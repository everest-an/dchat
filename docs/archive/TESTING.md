# Testing Guide

Comprehensive testing guide for dchat.pro including unit tests, integration tests, and end-to-end tests.

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Load Testing](#load-testing)
5. [Security Testing](#security-testing)
6. [CI/CD Integration](#cicd-integration)

---

## Testing Strategy

### Testing Pyramid

```
        /\
       /E2E\         10% - End-to-End Tests
      /------\
     /  Integ \      20% - Integration Tests
    /----------\
   /   Unit     \    70% - Unit Tests
  /--------------\
```

**Unit Tests** (70%):
- Test individual functions and methods
- Fast execution
- High coverage

**Integration Tests** (20%):
- Test API endpoints
- Test database interactions
- Test external service integrations

**End-to-End Tests** (10%):
- Test complete user flows
- Test across frontend and backend
- Slowest but most comprehensive

---

## Backend Testing

### Setup

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Install additional test tools
pip install pytest pytest-cov pytest-mock pytest-asyncio

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::TestAuthentication::test_login_success
```

### Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── test_auth.py             # Authentication tests
├── test_web3.py             # Web3 integration tests
├── test_messages.py         # Message API tests
├── test_groups.py           # Group API tests
├── test_payments.py         # Payment API tests
├── integration/
│   ├── test_api_flow.py     # End-to-end API flows
│   └── test_database.py     # Database integration tests
└── load/
    └── locustfile.py        # Load testing script
```

### Writing Unit Tests

**Example: Testing Authentication**

```python
import pytest
from src.main import app

@pytest.fixture
def client():
    """Create test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_nonce_generation(client):
    """Test nonce generation for authentication."""
    response = client.post('/api/auth/nonce', json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    })
    
    assert response.status_code == 200
    data = response.json
    assert 'nonce' in data
    assert 'timestamp' in data
```

### Testing Best Practices

**1. Use Fixtures for Setup**

```python
@pytest.fixture
def mock_user():
    """Create a mock user for testing."""
    return {
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        'username': 'testuser'
    }

def test_user_creation(mock_user):
    user = create_user(mock_user)
    assert user.address == mock_user['address']
```

**2. Mock External Dependencies**

```python
from unittest.mock import patch, Mock

@patch('src.services.web3_service.Web3')
def test_smart_contract_call(mock_web3):
    """Test smart contract interaction."""
    mock_web3.eth.contract.return_value.functions.createGroup.return_value.call.return_value = 1
    
    group_id = create_group_on_chain('Test Group')
    assert group_id == 1
```

**3. Test Error Cases**

```python
def test_invalid_address(client):
    """Test authentication with invalid address."""
    response = client.post('/api/auth/nonce', json={
        'address': 'invalid'
    })
    
    assert response.status_code == 400
    assert 'invalid address' in response.json['error'].lower()
```

**4. Use Parametrize for Multiple Cases**

```python
@pytest.mark.parametrize('address,expected', [
    ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', True),
    ('invalid', False),
    ('0x123', False),
    ('', False),
])
def test_address_validation(address, expected):
    result = is_valid_ethereum_address(address)
    assert result == expected
```

### Integration Tests

**Example: Testing API Flow**

```python
def test_complete_authentication_flow(client):
    """Test complete authentication flow."""
    # Step 1: Request nonce
    nonce_response = client.post('/api/auth/nonce', json={
        'address': test_address
    })
    assert nonce_response.status_code == 200
    nonce = nonce_response.json['nonce']
    
    # Step 2: Sign message (mocked)
    signature = sign_message(nonce, private_key)
    
    # Step 3: Verify signature
    auth_response = client.post('/api/auth/verify-signature', json={
        'address': test_address,
        'signature': signature,
        'nonce': nonce
    })
    assert auth_response.status_code == 200
    token = auth_response.json['token']
    
    # Step 4: Use token to access protected endpoint
    protected_response = client.get('/api/messages', headers={
        'Authorization': f'Bearer {token}'
    })
    assert protected_response.status_code == 200
```

### Database Tests

**Use Test Database**

```python
# conftest.py
import pytest
from src.database import db

@pytest.fixture(scope='session')
def test_db():
    """Create test database."""
    # Use in-memory SQLite for tests
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    db.create_all()
    yield db
    db.drop_all()

@pytest.fixture
def clean_db(test_db):
    """Clean database before each test."""
    yield test_db
    # Clean up after test
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()
```

---

## Frontend Testing

### Setup

```bash
cd frontend

# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Structure

```
frontend/src/
├── components/
│   ├── __tests__/
│   │   ├── WalletConnect.test.jsx
│   │   └── GroupChat.test.jsx
├── services/
│   ├── __tests__/
│   │   ├── Web3AuthService.test.js
│   │   └── Web3GroupService.test.js
└── utils/
    └── __tests__/
        └── encryption.test.js
```

### Writing Component Tests

**Example: Testing WalletConnect Component**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WalletConnect from '../WalletConnect';

describe('WalletConnect', () => {
  it('should render connect button', () => {
    render(<WalletConnect />);
    const button = screen.getByText(/connect wallet/i);
    expect(button).toBeInTheDocument();
  });

  it('should call connectWallet on button click', async () => {
    const mockConnect = vi.fn();
    render(<WalletConnect onConnect={mockConnect} />);
    
    const button = screen.getByText(/connect wallet/i);
    fireEvent.click(button);
    
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should display address after connection', async () => {
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    render(<WalletConnect address={mockAddress} />);
    
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });
});
```

### Testing Services

See `frontend/src/services/__tests__/Web3AuthService.test.js` for comprehensive service testing examples.

### E2E Tests (Playwright)

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

**Example E2E Test**:

```javascript
import { test, expect } from '@playwright/test';

test('complete authentication flow', async ({ page }) => {
  // Navigate to app
  await page.goto('https://dchat.pro');
  
  // Click connect wallet
  await page.click('text=Connect Wallet');
  
  // Wait for MetaMask popup (in test environment)
  // ... handle MetaMask interaction ...
  
  // Verify logged in
  await expect(page.locator('.user-address')).toBeVisible();
});
```

---

## Load Testing

### Using Locust

See `backend/tests/load/locustfile.py` for the complete load testing script.

**Run Load Test**:

```bash
cd backend/tests/load

# Install Locust
pip install locust

# Run with web UI
locust -f locustfile.py --host=https://api.dchat.pro

# Run headless
locust -f locustfile.py --host=https://api.dchat.pro \
    --users 1000 --spawn-rate 10 --run-time 5m --headless
```

**Load Test Scenarios**:

1. **Normal Load**: 100 users, 10 minutes
2. **Peak Load**: 500 users, 5 minutes
3. **Stress Test**: 1000+ users until failure
4. **Spike Test**: 100 → 1000 users in 1 minute
5. **Endurance Test**: 200 users, 24 hours

---

## Security Testing

### Automated Security Scanning

**1. Dependency Scanning**

```bash
# Backend
pip install safety
safety check

# Frontend
npm audit
npm audit fix
```

**2. SAST (Static Application Security Testing)**

```bash
# Install Bandit for Python
pip install bandit

# Run security scan
bandit -r backend/src/

# Frontend
npm install --save-dev eslint-plugin-security
```

**3. DAST (Dynamic Application Security Testing)**

```bash
# Use OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t https://api.dchat.pro
```

### Manual Security Testing

**1. Authentication Tests**
- [ ] Test weak passwords (if applicable)
- [ ] Test account lockout
- [ ] Test session timeout
- [ ] Test token expiration
- [ ] Test signature replay attacks

**2. Authorization Tests**
- [ ] Test accessing other users' data
- [ ] Test privilege escalation
- [ ] Test group permission bypass

**3. Input Validation Tests**
- [ ] Test XSS attacks
- [ ] Test SQL injection
- [ ] Test command injection
- [ ] Test path traversal

**4. Rate Limiting Tests**
- [ ] Test rate limit bypass
- [ ] Test distributed rate limiting

---

## CI/CD Integration

### GitHub Actions

Tests are automatically run on every push and pull request.

See `.github/workflows/backend-ci.yml` and `.github/workflows/frontend-ci.yml`.

**Backend CI**:
```yaml
- name: Run tests
  run: |
    cd backend
    pytest --cov=src --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./backend/coverage.xml
```

**Frontend CI**:
```yaml
- name: Run tests
  run: |
    cd frontend
    npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./frontend/coverage/coverage-final.json
```

### Test Coverage Goals

- **Overall**: > 80%
- **Critical paths** (auth, payments): > 95%
- **New code**: > 90%

---

## Running All Tests

### Quick Test

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

### Full Test Suite

```bash
# Run all tests with coverage
./scripts/run_all_tests.sh
```

**Script Content**:

```bash
#!/bin/bash

echo "Running backend tests..."
cd backend
pytest --cov=src --cov-report=html --cov-report=term
BACKEND_EXIT=$?

echo "Running frontend tests..."
cd ../frontend
npm test -- --coverage
FRONTEND_EXIT=$?

echo "Running load tests (quick)..."
cd ../backend/tests/load
locust -f locustfile.py --host=https://staging.dchat.pro \
    --users 50 --spawn-rate 5 --run-time 1m --headless
LOAD_EXIT=$?

# Exit with error if any test failed
if [ $BACKEND_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ] || [ $LOAD_EXIT -ne 0 ]; then
    echo "Tests failed!"
    exit 1
fi

echo "All tests passed!"
exit 0
```

---

## Best Practices

### General

1. **Write tests first** (TDD when possible)
2. **Keep tests independent** (no shared state)
3. **Use descriptive test names**
4. **Test one thing per test**
5. **Mock external dependencies**
6. **Clean up after tests**

### Code Coverage

- Aim for > 80% coverage
- Focus on critical paths
- Don't chase 100% coverage
- Coverage != quality

### Performance

- Keep unit tests fast (< 1s each)
- Run integration tests in CI only
- Use test database (in-memory)
- Parallelize tests when possible

### Maintenance

- Update tests with code changes
- Remove obsolete tests
- Refactor test code
- Document complex test scenarios

---

## Troubleshooting

### Common Issues

**1. Tests fail locally but pass in CI**
- Check environment variables
- Check database state
- Check file permissions

**2. Flaky tests**
- Add waits for async operations
- Mock time-dependent code
- Isolate test data

**3. Slow tests**
- Use test database
- Mock external APIs
- Parallelize tests

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Locust Documentation](https://docs.locust.io/)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
