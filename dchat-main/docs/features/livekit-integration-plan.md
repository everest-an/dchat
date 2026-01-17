# LiveKit Integration Plan for Dchat

## Overview

Integrating LiveKit as the WebRTC solution for Dchat's audio/video calling features. LiveKit is a production-ready, open-source platform that provides scalable real-time video, audio, and data capabilities.

## Why LiveKit?

**Advantages over building from scratch:**
- Production-ready quality (15.6k GitHub stars)
- Complete React SDK with UI components
- Self-hostable (open source)
- Automatic quality adaptation
- Built-in TURN server support
- Screen sharing, recording, and advanced features
- Active development and community support
- 2-3 days integration vs 10+ days custom development

## Architecture

### Current Dchat Stack
```
Frontend (React) → Socket.IO → Backend (Flask) → Custom WebRTC
```

### New Stack with LiveKit
```
Frontend (React) → LiveKit React SDK → LiveKit Server → Media Routing
                ↓
         Backend (Flask) → Token Generation
```

## Implementation Phases

### Phase 1: Backend Setup (Day 1)

#### 1.1 Deploy LiveKit Server
```bash
# Using Docker
docker run -d \
  --name livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server:latest
```

#### 1.2 Create LiveKit Service (Python)
```python
# backend/src/services/livekit_service.py
from livekit import api
import os

class LiveKitService:
    def __init__(self):
        self.api_key = os.getenv('LIVEKIT_API_KEY', 'devkey')
        self.api_secret = os.getenv('LIVEKIT_API_SECRET', 'secret')
        self.url = os.getenv('LIVEKIT_URL', 'ws://localhost:7880')
    
    def create_token(self, room_name, participant_name, metadata=None):
        """Generate access token for LiveKit room"""
        token = api.AccessToken(self.api_key, self.api_secret)
        token.with_identity(participant_name)
        token.with_name(participant_name)
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        ))
        if metadata:
            token.with_metadata(metadata)
        return token.to_jwt()
```

#### 1.3 Create API Endpoints
```python
# backend/src/routes/livekit_routes.py
@livekit_bp.route('/token', methods=['POST'])
@jwt_required()
def create_room_token():
    """
    Create LiveKit access token
    
    Request:
        {
            "room_name": "call_123",
            "participant_name": "user_456"
        }
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    room_name = data.get('room_name')
    participant_name = data.get('participant_name', user_id)
    
    token = livekit_service.create_token(room_name, participant_name)
    
    return jsonify({
        'token': token,
        'url': livekit_service.url
    })
```

### Phase 2: Frontend Integration (Day 2)

#### 2.1 Install Dependencies
```bash
npm install @livekit/components-react livekit-client
```

#### 2.2 Create LiveKit Call Component
```jsx
// frontend/src/components/LiveKitCall.jsx
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

function LiveKitCall({ roomName, onDisconnect }) {
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);

  useEffect(() => {
    // Fetch token from backend
    api.post('/api/livekit/token', {
      room_name: roomName,
      participant_name: currentUser.name
    }).then(response => {
      setToken(response.data.token);
      setServerUrl(response.data.url);
    });
  }, [roomName]);

  if (!token || !serverUrl) {
    return <LoadingSpinner />;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={onDisconnect}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

#### 2.3 Update Call Initiation Flow
```jsx
// Integrate with existing chat interface
const handleStartCall = async (type) => {
  const roomName = `call_${Date.now()}_${currentUser.id}`;
  
  // Notify other participants via Socket.IO
  socket.emit('call:initiate', {
    room_name: roomName,
    call_type: type, // 'audio' or 'video'
    participants: selectedUsers
  });
  
  // Open call dialog
  setCallDialog({
    open: true,
    roomName: roomName,
    type: type
  });
};
```

### Phase 3: Features & Polish (Day 3)

#### 3.1 Incoming Call UI
```jsx
// frontend/src/components/IncomingCallDialog.jsx
function IncomingCallDialog({ caller, roomName, callType, onAccept, onReject }) {
  return (
    <Dialog open fullScreen>
      <Avatar src={caller.avatar} />
      <Typography>{caller.name} is calling...</Typography>
      <CallTypeIcon type={callType} />
      
      <Button onClick={() => onAccept(roomName)}>Accept</Button>
      <Button onClick={onReject}>Decline</Button>
    </Dialog>
  );
}
```

#### 3.2 Custom Controls
```jsx
// Add custom controls to LiveKit room
<LiveKitRoom>
  <VideoConference>
    <ControlBar>
      <TrackToggle source="camera" />
      <TrackToggle source="microphone" />
      <ScreenShareButton />
      <DisconnectButton />
    </ControlBar>
  </VideoConference>
</LiveKitRoom>
```

#### 3.3 Mobile Optimization
- Responsive layout for small screens
- Touch-friendly controls
- Battery optimization
- Background call support (future: CallKit/ConnectionService)

## Configuration

### Environment Variables

**Backend (.env)**
```bash
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

**Frontend (.env)**
```bash
REACT_APP_LIVEKIT_URL=wss://your-livekit-server.com
```

### Production Deployment

#### Option 1: Self-Hosted
```yaml
# docker-compose.yml
version: '3.9'
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    environment:
      - LIVEKIT_KEYS=${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
```

#### Option 2: LiveKit Cloud
- Sign up at https://cloud.livekit.io
- Free tier: 10,000 participant minutes/month
- Get API credentials
- Update environment variables

## Migration from Current Implementation

### Keep
- Call initiation flow (Socket.IO notifications)
- Call history and metadata storage
- User presence and status
- Integration with chat interface

### Replace
- WebRTC peer connection logic → LiveKit SDK
- Manual media stream handling → LiveKit components
- Custom signaling → LiveKit signaling
- VideoCall component → LiveKitCall component

### Remove
- `frontend/src/services/WebRTCService.js` (replaced by LiveKit SDK)
- Custom WebRTC handlers in socket_server.py (keep call notifications)
- `backend/src/routes/webrtc.py` (partially replaced)

## Testing Plan

### Unit Tests
- Token generation
- API endpoint responses
- Component rendering

### Integration Tests
- 1-on-1 call flow
- Group call (3+ participants)
- Screen sharing
- Call reconnection
- Device switching

### Cross-Platform Tests
- Chrome, Firefox, Safari, Edge
- iOS Safari, Android Chrome
- Desktop and mobile layouts

## Success Metrics

- **Connection Success Rate**: > 95%
- **Time to First Frame**: < 2 seconds
- **Call Quality**: Automatic adaptation to network conditions
- **User Experience**: Professional UI with minimal latency

## Timeline

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1 | Backend setup, Docker deployment, API integration | Working token generation |
| 2 | Frontend SDK integration, basic call UI | 1-on-1 calls working |
| 3 | Group calls, screen sharing, polish, testing | Production-ready feature |

## Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [React Components Guide](https://docs.livekit.io/guides/room/react/)
- [Server SDK (Python)](https://github.com/livekit/python-sdks)
- [Self-Hosting Guide](https://docs.livekit.io/deploy/)

## Next Steps

1. Deploy LiveKit server (Docker)
2. Install Python SDK: `pip install livekit`
3. Create token generation service
4. Test token generation
5. Install React SDK: `npm install @livekit/components-react`
6. Build basic call component
7. Test end-to-end call flow
8. Polish UI and add features
9. Deploy to production
10. Update documentation
