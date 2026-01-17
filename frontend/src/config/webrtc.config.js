/**
 * WebRTC Configuration
 * 
 * Controls which WebRTC engine to use for audio/video calls.
 * 
 * Engines:
 * - 'livekit': Production-grade, uses LiveKit (recommended)
 * - 'native': Original implementation, uses native WebRTC
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

const webrtcConfig = {
  // Engine selection: 'livekit' or 'native'
  engine: process.env.REACT_APP_WEBRTC_ENGINE || 'livekit',
  
  // LiveKit configuration
  livekit: {
    enabled: true,
    // Server URL will be fetched from backend
    autoFallback: true, // Fallback to native if LiveKit fails
  },
  
  // Native WebRTC configuration
  native: {
    enabled: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  },
  
  // Feature flags
  features: {
    screenShare: true,
    recording: false, // Coming soon
    virtualBackground: false, // Coming soon
    noiseCancellation: true,
    echoCancellation: true
  },
  
  // Quality settings
  quality: {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }
};

export default webrtcConfig;
