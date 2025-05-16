from flask import Flask, request, jsonify
from flask.views import MethodView
from extension import db, cors
from models import ScheduleEvent, Categories
from datetime import datetime, timezone
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.path.dirname(__file__), "database.sqlite")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 配置CORS
db.init_app(app)
cors.init_app(app, origins=["http://localhost:5173"])

def format_naive_as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.astimezone(timezone.utc).isoformat()

def serialize_event(event):
    return {
        'id': event.id,
        'title': event.title,
        'category': event.category,
        'start': format_naive_as_utc(event.start),
        'end': format_naive_as_utc(event.end),
        'allDay': event.all_day,
        'location': event.location,
        'description': event.description,
        'repeat': event.repeat,
        'recurrence': event.recurrence or None,
        'originalEventId': event.originalEventId,
        'exceptions': event.exceptions if event.exceptions else [],
        'lastState': event.lastState if event.lastState else None
    }
    
class WeekEventsAPI(MethodView):
    def get(self):
        try:
            # 解析为aware datetime并转换为UTC
            start_str = request.args['start']
            end_str = request.args['end']
            
            start_date = datetime.fromisoformat(start_str).astimezone(timezone.utc)
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            else:
                start_date = start_date.astimezone(timezone.utc)
            
            end_date = datetime.fromisoformat(end_str).astimezone(timezone.utc)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            else:
                end_date = end_date.astimezone(timezone.utc)

            # 转换为naive UTC用于数据库查询
            start_naive_utc = start_date.replace(tzinfo=None)
            end_naive_utc = end_date.replace(tzinfo=None)

            events = ScheduleEvent.query.filter(
                (ScheduleEvent.repeat == True) |
                ((ScheduleEvent.start <= end_naive_utc) &
                (ScheduleEvent.end >= start_naive_utc))
            ).all()
            events = [serialize_event(event) for event in events]
            return jsonify(events), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

class ScheduleEventAPI(MethodView):
    def post(self):
        data = request.json
        if not all([data.get('title'), data.get('start'), data.get('end')]):
            return jsonify({'error': '缺少必要字段'}), 400
        
        start_aware = datetime.fromisoformat(data['start']).astimezone(timezone.utc)
        end_aware = datetime.fromisoformat(data['end']).astimezone(timezone.utc)
        
        # 统一存储为 naive UTC 时间
        new_event = ScheduleEvent(
            id=data.get('id'),
            start=start_aware.replace(tzinfo=None),  
            end=end_aware.replace(tzinfo=None),     
            title=data['title'],
            category=data.get('category'),
            all_day=data.get('allDay', False),
            location=data.get('location'),
            description=data.get('description'),
            repeat=data.get('repeat', False),
            recurrence=data.get('recurrence'),
            originalEventId=data.get('originalEventId'),
            exceptions=data.get('exceptions', []),
            lastState=data.get('lastState')
        )

        db.session.add(new_event)
        db.session.commit()
        return jsonify(serialize_event(new_event)), 201
    
    def put(self, event_id):
        event = ScheduleEvent.query.get(event_id)
        if not event:
            return jsonify({'error': '事件不存在'}), 404
        data = request.json
        
        if not all([data.get('title'), data.get('start'), data.get('end')]):
            return jsonify({'error': '缺少必要字段'}), 400
        
        # 转换为aware datetime并存储为naive UTC
        start_time = datetime.fromisoformat(data['start']).astimezone(timezone.utc).replace(tzinfo=None)
        end_time = datetime.fromisoformat(data['end']).astimezone(timezone.utc).replace(tzinfo=None)
        
        event.id = data.get('id')
        event.title = data['title']
        event.category = data.get('category')
        event.start = start_time
        event.end = end_time
        event.all_day = data.get('allDay', False)
        event.location = data.get('location')
        event.description = data.get('description')
        event.repeat = data.get('repeat', False)
        event.recurrence = data.get('recurrence')
        if 'originalEventId' in data:
            event.originalEventId = data['originalEventId']
        if 'exceptions' in data:
            event.exceptions=data.get('exceptions', [])
        if 'lastState' in data:
            event.lastState=data.get('lastState')
        db.session.commit()
        return jsonify(serialize_event(event))

    def delete(self, event_id):
        # 添加调试日志
        print(f'尝试删除事件 ID: {event_id}')
        event = ScheduleEvent.query.get(event_id)
        if not event:
            return jsonify({'error': '事件不存在'}), 404
            
        db.session.delete(event)
        db.session.commit()
        return '', 204

