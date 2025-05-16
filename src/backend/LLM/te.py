import os
from openai import OpenAI
import base64
import json
from datetime import datetime
from pydantic import BaseModel, Field
import uuid
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from typing import Optional

# 图片编码
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# 数据结构
class RecurrenceRule(BaseModel):
    type: str = Field(..., enum=["daily", "weekly", "monthly", "yearly"])
    interval: int = Field(..., gt=0)
    days_of_week: Optional[list[int]] = Field(default_factory=list)
    end_condition: str = Field(..., enum=["never", "untilDate", "occurrences"])
    occurrences: Optional[int] = None
    end_date: Optional[datetime] = None

class ScheduleEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))  
    title: str
    category: str
    start: datetime
    end: datetime
    all_day: bool = False
    location: str
    description: str
    repeat: bool
    recurrence: RecurrenceRule
    original_event_id: Optional[str] = None
    exceptions: Optional[list[datetime]] = None
    last_state: Optional["ScheduleEvent"] = None

def process_image_schedule(image_path):
    # 图片解析
    base64_image = encode_image(image_path)
    vision_client = OpenAI(
        api_key="sk-e6fba2d1a8f3404dae5791fb85d3c78f",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    print("图片解析完成")
    # 初始信息提取
    raw_events = []
    completion = vision_client.chat.completions.create(
        model="qwen2.5-vl-72b-instruct",
        messages=[{
            "role": "system",
            "content": "你是一个日程安排助手，帮助用户提取图片中所有的日程信息，不得遗漏。在每个抽取的事件末尾用单独的一个chunk输出&END&，表示事件抽取结束。提取出来的每个事件必须包含以下字段：title, category, start, end, location, description, repeat, recurrence.对于事件日期不明确的先记录开始和结束的时间和具体的星期几，不用包括日期"
        }, {
            "role": "user",
            "content": [{
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{base64_image}"}
            }]
        }],
        stream=True,
        temperature=0
    )
    print("初始信息提取完成")
    # 收集原始事件数据
    current_event = []
    for chunk in completion:
        if chunk.choices:
            content = chunk.choices[0].delta.content
            # 新增事件分割逻辑
            if content:
                current_event.append(content)
                joined_content = ''.join(current_event)
                
                if '&END&' in joined_content:
                    # 分割事件内容
                    parts = joined_content.split('&END&')
                    # 将最后一个部分保留在缓冲区
                    *complete_parts, remaining = parts
                    
                    # 添加完整事件到列表
                    for event_str in complete_parts:
                        if event_str.strip():
                            try:
                                event_data = json.loads(event_str.replace('\n', ' '))
                                raw_events.append(event_data)
                                print(event_data)
                            except json.JSONDecodeError:
                                print(f"JSON解析失败：{event_str}")
                                current_event = [remaining]  # 重置缓冲区
                    else:
                        current_event = [remaining] if remaining else []
    
    # 缺失字段
    validated_events = []
    for event in raw_events:
        required = ['title', 'category', 'start', 'end', 'location', 'description', 'repeat', 'recurrence']
        missing = [field for field in required if not event.get(field)]
        
        while missing:
            # 使用模型生成询问
            query = f"请补充缺失字段：{', '.join(missing)}\n当前事件：{json.dumps(event)}"
            response = vision_client.chat.completions.create(
                model="qwen2.5-vl-72b-instruct",
                messages=[{"role": "user", "content": query}],
                max_tokens=200
            )
            user_input = response.choices[0].message.content
            
            # 解析用户回复
            for line in user_input.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    event[key.strip()] = value.strip()
            
            missing = [field for field in required if not event.get(field)]
        
        # 结构化模型
        struct_client = OpenAI(
            api_key="sk-e6fba2d1a8f3404dae5791fb85d3c78f",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        parser = PydanticOutputParser(pydantic_object=ScheduleEvent)
        prompt = ChatPromptTemplate.from_messages([
            HumanMessagePromptTemplate.from_template(
                "请严格按照以下JSON Schema格式输出：\n{schema}\n用户输入：{input}"
            )
        ]).format(
            schema=parser.get_format_instructions(),
            input=json.dumps(event)
        )
        
        final_completion = struct_client.chat.completions.create(
            model="qwen-plus-2025-04-28",  
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        validated_event = parser.parse(final_completion.choices[0].message.content)
        validated_events.append(validated_event.dict())
    
    return validated_events

if __name__ == "__main__":
    image_path = "D:/FlowCalendar/RealFlowCalendar/src/backend/LLM/test_half.png"
    result = process_image_schedule(image_path)
    print(json.dumps(result, indent=2, default=str))