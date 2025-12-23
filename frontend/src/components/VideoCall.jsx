/**
 * Video Call Component
 * 
 * Provides UI for voice and video calls.
 * Integrates with WebRTCService for call management.
 * 
 * Features:
 * - Video preview
 * - Call controls (mute, video, end call)
 * - Screen sharing
 * - Multiple participants
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import React, { useState, useEffect, useRef } from 'react';
import webrtcService from '../services/webrtc';

const VideoCall = ({ callData, onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callData?.type === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  
  useEffect(() => {
    // Setup local video
    if (webrtcService.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webrtcService.localStream;
    }
    
    // Setup remote stream listener
    webrtcService.onRemoteStream = ({ userId, stream }) => {
      setParticipants(prev => {
        if (!prev.find(p => p.userId === userId)) {
          return [...prev, { userId, stream }];
        }
        return prev;
      });
    };
    
    // Setup call ended listener
    webrtcService.onCallEnded = () => {
      if (onEndCall) {
        onEndCall();
      }
    };
    
    // Start call duration timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, [onEndCall]);
  
  useEffect(() => {
    // Update remote video elements
    participants.forEach(({ userId, stream }) => {
      const videoElement = remoteVideosRef.current.get(userId);
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [participants]);
  
  const handleToggleMute = () => {
    const muted = webrtcService.toggleAudio();
    setIsMuted(muted);
  };
  
  const handleToggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
  };
  
  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      alert('Failed to toggle screen share');
    }
  };
  
  const handleEndCall = async () => {
    try {
      await webrtcService.endCall();
      if (onEndCall) {
        onEndCall();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="video-call-container">
      {/* Call Header */}
      <div className="call-header">
        <div className="call-info">
          <h3>{callData?.type === 'video' ? 'Video Call' : 'Voice Call'}</h3>
          <p className="call-duration">{formatDuration(callDuration)}</p>
        </div>
      </div>
      
      {/* Video Grid */}
      <div className={`video-grid ${participants.length > 1 ? 'multi-participant' : 'single-participant'}`}>
        {/* Local Video */}
        <div className="video-container local-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={isVideoEnabled ? '' : 'video-disabled'}
          />
          <div className="video-label">You {isMuted && '(Muted)'}</div>
        </div>
        
        {/* Remote Videos */}
        {participants.map(({ userId }) => (
          <div key={userId} className="video-container remote-video">
            <video
              ref={el => {
                if (el) {
                  remoteVideosRef.current.set(userId, el);
                }
              }}
              autoPlay
              playsInline
            />
            <div className="video-label">{userId}</div>
          </div>
        ))}
      </div>
      
      {/* Call Controls */}
      <div className="call-controls">
        <button
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="icon">{isMuted ? '🔇' : '🔊'}</span>
        </button>
        
        {callData?.type === 'video' && (
          <button
            className={`control-btn ${!isVideoEnabled ? 'active' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
          >
            <span className="icon">{isVideoEnabled ? '📹' : '📷'}</span>
          </button>
        )}
        
        {callData?.type === 'video' && (
          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={handleToggleScreenShare}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <span className="icon">🖥️</span>
          </button>
        )}
        
        <button
          className="control-btn end-call-btn"
          onClick={handleEndCall}
          title="End call"
        >
          <span className="icon">📞</span>
        </button>
      </div>
      
      <style jsx>{`
        .video-call-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }
        
        .call-header {
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          text-align: center;
        }
        
        .call-info h3 {
          margin: 0;
          font-size: 24px;
        }
        
        .call-duration {
          margin: 5px 0 0 0;
          font-size: 18px;
          color: #4CAF50;
        }
        
        .video-grid {
          flex: 1;
          display: grid;
          gap: 10px;
          padding: 10px;
          overflow: auto;
        }
        
        .video-grid.single-participant {
          grid-template-columns: 1fr;
        }
        
        .video-grid.multi-participant {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        .video-container {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }
        
        .video-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .video-container.local-video video {
          transform: scaleX(-1); /* Mirror local video */
        }
        
        .video-container video.video-disabled {
          display: none;
        }
        
        .video-label {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .call-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
        }
        
        .control-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: #333;
          color: white;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .control-btn:hover {
          background: #444;
          transform: scale(1.1);
        }
        
        .control-btn.active {
          background: #f44336;
        }
        
        .end-call-btn {
          background: #f44336;
        }
        
        .end-call-btn:hover {
          background: #d32f2f;
        }
        
        @media (max-width: 768px) {
          .video-grid.multi-participant {
            grid-template-columns: 1fr;
          }
          
          .control-btn {
            width: 50px;
            height: 50px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoCall;
