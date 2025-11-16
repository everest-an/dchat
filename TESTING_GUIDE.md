# Testing Guide

**Version:** 1.0  
**Date:** November 16, 2024  
**Status:** Test Framework Ready

---

## Overview

This document describes the testing strategy and framework for the Dchat backend. The project uses pytest for unit and integration testing with comprehensive coverage of all major features.

---

## Test Structure

### Test Organization

```
tests/
├── test_suite.py           # Main test suite
├── conftest.py            # Pytest configuration
├── fixtures/              # Test fixtures
│   ├── users.py
│   ├── red_packets.py
│   └── transactions.py
└── integration/           # Integration tests
    ├── test_user_flow.py
    ├── test_payment_flow.py
    └── test_call_flow.py
```

### Test Categories

| Category | Purpose | Location |
| :--- | :--- | :--- |
| **Unit Tests** | Test individual functions | `test_suite.py` |
| **Integration Tests** | Test component interactions | `tests/integration/` |
| **Performance Tests** | Test system performance | `TestPerformance` class |
| **Security Tests** | Test security features | `TestSecurity` class |

---

## Running Tests

### Installation

```bash
# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock

# Install additional dependencies
pip install pyotp qrcode pillow
```

### Basic Test Execution

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_suite.py

# Run specific test class
pytest tests/test_suite.py::TestAuthentication

# Run specific test method
pytest tests/test_suite.py::TestAuthentication::test_linkedin_oauth_url_generation

# Run with verbose output
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=src --cov-report=html
```

### Test Markers

```bash
# Run only unit tests
pytest tests/ -m unit

# Run only integration tests
pytest tests/ -m integration

# Run only performance tests
pytest tests/ -m performance

# Skip slow tests
pytest tests/ -m "not slow"
```

---

## Test Categories

### 1. Authentication Tests

**File:** `TestAuthentication` in `test_suite.py`

**Tests:**
- LinkedIn OAuth URL generation
- OAuth callback handling
- User login
- User logout
- Token validation

**Example:**
```python
def test_linkedin_oauth_url_generation(self):
    """Test LinkedIn OAuth URL generation"""
    # Verify OAuth URL contains required parameters
    # Check state parameter for CSRF protection
    # Verify redirect URI is correct
    pass
```

### 2. Red Packet Tests

**File:** `TestRedPackets` in `test_suite.py`

**Tests:**
- Red packet creation
- Red packet claiming
- Expiration handling
- Amount distribution
- Duplicate claim prevention

**Example:**
```python
def test_create_red_packet(self):
    """Test red packet creation"""
    # Create red packet with valid data
    # Verify packet is stored in database
    # Check that sender receives confirmation
    pass
```

### 3. WebRTC Tests

**File:** `TestWebRTC` in `test_suite.py`

**Tests:**
- Call initialization
- SDP offer/answer exchange
- ICE candidate handling
- Call termination

**Example:**
```python
def test_sdp_offer_exchange(self):
    """Test SDP offer/answer exchange"""
    # Create two peer connections
    # Exchange SDP offers and answers
    # Verify connection is established
    pass
```

### 4. Polkadot Payment Tests

**File:** `TestPolkadotPayments` in `test_suite.py`

**Tests:**
- Transaction construction
- Transaction broadcasting
- Status querying
- Testnet compatibility

**Example:**
```python
def test_transaction_construction(self):
    """Test Polkadot transaction construction"""
    # Build unsigned transaction
    # Verify transaction structure
    # Check all required fields
    pass
```

### 5. WebSocket Tests

**File:** `TestWebSocket` in `test_suite.py`

**Tests:**
- WebSocket connection
- Notification delivery
- Connection management
- Message filtering

**Example:**
```python
@pytest.mark.asyncio
async def test_websocket_connection(self):
    """Test WebSocket connection"""
    # Connect to WebSocket endpoint
    # Verify connection is established
    # Send and receive messages
    pass
```

### 6. MFA Tests

**File:** `TestMFA` in `test_suite.py`

**Tests:**
- TOTP setup
- TOTP verification
- Backup codes
- Device trust management

**Example:**
```python
def test_totp_setup(self):
    """Test TOTP setup"""
    # Generate TOTP secret
    # Create QR code
    # Generate backup codes
    # Verify all components are present
    pass
```

### 7. Call Quality Monitoring Tests

**File:** `TestCallQualityMonitoring` in `test_suite.py`

**Tests:**
- Metrics recording
- Quality assessment
- Alert generation
- Call summary

**Example:**
```python
def test_metrics_recording(self):
    """Test recording call quality metrics"""
    # Record sample metrics
    # Verify metrics are stored
    # Check quality level calculation
    pass
```

### 8. Logging Tests

**File:** `TestLogging` in `test_suite.py`

**Tests:**
- Structured JSON logging
- Log rotation
- Error logging
- Log searching

**Example:**
```python
def test_structured_logging(self):
    """Test structured JSON logging"""
    # Log a message
    # Verify JSON format
    # Check all required fields
    pass
