/**
 * WebRTC Service
 * 
 * Handles voice and video calls using WebRTC.
 * Integrates with Socket.IO for signaling.
 * 
 * Features:
 * - 1-on-1 voice/video calls
 * - Group calls (up to 8 participants)
 * - Screen sharing
 * - Call quality monitoring
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import socketService from './socketService';
import api from './api';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // call_id -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map(); // user_id -> MediaStream
    this.currentCall = null;
    
    // WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
    
    // Event listeners
    this.onIncomingCall = null;
    this.onCallAccepted = null;
    this.onCallRejected = null;
    this.onCallEnded = null;
    this.onRemoteStream = null;
    this.onParticipantJoined = null;
    this.onParticipantLeft = null;
    
    this._setupSocketListeners();
  }
  
  /**
   * Setup Socket.IO event listeners for WebRTC signaling
   * @private
   */
  _setupSocketListeners() {
    // Listen for incoming call
    socketService.on('webrtc_call_ringing', (data) => {
      if (this.onIncomingCall) {
        this.onIncomingCall(data);
      }
    });
    
    // Listen for call accepted
    socketService.on('webrtc_call_accepted', (data) => {
      if (this.onCallAccepted) {
        this.onCallAccepted(data);
      }
    });
    
    // Listen for call rejected
    socketService.on('webrtc_call_rejected', (data) => {
      if (this.onCallRejected) {
        this.onCallRejected(data);
      }
    });
    
    // Listen for call ended
    socketService.on('webrtc_call_ended', (data) => {
      this._handleCallEnded(data);
    });
    
    // Listen for WebRTC offer
    socketService.on('webrtc_offer', async (data) => {
      await this._handleOffer(data);
    });
    
    // Listen for WebRTC answer
    socketService.on('webrtc_answer', async (data) => {
      await this._handleAnswer(data);
    });
    
    // Listen for ICE candidate
    socketService.on('webrtc_ice_candidate', async (data) => {
      await this._handleIceCandidate(data);
    });
  }
  
  /**
   * Initiate a new call
   * @param {Object} options - Call options
   * @param {string} options.type - 'audio' or 'video'
   * @param {Array<string>} options.participants - List of participant user IDs
   * @param {string} [options.groupId] - Optional group ID
   * @returns {Promise<Object>} Call data
   */
  async initiateCall({ type = 'audio', participants, groupId }) {
    try {
      // Request media permissions
      const stream = await this.getLocalStream(type === 'video');
      this.localStream = stream;
      
      // Call backend API to create call
      const response = await api.post('/webrtc/call/initiate', {
        type,
        participants,
        group_id: groupId
      });
      
      const callData = response.data.call;
      this.currentCall = callData;
      
      // Notify participants via Socket.IO
      socketService.emit('webrtc_call_ringing', {
        call_id: callData.call_id,
        participants: callData.participants,
        type: callData.type
      });
      
      return callData;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }
  
  /**
   * Answer an incoming call
   * @param {string} callId - Call ID
   * @param {boolean} accept - Accept or reject
   * @returns {Promise<void>}
   */
  async answerCall(callId, accept = true) {
    try {
      // Call backend API
      await api.post(`/webrtc/call/${callId}/answer`, {
        answer: accept
      });
      
      if (accept) {
        // Get call data
        const response = await api.get(`/webrtc/call/${callId}`);
        const callData = response.data.call;
        this.currentCall = callData;
        
        // Request media permissions
        const stream = await this.getLocalStream(callData.type === 'video');
        this.localStream = stream;
        
        // Notify caller via Socket.IO
        socketService.emit('webrtc_call_accepted', {
          call_id: callId,
          caller_id: callData.caller_id
        });
        
        // Create peer connection and send answer
        await this._createPeerConnection(callId, callData.caller_id);
      } else {
        // Notify caller via Socket.IO
        const response = await api.get(`/webrtc/call/${callId}`);
        const callData = response.data.call;
        
        socketService.emit('webrtc_call_rejected', {
          call_id: callId,
          caller_id: callData.caller_id
        });
      }
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }
  
  /**
   * End the current call
   * @returns {Promise<void>}
   */
  async endCall() {
    try {
      if (!this.currentCall) {
        return;
      }
      
      const callId = this.currentCall.call_id;
      const participants = this.currentCall.participants;
      
      // Call backend API
      await api.post(`/webrtc/call/${callId}/end`);
      
      // Notify participants via Socket.IO
      socketService.emit('webrtc_call_ended', {
        call_id: callId,
        participants
      });
      
      // Cleanup
      this._cleanup();
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }
  
  /**
   * Get local media stream
   * @param {boolean} video - Include video
   * @returns {Promise<MediaStream>}
   */
  async getLocalStream(video = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }
  
  /**
   * Toggle audio mute
   * @returns {boolean} New mute state
   */
  toggleAudio() {
    if (!this.localStream) {
      return false;
    }
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // Return muted state
    }
    
    return false;
  }
  
  /**
   * Toggle video
   * @returns {boolean} New video state
   */
  toggleVideo() {
    if (!this.localStream) {
      return false;
    }
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    
    return false;
  }
  
  /**
   * Start screen sharing
   * @returns {Promise<MediaStream>}
   */
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });
      
      // Replace video track in peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Handle screen share stop
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
      
      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }
  
  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    if (!this.localStream) {
      return;
    }
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    });
  }
  
  /**
   * Report call quality
   * @param {string} callId - Call ID
   * @param {Object} quality - Quality metrics
   * @returns {Promise<void>}
   */
  async reportCallQuality(callId, quality) {
    try {
      await api.post(`/webrtc/call/${callId}/quality`, quality);
    } catch (error) {
      console.error('Error reporting call quality:', error);
    }
  }
  
  /**
   * Create peer connection
   * @private
   * @param {string} callId - Call ID
   * @param {string} userId - Remote user ID
   * @returns {Promise<RTCPeerConnection>}
   */
  async _createPeerConnection(callId, userId) {
    const pc = new RTCPeerConnection(this.rtcConfiguration);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc_ice_candidate', {
          call_id: callId,
          candidate: event.candidate,
          to_user_id: userId
        });
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      if (this.onRemoteStream) {
        this.onRemoteStream({ userId, stream: remoteStream });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        // Attempt to restart ICE
        pc.restartIce();
      }
    };
    
    // Store peer connection
    this.peerConnections.set(userId, pc);
    
    return pc;
  }
  
  /**
   * Handle incoming WebRTC offer
   * @private
   * @param {Object} data - Offer data
   */
  async _handleOffer(data) {
    try {
      const { call_id, offer, from_user_id } = data;
      
      // Create peer connection
      const pc = await this._createPeerConnection(call_id, from_user_id);
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer via Socket.IO
      socketService.emit('webrtc_answer', {
        call_id,
        answer,
        to_user_id: from_user_id
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }
  
  /**
   * Handle incoming WebRTC answer
   * @private
   * @param {Object} data - Answer data
   */
  async _handleAnswer(data) {
    try {
      const { call_id, answer, from_user_id } = data;
      
      const pc = this.peerConnections.get(from_user_id);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }
  
  /**
   * Handle incoming ICE candidate
   * @private
   * @param {Object} data - ICE candidate data
   */
  async _handleIceCandidate(data) {
    try {
      const { call_id, candidate, from_user_id } = data;
      
      const pc = this.peerConnections.get(from_user_id);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }
  
  /**
   * Handle call ended
   * @private
   * @param {Object} data - Call ended data
   */
  _handleCallEnded(data) {
    this._cleanup();
    
    if (this.onCallEnded) {
      this.onCallEnded(data);
    }
  }
  
  /**
   * Cleanup resources
   * @private
   */
  _cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    
    // Clear remote streams
    this.remoteStreams.clear();
    
    // Clear current call
    this.currentCall = null;
  }
}

export default new WebRTCService();
