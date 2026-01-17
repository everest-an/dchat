# WebRTC Voice and Video Call Guide

## Overview

dchat.pro now supports real-time voice and video calls using WebRTC technology. This guide explains how to use and integrate the WebRTC functionality.

## Features

### Core Features
- **1-on-1 Calls**: Direct voice or video calls between two users
- **Group Calls**: Multi-participant calls (up to 8 people)
- **Screen Sharing**: Share your screen during video calls
- **Call Quality Monitoring**: Track and report call quality metrics
- **Call History**: View past calls and durations

### Technical Features
- **Peer-to-Peer**: Direct connections between users for low latency
- **NAT Traversal**: STUN servers for firewall/NAT traversal
- **Adaptive Bitrate**: Automatic quality adjustment based on network
- **Echo Cancellation**: Built-in audio echo cancellation
- **Noise Suppression**: Automatic background noise reduction

## Architecture

### Backend Components

1. **WebRTC API** (`/backend/src/routes/webrtc.py`)
   - Call initiation and management
   - Call history and quality reports
   - RESTful API endpoints

2. **Socket.IO Signaling** (`/backend/src/socket_server.py`)
   - WebRTC offer/answer exchange
   - ICE candidate exchange
   - Real-time call notifications

### Frontend Components

1. **WebRTCService** (`/frontend/src/services/WebRTCService.js`)
   - WebRTC connection management
   - Media stream handling
   - Signaling integration

2. **VideoCall Component** (`/frontend/src/components/VideoCall.jsx`)
   - Call UI
   - Video display
   - Call controls

## API Reference

### REST API Endpoints

#### Initiate Call
```http
POST /api/webrtc/call/initiate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "audio" | "video",
  "participants": ["user_id_1", "user_id_2", ...],
  "group_id": "optional_group_id"
}
```

**Response:**
```json
{
  "success": true,
  "call": {
    "call_id": "call_1699...",
    "type": "video",
    "caller_id": "user_123",
    "participants": ["user_123", "user_456"],
    "status": "ringing",
    "started_at": "2024-11-05T10:30:00Z"
  }
}
```

#### Answer Call
```http
POST /api/webrtc/call/<call_id>/answer
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "answer": true | false
}
```

#### End Call
```http
POST /api/webrtc/call/<call_id>/end
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "call": {
    "call_id": "call_1699...",
    "status": "ended",
    "duration": 125.5,
    "ended_at": "2024-11-05T10:32:05Z"
  }
}
```

#### Get Call Details
```http
GET /api/webrtc/call/<call_id>
Authorization: Bearer <jwt_token>
```

#### Get Active Calls
```http
GET /api/webrtc/calls/active
Authorization: Bearer <jwt_token>
```

#### Get Call History
```http
GET /api/webrtc/calls/history?limit=20&offset=0
Authorization: Bearer <jwt_token>
```

#### Report Call Quality
```http
POST /api/webrtc/call/<call_id>/quality
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "video_quality": "good" | "fair" | "poor",
  "audio_quality": "good" | "fair" | "poor",
  "connection_quality": "good" | "fair" | "poor",
  "issues": ["audio_lag", "video_freeze", "connection_drop"]
}
```

### Socket.IO Events

#### Client → Server

**webrtc_offer**: Send WebRTC offer
```javascript
socket.emit('webrtc_offer', {
  call_id: 'call_123',
  offer: sdpOffer,
  to_user_id: 'user_456'
});
```

**webrtc_answer**: Send WebRTC answer
```javascript
socket.emit('webrtc_answer', {
  call_id: 'call_123',
  answer: sdpAnswer,
  to_user_id: 'user_123'
});
```

**webrtc_ice_candidate**: Send ICE candidate
```javascript
socket.emit('webrtc_ice_candidate', {
  call_id: 'call_123',
  candidate: iceCandidate,
  to_user_id: 'user_456'
});
```

