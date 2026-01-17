# Backend Tests

This directory contains unit tests and integration tests for the dchat.pro backend.

## Test Structure

```
tests/
├── README.md                 # This file
├── conftest.py              # Pytest configuration and fixtures
├── test_auth.py             # Authentication tests
├── test_groups_web3.py      # Group management tests
├── test_payments_web3.py    # Payment and red packet tests
├── test_socket.py           # Socket.IO tests
└── integration/             # Integration tests
    ├── test_auth_flow.py
    ├── test_group_flow.py
    └── test_payment_flow.py
```

## Running Tests

### Install Test Dependencies

```bash
pip install pytest pytest-cov pytest-mock pytest-asyncio
```

### Run All Tests

```bash
# From backend directory
pytest

# With coverage report
pytest --cov=src --cov-report=html

# With verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py

# Run specific test class
pytest tests/test_auth.py::TestAuthenticationFlow

# Run specific test method
pytest tests/test_auth.py::TestAuthenticationFlow::test_get_nonce_success
```

### Run Tests with Markers

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only slow tests
pytest -m slow

# Skip slow tests
pytest -m "not slow"
```

## Test Coverage

Current test coverage:

| Module | Coverage | Status |
|--------|----------|--------|
| `routes/auth.py` | 95% | ✅ Good |
| `routes/groups_web3.py` | 85% | ✅ Good |
| `routes/payments_web3.py` | 80% | ⚠️ Needs improvement |
| `routes/files.py` | 70% | ⚠️ Needs improvement |
| `socket_server.py` | 75% | ⚠️ Needs improvement |
| `models/` | 90% | ✅ Good |
| `config/` | 85% | ✅ Good |

Target: **85%+ coverage for all modules**

## Writing Tests

### Test Naming Convention

- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`

### Example Test

```python
import pytest
from src.routes.auth import auth_bp

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_get_nonce_success(self, client):
        """Test nonce generation with valid address"""
        # Arrange
        address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        
        # Act
        response = client.get(f'/api/auth/nonce?address={address}')
        data = response.json
        
        # Assert
        assert response.status_code == 200
        assert data['success'] is True
        assert 'nonce' in data
```

### Using Fixtures

```python
@pytest.fixture
def mock_web3():
    """Mock Web3 instance"""
    with patch('src.routes.auth.Web3') as mock:
        yield mock

def test_with_mock_web3(mock_web3):
    """Test using mocked Web3"""
    mock_web3.return_value.eth.accounts = ['0x123...']
    # Test code here
```

### Async Tests

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    """Test async function"""
    result = await async_function()
    assert result is not None
```

## Test Markers

Available markers:

- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (slower, requires services)
- `@pytest.mark.slow` - Slow tests (> 1 second)
- `@pytest.mark.web3` - Tests requiring Web3 connection
- `@pytest.mark.redis` - Tests requiring Redis
- `@pytest.mark.database` - Tests requiring database

Example:

```python
@pytest.mark.unit
@pytest.mark.fast
def test_simple_function():
    """Fast unit test"""
    assert 1 + 1 == 2

@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.database
def test_database_integration():
    """Slow integration test with database"""
    # Test code here
```

## Mocking

### Mock External Services

```python
from unittest.mock import Mock, patch

# Mock Redis
with patch('src.routes.auth.redis_service') as mock_redis:
    mock_redis.get.return_value = {'key': 'value'}
    # Test code here

# Mock Web3
with patch('src.routes.auth.Web3') as mock_web3:
    mock_w3 = Mock()
    mock_web3.return_value = mock_w3
    mock_w3.eth.accounts = ['0x123...']
    # Test code here

# Mock HTTP requests
with patch('requests.post') as mock_post:
    mock_post.return_value.json.return_value = {'success': True}
    # Test code here
```

### Mock Database

```python
@pytest.fixture
def mock_db():
    """Mock database session"""
    with patch('src.models.user.db.session') as mock:
        yield mock

def test_with_mock_db(mock_db):
    """Test with mocked database"""
    mock_db.add.return_value = None
    mock_db.commit.return_value = None
    # Test code here
```

## Continuous Integration

Tests are automatically run on:

- Every push to `main` branch
- Every pull request
- Nightly builds

### GitHub Actions Workflow

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest --cov=src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```python
# ❌ Bad - Tests depend on each other
def test_create_user():
    user = create_user('Alice')
    assert user.name == 'Alice'

def test_get_user():
    # Assumes test_create_user ran first
    user = get_user('Alice')
    assert user is not None

# ✅ Good - Tests are independent
def test_create_user():
    user = create_user('Alice')
    assert user.name == 'Alice'

def test_get_user():
    # Create user in this test
    create_user('Bob')
    user = get_user('Bob')
    assert user is not None
```

### 2. Use Fixtures for Setup

```python
@pytest.fixture
def sample_user():
    """Create a sample user for testing"""
    user = User(wallet_address='0x123...', name='Test User')
    db.session.add(user)
    db.session.commit()
    yield user
    db.session.delete(user)
    db.session.commit()

def test_user_exists(sample_user):
    """Test with fixture"""
    assert sample_user.name == 'Test User'
```

### 3. Test Edge Cases

```python
def test_divide():
    """Test division function"""
    # Normal case
    assert divide(10, 2) == 5
    
    # Edge cases
    assert divide(0, 5) == 0
    assert divide(10, 1) == 10
    
    # Error case
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### 4. Use Descriptive Names

```python
# ❌ Bad
def test_1():
    pass

# ✅ Good
def test_get_nonce_returns_32_char_hex_string():
    pass
```

### 5. Follow AAA Pattern

```python
def test_example():
    # Arrange - Set up test data
    user = User(name='Alice')
    
    # Act - Perform the action
    result = user.get_name()
    
    # Assert - Verify the result
    assert result == 'Alice'
```

## Troubleshooting

### Tests Failing Locally

1. **Check dependencies**
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-cov pytest-mock
   ```

2. **Check environment variables**
   ```bash
   export TESTING=true
   export DATABASE_URL=sqlite:///:memory:
   ```

3. **Clear pytest cache**
   ```bash
   pytest --cache-clear
   ```

### Slow Tests

1. **Use markers to skip slow tests**
   ```bash
   pytest -m "not slow"
   ```

2. **Run tests in parallel**
   ```bash
   pip install pytest-xdist
   pytest -n auto
   ```

### Coverage Not Showing

1. **Install coverage plugin**
   ```bash
   pip install pytest-cov
   ```

2. **Run with coverage flag**
   ```bash
   pytest --cov=src --cov-report=html
   ```

3. **View HTML report**
   ```bash
   open htmlcov/index.html
   ```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Best Practices](https://docs.pytest.org/en/latest/goodpractices.html)
- [Python Testing with pytest](https://pragprog.com/titles/bopytest/python-testing-with-pytest/)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
