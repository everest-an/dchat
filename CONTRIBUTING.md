# Contributing to Dchat

Thank you for your interest in contributing to Dchat! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Git
- Basic knowledge of React, Flask, and Web3 technologies

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/dchat.git
   cd dchat
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

## 🏗️ Project Structure

```
dchat/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── assets/          # Static assets
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Flask backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # Data models
│   │   └── main.py         # Application entry point
│   └── requirements.txt
├── README.md
├── DEPLOYMENT.md
└── CONTRIBUTING.md
```

## 🎯 How to Contribute

### 1. Issues
- Check existing issues before creating new ones
- Use clear, descriptive titles
- Provide detailed descriptions and reproduction steps
- Label issues appropriately

### 2. Pull Requests
- Fork the repository
- Create a feature branch: `git checkout -b feature/amazing-feature`
- Make your changes
- Test thoroughly
- Commit with clear messages
- Push to your fork
- Open a pull request

### 3. Code Style

#### Frontend (React/JavaScript)
- Use ES6+ features
- Follow React best practices
- Use meaningful component and variable names
- Add PropTypes for components
- Write clean, readable code

#### Backend (Python/Flask)
- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Keep functions small and focused
- Handle errors gracefully

### 4. Commit Messages
Use conventional commit format:
```
type(scope): description

feat(auth): add wallet authentication
fix(chat): resolve message encryption issue
docs(readme): update installation instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Backend Testing
```bash
cd backend
python -m pytest
```

### Manual Testing
- Test all major user flows
- Verify responsive design
- Check Web3 wallet integration
- Test API endpoints

## 📋 Development Guidelines

### Security
- Never commit sensitive data (API keys, secrets)
- Use environment variables for configuration
- Validate all user inputs
- Follow Web3 security best practices

### Performance
- Optimize React components (memo, useMemo, useCallback)
- Minimize API calls
- Use efficient database queries
- Implement proper caching

### Accessibility
- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation
- Test with screen readers

### Web3 Integration
- Handle wallet connection errors gracefully
- Support multiple wallet providers
- Implement proper transaction handling
- Follow Web3 UX best practices

## 🐛 Bug Reports

When reporting bugs, include:
- Operating system and browser
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or error messages
- Console logs if applicable

## 💡 Feature Requests

For new features:
- Explain the use case
- Describe the proposed solution
- Consider alternative approaches
- Discuss potential impact

## 🔄 Development Workflow

1. **Planning**
   - Discuss major changes in issues first
   - Break down large features into smaller tasks
   - Consider backwards compatibility

2. **Development**
   - Write code following style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Review**
   - Self-review your code
   - Test thoroughly
   - Request reviews from maintainers

4. **Deployment**
   - Ensure CI/CD passes
   - Update version numbers if needed
   - Monitor for issues after deployment

## 📞 Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code reviews and discussions
- **Discussions**: General questions and ideas

## 🏷️ Labels

We use these labels to organize issues and PRs:
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to docs
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority-high`: High priority items

## 🎖️ Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Invited to join the contributor team (for regular contributors)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Dchat better! 🚀

