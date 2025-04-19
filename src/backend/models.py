from sqlalchemy.dialects.postgresql import JSON
from extension import db

class ScheduleEvent(db.Model):
    __tablename__ = 'schedule_events'
    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(100))
    category = db.Column(db.String(50))
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    all_day = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(200))
    description = db.Column(db.Text)
    repeat = db.Column(db.Boolean, default=False)
    recurrence = db.Column(JSON)  # 存储递归规则

class Categories(db.Model):
    __tablename__ ='categories'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100))
    color = db.Column(db.String(50))
    