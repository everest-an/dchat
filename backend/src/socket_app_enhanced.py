"""
Enhanced Socket.IO Application with Production Features
- CORS configuration
- Health checks
- Metrics endpoint
- Graceful shutdown
- Error handling
"""

from aiohttp import web
from socket_server import get_socket_app
import logging
import sys
import os
from datetime import datetime

# Add parent directory to path for config import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'deploy'))

try:
    from socket_io_config import SocketIOConfig
except ImportError:
    # Fallback configuration if config file not found
    class SocketIOConfig:
        HOST = '0.0.0.0'
        PORT = 8001
        CORS_ALLOWED_ORIGINS = ['*']
        LOG_LEVEL = 'INFO'

# Configure logging
logging.basicConfig(
    level=getattr(logging, SocketIOConfig.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Server start time for uptime tracking
START_TIME = datetime.now()

# Get Socket.IO server instance
sio = get_socket_app()

# Create aiohttp application
app = web.Application()

# Attach Socket.IO to aiohttp app
sio.attach(app)

# Health check endpoint
async def health_check(request):
    """
    Health check endpoint for load balancers and monitoring
    Returns 200 OK if server is running
    """
    return web.json_response({
        'status': 'healthy',
        'service': 'socket-io',
        'timestamp': datetime.now().isoformat(),
        'uptime_seconds': (datetime.now() - START_TIME).total_seconds()
    })

# Metrics endpoint
async def metrics(request):
    """
    Metrics endpoint for monitoring
    Returns server statistics
    """
    uptime = (datetime.now() - START_TIME).total_seconds()
    
    return web.json_response({
        'uptime_seconds': uptime,
        'uptime_human': f"{int(uptime // 3600)}h {int((uptime % 3600) // 60)}m",
        'start_time': START_TIME.isoformat(),
        'current_time': datetime.now().isoformat(),
        'version': '1.0.0',
        'environment': os.getenv('ENVIRONMENT', 'production')
    })

# Root endpoint
async def root(request):
    """Root endpoint with server information"""
    return web.json_response({
        'service': 'Dchat Socket.IO Server',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'metrics': '/metrics',
            'socket.io': '/socket.io/'
        }
    })

# CORS middleware
@web.middleware
async def cors_middleware(request, handler):
    """Add CORS headers to all responses"""
    if request.method == 'OPTIONS':
        # Preflight request
        response = web.Response()
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex
    
    # Add CORS headers
    origin = request.headers.get('Origin', '')
    allowed_origins = SocketIOConfig.CORS_ALLOWED_ORIGINS
    
    if '*' in allowed_origins or origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin or '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    return response

# Add middleware
app.middlewares.append(cors_middleware)

# Add routes
app.router.add_get('/', root)
app.router.add_get('/health', health_check)
app.router.add_get('/metrics', metrics)

# Graceful shutdown handler
async def on_shutdown(app):
    """Cleanup on shutdown"""
    logger.info("Shutting down Socket.IO server...")
    # Close all socket connections
    await sio.shutdown()
    logger.info("Socket.IO server shut down successfully")

app.on_shutdown.append(on_shutdown)

# Startup handler
async def on_startup(app):
    """Log startup information"""
    logger.info("=" * 60)
    logger.info("Dchat Socket.IO Server Starting")
    logger.info("=" * 60)
    logger.info(f"Host: {SocketIOConfig.HOST}")
    logger.info(f"Port: {SocketIOConfig.PORT}")
    logger.info(f"CORS Origins: {SocketIOConfig.CORS_ALLOWED_ORIGINS}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'production')}")
    logger.info("=" * 60)

app.on_startup.append(on_startup)

def main():
    """Main entry point"""
    try:
        logger.info(f"Starting Socket.IO server on {SocketIOConfig.HOST}:{SocketIOConfig.PORT}...")
        web.run_app(
            app,
            host=SocketIOConfig.HOST,
            port=SocketIOConfig.PORT,
            access_log=logger
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
