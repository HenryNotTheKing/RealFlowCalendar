from flask import Flask, request, jsonify
from flask.views import MethodView
from extension import db, cors
from models import ScheduleEvent
from datetime import datetime, timezone
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.path.dirname(__file__), "database.sqlite")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 配置CORS
db.init_app(app)
cors.init_app(app, origins=["http://localhost:5173"])

def serialize_event(event):
    def format_naive_as_utc(dt):
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.astimezone(timezone.utc).isoformat()
    
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
    }

def build_rrule(event, request_end_date):
    if not event.recurrence or 'type' not in event.recurrence:
        return None

    valid_types = ['daily', 'weekly', 'monthly', 'yearly']
    if event.recurrence['type'].lower() not in valid_types:
        raise ValueError(f"无效的重复类型: {event.recurrence['type']}")

    freq_map = {
        'daily': DAILY,
        'weekly': WEEKLY,
        'monthly': MONTHLY,
        'yearly': YEARLY
    }

    # 转换为aware UTC时间
    dtstart_aware = event.start.replace(tzinfo=timezone.utc) if event.start.tzinfo is None else event.start.astimezone(timezone.utc)
    
    rule_params = {
        'freq': freq_map[event.recurrence['type'].lower()],
        'interval': event.recurrence.get('interval', 1),
        'dtstart': dtstart_aware
    }

    if event.recurrence['endCondition'] == 'untilDate':
        if 'endDate' not in event.recurrence:
            raise ValueError("untilDate 类型需要 endDate 字段")
        end_date_str = event.recurrence['endDate']
        until_naive = datetime.fromisoformat(end_date_str)
        # 转换为aware UTC时间
        if until_naive.tzinfo is None:
            until_aware = until_naive.replace(tzinfo=timezone.utc)
        else:
            until_aware = until_naive.astimezone(timezone.utc)
        rule_params['until'] = until_aware
    elif event.recurrence['endCondition'] == 'occurrences':
        if 'occurrences' not in event.recurrence:
            raise ValueError("occurrences 类型需要 occurrences 字段")
        rule_params['count'] = event.recurrence['occurrences']
    elif event.recurrence['endCondition'] == 'never':
        # 转换为aware UTC时间
        if request_end_date.tzinfo is None:
            request_end_aware = request_end_date.replace(tzinfo=timezone.utc)
        else:
            request_end_aware = request_end_date.astimezone(timezone.utc)
        rule_params['until'] = request_end_aware
        
    if event.recurrence.get('type', '').lower() == 'weekly' and 'daysOfWeek' in event.recurrence:
        rule_params['byweekday'] = [int(day) for day in event.recurrence['daysOfWeek']]
        
    return rrule(**rule_params)

