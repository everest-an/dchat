import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Lock, Zap, Globe, MessageSquare, Users, 
  Briefcase, CreditCard, FileText, Bell, Search, 
  Smartphone, Cloud, Code, TrendingUp, Award, CheckCircle 
} from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * Features Page
 * Comprehensive overview of all Dchat features
 */
const FeaturesPage = () => {
  const navigate = useNavigate();

  const featureCategories = [
    {
      title: 'Security & Privacy',
      icon: <Shield className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <Lock className="w-8 h-8" />,
          title: 'End-to-End Encryption',
          description: 'Military-grade encryption ensures your messages are completely private. Only you and your recipient can read them.'
        },
        {
          icon: <Shield className="w-8 h-8" />,
          title: 'Quantum-Resistant Encryption',
          description: 'Future-proof your communications with post-quantum cryptography, protecting against future quantum computing threats.'
        },
        {
          icon: <Globe className="w-8 h-8" />,
          title: 'Blockchain Storage',
          description: 'Messages stored on blockchain with cryptographic hashes, ensuring immutability and permanent record-keeping.'
        },
        {
          icon: <Code className="w-8 h-8" />,
          title: 'Zero-Knowledge Architecture',
          description: 'We cannot access your encrypted data. Your privacy keys remain exclusively in your control.'
        }
      ]
    },
    {
      title: 'Communication',
      icon: <MessageSquare className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <MessageSquare className="w-8 h-8" />,
          title: 'Real-Time Messaging',
          description: 'Instant message delivery with Socket.IO, typing indicators, and read receipts for seamless communication.'
        },
        {
          icon: <Users className="w-8 h-8" />,
          title: 'Group Chat',
          description: 'Create unlimited group chats with team members, clients, and partners. Manage permissions and roles.'
        },
        {
          icon: <FileText className="w-8 h-8" />,
          title: 'File Sharing',
          description: 'Share documents, images, and files securely. All files are encrypted before transmission.'
        },
        {
          icon: <Search className="w-8 h-8" />,
          title: 'Message Search',
          description: 'Powerful search functionality to find any message, file, or conversation instantly.'
        }
      ]
    },
    {
      title: 'Professional Networking',
      icon: <Users className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <Users className="w-8 h-8" />,
          title: 'LinkedIn Integration',
          description: 'Connect your LinkedIn account to verify your professional identity and import your network.'
        },
        {
          icon: <Briefcase className="w-8 h-8" />,
          title: 'Living Portfolio',
          description: 'Showcase your skills, projects, and achievements with a dynamic blockchain-based portfolio.'
        },
        {
          icon: <TrendingUp className="w-8 h-8" />,
          title: 'Opportunity Matching',
          description: 'AI-powered matching connects you with relevant business opportunities, partners, and projects.'
        },
        {
          icon: <Award className="w-8 h-8" />,
          title: 'Verified Credentials',
          description: 'Store and share verified credentials, certifications, and endorsements on the blockchain.'
        }
      ]
    },
    {
      title: 'Business Collaboration',
      icon: <Briefcase className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <Briefcase className="w-8 h-8" />,
          title: 'Project Management',
          description: 'Manage projects, assign tasks, track progress, and collaborate with team members in one place.'
        },
        {
          icon: <FileText className="w-8 h-8" />,
          title: 'Smart Contracts',
          description: 'Create and execute smart contracts for project agreements, ensuring transparency and trust.'
        },
        {
          icon: <Users className="w-8 h-8" />,
          title: 'Team Collaboration',
          description: 'Invite team members, assign roles, and collaborate on projects with built-in tools.'
        },
        {
          icon: <Cloud className="w-8 h-8" />,
          title: 'Document Management',
          description: 'Centralized document storage with version control and access management.'
        }
      ]
    },
    {
      title: 'Payments & Transactions',
      icon: <CreditCard className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <CreditCard className="w-8 h-8" />,
          title: 'Cryptocurrency Payments',
          description: 'Send and receive payments in cryptocurrency directly within conversations. Support for ETH, USDC, and more.'
        },
        {
          icon: <Lock className="w-8 h-8" />,
          title: 'Payment Escrow',
          description: 'Smart contract-based escrow ensures safe transactions. Funds released only when conditions are met.'
        },
        {
          icon: <Zap className="w-8 h-8" />,
          title: 'Instant Settlement',
          description: 'Blockchain-based payments settle instantly, eliminating delays and intermediaries.'
        },
        {
          icon: <FileText className="w-8 h-8" />,
          title: 'Transaction History',
          description: 'Complete transparent record of all transactions stored immutably on the blockchain.'
        }
      ]
    },
    {
      title: 'Platform Features',
      icon: <Smartphone className="w-12 h-12 text-black" />,
      features: [
        {
          icon: <Smartphone className="w-8 h-8" />,
          title: 'Responsive Design',
          description: 'Seamless experience across desktop, tablet, and mobile devices with adaptive UI.'
        },
        {
          icon: <Bell className="w-8 h-8" />,
          title: 'Smart Notifications',
          description: 'Customizable notifications keep you informed without overwhelming you.'
        },
        {
          icon: <Globe className="w-8 h-8" />,
          title: 'Multi-Language Support',
          description: 'Available in multiple languages with easy language switching.'
        },
        {
          icon: <Cloud className="w-8 h-8" />,
          title: 'Cloud Sync',
          description: 'Your data syncs across all devices, ensuring you never miss a message.'
        }
      ]
    }
  ];

  const comparisonFeatures = [
    { feature: 'End-to-End Encryption', dchat: true, whatsapp: true, slack: false, telegram: true },
    { feature: 'Blockchain Storage', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Cryptocurrency Payments', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Smart Contracts', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Professional Portfolio', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Opportunity Matching', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Quantum-Resistant Encryption', dchat: true, whatsapp: false, slack: false, telegram: false },
    { feature: 'Decentralized', dchat: true, whatsapp: false, slack: false, telegram: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DchatLogo size={40} className="text-black" />
              <h1 className="text-2xl font-bold text-black">Dchat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-black transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Everything You Need for<br />Secure Business Communication
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Dchat combines cutting-edge encryption, blockchain technology, and professional networking 
            to create the ultimate platform for business communication.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {featureCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-20">
            <div className="flex items-center space-x-4 mb-8">
              {category.icon}
              <h2 className="text-3xl font-bold text-black">{category.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {category.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 text-black">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-black mb-2">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Comparison Table */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-black text-center mb-4">
            How Dchat Compares
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            See how Dchat stacks up against other communication platforms
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-black">Dchat</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-600">WhatsApp</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-600">Slack</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-600">Telegram</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((item, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-6 py-4 text-sm text-gray-700">{item.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {item.dchat ? (
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.whatsapp ? (
                        <CheckCircle className="w-6 h-6 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.slack ? (
                        <CheckCircle className="w-6 h-6 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.telegram ? (
                        <CheckCircle className="w-6 h-6 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Experience the Future?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of professionals using Dchat for secure business communication
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-bold text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-full hover:bg-white hover:text-black transition-all duration-300 font-bold text-lg"
            >
              View Pricing
            </button>
          </div>
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
                Secure Business Communication
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">Documentation</button></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/everest-an/dchat" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button></li>
                <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button></li>
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

export default FeaturesPage;
