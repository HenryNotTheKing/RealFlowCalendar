from flask_socketio import SocketIO, emit
from app import app, agents, db, ScheduleEvent
import os
# 在 Flask 初始化后添加
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")

# WebSocket 事件处理
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_message(data):
    try:
        # 使用现有业务逻辑处理消息
        if data.get('type') == 'text':
            exam_result = agents.exam(data['message'])
            
            if exam_result == "True":
                new_event = agents.structure_output(data['message'])
                # 保存事件到数据库
                with app.app_context():
                    db.session.add(ScheduleEvent(**new_event))
                    db.session.commit()
                
                # 实时推送多个事件
                emit('event_created', {
                    'status': 'success',
                    'event': new_event
                })
                
                # 发送自然语言响应
                emit('message', {
                    'content': '已为您创建日程: ' + new_event['title'],
                    'type': 'text'
                })
            else:
                emit('message', {
                    'content': exam_result,
                    'type': 'text'
                })
                
    except Exception as e:
        emit('error', {'message': str(e)})

# 修改启动方式
if __name__ == '__main__':
    socketio.run(app, debug=True)