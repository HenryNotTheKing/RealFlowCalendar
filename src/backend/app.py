from flask import Flask
from flask.views import MethodView
from extension import db,cors
from models import Book
from flask import request

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
cors.init_app(app)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.cli.command()
def create():
    create_db()

def create_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        Book.init_db()
        print(f"数据库已创建在：{app.config['SQLALCHEMY_DATABASE_URI']}")


# 在文件底部添加自动检测逻辑
if __name__ == '__main__':
    import os
    db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    if not os.path.exists(db_path):
        print("检测到新数据库，正在初始化...")
        create_db()
    app.run(debug=True)