```

### 9. Refund Processing Tests

**File:** `TestRefundProcessing` in `test_suite.py`

**Tests:**
- Expired packet refunds
- Cancelled packet refunds
- Refund calculation
- Refund history

**Example:**
```python
def test_expired_packet_refund(self):
    """Test refund for expired packets"""
    # Create expired packet
    # Trigger refund processing
    # Verify refund is processed
    pass
```

### 10. Integration Tests

**File:** `TestIntegration` in `test_suite.py`

**Tests:**
- User registration and login
- Red packet workflow
- Payment workflow
- Call workflow
- MFA workflow

**Example:**
```python
def test_user_registration_and_login(self):
    """Test complete user registration and login flow"""
    # Register new user
    # Login with credentials
    # Verify authentication token
    # Create red packet
    # Claim red packet
    pass
```

---

## Test Fixtures

### User Fixture

```python
@pytest.fixture
def test_user_data():
    return {
        'email': 'test@example.com',
        'name': 'Test User',
        'linkedin_id': 'test_linkedin_id'
    }
```

### Red Packet Fixture

```python
@pytest.fixture
def test_red_packet_data():
    return {
        'sender_id': 1,
        'sender_address': '1ABC...',
        'total_amount': 10000000000000,
        'packet_count': 5,
        'distribution_type': 'random',
        'message': 'Happy New Year!'
    }
```

### Transaction Fixture

```python
@pytest.fixture
def test_transaction_data():
    return {
        'sender_address': '1ABC...',
        'recipient_address': '1DEF...',
        'amount': 1000000000000,
        'token': 'DOT'
    }
```

---

## Test Coverage

### Current Coverage Goals

| Module | Target | Status |
| :--- | :--- | :--- |
| Authentication | 90% | In Progress |
| Red Packets | 95% | In Progress |
| WebRTC | 85% | In Progress |
| Polkadot | 90% | In Progress |
| WebSocket | 80% | In Progress |
| MFA | 95% | In Progress |
| Logging | 85% | In Progress |
| Refunds | 90% | In Progress |

### Generate Coverage Report

```bash
# Generate HTML coverage report
pytest tests/ --cov=src --cov-report=html

# View report
open htmlcov/index.html
```

---

## Continuous Integration

### GitHub Actions

Tests are automatically run on:
- Push to `vercel-beta` branch
- Pull requests
- Scheduled nightly runs

### CI Configuration

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=src
```

---

## Best Practices

### Test Writing

1. **Clear Names:** Use descriptive test names that explain what is being tested
2. **Single Responsibility:** Each test should test one thing
3. **Arrange-Act-Assert:** Structure tests with setup, action, and verification
4. **Use Fixtures:** Reuse common setup code with fixtures
5. **Mock External Services:** Mock APIs and external dependencies

### Test Data

1. **Use Realistic Data:** Test with data that reflects real usage
2. **Test Edge Cases:** Include boundary conditions and error cases
3. **Use Fixtures:** Create reusable test data fixtures
4. **Clean Up:** Ensure tests clean up after themselves

### Assertions

1. **Be Specific:** Use specific assertions rather than generic checks
2. **Clear Messages:** Include helpful error messages
3. **Test One Thing:** Each assertion should verify one behavior
4. **Use Matchers:** Use pytest matchers for complex assertions

---

## Debugging Tests

### Run Single Test

```bash
pytest tests/test_suite.py::TestAuthentication::test_linkedin_oauth_url_generation -v
```

### Run with Print Statements

```bash
pytest tests/ -v -s
```

### Run with Debugger

```bash
pytest tests/ --pdb
```

### Generate Test Report

```bash
pytest tests/ -v --html=report.html
```

---

## Performance Testing

### Load Testing

```bash
# Install locust
pip install locust

# Run load tests
locust -f tests/load_tests.py --host=http://localhost:8000
```

### Profiling

```bash
# Profile test execution
pytest tests/ --profile

# Generate flame graph
pytest tests/ --profile-svg
```

---

## Security Testing

### OWASP Top 10

Tests cover:
- SQL Injection prevention
- CSRF protection
- XSS prevention
- Authentication bypass
- Authorization bypass
- Sensitive data exposure

### Run Security Tests

```bash
pytest tests/ -m security -v
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
| :--- | :--- |
| Import errors | Ensure `src/` is in PYTHONPATH |
| Database errors | Use test database, not production |
| Async test failures | Use `@pytest.mark.asyncio` decorator |
| Mock issues | Verify mock patch paths |

### Debug Output

```bash
# Show all print statements
pytest tests/ -s

# Show local variables on failure
pytest tests/ -l

# Show full diff on assertion failure
pytest tests/ -vv
```

---

## Future Improvements

- [ ] Increase test coverage to 95%
- [ ] Add performance benchmarks
- [ ] Implement load testing
- [ ] Add security scanning
- [ ] Implement mutation testing
- [ ] Add contract testing for APIs

---

## Support

For testing questions or issues:
- GitHub Issues: https://github.com/everest-an/dchat/issues
- Documentation: https://github.com/everest-an/dchat/wiki

---

*Document prepared by: Manus AI*  
*Last Updated: November 16, 2024*
