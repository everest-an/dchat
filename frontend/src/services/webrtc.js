/**
 * WebRTC Service Entry Point
 *
 * Provides a unified interface for WebRTC functionality.
 * Automatically selects the appropriate engine based on configuration.
 * Falls back to native WebRTC if LiveKit module is unavailable.
 */
import webrtcConfig from '../config/webrtc.config'
import NativeWebRTCService from './WebRTCService'

let webrtcService

// Select engine based on configuration
// LiveKit enhanced engine is optional; falls back to native WebRTC
if (webrtcConfig.engine === 'livekit' && webrtcConfig.livekit?.enabled) {
  try {
    const LiveKitService = require('./WebRTCService.enhanced').default
    webrtcService = LiveKitService
  } catch {
    // LiveKit module not available, fall back to native WebRTC
    webrtcService = NativeWebRTCService
  }
} else {
  webrtcService = NativeWebRTCService
}

export default webrtcService
