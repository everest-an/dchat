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
from src.routes.files import files_bp
# from src.middleware.api_logger import init_api_logging

# 导入新增的路由
try:
    from src.routes.groups import groups_bp
    from src.routes.notifications import notifications_bp
    from src.routes.linkedin_oauth import linkedin_bp
    HAS_NEW_ROUTES = True
except ImportError as e:
    HAS_NEW_ROUTES = False
    print(f"⚠️  新路由模块未找到: {e}")

# 导入 Web3 路由
try:
    from src.routes.groups_web3 import groups_web3_bp
    from src.routes.payments_web3 import payments_web3_bp
    from src.routes.payments_polkadot import payments_polkadot_bp
    from src.routes.webrtc import webrtc_bp
    from src.routes.search import search_bp
    from src.routes.stickers import stickers_bp
    from src.routes.reactions import reactions_bp
    from src.routes.read_receipts import read_receipts_bp
    from src.routes.push_notifications import push_notifications_bp
    from src.routes.tokens import tokens_bp
    HAS_WEB3_ROUTES = True
except ImportError as e:
    HAS_WEB3_ROUTES = False
    print(f"⚠️  Web3 路由模块未找到: {e}")

# 导入订阅和 NFT 头像路由
try:
    from src.routes.subscription import subscription_bp
    from src.routes.nft_avatar import nft_avatar_bp
    from src.routes.custodial_wallet import custodial_wallet_bp
    from src.routes.user_profile import user_profile_bp
    from src.routes.chat_transfer import chat_transfer_bp
    from src.routes.red_packets import red_packets_bp
    from src.routes.transfers import transfers_bp
    HAS_SUBSCRIPTION_ROUTES = True
except ImportError as e:
    HAS_SUBSCRIPTION_ROUTES = False
    print(f"⚠️  订阅路由模块未找到: {e}")

# 导入机会匹配路由
try:
    from src.routes.matching import matching_bp
    HAS_MATCHING_ROUTES = True
except ImportError as e:
    HAS_MATCHING_ROUTES = False
    print(f"⚠️  机会匹配路由模块未找到: {e}")

# 导入 LiveKit 路由
try:
    from src.routes.livekit_routes import livekit_bp
    HAS_LIVEKIT_ROUTES = True
except ImportError as e:
    HAS_LIVEKIT_ROUTES = False
    print(f"⚠️  LiveKit 路由模块未找到: {e}")

# 导入高级功能路由
try:
    from src.routes.websocket_notifications import websocket_bp
    from src.routes.call_quality_monitor import call_quality_bp
    from src.routes.mfa import mfa_bp
    from src.routes.admin import admin_bp
    HAS_ADVANCED_ROUTES = True
except ImportError as e:
    HAS_ADVANCED_ROUTES = False
    print(f"⚠️  高级功能路由模块未找到: {e}")

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# 配置
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dchat-secret-key-2024')
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
def init_db(app):
    db.init_app(app)
    with app.app_context():
        # 导入所有模型以确保表被创建
        from src.models.message import Message
        from src.models.project import Project, Moment
        # 导入订阅模型
        try:
            from src.models.subscription import Subscription, NFTMembership, NFTAvatar, SubscriptionFeatureUsage
        except ImportError:
            pass
        # 导入红包模型
        try:
            from src.models.red_packet import RedPacket, RedPacketClaim
        except ImportError:
            pass
        # 导入匹配模型
        try:
            from src.models.matching import MatchingRequest, MatchingResult, MatchingFeedback, SkillRelation
        except ImportError:
            pass
        db.create_all()
        print("✅ 数据库表创建成功")

# 初始化 API 日志
# init_api_logging(app)

# ========== 路由注册顺序很重要：API路由必须在静态文件服务之前注册 ==========

# 注册基础蓝图
app.register_blueprint(user_bp, url_prefix='/api/users')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(messages_bp, url_prefix='/api/messages')
app.register_blueprint(projects_bp, url_prefix='/api')
app.register_blueprint(files_bp, url_prefix='/api/files')

# 注册新增蓝图
if HAS_NEW_ROUTES:
    app.register_blueprint(groups_bp, url_prefix='/api/groups')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(linkedin_bp, url_prefix='/api/linkedin')
    print("✅ 新增 API 路由已注册（Groups, Notifications, LinkedIn OAuth）")
else:
    print("⚠️  新增 API 路由未注册")

# 注册 Web3 蓝图
if HAS_WEB3_ROUTES:
    app.register_blueprint(groups_web3_bp, url_prefix='/api/web3/groups')
    app.register_blueprint(payments_web3_bp, url_prefix='/api/web3/payments')
    app.register_blueprint(payments_polkadot_bp, url_prefix='/api/web3/polkadot')
    app.register_blueprint(webrtc_bp, url_prefix='/api/webrtc')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(stickers_bp, url_prefix='/api/stickers')
    app.register_blueprint(reactions_bp, url_prefix='/api/reactions')
    app.register_blueprint(read_receipts_bp, url_prefix='/api/read-receipts')
    app.register_blueprint(push_notifications_bp, url_prefix='/api/push-notifications')
    app.register_blueprint(tokens_bp, url_prefix='/api/tokens')
    print("✅ Web3 API 路由已注册（Polkadot, WebRTC, 搜索, 表情包, 消息反应, 已读回执, 推送通知, 代币）")
else:
    print("⚠️  Web3 API 路由未注册")

