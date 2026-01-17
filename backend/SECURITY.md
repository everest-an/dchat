# Security Best Practices

This document outlines security best practices implemented in the dchat.pro backend and guidelines for maintaining security.

---

## Table of Contents

1. [Security Features](#security-features)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation](#input-validation)
4. [Rate Limiting](#rate-limiting)
5. [CORS & Security Headers](#cors--security-headers)
6. [Data Protection](#data-protection)
7. [API Security](#api-security)
8. [Deployment Security](#deployment-security)
9. [Monitoring & Incident Response](#monitoring--incident-response)
10. [Security Checklist](#security-checklist)

---

## Security Features

### Implemented Security Measures

✅ **Web3 Signature Verification**
- Nonce-based authentication
- Prevents replay attacks
- 5-minute nonce expiration

✅ **Rate Limiting**
- IP-based and user-based limits
- Sliding window algorithm
- Redis-backed for distributed systems

✅ **Input Validation & Sanitization**
- Ethereum address validation
- Email validation
- XSS prevention
- SQL injection prevention

✅ **CORS Configuration**
- Whitelist-based origin validation
- Secure credential handling
- Preflight request support

✅ **Security Headers**
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

✅ **Data Encryption**
- End-to-end encryption for messages
- RSA + AES hybrid encryption
- Public key management

✅ **Secure File Uploads**
- File type validation
- Size limits
- Virus scanning (recommended)

✅ **Logging & Monitoring**
- Structured logging
- Error tracking (Sentry)
- Audit logs for sensitive operations

---

## Authentication & Authorization

### Web3 Authentication Flow

1. **Request Nonce**
   ```python
   POST /api/auth/nonce
   {
       "address": "0x..."
   }
   ```

2. **Sign Message**
   ```javascript
   const message = `Sign this message to authenticate with dchat.pro\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`
   const signature = await signer.signMessage(message)
   ```

3. **Verify Signature**
   ```python
   POST /api/auth/verify-signature
   {
       "address": "0x...",
       "signature": "0x...",
       "nonce": "abc123"
   }
   ```

4. **Receive JWT Token**
   ```json
   {
       "success": true,
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {...}
   }
   ```

### JWT Token Management

**Token Expiration**: 24 hours (configurable)

**Token Refresh**: Implement token refresh endpoint

**Token Storage**: 
- Frontend: Store in httpOnly cookie (recommended) or localStorage
- Never expose in URL or logs

**Token Validation**:
```python
from flask_jwt_extended import jwt_required, get_jwt_identity

@app.route('/api/protected')
@jwt_required()
def protected_endpoint():
    user_id = get_jwt_identity()
    return {'user_id': user_id}
```

---

## Input Validation

### Validation Rules

**Ethereum Address**:
```python
from src.middleware.input_validation import InputValidator

address = InputValidator.validate_ethereum_address(user_input)
# Returns checksummed address or raises ValidationError
```

**Email**:
```python
email = InputValidator.validate_email(user_input)
# Returns normalized email or raises ValidationError
```

**String Sanitization**:
```python
text = InputValidator.sanitize_string(user_input, max_length=500)
# Removes XSS vectors, limits length
```

### Request Body Validation

Use the `@validate_request_body` decorator:

```python
from src.middleware.input_validation import validate_request_body

schema = {
    'address': {'type': 'ethereum_address', 'required': True},
    'message': {'type': 'string', 'required': True, 'max_length': 1000},
    'amount': {'type': 'integer', 'required': False, 'min_value': 0}
}

@app.route('/api/send-message', methods=['POST'])
@validate_request_body(schema)
def send_message():
    data = request.validated_data
    # data is now validated and sanitized
    return {'success': True}
```

---

## Rate Limiting

### Rate Limit Tiers

**Strict** (10 req/min):
- Login
- Signup
- Password reset
- Sensitive operations

**Moderate** (60 req/min):
- Standard API endpoints
- Message sending
- File uploads

**Relaxed** (300 req/min):
- Read-only endpoints
- Public data

### Usage Examples

**IP-based Rate Limiting**:
```python
from src.middleware.rate_limiter import rate_limit_strict

@app.route('/api/auth/login', methods=['POST'])
@rate_limit_strict
def login():
    return {'success': True}
```

**User-based Rate Limiting**:
```python
from src.middleware.rate_limiter import rate_limit_per_user

@app.route('/api/messages', methods=['POST'])
@jwt_required()
@rate_limit_per_user(max_requests=50, window_seconds=60)
def send_message():
    return {'success': True}
```

**Custom Rate Limiting**:
```python
from src.middleware.rate_limiter import rate_limiter

@app.route('/api/custom', methods=['POST'])
@rate_limiter.limit(max_requests=100, window_seconds=3600)
def custom_endpoint():
    return {'success': True}
```

### Rate Limit Headers

Responses include rate limit information:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699123456
```

Rate limit exceeded response (429):
```json
{
    "success": false,
    "error": "Rate limit exceeded",
    "message": "Too many requests. Please try again in 45 seconds.",
    "retry_after": 45
}
```

---

## CORS & Security Headers

### CORS Configuration

**Allowed Origins**:
- `https://dchat.pro`
- `https://www.dchat.pro`
- `https://staging.dchat.pro`
- `http://localhost:3000` (development)
- `http://localhost:5173` (Vite dev server)

**Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers**: Content-Type, Authorization, X-Requested-With

### Security Headers

**Content Security Policy (CSP)**:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://api.dchat.pro wss://api.dchat.pro https://eth-sepolia.g.alchemy.com;
frame-ancestors 'none';
```

**Strict Transport Security (HSTS)**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Other Headers**:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Data Protection

### Encryption

**End-to-End Encryption**:
1. Generate RSA key pair for each user
2. Store public key in database
3. Encrypt messages with recipient's public key
4. Use AES for symmetric encryption of large data

**At-Rest Encryption**:
- Database encryption (AWS RDS encryption)
- File storage encryption (S3 server-side encryption)
- Backup encryption

**In-Transit Encryption**:
- HTTPS/TLS 1.3 for all connections
- WSS (WebSocket Secure) for real-time communication

### Sensitive Data Handling

**Never Log**:
- Passwords
- Private keys
- JWT tokens
- API keys
- Personal identifiable information (PII)

**Database Security**:
- Use parameterized queries (prevent SQL injection)
- Hash passwords with bcrypt (if using traditional auth)
- Encrypt sensitive fields
- Regular backups with encryption

---

## API Security

### Best Practices

1. **Always Validate Input**
   ```python
   @validate_request_body(schema)
   def endpoint():
       pass
   ```

2. **Always Require Authentication**
   ```python
   @jwt_required()
   def endpoint():
       pass
   ```

3. **Always Apply Rate Limiting**
   ```python
   @rate_limit_moderate
   def endpoint():
       pass
   ```

4. **Always Sanitize Output**
   ```python
   return jsonify({
       'message': InputValidator.sanitize_string(message)
   })
   ```

5. **Never Expose Internal Errors**
   ```python
   try:
       # operation
   except Exception as e:
       logger.error(f"Error: {e}")
       return jsonify({'error': 'Internal server error'}), 500
   ```

### API Versioning

Use URL versioning:
- `/api/v1/messages`
- `/api/v2/messages`

Maintain backward compatibility for at least 6 months.

### Error Responses

**Standard Error Format**:
```json
{
    "success": false,
    "error": "Error type",
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
}
```

**Never Expose**:
- Stack traces
- Database errors
- File paths
- Internal IP addresses

---

## Deployment Security

### Environment Variables

**Required**:
- `SECRET_KEY` - Flask secret key (generate with `openssl rand -hex 32`)
- `JWT_SECRET_KEY` - JWT signing key
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string
- `ALCHEMY_API_KEY` - Blockchain RPC key
- `PINATA_JWT` - IPFS storage key

**Never Commit**:
- `.env` files
- API keys
- Database credentials
- Private keys

**Use AWS Secrets Manager or Similar**:
```python
import boto3

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return response['SecretString']
```

### Docker Security

**Use Non-Root User**:
```dockerfile
RUN adduser --disabled-password --gecos '' appuser
USER appuser
```

**Scan Images**:
```bash
docker scan dchat-backend:latest
```

**Minimal Base Image**:
```dockerfile
FROM python:3.11-slim
```

### AWS Security

**IAM Roles**:
- Principle of least privilege
- Separate roles for different services
- No hardcoded credentials

**Security Groups**:
- Restrict inbound traffic
- Only allow necessary ports
- Use VPC for internal communication

**CloudWatch Alarms**:
- Monitor failed login attempts
- Monitor API error rates
- Monitor unusual traffic patterns

---

## Monitoring & Incident Response

### Logging

**What to Log**:
- Authentication attempts (success/failure)
- Authorization failures
- Rate limit violations
- Input validation errors
- API errors
- Unusual patterns

**Log Format**:
```json
{
    "timestamp": "2024-11-05T12:00:00Z",
    "level": "INFO",
    "event": "authentication_success",
    "user_id": "0x...",
    "ip": "1.2.3.4",
    "user_agent": "Mozilla/5.0..."
}
```

### Monitoring

**Key Metrics**:
- Request rate
- Error rate
- Response time
- Authentication failures
- Rate limit hits

**Alerts**:
- Error rate > 5%
- Response time > 1s
- Failed auth > 10/min from same IP
- Rate limit hits > 100/min

### Incident Response

**Steps**:
1. **Detect** - Monitor alerts
2. **Assess** - Determine severity
3. **Contain** - Block malicious IPs, disable compromised accounts
4. **Eradicate** - Fix vulnerability
5. **Recover** - Restore service
6. **Learn** - Post-mortem analysis

**Contacts**:
- Security team email
- On-call engineer
- Incident response plan

---

## Security Checklist

### Development

- [ ] All user input is validated
- [ ] All user input is sanitized
- [ ] SQL queries use parameterized statements
- [ ] Secrets are in environment variables
- [ ] Error messages don't expose sensitive info
- [ ] Dependencies are up to date
- [ ] Code is reviewed for security issues

### Deployment

- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Logging is configured
- [ ] Monitoring is set up
- [ ] Backups are automated and encrypted
- [ ] Secrets are in AWS Secrets Manager
- [ ] IAM roles follow least privilege
- [ ] Security groups are restrictive

### Operations

- [ ] Regular security audits
- [ ] Dependency updates (weekly)
- [ ] Log review (daily)
- [ ] Incident response plan tested
- [ ] Backup restoration tested
- [ ] Penetration testing (quarterly)
- [ ] Security training for team

---

## Security Audit Schedule

**Daily**:
- Review error logs
- Monitor failed authentication attempts
- Check rate limit violations

**Weekly**:
- Update dependencies
- Review access logs
- Check for security advisories

**Monthly**:
- Full security audit
- Review and update security policies
- Test incident response procedures

**Quarterly**:
- Penetration testing
- Third-party security audit
- Update threat model

---

## Reporting Security Issues

If you discover a security vulnerability, please email:
- **Email**: security@dchat.pro
- **PGP Key**: [Link to PGP key]

**Do NOT**:
- Open a public GitHub issue
- Disclose publicly before fix
- Exploit the vulnerability

**Expect**:
- Acknowledgment within 24 hours
- Fix within 7 days (critical) or 30 days (non-critical)
- Credit in security advisory (if desired)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Web3 Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
