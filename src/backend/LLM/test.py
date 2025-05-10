from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import HumanMessagePromptTemplate
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
import json
import os
from langchain_core.tools import tool
load_dotenv()
# 在提示模板中强化结构化输出指令
prompt_template = ChatPromptTemplate.from_messages([
    HumanMessagePromptTemplate.from_template(
        "请以JSON格式输出：\n{instruction}\n用户输入：{input}"
    )
])

model = ChatOpenAI(
    model="qwen-plus-2025-04-28",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.getenv("DASHSCOPE_API_KEY"))



class RecurrenceRule(BaseModel):
    """重复规则定义"""
    type: str = Field(..., enum=["daily", "weekly", "monthly", "yearly"], description="重复类型,只能从daily, weekly, monthly, yearly中选择")
    interval: int = Field(..., gt=0)
    days_of_week: Optional[List[int]] = Field(
        default=None, 
        description="0-6代表周日到周六"
    )
    end_condition: str = Field(..., enum=["never", "untilDate", "occurrences"])
    occurrences: Optional[int] = Field(default=None, gt=0)
    end_date: Optional[datetime] = None

class ScheduleEvent(BaseModel):
    """日历事件数据结构"""
    id: Optional[str] = None
    title: str = Field(..., max_length=100)
    category: str = Field(..., max_length=50)
    start: datetime
    end: datetime
    all_day: bool = False
    location: str = Field(..., max_length=200)
    description: str
    repeat: bool = Field(..., description="是否重复，只发生一次的事件设置为false")
    recurrence: RecurrenceRule = Field(description="当 repeat 为 true 时，必填；当 repeat 为 false 时，赋值为None")
    original_event_id: Optional[str] = None
    exceptions: Optional[List[datetime]] = None
    last_state: Optional["ScheduleEvent"] = None

# 强化输出解析器配置
output_parser = PydanticOutputParser(
    pydantic_object=ScheduleEvent,
    # 添加详细解析指令
    instruction="请严格遵循JSON格式和字段约束，特别注意时间格式应为ISO 8601标准"
)


# 在提示词中插入格式化指令（保留原有prompt_value定义）
prompt_value = prompt_template.format(
    input="""title: 计算机网络
category: 课程
start: 星期一 08:00
end: 星期一 08:45
location: S215
description: 姜竹青 1-16(周)[01-02节]
repeat: 每周
recurrence: 16次,第一周的星期一是2025年2月24日，该事件从第一周开始""",
    instruction=output_parser.get_format_instructions() + "\n注意事项：\n1. 时间必须使用ISO格式\n2. 枚举值必须从指定选项中选择\n3. 必须使用合法的JSON格式，包含完整的字段"
)
# result = model.invoke(prompt_value)
@tool
def get_current_time():
    """获取当前时间"""
    return datetime.now().isoformat()

tools = [get_current_time]

model_with_tools = model.bind_tools(tools)

from langchain_core.messages import ToolMessage, HumanMessage

def process_tool_calls(result):
    tool_responses = []
    for tool_call in getattr(result, 'tool_calls', []):
        if tool_call['name'] == "get_current_time":
            # 获取工具调用结果
            tool_result = get_current_time.invoke({})
            # 构建符合要求的工具消息
            tool_responses.append(
                ToolMessage(
                    content=json.dumps(tool_result),
                    tool_call_id=tool_call['id']
                )
            )
    return tool_responses


# 在最终调用时强化JSON关键字
final_messages = [
    HumanMessage(content="JSON格式输出：" + prompt_value)  # 在消息内容前添加JSON关键词
]
final_response = model.with_structured_output(ScheduleEvent).invoke(final_messages)
print("final_response", final_response)