# 注册订阅和 NFT 头像蓝图
if HAS_SUBSCRIPTION_ROUTES:
    app.register_blueprint(subscription_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(nft_avatar_bp, url_prefix='/api/avatars/nft')
    app.register_blueprint(custodial_wallet_bp, url_prefix='/api/wallets/custodial')
    app.register_blueprint(user_profile_bp, url_prefix='/api/profiles')
    app.register_blueprint(chat_transfer_bp, url_prefix='/api/chat-transfer')
    app.register_blueprint(red_packets_bp, url_prefix='/api/red-packets')
    app.register_blueprint(transfers_bp, url_prefix='/api/transfers')
    print("✅ 订阅、NFT 头像、托管钱包、用户资料、红包和转账 API 路由已注册")
else:
    print("⚠️  订阅和相关 API 路由未注册")

# 注册机会匹配蓝图
if HAS_MATCHING_ROUTES:
    app.register_blueprint(matching_bp, url_prefix='/api/matching')
    print("✅ 机会匹配 API 路由已注册")
else:
    print("⚠️  机会匹配 API 路由未注册")

# 注册 LiveKit 蓝图
if HAS_LIVEKIT_ROUTES:
    app.register_blueprint(livekit_bp, url_prefix='/api/livekit')
    print("✅ LiveKit API 路由已注册")
else:
    print("⚠️  LiveKit API 路由未注册")

# 注册高级功能蓝图
if HAS_ADVANCED_ROUTES:
    app.register_blueprint(websocket_bp, url_prefix='/api/ws')
    app.register_blueprint(call_quality_bp, url_prefix='/api/call-quality')
    app.register_blueprint(mfa_bp, url_prefix='/api/mfa')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    print("✅ 高级功能 API 路由已注册（WebSocket, 通话质量监控, MFA, 管理员）")
else:
    print("⚠️  高级功能 API 路由未注册")

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
    endpoints = {
        'auth': '/api/auth',
        'users': '/api/users',
        'messages': '/api/messages',
        'projects': '/api/projects',
        'files': '/api/files'
    }
    
    if HAS_NEW_ROUTES:
        endpoints.update({
            'groups': '/api/groups',
            'notifications': '/api/notifications',
            'linkedin': '/api/linkedin'
        })
    
    if HAS_WEB3_ROUTES:
        endpoints.update({
            'web3_groups': '/api/web3/groups',
            'web3_payments': '/api/web3/payments',
            'web3_polkadot': '/api/web3/polkadot',
            'webrtc': '/api/webrtc',
            'search': '/api/search'
        })
    
    if HAS_SUBSCRIPTION_ROUTES:
        endpoints.update({
            'subscriptions': '/api/subscriptions',
            'nft_avatars': '/api/avatars/nft',
            'red_packets': '/api/red-packets'
        })
    
    if HAS_MATCHING_ROUTES:
        endpoints.update({
            'matching': '/api/matching'
        })
    
    if HAS_ADVANCED_ROUTES:
        endpoints.update({
            'websocket': '/api/ws',
            'call_quality': '/api/call-quality',
            'mfa': '/api/mfa',
            'admin': '/api/admin'
        })
    
    return jsonify({
        'status': 'ok',
        'message': 'Dchat API is running',
        'version': '2.0.0',
        'endpoints': endpoints
    })

# API文档接口
@app.route('/api/docs', methods=['GET'])
def api_docs():
    """API文档接口"""
    return jsonify({
        'title': 'Dchat API Documentation',
        'version': '2.0.0',
        'base_url': '/api',
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
            'files': {
                'POST /files/upload': '上传文件到IPFS',
                'GET /files/download/:ipfs_hash': '获取文件下载链接',
                'GET /files/metadata/:ipfs_hash': '获取文件元数据',
                'DELETE /files/unpin/:ipfs_hash': '删除IPFS文件'
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

# ========== 前端静态文件服务（必须在所有API路由之后注册） ==========
# 这个通配符路由会拦截所有未被其他路由处理的请求
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """服务前端静态文件或返回API信息"""
    # 如果请求的路径以 /api 开头，不应该到达这里
    # 如果到达这里，说明是一个未定义的API路由，返回404
    if path.startswith('api'):
        return jsonify({
            'success': False,
            'error': '未找到该API端点',
            'message': f'API endpoint /{path} not found',
            'hint': '请访问 /api/health 查看可用的API端点'
        }), 404
    
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return jsonify({
            'message': 'Dchat API Server',
            'version': '2.0.0',
            'docs': '/api/docs',
            'health': '/api/health'
        }), 200

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

# 延迟初始化数据库
# init_db(app) # 移除这里的调用，因为在 Vercel 中不需要
if __name__ == '__main__':
    # Skip database initialization in Vercel environment
    if not os.environ.get('VERCEL'):
        try:
            init_db(app) # 在本地运行时初始化数据库
        except Exception as e:
            logger.warning(f"Database initialization failed: {e}. Continuing without database...")
    else:
        logger.info("Skipping database initialization in Vercel environment")
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False') == 'True'
    
    print(f"\n🚀 Dchat API Server Starting...")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   Database: {database_url}")
    print(f"   Version: 2.0.0")
    features = []
    if HAS_NEW_ROUTES:
        features.append("Groups, Notifications, LinkedIn OAuth")
    if HAS_WEB3_ROUTES:
        features.append("Web3 Smart Contracts, Polkadot, WebRTC")
    if HAS_SUBSCRIPTION_ROUTES:
        features.append("Subscription & NFT Avatars & Red Packets")
    if HAS_MATCHING_ROUTES:
        features.append("Opportunity Matching")
    if HAS_ADVANCED_ROUTES:
        features.append("WebSocket, MFA, Call Quality Monitor")
    
    if features:
        print(f"   Features: Enhanced ({', '.join(features)})")
    else:
        print(f"   Features: Basic")
    print(f"\n📚 API Documentation: http://localhost:{port}/api/docs")
    print(f"💚 Health Check: http://localhost:{port}/api/health\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
