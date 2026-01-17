"""
Socket.IO Application Entry Point
Runs the Socket.IO server with aiohttp
"""

from aiohttp import web
from socket_server import get_socket_app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Socket.IO server instance
sio = get_socket_app()

# Create aiohttp application
app = web.Application()

# Attach Socket.IO to aiohttp app
sio.attach(app)

# Add health check endpoint
async def health_check(request):
    """Health check endpoint"""
    return web.Response(text="Socket.IO server is running")

app.router.add_get('/health', health_check)

if __name__ == '__main__':
    logger.info("Starting Socket.IO server on port 8001...")
    web.run_app(app, host='0.0.0.0', port=8001)
