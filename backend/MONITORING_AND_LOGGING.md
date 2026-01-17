## Monitoring and Logging Guide

This document describes the monitoring and logging infrastructure for dchat.pro.

## Table of Contents

1. [Logging](#logging)
2. [Error Tracking](#error-tracking)
3. [Performance Monitoring](#performance-monitoring)
4. [Metrics](#metrics)
5. [Alerts](#alerts)

---

## Logging

### Configuration

The logging system is configured in `src/config/logging_config.py`.

#### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FILE` | Path to log file | `logs/dchat.log` | `/var/log/dchat/app.log` |
| `JSON_LOGS` | Use JSON format | `true` (production) | `true`, `false` |
| `ENVIRONMENT` | Environment name | `development` | `development`, `staging`, `production` |

#### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `DEBUG` | Detailed diagnostic information | Variable values, function calls |
| `INFO` | General informational messages | User login, API requests |
| `WARNING` | Warning messages | Deprecated API usage, rate limit approaching |
| `ERROR` | Error messages | Failed API calls, database errors |
| `CRITICAL` | Critical errors | System failures, security breaches |

### Log Formats

#### Development (Colored Console)

```
[INFO] 2024-11-05 10:30:45 - auth - User logged in: 0x123...
[ERROR] 2024-11-05 10:31:12 - database - Connection failed: timeout
```

#### Production (JSON)

```json
{
  "timestamp": "2024-11-05T10:30:45.123Z",
  "level": "INFO",
  "logger": "auth",
  "message": "User logged in: 0x123...",
  "module": "auth",
  "function": "connect_wallet",
  "line": 145,
  "user_id": "123",
  "request_id": "abc-def-ghi",
  "ip_address": "192.168.1.1"
}
```

### Usage Examples

#### Basic Logging

```python
from src.config.logging_config import get_logger

logger = get_logger(__name__)

# Log messages
logger.debug("Debugging information")
logger.info("User action completed")
logger.warning("Potential issue detected")
logger.error("Operation failed")
logger.critical("System failure")
```

#### Logging with Extra Context

```python
logger.info(
    "User logged in",
    extra={
        'user_id': user.id,
        'wallet_address': user.wallet_address,
        'ip_address': request.remote_addr
    }
)
```

#### Logging Exceptions

```python
try:
    # Some operation
    result = risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {str(e)}", exc_info=True)
    raise
```

#### Performance Logging

```python
from src.config.logging_config import PerformanceLogger

@PerformanceLogger()
def expensive_operation():
    # This function's execution time will be logged
    time.sleep(2)
    return "result"
```

### Log Rotation

Logs are automatically rotated to prevent disk space issues:

- **Max Size**: 10 MB per file
- **Backup Count**: 5 files
- **Total Storage**: ~50 MB

Files are named:
- `dchat.log` (current)
- `dchat.log.1` (previous)
- `dchat.log.2` (older)
- ...
- `dchat.log.5` (oldest)

---

## Error Tracking

### Sentry Integration

Sentry provides real-time error tracking and performance monitoring.

#### Setup

1. **Create Sentry Account**
   - Visit [sentry.io](https://sentry.io)
   - Create a new project (Python/Flask)
   - Copy the DSN

2. **Install Sentry SDK**
   ```bash
   pip install sentry-sdk[flask]
   ```

3. **Configure Environment Variables**
   ```bash
   export SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
   export SENTRY_ENVIRONMENT="production"
   export SENTRY_TRACES_SAMPLE_RATE="0.1"  # 10% of transactions
   ```

4. **Initialize in Application**
   ```python
   from src.config.logging_config import setup_sentry
   
   setup_sentry()
   ```

#### Features

- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: Transaction tracing and profiling
- **Release Tracking**: Track errors by release version
- **User Context**: Associate errors with specific users
- **Breadcrumbs**: Track events leading to errors

#### Usage

```python
import sentry_sdk

# Capture exception
try:
    risky_operation()
except Exception as e:
    sentry_sdk.capture_exception(e)

# Add user context
sentry_sdk.set_user({
    "id": user.id,
    "wallet_address": user.wallet_address
})

# Add custom context
sentry_sdk.set_context("transaction", {
    "tx_hash": "0x123...",
    "amount": "1.5 ETH"
})

# Add breadcrumb
sentry_sdk.add_breadcrumb(
    category="auth",
    message="User logged in",
    level="info"
)
```

### Alternative: CloudWatch Logs (AWS)

If using AWS, you can send logs to CloudWatch:

```python
import watchtower
import logging

logger = logging.getLogger(__name__)
logger.addHandler(watchtower.CloudWatchLogHandler(
    log_group='dchat-production',
    stream_name='backend-{strftime:%Y-%m-%d}'
))
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

#### Metrics to Track

1. **Response Time**
   - Average response time per endpoint
   - 95th percentile response time
   - Slowest endpoints

2. **Throughput**
   - Requests per second (RPS)
   - Requests per minute (RPM)
   - Peak traffic times

3. **Error Rate**
   - Errors per minute
   - Error rate percentage
   - Error types distribution

4. **Database Performance**
   - Query execution time
   - Slow query count
   - Connection pool usage

5. **External Services**
   - Pinata API response time
   - Alchemy/Infura response time
   - Redis latency

### Performance Logging Decorator

```python
from src.config.logging_config import PerformanceLogger

@PerformanceLogger('api')
def get_user_messages(user_id):
    # Function execution time is automatically logged
    messages = Message.query.filter_by(receiver_id=user_id).all()
    return messages
```

### Custom Performance Tracking

```python
import time
from src.config.logging_config import get_logger

logger = get_logger(__name__)

def track_performance(operation_name):
    start_time = time.time()
    
    try:
        yield
    finally:
        duration = time.time() - start_time
        logger.info(
            f"{operation_name} completed",
            extra={
                'operation': operation_name,
                'duration': duration,
                'duration_ms': duration * 1000
            }
        )

# Usage
with track_performance('database_query'):
    results = db.session.execute(query).fetchall()
```

---

## Metrics

### Key Metrics to Monitor

#### Application Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Response Time (avg) | Average API response time | < 200ms | > 1s |
| Response Time (p95) | 95th percentile response time | < 500ms | > 2s |
| Error Rate | Percentage of failed requests | < 1% | > 5% |
| Requests/sec | Request throughput | - | - |
| Active Users | Currently connected users | - | - |

#### Infrastructure Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| CPU Usage | Server CPU utilization | < 70% | > 85% |
| Memory Usage | Server memory utilization | < 80% | > 90% |
| Disk Usage | Disk space utilization | < 70% | > 85% |
| Network I/O | Network bandwidth usage | - | > 80% capacity |

#### Database Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Query Time (avg) | Average query execution time | < 50ms | > 200ms |
| Slow Queries | Queries taking > 1s | 0 | > 10/min |
| Connections | Active database connections | < 50 | > 80 |
| Connection Pool | Pool utilization | < 80% | > 90% |

#### External Services

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Pinata API | IPFS upload/download time | < 2s | > 10s |
| Alchemy/Infura | Blockchain RPC response time | < 500ms | > 2s |
| Redis | Cache hit rate | > 80% | < 50% |

### Metrics Collection

#### Using Prometheus

1. **Install Prometheus Client**
   ```bash
   pip install prometheus-flask-exporter
   ```

2. **Add to Application**
   ```python
   from prometheus_flask_exporter import PrometheusMetrics
   
   app = Flask(__name__)
   metrics = PrometheusMetrics(app)
   
   # Custom metrics
   request_duration = metrics.histogram(
       'request_duration_seconds',
       'Request duration in seconds',
       labels={'endpoint': lambda: request.endpoint}
   )
   ```

3. **Expose Metrics Endpoint**
   ```
   GET /metrics
   ```

4. **Configure Prometheus**
   ```yaml
   scrape_configs:
     - job_name: 'dchat-backend'
       static_configs:
         - targets: ['backend:5000']
   ```

#### Using CloudWatch (AWS)

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def put_metric(metric_name, value, unit='Count'):
    cloudwatch.put_metric_data(
        Namespace='DChat/Backend',
        MetricData=[
            {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow()
            }
        ]
    )

# Usage
put_metric('UserLogin', 1)
put_metric('ResponseTime', response_time, 'Milliseconds')
```

---

## Alerts

### Alert Rules

#### Critical Alerts (Immediate Action)

| Alert | Condition | Action |
|-------|-----------|--------|
| Service Down | No requests in 5 minutes | Page on-call engineer |
| Error Rate Spike | Error rate > 10% | Page on-call engineer |
| Database Down | Connection failures | Page on-call engineer |
| Disk Full | Disk usage > 95% | Page on-call engineer |

#### Warning Alerts (Investigation Needed)

| Alert | Condition | Action |
|-------|-----------|--------|
| High Error Rate | Error rate > 5% for 10 min | Notify team channel |
| Slow Response | p95 response time > 2s | Notify team channel |
| High CPU | CPU > 85% for 15 min | Notify team channel |
| Slow Queries | > 10 slow queries/min | Notify team channel |

#### Informational Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High Traffic | RPS > 1000 | Log for analysis |
| Cache Miss Rate | Cache hit rate < 50% | Log for analysis |
| API Rate Limit | Approaching rate limit | Log for analysis |

### Alert Channels

1. **Email** - For non-critical alerts
2. **Slack/Discord** - For team notifications
3. **PagerDuty** - For critical on-call alerts
4. **SMS** - For emergency alerts

### Alert Configuration Example (Sentry)

```python
# In Sentry dashboard:
# 1. Go to Alerts → Create Alert Rule
# 2. Configure conditions:
#    - Error rate > 5% in 10 minutes
#    - Slow transaction > 2 seconds
# 3. Configure actions:
#    - Send notification to #alerts channel
#    - Email team@dchat.pro
```

---

## Best Practices

### Logging Best Practices

1. **Use Appropriate Log Levels**
   - Don't log everything at ERROR level
   - Use DEBUG for development only
   - Use INFO for important events

2. **Include Context**
   - Add user_id, request_id, etc.
   - Include relevant data for debugging
   - Don't log sensitive information (passwords, private keys)

3. **Structure Your Logs**
   - Use JSON format in production
   - Include timestamps
   - Use consistent field names

4. **Log Actionable Information**
   - Log what happened and why
   - Include error messages and stack traces
   - Log steps leading to errors

5. **Avoid Log Spam**
   - Don't log in tight loops
   - Use sampling for high-frequency events
   - Aggregate similar messages

### Monitoring Best Practices

1. **Monitor What Matters**
   - Focus on user-facing metrics
   - Track business metrics (signups, messages sent)
   - Monitor critical dependencies

2. **Set Meaningful Alerts**
   - Avoid alert fatigue
   - Set realistic thresholds
   - Include runbooks in alerts

3. **Regular Review**
   - Review logs weekly
   - Analyze trends monthly
   - Update alerts based on patterns

4. **Performance Budgets**
   - Set performance targets
   - Track against targets
   - Alert on degradation

5. **Incident Response**
   - Document incidents
   - Conduct post-mortems
   - Implement preventive measures

---

## Troubleshooting

### Common Issues

#### Logs Not Appearing

1. Check log level configuration
2. Verify log file permissions
3. Check disk space
4. Verify logger name

#### High Log Volume

1. Reduce log level (INFO → WARNING)
2. Implement log sampling
3. Filter noisy loggers
4. Increase log rotation frequency

#### Sentry Not Capturing Errors

1. Verify DSN configuration
2. Check network connectivity
3. Verify Sentry SDK version
4. Check sample rate settings

#### Performance Degradation

1. Check slow query logs
2. Review database indexes
3. Check Redis cache hit rate
4. Review external API latency

---

## Tools and Services

### Recommended Tools

1. **Error Tracking**
   - Sentry (recommended)
   - Rollbar
   - Bugsnag

2. **Log Aggregation**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Datadog
   - CloudWatch Logs (AWS)
   - Stackdriver (Google Cloud)

3. **APM (Application Performance Monitoring)**
   - New Relic
   - Datadog APM
   - AppDynamics

4. **Metrics and Dashboards**
   - Grafana + Prometheus
   - Datadog
   - CloudWatch Dashboards

5. **Alerting**
   - PagerDuty
   - Opsgenie
   - VictorOps

---

## References

- [Python Logging Documentation](https://docs.python.org/3/library/logging.html)
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [The Twelve-Factor App: Logs](https://12factor.net/logs)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
