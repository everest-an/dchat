# Socket.IO Deployment Guide

## Overview
This guide explains how to deploy the Socket.IO real-time messaging backend for Dchat.

## Architecture

### Backend (Socket.IO Server)
- **Location**: `/backend/src/socket_app.py`
- **Port**: 8001
- **Technology**: Python Socket.IO with aiohttp
- **Dependencies**: python-socketio, aiohttp

### Frontend (Socket.IO Client)
- **Location**: `/frontend/src/services/socketService.js`
- **Technology**: socket.io-client
- **Connection**: Connects to backend via WebSocket

## Local Development

### 1. Start Socket.IO Backend
```bash
cd backend/src
python3 socket_app.py
```

The server will run on `http://localhost:8001`

### 2. Start Frontend
```bash
cd frontend
pnpm dev
```

The frontend will connect to `http://localhost:8001` by default.

## Production Deployment

### Option 1: Deploy Backend on Render/Railway/Fly.io

1. **Create a new Python service**
2. **Set build command**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set start command**:
   ```bash
   cd src && python socket_app.py
   ```

4. **Expose port**: 8001

5. **Get deployment URL**: e.g., `https://dchat-socket.onrender.com`

### Option 2: Deploy Backend on Vercel (Serverless)

Note: Socket.IO requires persistent connections, which are not ideal for serverless. Consider using a dedicated server instead.

### Frontend Configuration

Update `.env.production`:
```env
VITE_SOCKET_URL=https://your-socket-server.com
```

## Environment Variables

### Backend
No environment variables required for basic setup.

### Frontend
- `VITE_SOCKET_URL`: Socket.IO server URL (default: `http://localhost:8001`)

## Testing

### Health Check
```bash
curl http://localhost:8001/health
```

Should return: `Socket.IO server is running`

### Test Connection
1. Open browser console
2. Navigate to chat page
3. Check for: `Connected to Socket.IO server`
4. Send a message
5. Check for: `Message sent from {user_id} to room {room_id}`

## Features Implemented

✅ Real-time message delivery
✅ User authentication
✅ Room management (join/leave)
✅ Typing indicators (ready)
✅ Online status tracking
✅ Message persistence (local storage)
✅ Automatic reconnection

## Next Steps

1. Deploy Socket.IO backend to production server
2. Update frontend environment variables
3. Test real-time messaging between multiple users
4. Monitor server logs for errors
5. Scale backend if needed (Redis adapter for multiple instances)

## Troubleshooting

### Connection Failed
- Check if backend is running
- Verify CORS settings in `socket_server.py`
- Check firewall rules
- Verify VITE_SOCKET_URL is correct

### Messages Not Received
- Check browser console for errors
- Verify room_id is consistent
- Check backend logs
- Ensure user is authenticated

### Performance Issues
- Consider using Redis adapter for horizontal scaling
- Enable message compression
- Optimize message payload size
- Use CDN for static assets

## Security Considerations

⚠️ **Important**: Before production deployment:

1. Update CORS settings to allow only your domain
2. Implement proper authentication/authorization
3. Add rate limiting
4. Enable SSL/TLS (wss://)
5. Validate all incoming messages
6. Sanitize user input
7. Monitor for abuse

## Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Python Socket.IO](https://python-socketio.readthedocs.io/)
- [Scaling Socket.IO](https://socket.io/docs/v4/using-multiple-nodes/)