**webrtc_call_ringing**: Notify participants
```javascript
socket.emit('webrtc_call_ringing', {
  call_id: 'call_123',
  participants: ['user_123', 'user_456'],
  type: 'video'
});
```

**webrtc_call_accepted**: Notify call accepted
```javascript
socket.emit('webrtc_call_accepted', {
  call_id: 'call_123',
  caller_id: 'user_123'
});
```

**webrtc_call_rejected**: Notify call rejected
```javascript
socket.emit('webrtc_call_rejected', {
  call_id: 'call_123',
  caller_id: 'user_123'
});
```

**webrtc_call_ended**: Notify call ended
```javascript
socket.emit('webrtc_call_ended', {
  call_id: 'call_123',
  participants: ['user_123', 'user_456']
});
```

#### Server → Client

**webrtc_call_ringing**: Incoming call notification
```javascript
socket.on('webrtc_call_ringing', (data) => {
  // data: { call_id, caller_id, type, participants }
  // Show incoming call UI
});
```

**webrtc_offer**: Receive WebRTC offer
```javascript
socket.on('webrtc_offer', (data) => {
  // data: { call_id, offer, from_user_id }
  // Handle offer and send answer
});
```

**webrtc_answer**: Receive WebRTC answer
```javascript
socket.on('webrtc_answer', (data) => {
  // data: { call_id, answer, from_user_id }
  // Set remote description
});
```

**webrtc_ice_candidate**: Receive ICE candidate
```javascript
socket.on('webrtc_ice_candidate', (data) => {
  // data: { call_id, candidate, from_user_id }
  // Add ICE candidate
});
```

**webrtc_call_accepted**: Call accepted notification
```javascript
socket.on('webrtc_call_accepted', (data) => {
  // data: { call_id, user_id }
  // Start call
});
```

**webrtc_call_rejected**: Call rejected notification
```javascript
socket.on('webrtc_call_rejected', (data) => {
  // data: { call_id, user_id }
  // Show rejection message
});
```

**webrtc_call_ended**: Call ended notification
```javascript
socket.on('webrtc_call_ended', (data) => {
  // data: { call_id, ended_by }
  // Cleanup and close call UI
});
```

## Usage Examples

### Frontend Integration

#### Initiate a Call
```javascript
import webrtcService from './services/WebRTCService';

// Initiate video call
const callData = await webrtcService.initiateCall({
  type: 'video',
  participants: ['user_456', 'user_789']
});

console.log('Call initiated:', callData.call_id);
```

#### Answer a Call
```javascript
// Listen for incoming calls
webrtcService.onIncomingCall = (data) => {
  const { call_id, caller_id, type } = data;
  
  // Show incoming call UI
  showIncomingCallDialog({
    callId: call_id,
    callerId: caller_id,
    type: type,
    onAccept: () => webrtcService.answerCall(call_id, true),
    onReject: () => webrtcService.answerCall(call_id, false)
  });
};
```

#### Handle Remote Stream
```javascript
// Listen for remote streams
webrtcService.onRemoteStream = ({ userId, stream }) => {
  // Display remote video
  const videoElement = document.getElementById(`video-${userId}`);
  videoElement.srcObject = stream;
};
```

#### End a Call
```javascript
// End the current call
await webrtcService.endCall();
```

#### Toggle Audio/Video
```javascript
// Mute/unmute audio
const isMuted = webrtcService.toggleAudio();

// Enable/disable video
const isVideoEnabled = webrtcService.toggleVideo();
```

#### Screen Sharing
```javascript
// Start screen sharing
const screenStream = await webrtcService.startScreenShare();

// Stop screen sharing
webrtcService.stopScreenShare();
```

### React Component Example

