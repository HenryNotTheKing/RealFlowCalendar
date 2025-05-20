from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import HumanMessagePromptTemplate
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
# 在提示模板中强化结构化输出指令
structure_template = ChatPromptTemplate.from_messages([
    HumanMessagePromptTemplate.from_template(
        "请以JSON格式输出:\n{instruction}\n用户输入:{input}\n提供的类别：{categorises},选择合适的，如果没有就自行生成。例如如果有了“日程”，但“课程”“工作”“活动”“休闲”等更具体更合适，就使用后者"
    )
])

class RecurrenceRule(BaseModel):
    """重复规则定义"""
    type: str = Field(..., enum=["daily", "weekly", "monthly", "yearly"], description="重复类型,只能从daily, weekly, monthly, yearly中选择")
    interval: int = Field(..., gt=0)
    daysOfWeek: Optional[List[int]] = Field(
        default=None, 
        description="0代表周日,1代表周一,2代表周二，3代表周三，4代表周四，5代表周五，6代表周六，请严格遵循这个规则。"
    )
    endCondition: str = Field(..., enum=["never", "untilDate", "occurrences"], description="优先选用occurrences")
    occurrences: Optional[int] = Field(default=None, gt=0)
    endDate: Optional[datetime] = Field(default=None,description="结束日期")

class ScheduleEvent(BaseModel):
    """日历事件数据结构"""
    id: Optional[str] = None
    title: str = Field(..., max_length=100, description="尽量简短到几个字，只需要包括主要事件内容")
    category: str = Field(..., max_length=50, description="先从提供的类别中选择最相近的，如果都不符合，请自行生成")
    start: datetime = Field(..., description="精确到分钟即可，五分钟为一个尺度，如果不是整的五分钟，向下取整")
    end: datetime = Field(..., description="精确到分钟即可，五分钟为一个尺度，如果不是整的五分钟，向下取整")
    allDay: bool = False
    location: str = Field(..., max_length=200)
    description: str
    repeat: bool = Field(..., description="是否重复，只发生一次的事件设置为false")
    recurrence: RecurrenceRule = Field(description="当 repeat 为 true 时，必填；当 repeat 为 false 时，赋值为None")
    originalEventId: Optional[str] = None
    exceptions: Optional[List[datetime]] = None
    lastState: Optional["ScheduleEvent"] = None

# 强化输出解析器配置
output_parser = PydanticOutputParser(
    pydantic_object=ScheduleEvent,
    # 添加详细解析指令
    instruction="请严格遵循JSON格式和字段约束，特别注意时间格式应为ISO 8601标准。输入包括主要内容，一个提问和一个回答。以主要内容的信息为主，综合考虑提问和回答的内容。"
)


