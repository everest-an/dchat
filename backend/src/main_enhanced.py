"""
增强版主应用文件
包含所有API路由、中间件和安全配置
"""

import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.messages import messages_bp
from src.routes.projects import projects_bp
from src.routes.groups import groups_bp
from src.routes.notifications import notifications_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# 配置
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', '')  # MUST be set via environment variable
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# CORS配置 - 生产环境应配置具体的域名
CORS(app, 
     origins=os.environ.get('CORS_ORIGINS', '*').split(','),
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# 数据库配置
database_url = os.environ.get(
    'DATABASE_URL',
    f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = os.environ.get('DEBUG', 'False') == 'True'

# 初始化数据库
db.init_app(app)

# 创建数据库表
with app.app_context():
    # 导入所有模型以确保表被创建
    from src.models.message import Message
    from src.models.project import Project, Moment
    db.create_all()
    print("✅ 数据库表创建成功")

# 注册蓝图
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(messages_bp, url_prefix='/api/messages')
app.register_blueprint(projects_bp, url_prefix='/api')
app.register_blueprint(groups_bp, url_prefix='/api/groups')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

print("✅ 所有API路由已注册:")
print("   - /api/users")
print("   - /api/auth")
print("   - /api/messages")
print("   - /api/projects")
print("   - /api/groups")
print("   - /api/notifications")

# 全局错误处理
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': '请求参数错误',
        'message': str(error)
    }), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': '未授权访问',
        'message': str(error)
    }), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'error': '禁止访问',
        'message': str(error)
    }), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '资源不存在',
        'message': str(error)
    }), 404

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        'success': False,
        'error': '请求过于频繁',
        'message': '请稍后再试'
    }), 429

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误',
        'message': str(error) if app.debug else '请稍后重试'
    }), 500

# 健康检查接口
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'message': 'Dchat API is running',
        'version': '2.0.0',
        'endpoints': {
            'auth': '/api/auth',
            'users': '/api/users',
            'messages': '/api/messages',
            'groups': '/api/groups',
            'notifications': '/api/notifications',
            'projects': '/api/projects'
        }
    })

# API文档接口
@app.route('/api/docs', methods=['GET'])
def api_docs():
    """API文档接口"""
    return jsonify({
        'title': 'Dchat API Documentation',
        'version': '2.0.0',
        'base_url': request.host_url + 'api',
        'authentication': {
            'type': 'JWT Bearer Token',
            'header': 'Authorization: Bearer <token>'
        },
        'endpoints': {
            'auth': {
                'POST /auth/connect-wallet': '钱包连接登录',
                'POST /auth/verify-token': '验证JWT token',
                'PUT /auth/update-profile': '更新用户资料'
            },
            'users': {
                'GET /users': '获取用户列表',
                'POST /users': '创建用户',
                'GET /users/:id': '获取用户详情',
                'PUT /users/:id': '更新用户',
                'DELETE /users/:id': '删除用户'
            },
            'messages': {
                'GET /messages/conversations': '获取对话列表',
                'GET /messages/conversations/:user_id': '获取与特定用户的消息',
                'POST /messages/send': '发送消息'
            },
            'groups': {
                'POST /groups/create': '创建群组',
                'GET /groups/:id': '获取群组信息',
                'GET /groups/:id/messages': '获取群组消息',
                'POST /groups/:id/messages': '发送群组消息',
                'POST /groups/:id/members': '添加群组成员',
                'DELETE /groups/:id/members/:member_id': '移除群组成员',
                'GET /groups/list': '获取用户的群组列表'
            },
            'notifications': {
                'GET /notifications': '获取通知列表',
                'PUT /notifications/:id/read': '标记通知已读',
                'PUT /notifications/read-all': '标记所有通知已读',
                'DELETE /notifications/:id': '删除通知',
                'DELETE /notifications/clear': '清空所有通知'
            },
            'projects': {
                'GET /projects': '获取项目列表',
                'POST /projects': '创建项目',
                'GET /projects/:id': '获取项目详情',
                'PUT /projects/:id': '更新项目',
                'DELETE /projects/:id': '删除项目'
            }
        }
    })

# 前端静态文件服务
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """服务前端静态文件"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return jsonify({
            'error': 'Static folder not configured',
            'message': 'This is API server. Please access frontend separately.'
        }), 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return jsonify({
                'message': 'Dchat API Server',
                'version': '2.0.0',
                'docs': '/api/docs',
                'health': '/api/health'
            }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False') == 'True'
    
    print(f"\n🚀 Dchat API Server Starting...")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   Database: {database_url}")
    print(f"\n📚 API Documentation: http://localhost:{port}/api/docs")
    print(f"💚 Health Check: http://localhost:{port}/api/health\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
