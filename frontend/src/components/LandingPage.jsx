import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Zap, Globe, Lock, Users } from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * Landing Page - Public Homepage
 * Similar to WeChat/Telegram welcome page
 * Showcases product features and login/register entry
 */
const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="w-12 h-12 text-gray-800" />,
      title: 'End-to-End Encryption',
      description: 'All messages are end-to-end encrypted, ensuring your privacy and security'
    },
    {
      icon: <Lock className="w-12 h-12 text-gray-800" />,
      title: 'Blockchain Storage',
      description: 'Messages stored on blockchain, permanently preserved and immutable'
    },
    {
      icon: <Zap className="w-12 h-12 text-gray-800" />,
      title: 'Instant Payment',
      description: 'Integrated cryptocurrency payments for seamless business transactions'
    },
    {
      icon: <Users className="w-12 h-12 text-gray-800" />,
      title: 'Professional Network',
      description: 'LinkedIn integration to verify identity and build trusted business relationships'
    },
    {
      icon: <Globe className="w-12 h-12 text-gray-800" />,
      title: 'Web3 Native',
      description: 'Built on Web3 technology for truly decentralized communication'
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-gray-800" />,
      title: 'Smart Collaboration',
      description: 'Project management, file sharing, and team collaboration in one place'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DchatLogo size={40} className="text-black" />
              <h1 className="text-2xl font-bold text-black">
                Dchat
              </h1>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
              Web3 Business Communication
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Dchat is a private, secure, and anonymous way for you and your clients to communicate. Bring blockchain to the people, guarantee contracts' safety and security, and the messages are permanently stored.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-semibold text-lg"
              >
                Get Started
              </button>
              <button
                onClick={() => window.open('https://github.com/everest-an/dchat', '_blank')}
                className="px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-semibold text-lg border-2 border-black"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right: Visual Element */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="aspect-square bg-black rounded-lg flex items-center justify-center">
                <DchatLogo size={200} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-black mb-4">
              Why Choose Dchat?
            </h3>
            <p className="text-xl text-gray-600">
              Enterprise-grade security, Web3 technology, the best choice for professional business communication
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200"
              >
                <div className="mb-4">{feature.icon}</div>
                <h4 className="text-xl font-bold text-black mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Join Dchat and experience the next generation of secure business communication
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-bold text-lg"
          >
            Start Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <DchatLogo size={32} className="text-white" />
                <span className="text-white font-bold text-lg">Dchat</span>
              </div>
              <p className="text-sm">
                Web3 Business Chat Platform
                <br />
                Secure & Decentralized Communication
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Enterprise</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Resources</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/everest-an/dchat" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/contact" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Dchat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
