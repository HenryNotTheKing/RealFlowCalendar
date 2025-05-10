import os
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
import base64
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")
base64_image = encode_image("src/backend/LLM/test.png")

client = OpenAI(
    # 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx",
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
completion = client.chat.completions.create(
    model="qwen2.5-vl-72b-instruct",  # 此处以qwen-vl-plus为例，可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
    messages=[{"role": "system", "content": "你是一个日程安排助手，帮助用户提取图片中所有的日程信息，不得遗漏。在每个抽取的事件末尾用单独的一个chunk输出&END&，表示事件抽取结束。提取出来的每个事件必须包含以下字段：title, category, start, end, location, description, repeat, recurrence.对于事件日期不明确的先记录开始和结束的时间和具体的星期几，不用包括日期"},
        {"role": "user","content": [
            {"type": "image_url",
             "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
            ]}],
        stream=True,
        temperature=0.1,
    )

current_event = []  # 新增：当前事件缓冲区
events = []         # 新增：存储所有事件的列表

for chunk in completion:
    if chunk.choices:
        content = chunk.choices[0].delta.content
        print(content)
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
                        events.append(event_str.strip())
                        print(event_str.strip())
                        current_event = [remaining]  # 重置缓冲区
                else:
                    current_event = [remaining] if remaining else []