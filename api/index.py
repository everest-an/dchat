import sys
import os

# 将项目根目录添加到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 确保在 Vercel 环境中正确设置了路径
# Vercel 部署时，工作目录是项目根目录，但 Serverless Function 运行时是在 /var/task
# 我们需要确保 Flask 应用能够找到 src 目录

# 导入 Flask 应用实例
from src.main import app

# Vercel Serverless Function 入口
# Vercel 会自动寻找 api/index.py 中的 app 变量
# Flask 应用实例 app 已经从 src.main 导入
# 
# 为了兼容 Vercel 的 Serverless Function，我们不需要在这里运行 app.run()
# Vercel 会使用 WSGI 适配器来运行这个 app 实例

# 确保数据库初始化在 Vercel 运行时也能执行
# 由于 Vercel 每次部署都会重新构建，我们应该在部署脚本中执行一次数据库迁移
# 但为了简单起见，我们保留 app.app_context() 中的 db.create_all()
# 在 Vercel 上，数据库通常是外部托管的，所以 db.create_all() 应该只在首次部署时执行
# 
# 在 Vercel 上，我们应该使用 Vercel Postgres 或其他外部数据库服务
# 假设 DATABASE_URL 环境变量已配置
# 
# 确保 app.app_context() 在 Vercel 运行时被调用
# Vercel 的 WSGI 适配器会处理请求上下文，但数据库初始化需要在应用上下文中
# 
# 为了避免在每次请求时都执行 db.create_all()，我们可以在应用启动时执行一次
# 但在 Serverless 环境中，应用启动的概念是模糊的
# 
# 暂时保留 src.main 中的 db.create_all()，并依赖 Vercel 的部署流程
# 
# 最终 Vercel 会使用这个 app 实例来处理请求
# from src.main import app
