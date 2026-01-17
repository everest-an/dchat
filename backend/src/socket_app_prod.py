"""
Production Socket.IO Application Entry Point
Runs the Socket.IO server with aiohttp and proper lifecycle management
"""

from aiohttp import web
import logging
import signal
import sys
from src.socket_server_production import get_socket_app, startup, shutdown

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/dchat/socket.log')
    ]
)
logger = logging.getLogger(__name__)

# Get Socket.IO server instance
sio = get_socket_app()

# Create aiohttp application
app = web.Application()

# Attach Socket.IO to aiohttp app
sio.attach(app)


# Health check endpoint
async def health_check(request):
    """Health check endpoint"""
    return web.json_response({
        'status': 'ok',
        'service': 'socket.io',
        'message': 'Socket.IO server is running'
    })


# Metrics endpoint
async def metrics(request):
    """Metrics endpoint for monitoring"""
    # TODO: Add Prometheus metrics
    return web.json_response({
        'status': 'ok',
        'metrics': {
            'active_connections': 0,  # TODO: Get from Socket.IO
            'messages_sent': 0,  # TODO: Get from Redis
        }
    })


app.router.add_get('/health', health_check)
app.router.add_get('/metrics', metrics)


# Startup and shutdown handlers
async def on_startup(app):
    """Initialize connections on startup"""
    logger.info("Starting Socket.IO server...")
    await startup()
    logger.info("Socket.IO server started successfully")


async def on_shutdown(app):
    """Close connections on shutdown"""
    logger.info("Shutting down Socket.IO server...")
    await shutdown()
    logger.info("Socket.IO server shut down successfully")


app.on_startup.append(on_startup)
app.on_shutdown.append(on_shutdown)


# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


if __name__ == '__main__':
    import os
    
    host = os.environ.get('SOCKET_HOST', '0.0.0.0')
    port = int(os.environ.get('SOCKET_PORT', 5000))
    
    logger.info(f"Starting Socket.IO server on {host}:{port}...")
    
    web.run_app(
        app,
        host=host,
        port=port,
        access_log=logger,
        access_log_format='%a %t "%r" %s %b "%{Referer}i" "%{User-Agent}i"'
    )
