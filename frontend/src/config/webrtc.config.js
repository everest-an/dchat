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
      width: { ideal: 1280, min: 320 },
      height: { ideal: 720, min: 180 },
      frameRate: { ideal: 30, min: 15 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
    }
  },

  // Adaptive bitrate configuration
  adaptiveBitrate: {
    enabled: true,
    tiers: {
      high:   { maxBitrate: 2_500_000, width: 1280, height: 720, fps: 30 },
      medium: { maxBitrate: 1_000_000, width: 640,  height: 360, fps: 24 },
      low:    { maxBitrate:   350_000, width: 320,  height: 180, fps: 15 },
    },
    downgradeThreshold: 0.75,
    upgradeThreshold: 1.25,
    probeIntervalMs: 3000,
  },

  // Network quality monitoring
  networkQuality: {
    enabled: true,
    sampleIntervalMs: 2000,
    rttThresholds: { excellent: 100, good: 200, fair: 400 },
    lossThresholds: { excellent: 0.5, good: 2, fair: 5 },
  },
};

export default webrtcConfig;