class CategoriesAPI(MethodView):
    def get(self):
        try:
            categories = Categories.query.all()
            return jsonify([{
                'id': c.id,
                'name': c.name,
                'color': c.color
            } for c in categories]), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def post(self):
        data = request.json
        if not data.get('name') or not data.get('color'):
            return jsonify({'error': '缺少必要字段 name 或 color'}), 400
            
        try:
            new_category = Categories(
                name=data['name'],
                color=data['color']
            )
            db.session.add(new_category)
            db.session.commit()
            return jsonify({
                'id': new_category.id,
                'name': new_category.name,
                'color': new_category.color
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    def delete(self, id):
        category = Categories.query.get(id)
        if not category:
            return jsonify({'error': '分类不存在'}), 404
            
        try:
            db.session.delete(category)
            db.session.commit()
            return jsonify({}), 204
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    def put(self, id):
        category = Categories.query.get(id)
        if not category:
            return jsonify({'error': '分类不存在'}), 404
            
        data = request.json
        try:
            if 'name' in data: 
                category.name = data['name']
            if 'color' in data:
                category.color = data['color']
            db.session.commit()
            return jsonify({
                'id': category.id,
                'name': category.name,
                'color': category.color
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# 注册路由
app.add_url_rule('/api/events', view_func=ScheduleEventAPI.as_view('events_api'), methods=['POST'])
app.add_url_rule('/api/events/<string:event_id>', view_func=ScheduleEventAPI.as_view('event_api'), methods=['PUT', 'DELETE'])
app.add_url_rule('/api/events/week', view_func=WeekEventsAPI.as_view('week_events_api'), methods=['GET'])
app.add_url_rule('/api/categories', view_func=CategoriesAPI.as_view('categories_api'), methods=['GET', 'POST'])
app.add_url_rule('/api/categories/<int:id>', view_func=CategoriesAPI.as_view('category_api'), methods=['PUT', 'DELETE'])

@app.cli.command()
def create_db():
    with app.app_context():
        db.create_all()
        print(f"数据库已创建在：{app.config['SQLALCHEMY_DATABASE_URI']}")

@app.cli.command()
def reset_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("数据库已重置")
        
client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    try:
        # 根据类型构建不同消息结构
        msg_type = data.get('type', 'text')
        
        messages = [{"role": "system", "content": "你是一个日程管理助手，可以理解图片中的日程信息,对于其他的问题不予回答。如果图片中没有日程信息，请回答“图片中没有日程信息”，不用分析图片中的内容。"}]
        
        if msg_type == 'text':
            messages.append({
                "role": "user", 
                "content": data['message']
            })
        elif msg_type == 'img':
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": "请分析这张图片中的日程信息"},
                    {"type": "image_url", "image_url": {
                        "url": f"{data['imageBase64']}"
                    }}
                ]
            })
        else:
            return jsonify({"error": "不支持的请求类型"}), 400
        completion = client.chat.completions.create(
            model="qwen2.5-vl-72b-instruct",
            messages=messages
        )
        return jsonify({
            "reply": completion.choices[0].message.content
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    db_dir = os.path.dirname(db_path)
    os.makedirs(db_dir, exist_ok=True)
    
    if not os.path.exists(db_path):
        with app.app_context():
            db.create_all()
    
    app.run(debug=True)