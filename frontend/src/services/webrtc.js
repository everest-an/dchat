/**
 * WebRTC Service Entry Point
 * 
 * This file provides a unified interface for WebRTC functionality.
 * It automatically selects the appropriate engine based on configuration.
 * 
 * The VideoCall component imports from this file and works with both engines
 * without any code changes.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import webrtcConfig from '../config/webrtc.config';

let webrtcService;

// Select engine based on configuration
if (webrtcConfig.engine === 'livekit' && webrtcConfig.livekit.enabled) {
  console.log('🚀 Using LiveKit engine for WebRTC');
  
  try {
    // Import LiveKit enhanced service
    const LiveKitService = require('./WebRTCService.enhanced').default;
    webrtcService = LiveKitService;
  } catch (error) {
    console.error('❌ Failed to load LiveKit engine:', error);
    
    // Fallback to native if auto-fallback is enabled
    if (webrtcConfig.livekit.autoFallback) {
      console.log('⚠️  Falling back to native WebRTC engine');
      const NativeService = require('./WebRTCService').default;
      webrtcService = NativeService;
    } else {
      throw error;
    }
  }
} else {
  console.log('📡 Using native WebRTC engine');
  const NativeService = require('./WebRTCService').default;
  webrtcService = NativeService;
}

// Export the selected service
export default webrtcService;