```jsx
import React, { useState } from 'react';
import webrtcService from '../services/WebRTCService';
import VideoCall from '../components/VideoCall';

function ChatPage() {
  const [activeCall, setActiveCall] = useState(null);
  
  const handleStartCall = async (userId, type = 'video') => {
    try {
      const callData = await webrtcService.initiateCall({
        type,
        participants: [userId]
      });
      setActiveCall(callData);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };
  
  const handleEndCall = () => {
    setActiveCall(null);
  };
  
  return (
    <div>
      {/* Chat UI */}
      <button onClick={() => handleStartCall('user_456', 'video')}>
        Start Video Call
      </button>
      
      {/* Video Call UI */}
      {activeCall && (
        <VideoCall
          callData={activeCall}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );
}
```

## Configuration

### STUN/TURN Servers

The default configuration uses Google's public STUN servers. For production, consider using your own TURN servers for better reliability.

```javascript
// In WebRTCService.js
this.rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

### Media Constraints

Customize audio and video quality:

```javascript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000
  },
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    facingMode: 'user'
  }
};
```

## Troubleshooting

### Common Issues

**1. No audio/video**
- Check browser permissions
- Ensure microphone/camera are not in use by other apps
- Verify getUserMedia() is called over HTTPS

**2. Connection fails**
- Check firewall settings
- Verify STUN/TURN servers are accessible
- Check network connectivity

**3. Poor call quality**
- Check network bandwidth
- Reduce video resolution
- Close other bandwidth-intensive applications

**4. Echo or feedback**
- Ensure echo cancellation is enabled
- Use headphones instead of speakers
- Check microphone placement

### Debug Mode

Enable WebRTC debug logs:

```javascript
// In browser console
localStorage.setItem('debug', 'webrtc:*');
```

### Quality Metrics

Monitor call quality:

```javascript
const stats = await peerConnection.getStats();
stats.forEach(report => {
  if (report.type === 'inbound-rtp') {
    console.log('Packets received:', report.packetsReceived);
    console.log('Packets lost:', report.packetsLost);
    console.log('Jitter:', report.jitter);
  }
});
```

## Security

### Best Practices

1. **Always use HTTPS**: WebRTC requires secure context
2. **Authenticate users**: Verify JWT tokens before allowing calls
3. **Validate permissions**: Check user permissions for group calls
4. **Rate limiting**: Prevent call spam
5. **Encrypt signaling**: Use WSS (WebSocket Secure) for Socket.IO

### Privacy

- All media streams are peer-to-peer (not routed through server)
- Signaling data is encrypted with TLS
- No call recording without explicit user consent
- Call history is stored securely with encryption

## Performance Optimization

### Tips for Better Performance

1. **Use adaptive bitrate**: Automatically adjust quality based on network
2. **Implement simulcast**: Send multiple quality streams for group calls
3. **Enable hardware acceleration**: Use GPU for video encoding/decoding
4. **Optimize UI**: Use CSS transforms for video elements
5. **Lazy load**: Only initialize WebRTC when needed

### Recommended Settings

**For Mobile:**
```javascript
{
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 }
  }
}
```

**For Desktop:**
```javascript
{
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}
```

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 74+ | ✅ Full |
| Firefox | 66+ | ✅ Full |
| Safari | 12+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| Opera | 62+ | ✅ Full |
| Mobile Safari | 12+ | ✅ Full |
| Chrome Android | 74+ | ✅ Full |

## Future Enhancements

### Planned Features

- [ ] Call recording
- [ ] Virtual backgrounds
- [ ] Noise cancellation AI
- [ ] Live transcription
- [ ] Picture-in-picture mode
- [ ] Call analytics dashboard
- [ ] SFU (Selective Forwarding Unit) for large groups
- [ ] End-to-end encryption (E2EE)

## Support

For issues or questions:
- GitHub Issues: https://github.com/everest-an/dchat/issues
- Documentation: https://dchat.pro/docs
- Email: support@dchat.pro

## License

MIT License - See LICENSE file for details

---

**Last Updated**: November 5, 2024  
**Version**: 1.0.0  
**Author**: Manus AI
