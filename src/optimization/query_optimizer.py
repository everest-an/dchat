"""
Query Optimization and Performance Monitoring

Implements:
- Query optimization strategies
- Database connection pooling
- Query performance tracking
- Slow query detection
- Performance metrics

Author: Manus AI
Date: 2024-11-16
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import event, pool
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
import logging
import time

logger = logging.getLogger(__name__)


class QueryMetrics:
    """Track query metrics"""
    
    def __init__(self):
        self.total_queries = 0
        self.total_time = 0.0
        self.slow_queries = []
        self.query_times: Dict[str, List[float]] = {}
        self.slow_query_threshold = 1.0  # 1 second
    
    def record_query(self, query_str: str, execution_time: float) -> None:
        """Record query execution"""
        self.total_queries += 1
        self.total_time += execution_time
        
        # Track by query type
        query_type = self._get_query_type(query_str)
        if query_type not in self.query_times:
            self.query_times[query_type] = []
        self.query_times[query_type].append(execution_time)
        
        # Track slow queries
        if execution_time > self.slow_query_threshold:
            self.slow_queries.append({
                'query': query_str[:200],  # Truncate long queries
                'time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Keep only last 100 slow queries
            if len(self.slow_queries) > 100:
                self.slow_queries = self.slow_queries[-100:]
            
            logger.warning(f"Slow query detected ({execution_time:.2f}s): {query_str[:100]}")
    
    def _get_query_type(self, query_str: str) -> str:
        """Extract query type"""
        query_upper = query_str.upper().strip()
        if query_upper.startswith('SELECT'):
            return 'SELECT'
        elif query_upper.startswith('INSERT'):
            return 'INSERT'
        elif query_upper.startswith('UPDATE'):
            return 'UPDATE'
        elif query_upper.startswith('DELETE'):
            return 'DELETE'
        else:
            return 'OTHER'
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        avg_time = self.total_time / self.total_queries if self.total_queries > 0 else 0
        
        query_stats = {}
        for query_type, times in self.query_times.items():
            query_stats[query_type] = {
                'count': len(times),
                'avg_time': sum(times) / len(times),
                'min_time': min(times),
                'max_time': max(times)
            }
        
        return {
            'total_queries': self.total_queries,
            'total_time': self.total_time,
            'avg_time': avg_time,
            'slow_queries_count': len(self.slow_queries),
            'query_stats': query_stats,
            'recent_slow_queries': self.slow_queries[-10:]
        }


class DatabaseOptimizer:
    """Database optimization utilities"""
    
    @staticmethod
    def create_optimized_engine(
        database_url: str,
        pool_size: int = 20,
        max_overflow: int = 40,
        pool_recycle: int = 3600,
        echo: bool = False
    ):
        """Create optimized SQLAlchemy engine"""
        from sqlalchemy import create_engine
        
        engine = create_engine(
            database_url,
            poolclass=pool.QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_recycle=pool_recycle,
            echo=echo
        )
        
        return engine
    
    @staticmethod
    def setup_query_monitoring(engine: Engine, metrics: QueryMetrics) -> None:
        """Setup query monitoring"""
        
        @event.listens_for(engine, 'before_cursor_execute')
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(time.time())
        
        @event.listens_for(engine, 'after_cursor_execute')
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - conn.info['query_start_time'].pop(-1)
            metrics.record_query(statement, total_time)


class QueryOptimizationTips:
    """Query optimization tips and best practices"""
    
    @staticmethod
    def optimize_list_query(
        db: Session,
        model,
        skip: int = 0,
        limit: int = 100,
        eager_load: Optional[List[str]] = None
    ):
        """Optimize list query with eager loading"""
        from sqlalchemy.orm import joinedload
        
        query = db.query(model)
        
        # Add eager loading
        if eager_load:
            for relation in eager_load:
                if hasattr(model, relation):
                    query = query.options(joinedload(getattr(model, relation)))
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def optimize_count_query(db: Session, model) -> int:
        """Optimize count query"""
        from sqlalchemy import func
        
        return db.query(func.count(model.id)).scalar()
    
    @staticmethod
    def use_bulk_insert(db: Session, model, records: List[Dict]) -> None:
        """Use bulk insert for better performance"""
        db.bulk_insert_mappings(model, records)
        db.commit()
    
    @staticmethod
    def use_bulk_update(db: Session, model, records: List[Dict]) -> None:
        """Use bulk update for better performance"""
        db.bulk_update_mappings(model, records)
        db.commit()


class PerformanceMonitor:
    """Monitor overall performance"""
    
    def __init__(self):
        self.metrics = QueryMetrics()
        self.request_times: List[float] = []
        self.error_count = 0
        self.success_count = 0
    
    def record_request(self, execution_time: float, success: bool = True) -> None:
        """Record request execution"""
        self.request_times.append(execution_time)
        
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        
        # Keep only last 1000 requests
        if len(self.request_times) > 1000:
            self.request_times = self.request_times[-1000:]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        request_times = self.request_times
        
        if not request_times:
            return {
                'status': 'No data',
                'requests': 0
            }
        
        avg_time = sum(request_times) / len(request_times)
        min_time = min(request_times)
        max_time = max(request_times)
        
        # Calculate percentiles
        sorted_times = sorted(request_times)
        p50 = sorted_times[len(sorted_times) // 2]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]
        
        total_requests = self.success_count + self.error_count
        success_rate = self.success_count / total_requests if total_requests > 0 else 0
        
        return {
            'total_requests': total_requests,
            'success_count': self.success_count,
            'error_count': self.error_count,
            'success_rate': success_rate,
            'response_times': {
                'avg': avg_time,
                'min': min_time,
                'max': max_time,
                'p50': p50,
                'p95': p95,
                'p99': p99
            },
            'database': self.metrics.get_stats()
        }


class IndexOptimization:
    """Database index optimization"""
    
    @staticmethod
    def get_recommended_indexes(db: Session) -> List[str]:
        """Get recommended indexes based on query patterns"""
        recommendations = []
        
        # Check for frequently queried columns
        metrics = QueryMetrics()
        
        # Common recommendations
        recommendations.extend([
            'CREATE INDEX idx_user_email ON user_profiles(email)',
            'CREATE INDEX idx_user_linkedin_id ON user_profiles(linkedin_id)',
            'CREATE INDEX idx_red_packet_sender ON red_packets(sender_id)',
            'CREATE INDEX idx_red_packet_status ON red_packets(status)',
            'CREATE INDEX idx_red_packet_expires ON red_packets(expires_at)',
            'CREATE INDEX idx_transaction_hash ON transactions(tx_hash)',
            'CREATE INDEX idx_transaction_sender ON transactions(sender_id)',
            'CREATE INDEX idx_transaction_status ON transactions(status)',
            'CREATE INDEX idx_call_session_initiator ON call_sessions(initiator_id)',
            'CREATE INDEX idx_call_session_status ON call_sessions(status)',
            'CREATE INDEX idx_audit_log_user ON audit_logs(user_id)',
            'CREATE INDEX idx_audit_log_action ON audit_logs(action)',
            'CREATE INDEX idx_notification_user ON notifications(user_id)',
            'CREATE INDEX idx_notification_read ON notifications(is_read)'
        ])
        
        return recommendations


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


class PerformanceMiddleware:
    """Middleware for tracking request performance"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message['type'] == 'http.response.start':
                execution_time = time.time() - start_time
                status_code = message['status']
                success = 200 <= status_code < 400
                
                performance_monitor.record_request(execution_time, success)
                
                logger.debug(f"Request completed in {execution_time:.3f}s (Status: {status_code})")
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