class WeekEventsAPI(MethodView):
    def get(self):
        try:
            # 解析为aware datetime并转换为UTC
            start_str = request.args['start']
            end_str = request.args['end']
            
            start_date = datetime.fromisoformat(start_str)
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            else:
                start_date = start_date.astimezone(timezone.utc)
            
            end_date = datetime.fromisoformat(end_str)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            else:
                end_date = end_date.astimezone(timezone.utc)

            # 转换为naive UTC用于数据库查询
            start_naive_utc = start_date.replace(tzinfo=None)
            end_naive_utc = end_date.replace(tzinfo=None)

            base_events = ScheduleEvent.query.filter(
                (ScheduleEvent.repeat == True) |
                ((ScheduleEvent.start <= end_naive_utc) &
                (ScheduleEvent.end >= start_naive_utc))
            ).all()

            expanded_events = []
            for event in base_events:
                if event.repeat and event.recurrence:
                    try:
                        rule = build_rrule(event, end_date)
                        if not rule:
                            continue
                            
                        # 获取原始事件的持续时间（naive UTC时间计算）
                        duration = event.end - event.start
                        
                        # 获取所有潜在发生时间
                        raw_occurrences = list(rule.between(start_date, end_date, inc=True))
                        
                        # 处理空结果时的默认事件
                        if not raw_occurrences:
                            # 转换为aware时间进行比较
                            event_start_aware = event.start.replace(tzinfo=timezone.utc)
                            event_end_aware = event_start_aware + duration
                            # 验证是否在请求范围内
                            if (event_start_aware < end_date) and (event_end_aware > start_date):
                                raw_occurrences = [event_start_aware]
                        
                        # 精确筛选符合条件的事件
                        valid_occurrences = []
                        for occ in raw_occurrences:
                            # 确保occ是aware类型
                            if occ.tzinfo is None:
                                occ = occ.replace(tzinfo=timezone.utc)
                                
                            # 计算事件结束时间
                            occ_end = occ + duration
                            
                            # 时间范围重叠验证（允许部分重叠）
                            if (occ < end_date) and (occ_end > start_date):
                                valid_occurrences.append(occ)
                        
                        # 生成最终事件数据
                        for occ in valid_occurrences:
                            expanded_events.append({
                                **serialize_event(event),
                                'start': occ.isoformat(),
                                'end': (occ + duration).isoformat()
                            })
                            
                    except Exception as e:
                        print(f"生成重复事件失败 ID:{event.id} - {str(e)}")
                        continue
                else:
                    expanded_events.append(serialize_event(event))
    
            return jsonify(expanded_events)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

class ScheduleEventAPI(MethodView):
    def post(self):
        data = request.json
        # 转换为aware datetime并存储为naive UTC
        start_time = datetime.fromisoformat(data['start']).astimezone(timezone.utc).replace(tzinfo=None)
        end_time = datetime.fromisoformat(data['end']).astimezone(timezone.utc).replace(tzinfo=None)
        
        new_event = ScheduleEvent(
            start=start_time,
            end=end_time,
            title=data['title'],
            category=data.get('category'),
            all_day=data.get('allDay', False),
            location=data.get('location'),
            description=data.get('description'),
            repeat=data.get('repeat', False),
            recurrence=data.get('recurrence')
        )

        db.session.add(new_event)
        db.session.commit()
        return jsonify(serialize_event(new_event)), 201
    
    def put(self, event_id):
        event = ScheduleEvent.query.get_or_404(event_id)
        data = request.json
        
        if not all([data.get('title'), data.get('start'), data.get('end')]):
            return jsonify({'error': '缺少必要字段'}), 400
        
        # 转换为aware datetime并存储为naive UTC
        start_time = datetime.fromisoformat(data['start']).astimezone(timezone.utc).replace(tzinfo=None)
        end_time = datetime.fromisoformat(data['end']).astimezone(timezone.utc).replace(tzinfo=None)
        
        event.title = data['title']
        event.category = data.get('category')
        event.start = start_time
        event.end = end_time
        event.all_day = data.get('allDay', False)
        event.location = data.get('location')
        event.description = data.get('description')
        event.repeat = data.get('repeat', False)
        event.recurrence = data.get('recurrence')
        
        db.session.commit()
        return jsonify(serialize_event(event))

    def delete(self, event_id):
        event = ScheduleEvent.query.get_or_404(event_id)
        db.session.delete(event)
        db.session.commit()
        return '', 204

# 注册路由
app.add_url_rule('/api/events', view_func=ScheduleEventAPI.as_view('events_api'), methods=['POST'])
app.add_url_rule('/api/events/<int:event_id>', view_func=ScheduleEventAPI.as_view('event_api'), methods=['PUT', 'DELETE'])
app.add_url_rule('/api/events/week', view_func=WeekEventsAPI.as_view('week_events_api'), methods=['GET'])

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
        
if __name__ == '__main__':
    db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    db_dir = os.path.dirname(db_path)
    os.makedirs(db_dir, exist_ok=True)
    
    if not os.path.exists(db_path):
        with app.app_context():
            db.create_all()
    
    app.run(debug=True)