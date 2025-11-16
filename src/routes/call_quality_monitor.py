"""
Call Quality Monitoring System

Monitors and tracks WebRTC call quality metrics:
- Bandwidth usage
- Packet loss
- Latency (RTT)
- Jitter
- Audio/Video codec information
- Connection state

Provides analytics and alerts for poor call quality.

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import logging
import json

from src.models.user import User, db

logger = logging.getLogger(__name__)

call_quality_bp = APIRouter(prefix="/api/call-quality", tags=["Call Quality"])


class CallQualityLevel(str, Enum):
    """Call quality levels"""
    EXCELLENT = "excellent"  # RTT < 50ms, packet loss < 0.5%
    GOOD = "good"            # RTT < 100ms, packet loss < 2%
    FAIR = "fair"            # RTT < 200ms, packet loss < 5%
    POOR = "poor"            # RTT > 200ms, packet loss > 5%
    DISCONNECTED = "disconnected"


class CallQualityMetrics:
    """Call quality metrics data class"""
    
    def __init__(self, call_id: str, user_id: int):
        self.call_id = call_id
        self.user_id = user_id
        self.timestamp = datetime.utcnow()
        
        # Network metrics
        self.rtt_ms = 0  # Round trip time in milliseconds
        self.jitter_ms = 0  # Jitter in milliseconds
        self.packet_loss_percent = 0.0  # Packet loss percentage
        self.bandwidth_kbps = 0  # Bandwidth in kilobits per second
        
        # Audio metrics
        self.audio_codec = None
        self.audio_bitrate_kbps = 0
        self.audio_sample_rate = 0
        
        # Video metrics
        self.video_codec = None
        self.video_bitrate_kbps = 0
        self.video_resolution = None
        self.video_framerate = 0
        
        # Connection metrics
        self.connection_state = "connected"
        self.ice_candidate_pair = None
        self.bytes_sent = 0
        self.bytes_received = 0
        
        # Quality assessment
        self.quality_level = self._assess_quality()
    
    def _assess_quality(self) -> CallQualityLevel:
        """Assess overall call quality based on metrics"""
        if self.connection_state != "connected":
            return CallQualityLevel.DISCONNECTED
        
        # Score based on RTT and packet loss
        if self.rtt_ms < 50 and self.packet_loss_percent < 0.5:
            return CallQualityLevel.EXCELLENT
        elif self.rtt_ms < 100 and self.packet_loss_percent < 2:
            return CallQualityLevel.GOOD
        elif self.rtt_ms < 200 and self.packet_loss_percent < 5:
            return CallQualityLevel.FAIR
        else:
            return CallQualityLevel.POOR
    
    def to_dict(self) -> Dict:
        """Convert metrics to dictionary"""
        return {
            'call_id': self.call_id,
            'user_id': self.user_id,
            'timestamp': self.timestamp.isoformat(),
            'network': {
                'rtt_ms': self.rtt_ms,
                'jitter_ms': self.jitter_ms,
                'packet_loss_percent': self.packet_loss_percent,
                'bandwidth_kbps': self.bandwidth_kbps
            },
            'audio': {
                'codec': self.audio_codec,
                'bitrate_kbps': self.audio_bitrate_kbps,
                'sample_rate': self.audio_sample_rate
            },
            'video': {
                'codec': self.video_codec,
                'bitrate_kbps': self.video_bitrate_kbps,
                'resolution': self.video_resolution,
                'framerate': self.video_framerate
            },
            'connection': {
                'state': self.connection_state,
                'ice_candidate_pair': self.ice_candidate_pair,
                'bytes_sent': self.bytes_sent,
                'bytes_received': self.bytes_received
            },
            'quality_level': self.quality_level.value
        }


class CallQualityMonitor:
    """Monitors call quality metrics"""
    
    def __init__(self):
        # Store metrics for active calls: {call_id: [metrics]}
        self.call_metrics: Dict[str, List[CallQualityMetrics]] = {}
        # Store call sessions: {call_id: {user_ids, start_time, end_time}}
        self.call_sessions: Dict[str, Dict] = {}
        # Store quality alerts
        self.quality_alerts: List[Dict] = []
    
    def start_call(self, call_id: str, user_ids: List[int]):
        """Start monitoring a call"""
        self.call_sessions[call_id] = {
            'user_ids': user_ids,
            'start_time': datetime.utcnow(),
            'end_time': None,
            'status': 'active'
        }
        self.call_metrics[call_id] = []
        
        logger.info(f"Started monitoring call {call_id} with users {user_ids}")
    
    def end_call(self, call_id: str):
        """End monitoring a call"""
        if call_id in self.call_sessions:
            self.call_sessions[call_id]['end_time'] = datetime.utcnow()
            self.call_sessions[call_id]['status'] = 'completed'
            
            logger.info(f"Ended monitoring call {call_id}")
    
    def record_metrics(self, metrics: CallQualityMetrics):
        """Record call quality metrics"""
        call_id = metrics.call_id
        
        if call_id not in self.call_metrics:
            self.call_metrics[call_id] = []
        
        self.call_metrics[call_id].append(metrics)
        
        # Check for quality issues
        if metrics.quality_level in [CallQualityLevel.POOR, CallQualityLevel.DISCONNECTED]:
            self._create_quality_alert(metrics)
    
    def _create_quality_alert(self, metrics: CallQualityMetrics):
        """Create quality alert for poor metrics"""
        alert = {
            'call_id': metrics.call_id,
            'user_id': metrics.user_id,
            'timestamp': datetime.utcnow().isoformat(),
            'quality_level': metrics.quality_level.value,
            'rtt_ms': metrics.rtt_ms,
            'packet_loss_percent': metrics.packet_loss_percent,
            'message': f"Poor call quality detected: {metrics.quality_level.value}"
        }
        
        self.quality_alerts.append(alert)
        logger.warning(f"Quality alert: {alert['message']} for call {metrics.call_id}")
    
    def get_call_metrics(self, call_id: str) -> List[Dict]:
        """Get all metrics for a call"""
        if call_id not in self.call_metrics:
            return []
        
        return [m.to_dict() for m in self.call_metrics[call_id]]
    
    def get_call_summary(self, call_id: str) -> Dict:
        """Get summary statistics for a call"""
        if call_id not in self.call_metrics or not self.call_metrics[call_id]:
            return None
        
        metrics_list = self.call_metrics[call_id]
        
        # Calculate averages
        avg_rtt = sum(m.rtt_ms for m in metrics_list) / len(metrics_list)
        avg_jitter = sum(m.jitter_ms for m in metrics_list) / len(metrics_list)
        avg_packet_loss = sum(m.packet_loss_percent for m in metrics_list) / len(metrics_list)
        avg_bandwidth = sum(m.bandwidth_kbps for m in metrics_list) / len(metrics_list)
        
        # Get quality distribution
        quality_dist = {}
        for m in metrics_list:
            level = m.quality_level.value
            quality_dist[level] = quality_dist.get(level, 0) + 1
        
        session = self.call_sessions.get(call_id, {})
        
        return {
            'call_id': call_id,
            'user_ids': session.get('user_ids', []),
            'start_time': session.get('start_time', '').isoformat() if session.get('start_time') else None,
            'end_time': session.get('end_time', '').isoformat() if session.get('end_time') else None,
            'duration_seconds': self._calculate_duration(call_id),
            'metrics_count': len(metrics_list),
            'network': {
                'avg_rtt_ms': round(avg_rtt, 2),
                'avg_jitter_ms': round(avg_jitter, 2),
                'avg_packet_loss_percent': round(avg_packet_loss, 2),
                'avg_bandwidth_kbps': round(avg_bandwidth, 2)
            },
            'quality_distribution': quality_dist,
            'quality_alerts': len([a for a in self.quality_alerts if a['call_id'] == call_id])
        }
    
    def _calculate_duration(self, call_id: str) -> int:
        """Calculate call duration in seconds"""
        session = self.call_sessions.get(call_id)
        if not session:
            return 0
        
        start = session.get('start_time')
        end = session.get('end_time') or datetime.utcnow()
        
        if start:
            return int((end - start).total_seconds())
        
        return 0
    
    def get_quality_alerts(self, limit: int = 100) -> List[Dict]:
        """Get recent quality alerts"""
        return self.quality_alerts[-limit:]
    
    def get_user_call_history(self, user_id: int, limit: int = 20) -> List[Dict]:
        """Get call history for a user"""
        history = []
        
        for call_id, session in self.call_sessions.items():
            if user_id in session.get('user_ids', []):
                summary = self.get_call_summary(call_id)
                if summary:
                    history.append(summary)
        
        # Sort by start time, newest first
        history.sort(
            key=lambda x: x['start_time'] or '',
            reverse=True
        )
        
        return history[:limit]


# Global monitor instance
call_quality_monitor = CallQualityMonitor()


# API Endpoints

@call_quality_bp.post('/metrics')
async def record_call_metrics(metrics_data: dict):
    """
    Record call quality metrics from client
    
    Request Body:
        {
            "call_id": "call_123",
            "user_id": 1,
            "rtt_ms": 45,
            "jitter_ms": 5,
            "packet_loss_percent": 0.2,
            "bandwidth_kbps": 2500,
            "audio": {
                "codec": "opus",
                "bitrate_kbps": 128,
                "sample_rate": 48000
            },
            "video": {
                "codec": "vp8",
                "bitrate_kbps": 2000,
                "resolution": "1280x720",
                "framerate": 30
            },
            "connection": {
                "state": "connected",
                "ice_candidate_pair": "srflx:host",
                "bytes_sent": 1000000,
                "bytes_received": 900000
            }
        }
    
    Returns:
        JSON response with metrics recorded
    """
    try:
        call_id = metrics_data.get('call_id')
        user_id = metrics_data.get('user_id')
        
        if not call_id or not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing call_id or user_id'
            )
        
        # Create metrics object
        metrics = CallQualityMetrics(call_id, user_id)
        
        # Update from request data
        metrics.rtt_ms = metrics_data.get('rtt_ms', 0)
        metrics.jitter_ms = metrics_data.get('jitter_ms', 0)
        metrics.packet_loss_percent = metrics_data.get('packet_loss_percent', 0)
        metrics.bandwidth_kbps = metrics_data.get('bandwidth_kbps', 0)
        
        # Audio metrics
        audio_data = metrics_data.get('audio', {})
        metrics.audio_codec = audio_data.get('codec')
        metrics.audio_bitrate_kbps = audio_data.get('bitrate_kbps', 0)
        metrics.audio_sample_rate = audio_data.get('sample_rate', 0)
        
        # Video metrics
        video_data = metrics_data.get('video', {})
        metrics.video_codec = video_data.get('codec')
        metrics.video_bitrate_kbps = video_data.get('bitrate_kbps', 0)
        metrics.video_resolution = video_data.get('resolution')
        metrics.video_framerate = video_data.get('framerate', 0)
        
        # Connection metrics
        conn_data = metrics_data.get('connection', {})
        metrics.connection_state = conn_data.get('state', 'connected')
        metrics.ice_candidate_pair = conn_data.get('ice_candidate_pair')
        metrics.bytes_sent = conn_data.get('bytes_sent', 0)
        metrics.bytes_received = conn_data.get('bytes_received', 0)
        
        # Reassess quality
        metrics.quality_level = metrics._assess_quality()
        
        # Record metrics
        call_quality_monitor.record_metrics(metrics)
        
        logger.info(f"Recorded metrics for call {call_id} user {user_id}: {metrics.quality_level.value}")
        
        return {
            'success': True,
            'metrics': metrics.to_dict(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to record metrics: {str(e)}'
        )


@call_quality_bp.post('/calls/{call_id}/start')
async def start_call_monitoring(call_id: str, call_data: dict):
    """
    Start monitoring a call
    
    Path Parameters:
        call_id: Call ID
    
    Request Body:
        {
            "user_ids": [1, 2]
        }
    
    Returns:
        JSON response with monitoring started
    """
    try:
        user_ids = call_data.get('user_ids', [])
        
        if not user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing user_ids'
            )
        
        call_quality_monitor.start_call(call_id, user_ids)
        
        return {
            'success': True,
            'call_id': call_id,
            'user_ids': user_ids,
            'message': 'Call monitoring started',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting call monitoring: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to start monitoring: {str(e)}'
        )


@call_quality_bp.post('/calls/{call_id}/end')
async def end_call_monitoring(call_id: str):
    """
    End monitoring a call
    
    Path Parameters:
        call_id: Call ID
    
    Returns:
        JSON response with call summary
    """
    try:
        call_quality_monitor.end_call(call_id)
        
        summary = call_quality_monitor.get_call_summary(call_id)
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Call not found'
            )
        
        return {
            'success': True,
            'call_summary': summary,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending call monitoring: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to end monitoring: {str(e)}'
        )


@call_quality_bp.get('/calls/{call_id}')
async def get_call_metrics(call_id: str):
    """
    Get all metrics for a call
    
    Path Parameters:
        call_id: Call ID
    
    Returns:
        JSON response with call metrics
    """
    try:
        metrics = call_quality_monitor.get_call_metrics(call_id)
        summary = call_quality_monitor.get_call_summary(call_id)
        
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Call not found'
            )
        
        return {
            'success': True,
            'call_id': call_id,
            'summary': summary,
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting call metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get metrics: {str(e)}'
        )


@call_quality_bp.get('/alerts')
async def get_quality_alerts(limit: int = Query(100, ge=1, le=1000)):
    """
    Get recent quality alerts
    
    Query Parameters:
        limit: Maximum number of alerts to return
    
    Returns:
        JSON response with alerts
    """
    try:
        alerts = call_quality_monitor.get_quality_alerts(limit)
        
        return {
            'success': True,
            'alert_count': len(alerts),
            'alerts': alerts,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get alerts: {str(e)}'
        )


@call_quality_bp.get('/users/{user_id}/history')
async def get_user_call_history(user_id: int, limit: int = Query(20, ge=1, le=100)):
    """
    Get call history for a user
    
    Path Parameters:
        user_id: User ID
    
    Query Parameters:
        limit: Maximum number of calls to return
    
    Returns:
        JSON response with call history
    """
    try:
        history = call_quality_monitor.get_user_call_history(user_id, limit)
        
        return {
            'success': True,
            'user_id': user_id,
            'call_count': len(history),
            'calls': history,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting call history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get history: {str(e)}'
        )
