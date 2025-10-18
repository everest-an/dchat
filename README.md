# Dchat - Secure Business Communication Platform

Dchat is a Web3-native business communication platform that combines end-to-end encryption, blockchain storage, and professional networking features.

## 🚀 Features

- **Wallet Authentication**: Secure login via Web3 wallets
- **LinkedIn Integration**: Sync professional profiles and company information
- **End-to-End Encryption**: Quantum-resistant encryption for all communications
- **Blockchain Storage**: Decentralized message storage ensuring data sovereignty
- **Project Collaboration**: Share projects, find partners, showcase resources
- **Professional Networking**: Business moments and verified company profiles
- **Integrated Payments**: Crypto payments within chat conversations

## 🏗️ Architecture

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Web3 Integration**: Wallet connection and blockchain interaction
- **Responsive Design**: Mobile-first approach with desktop support

### Backend
- **Framework**: Flask (Python)
- **API**: RESTful API with CORS support
- **Authentication**: JWT-based authentication
- **Database**: SQLite (development) / PostgreSQL (production)

## 📱 Demo

Check out the live demo of Dchat in action. The application showcases all core features including wallet authentication, secure messaging, project collaboration, and professional networking.

For deployment instructions, see the [Deployment](#-deployment) section below.

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs/) directory:

- **[📖 Whitepaper](./docs/whitepaper/dchat-whitepaper.md)** - Technical and business overview
- **[💼 Business Plan](./docs/business/business-plan.md)** - Market analysis and strategy  
- **[🎯 Pitch Deck](./docs/pitch-deck/dchat_pitch_deck_with_ui.pdf)** - Investor presentation
- **[👥 User Manual](./docs/user-manual/dchat_user_manual_en.md)** - User guide and features
- **[🔧 Technical Specs](./docs/technical/technical-specifications.md)** - Architecture details
- **[🎨 Design System](./docs/design/dchat_design_system.md)** - UI/UX guidelines

Visit the [Documentation Index](./docs/README.md) for a complete overview.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Git

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend API will be available at `http://localhost:5000`

### Full Stack Development

1. Start the backend server
2. Start the frontend development server
3. The frontend will proxy API requests to the backend

## 🚀 Deployment

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

### Backend Deployment
```bash
cd backend
# Deploy using your preferred method (Docker, Heroku, AWS, etc.)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=your-database-url
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Web3 Configuration

The frontend includes Web3 wallet integration. Make sure to configure:
- Supported wallet providers
- Blockchain networks
- Smart contract addresses

## 🏢 Business Features

### Project Management
- Create and manage business projects
- Track project progress and milestones
- Find collaboration opportunities
- Showcase available resources

### Professional Networking
- LinkedIn profile synchronization
- Company verification
- Business card integration
- Professional reputation system

### Secure Communication
- End-to-end encrypted messaging
- Quantum-resistant encryption
- Blockchain message storage
- Decentralized architecture

## 🔐 Security

- **End-to-End Encryption**: All messages are encrypted before transmission
- **Quantum-Resistant**: Future-proof encryption algorithms
- **Decentralized Storage**: Messages stored on blockchain
- **Wallet Authentication**: No passwords, only cryptographic signatures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced project management features
- [ ] Multi-chain support
- [ ] Enterprise SSO integration
- [ ] Advanced analytics and reporting
- [ ] Third-party integrations (Slack, Teams, etc.)

## 📞 Contact

For questions, suggestions, or business inquiries, please reach out through:
- GitHub Issues
- Project discussions

---

**Dchat** - Building the future of secure business communication with Web3 technology.

