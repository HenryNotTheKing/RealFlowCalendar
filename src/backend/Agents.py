from langchain_openai import ChatOpenAI
from structurer import output_parser, structure_template
import json
import uuid
from datetime import datetime
from flask import current_app

class Agents:
    def __init__(self,api_key=None):
        self.examiner = ChatOpenAI(
            model="qwen-plus-2025-04-28",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key=api_key,
            temperature=0
        )
        self.extractor = ChatOpenAI(
            model="qwen-vl-max-latest",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key=api_key,
            temperature=0
        )
        self.sturcturer = ChatOpenAI(
            model="qwen-plus-2025-04-28",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key=api_key,
            temperature=0
        )


    def exam(self,event_text):
        messages = [
            {"role": "system", 
            "content": 
                f"""你要负责检查用户输入的文字中是否有足够的信息能生成一个日程事件。请严格遵循以下规则：
                    1. 当且仅当输入包含明确的时间信息（具体年月日）时，才生成对应字段.注意查看输入信息中提问和回复的内容
                    2. 若时间信息不完整（缺少年月日中的任意部分），必须返回自然语言提问
                    3. 绝对禁止自行假设或生成时间信息（如使用随机日期），但是可以使用已知的当前时间推断明天、后天、周二的日期，但时间仍未知。但“一个小时之后”的时间也可以推断出来
                    4. 时间检测标准示例：
                    ✓ 有效："5月4日19:15" → 需要补充年份
                    ✓ 有效："每周一08:00" → 需要具体开始日期
                    ✓ 有效："从第一周开始，持续到第16周" → 提问需要具体第一周周一的日期
                    ✓ 有效："周二08:00-09:00,1-12周" → 提问需要具体第一周周一的日期
                    ✓ 有效："今天是2025年4月1日" → 自行推断出“明天”是2025年4月2日
                    ✗ 无效：自行补充"2025年"作为年份
                    5.如果用户输入的不是日程信息，用自然语言回答你只能处理日程信息。如果是“你好”之类的信息可以回答。
                    请按以下格式响应：
                    当信息完整时,不允许增加额外的文字，仅仅返回 →
                    True
                    当信息缺失时 →
                    根据缺失的信息，结合用户的输入文本，生成自然语言提问，不要输出Flase"""
            },
            {"role": "user", "content": event_text + "\n补充信息:\n" + "\n现在的时间是: " + self.get_current_time()}
        ]
        model_response = self.examiner.invoke(messages)
        return model_response.content
    
    def structure_output(self, event_text):
        from app import CategoriesAPI
        prompt_value = structure_template.format(input=event_text + "\n今天是"+self.get_current_time(), instruction=output_parser.get_format_instructions(), categorises=CategoriesAPI.get_formatted_names(separator=", "))
        completion = self.sturcturer.invoke([prompt_value])
        try:
            cleaned = completion.content.strip().replace('```json', '').replace('```', '')
            event = json.loads(cleaned)
            event['id'] = str(uuid.uuid4())  # 生成唯一ID
            return event
        except json.JSONDecodeError:
            # 添加详细的错误日志
            print(f"原始模型输出内容：\n{completion.content}")
            return {"error": "模型返回了无效的JSON格式"}
    
    def extract(self, input_image, socketio, session_id, session_context, user_input=""):
        messages=[{"role": "system", 
                    "content": "你是一个专业的日程信息提取助手，请从图片中提取所有日程安排信息，注意是所有的信息。要求：\n"
                                    "0. 在识别出的每个单独事件后面用单独的一个chunk输出END作为结束标识\n"
                                    "1. 用完整的自然语言句子描述每个独立事件,如果判断是重复事件要包括重复规则\n"
                                    "2. 请注意：合并标题相同的并且时间相近的事件，间隔大于十五分钟的事件不合并\n"
                                    "合并示例：\n"
                                    "项目评审,周一10:00-11:00\n"
                                    "项目评审,周一11:15-12:00\n"
                                    "合并后：\n"
                                    "项目评审,周一10:00-12:00"
                                    "示例输出结果：机器智能，星期几，14:45-16:20,7-9周，其他信息...\nEND"
                                    },
                {"role": "user",
                "content": [
                    {"type": "image_url",
                    "image_url": {"url": f"{input_image}"}}]
                }]

        socketio.emit('image_processed', room=session_id)
        try:
            # 流式处理逻辑
            response = self.extractor.stream(messages)
            current_event = []
            
            for chunk in response:
                if chunk.content:
                    current_event.append(chunk.content)
                    joined_content = ''.join(current_event)
                    
                    if 'END' in joined_content:
                        parts = joined_content.split('END')
                        *complete_parts, remaining = parts
                        
                        for event_str in complete_parts:
                            if event_str.strip():
                                # 合并历史输入
                                combined_input = f"{event_str.strip()}\n补充信息:\n{user_input}"
                                exam_response = self.exam(combined_input)
                                print(f"\ncombined_input: {combined_input}\n")
                                if exam_response == "True":
                                    # 生成并发送事件
                                    socketio.emit('message', {
                                        'content': '日程生成中...'
                                    }, room=session_id)
                                    event = self.structure_output(combined_input)
                                    event = self.exam_harsh(event)
                                    socketio.emit('event_created', {'event': event}, room=session_id)
                                    socketio.emit('message', {
                                        'content': f'已创建日程：{event["title"]}'
                                    }, room=session_id)
                                    with current_app.app_context():
                                        with current_app.test_client() as client:
                                            client.post('/api/events', json=event)
                                            from app import CategoriesAPI
                                            if not CategoriesAPI.name_exists(event['category']):
                                                client.post('/api/categories', json={
                                                    'name': event['category'],
                                                    'color': 'Blue'})
                                    # 清除上下文
                                    print(f"已创建日程：{event}")
                                    if session_id in session_context:
                                        del session_context[session_id]
                                else:
                                    # 存储上下文等待回复
                                    session_context[session_id] = {
                                        'exam_question': exam_response,
                                        'imageBase64': input_image
                                    }
                                    socketio.emit('message', {
                                        'content': exam_response
                                    }, room=session_id)
                                    return False  # 暂停执行

                        current_event = [remaining] if remaining else []
            return False
        except Exception as e:
            socketio.emit('error', {'message': str(e)}, room=session_id)
            raise
    def get_current_time(self):
        weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        now = datetime.now()
        return f"{now.strftime('%Y年%m月%d日')} {weekdays[now.weekday()]} {now.strftime('%H:%M:%S')}"
    def exam_harsh(self, event):
        if 'recurrence' in event and event['repeat'] == True:
            recurrence = event['recurrence']
            if recurrence.get('endCondition', '') != "untilDate":
                recurrence.pop('endDate', None)
        return event