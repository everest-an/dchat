# Performance Optimization Guide

This document outlines performance optimization strategies and load testing procedures for dchat.pro backend.

---

## Table of Contents

1. [Performance Metrics](#performance-metrics)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [API Optimization](#api-optimization)
5. [Load Testing](#load-testing)
6. [Monitoring](#monitoring)
7. [Scaling Strategy](#scaling-strategy)

---

## Performance Metrics

### Target Performance Goals

**Response Time**:
- P50: < 100ms
- P95: < 300ms
- P99: < 500ms

**Throughput**:
- 1000 requests/second per instance
- 10,000 concurrent WebSocket connections

**Availability**:
- 99.9% uptime (< 8.76 hours downtime/year)
- < 1% error rate

**Resource Usage**:
- CPU: < 70% average
- Memory: < 80% average
- Database connections: < 80% of pool

---

## Database Optimization

### Indexing Strategy

**Already Implemented** (see `backend/migrations/optimize_database.sql`):

```sql
-- User lookups
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);

-- Message queries
CREATE INDEX idx_messages_sender ON messages(sender_address);
CREATE INDEX idx_messages_recipient ON messages(recipient_address);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_conversation ON messages(sender_address, recipient_address, timestamp DESC);

-- Group queries
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_address);
CREATE INDEX idx_group_messages_group ON group_messages(group_id, timestamp DESC);
```

### Query Optimization

**Use EXPLAIN ANALYZE**:
```sql
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE sender_address = '0x...'
ORDER BY timestamp DESC
LIMIT 50;
```

**Optimize N+1 Queries**:
```python
# Bad: N+1 query
messages = Message.query.all()
for msg in messages:
    user = User.query.get(msg.sender_address)  # N queries

# Good: Join or eager loading
messages = db.session.query(Message).join(User).all()
```

**Use Pagination**:
```python
# Always paginate large result sets
messages = Message.query.order_by(Message.timestamp.desc()).paginate(
    page=page,
    per_page=50,
    error_out=False
)
```

### Connection Pooling

**SQLAlchemy Configuration**:
```python
app.config['SQLALCHEMY_POOL_SIZE'] = 20
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 10
app.config['SQLALCHEMY_POOL_TIMEOUT'] = 30
app.config['SQLALCHEMY_POOL_RECYCLE'] = 3600
```

**Monitor Connection Usage**:
```python
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    logger.info("Database connection established")

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    logger.debug("Connection checked out from pool")
```

---

## Caching Strategy

### Redis Caching Layers

**Layer 1: Session Cache** (TTL: 24 hours)
```python
# User sessions
redis.setex(f"session:{user_id}", 86400, session_data)
```

**Layer 2: Data Cache** (TTL: 5 minutes)
```python
# Frequently accessed data
redis.setex(f"user:{user_id}", 300, user_data)
redis.setex(f"group:{group_id}:members", 300, members_list)
```

**Layer 3: Query Cache** (TTL: 1 minute)
```python
# Expensive query results
redis.setex(f"query:{query_hash}", 60, query_result)
```

### Cache Invalidation

**Write-Through Cache**:
```python
def update_user(user_id, data):
    # Update database
    user = User.query.get(user_id)
    user.update(data)
    db.session.commit()
    
    # Invalidate cache
    redis.delete(f"user:{user_id}")
    
    # Or update cache
    redis.setex(f"user:{user_id}", 300, user.to_dict())
```

**Cache Warming**:
```python
def warm_cache():
    """Pre-populate cache with frequently accessed data"""
    # Popular groups
    popular_groups = Group.query.filter_by(is_public=True).limit(100).all()
    for group in popular_groups:
        redis.setex(f"group:{group.id}", 300, group.to_dict())
```

### Cache Patterns

**Cache-Aside Pattern**:
```python
def get_user(user_id):
    # Try cache first
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Cache miss, query database
    user = User.query.get(user_id)
    if user:
        redis.setex(f"user:{user_id}", 300, json.dumps(user.to_dict()))
    
    return user.to_dict() if user else None
```

---

## API Optimization

### Response Compression

**Enable Gzip Compression**:
```python
from flask_compress import Compress

app = Flask(__name__)
Compress(app)

app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/xml',
    'application/json',
    'application/javascript'
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500
```

### Pagination

**Cursor-Based Pagination** (for real-time data):
```python
@app.route('/api/messages')
def get_messages():
    cursor = request.args.get('cursor')  # timestamp
    limit = min(int(request.args.get('limit', 50)), 100)
    
    query = Message.query.order_by(Message.timestamp.desc())
    
    if cursor:
        query = query.filter(Message.timestamp < cursor)
    
    messages = query.limit(limit).all()
    
    next_cursor = messages[-1].timestamp if messages else None
    
    return jsonify({
        'messages': [m.to_dict() for m in messages],
        'next_cursor': next_cursor,
        'has_more': len(messages) == limit
    })
```

### Async Processing

**Use Celery for Background Tasks**:
```python
from celery import Celery

celery = Celery('dchat', broker='redis://localhost:6379/0')

@celery.task
def send_notification(user_id, message):
    """Send notification asynchronously"""
    # Send push notification
    # Send email
    pass

# In API endpoint
@app.route('/api/messages', methods=['POST'])
def send_message():
    # Save message
    message = Message.create(...)
    
    # Send notification asynchronously
    send_notification.delay(recipient_id, message.content)
    
    return jsonify({'success': True})
```

### Database Read Replicas

**Use Read Replicas for Queries**:
```python
# Write to primary
db.session.add(message)
db.session.commit()

# Read from replica
messages = db.session.execute(
    text("SELECT * FROM messages WHERE ..."),
    bind=db.get_engine(app, 'replica')
).fetchall()
```

---

## Load Testing

### Tools

**Locust** (Python-based):
```python
# locustfile.py
from locust import HttpUser, task, between

class DchatUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login and get JWT token"""
        response = self.client.post("/api/auth/login", json={
            "address": "0x...",
            "signature": "0x..."
        })
        self.token = response.json()['token']
    
    @task(3)
    def get_messages(self):
        """Get messages (most common operation)"""
        self.client.get(
            "/api/messages",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def send_message(self):
        """Send message"""
        self.client.post(
            "/api/messages",
            json={
                "recipient": "0x...",
                "content": "Test message",
                "encrypted": True
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def get_groups(self):
        """Get groups"""
        self.client.get(
            "/api/groups",
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

**Run Load Test**:
```bash
# Install Locust
pip install locust

# Run test
locust -f locustfile.py --host=https://api.dchat.pro

# Or headless mode
locust -f locustfile.py --host=https://api.dchat.pro \
    --users 1000 --spawn-rate 10 --run-time 5m --headless
```

**Apache Bench** (Simple HTTP testing):
```bash
# Test single endpoint
ab -n 10000 -c 100 -H "Authorization: Bearer TOKEN" \
    https://api.dchat.pro/api/messages

# With POST data
ab -n 1000 -c 50 -p post_data.json -T application/json \
    https://api.dchat.pro/api/messages
```

**k6** (Modern load testing):
```javascript
// load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp up
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200
        { duration: '5m', target: 200 },  // Stay at 200
        { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
        http_req_failed: ['rate<0.01'],    // Error rate < 1%
    },
};

export default function () {
    let response = http.get('https://api.dchat.pro/api/messages', {
        headers: { 'Authorization': 'Bearer TOKEN' },
    });
    
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(1);
}
```

```bash
# Run k6 test
k6 run load_test.js
```

### Load Testing Scenarios

**Scenario 1: Normal Load**
- Users: 100
- Duration: 10 minutes
- Expected: All requests succeed, P95 < 300ms

**Scenario 2: Peak Load**
- Users: 500
- Duration: 5 minutes
- Expected: Error rate < 1%, P95 < 500ms

**Scenario 3: Stress Test**
- Users: 1000+
- Duration: Until failure
- Goal: Find breaking point

**Scenario 4: Spike Test**
- Ramp from 100 to 1000 users in 1 minute
- Goal: Test auto-scaling

**Scenario 5: Endurance Test**
- Users: 200
- Duration: 24 hours
- Goal: Find memory leaks

### Metrics to Monitor

**During Load Test**:
- Response time (P50, P95, P99)
- Throughput (requests/second)
- Error rate
- CPU usage
- Memory usage
- Database connections
- Redis memory usage
- Network I/O

**After Load Test**:
- Memory leaks
- Connection leaks
- Error logs
- Slow query logs

---

## Monitoring

### Application Performance Monitoring (APM)

**New Relic** (Recommended):
```python
import newrelic.agent
newrelic.agent.initialize('newrelic.ini')

app = Flask(__name__)
app = newrelic.agent.WSGIApplicationWrapper(app)
```

**Datadog**:
```python
from ddtrace import patch_all, tracer

patch_all()

tracer.configure(
    hostname='localhost',
    port=8126,
)
```

### Custom Metrics

**Track Custom Metrics**:
```python
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')
active_users = Gauge('active_users', 'Number of active users')

# Use in code
@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    request_duration.observe(duration)
    request_count.labels(method=request.method, endpoint=request.endpoint).inc()
    return response
```

**Expose Metrics Endpoint**:
```python
from prometheus_client import generate_latest

@app.route('/metrics')
def metrics():
    return generate_latest()
```

### Alerting

**CloudWatch Alarms** (AWS):
```bash
# High CPU usage
aws cloudwatch put-metric-alarm \
    --alarm-name high-cpu \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2

# High error rate
aws cloudwatch put-metric-alarm \
    --alarm-name high-error-rate \
    --alarm-description "Alert when error rate exceeds 1%" \
    --metric-name 5XXError \
    --namespace AWS/ApplicationELB \
    --statistic Average \
    --period 60 \
    --threshold 1 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2
```

---

## Scaling Strategy

### Horizontal Scaling

**Auto Scaling (AWS ECS)**:
```json
{
  "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/dchat-backend",
  "scalingPolicies": [
    {
      "policyName": "cpu-scaling",
      "targetTrackingScalingPolicyConfiguration": {
        "targetValue": 70.0,
        "predefinedMetricSpecification": {
          "predefinedMetricType": "ECSServiceAverageCPUUtilization"
        },
        "scaleOutCooldown": 60,
        "scaleInCooldown": 300
      }
    }
  ],
  "minCapacity": 2,
  "maxCapacity": 10
}
```

### Vertical Scaling

**Instance Types** (AWS):
- Development: t3.small (2 vCPU, 2 GB RAM)
- Staging: t3.medium (2 vCPU, 4 GB RAM)
- Production: c6i.large (2 vCPU, 4 GB RAM, compute-optimized)
- High Load: c6i.xlarge (4 vCPU, 8 GB RAM)

### Database Scaling

**Read Replicas**:
- Primary: Write operations
- Replica 1: Read operations (API)
- Replica 2: Analytics queries

**Connection Pooling**:
```python
# Use PgBouncer for PostgreSQL
DATABASE_URL = "postgresql://pgbouncer:6432/dchat"
```

**Sharding** (Future):
- Shard by user ID
- Shard by region

---

## Performance Checklist

### Before Deployment

- [ ] All database queries have indexes
- [ ] N+1 queries eliminated
- [ ] Caching implemented for hot paths
- [ ] Response compression enabled
- [ ] Pagination implemented
- [ ] Connection pooling configured
- [ ] Load testing completed
- [ ] Performance benchmarks met

### After Deployment

- [ ] APM configured
- [ ] Metrics dashboard created
- [ ] Alerts configured
- [ ] Auto-scaling enabled
- [ ] Performance monitoring active
- [ ] Slow query logging enabled

---

## Performance Optimization Roadmap

### Phase 1 (Completed)
- [x] Database indexing
- [x] Redis caching
- [x] Query optimization

### Phase 2 (Current)
- [ ] Load testing
- [ ] APM integration
- [ ] Auto-scaling configuration

### Phase 3 (Future)
- [ ] CDN for static assets
- [ ] GraphQL for flexible queries
- [ ] Database read replicas
- [ ] Microservices architecture

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
