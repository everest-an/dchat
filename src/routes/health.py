"""
Health Check and Metrics Endpoints
"""

from flask import Blueprint, jsonify
from datetime import datetime
import psutil
import os
from src.middleware.monitoring import metrics_collector

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Basic health check endpoint
    
    Returns:
        200: Service is healthy
        503: Service is unhealthy
    """
    try:
        # Check database connection
        # TODO: Add actual database ping
        db_healthy = True
        
        # Check Redis connection
        # TODO: Add actual Redis ping
        redis_healthy = True
        
        # Overall health
        healthy = db_healthy and redis_healthy
        
        response = {
            'status': 'healthy' if healthy else 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {
                'database': 'up' if db_healthy else 'down',
                'redis': 'up' if redis_healthy else 'down'
            }
        }
        
        status_code = 200 if healthy else 503
        return jsonify(response), status_code
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    Readiness check for Kubernetes/load balancers
    
    Returns:
        200: Service is ready to accept traffic
        503: Service is not ready
    """
    try:
        # Check if service is fully initialized
        # TODO: Add initialization checks
        ready = True
        
        if ready:
            return jsonify({
                'status': 'ready',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'status': 'not ready',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
            
    except Exception as e:
        return jsonify({
            'status': 'not ready',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    Liveness check for Kubernetes
    
    Returns:
        200: Service is alive
        503: Service is dead (should be restarted)
    """
    return jsonify({
        'status': 'alive',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@health_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """
    Get application metrics
    
    Returns:
        Application performance and usage metrics
    """
    try:
        # Get application metrics
        app_metrics = metrics_collector.get_metrics()
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        system_metrics = {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_mb': memory.available / (1024 * 1024),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024 * 1024 * 1024)
        }
        
        # Get process metrics
        process = psutil.Process(os.getpid())
        process_metrics = {
            'memory_mb': process.memory_info().rss / (1024 * 1024),
            'cpu_percent': process.cpu_percent(interval=0.1),
            'threads': process.num_threads(),
            'open_files': len(process.open_files())
        }
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'application': app_metrics,
            'system': system_metrics,
            'process': process_metrics
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@health_bp.route('/metrics/reset', methods=['POST'])
def reset_metrics():
    """
    Reset application metrics (admin only)
    
    Returns:
        200: Metrics reset successfully
    """
    try:
        metrics_collector.reset_metrics()
        
        return jsonify({
            'status': 'success',
            'message': 'Metrics reset successfully',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
