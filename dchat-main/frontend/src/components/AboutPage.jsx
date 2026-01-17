import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Globe, Zap, Heart, Target } from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * About Page Component
 * Provides information about Dchat's mission, vision, and team
 */
const AboutPage = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Privacy First',
      description: 'We believe privacy is a fundamental human right. All communications are end-to-end encrypted.'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Decentralization',
      description: 'Built on Web3 principles, ensuring no single entity controls your data or communications.'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Community Driven',
      description: 'Open-source and community-governed, evolving based on user needs and feedback.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Innovation',
      description: 'Pushing boundaries by combining blockchain, AI, and modern communication technologies.'
    }
  ];

  const milestones = [
    { year: '2024 Q1', event: 'Project Inception', description: 'Dchat concept and initial development' },
    { year: '2024 Q2', event: 'Alpha Release', description: 'Core messaging features and wallet integration' },
    { year: '2024 Q3', event: 'Beta Launch', description: 'Public beta with enhanced features' },
    { year: '2024 Q4', event: 'Official Launch', description: 'Full platform release with all features' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <DchatLogo size={32} className="text-black" />
              <h1 className="text-xl font-bold text-black">About Dchat</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Redefining Business Communication for the Web3 Era
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Dchat is a decentralized communication platform that combines the security of blockchain 
            with the convenience of modern messaging. We're building the future of professional 
            communication—private, secure, and truly owned by users.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-10 h-10 text-black" />
              <h3 className="text-2xl font-bold text-black">Our Mission</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              To empower professionals and businesses with a secure, decentralized communication 
              platform that respects privacy, ensures data ownership, and enables seamless 
              collaboration in the Web3 ecosystem.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="w-10 h-10 text-black" />
              <h3 className="text-2xl font-bold text-black">Our Vision</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              A world where communication is free from surveillance, censorship, and centralized 
              control. Where users truly own their data and can communicate with confidence, 
              knowing their privacy is protected by cryptography and blockchain technology.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">Our Core Values</h3>
            <p className="text-xl text-gray-600">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 text-black">
                  {value.icon}
                </div>
                <h4 className="text-lg font-semibold text-black mb-2">{value.title}</h4>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-black mb-4">Our Journey</h3>
          <p className="text-xl text-gray-600">
            Key milestones in Dchat's development
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-300 hidden md:block"></div>

          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <div key={index} className={`flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="flex-1 md:pr-8 md:text-right">
                  {index % 2 === 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                      <div className="text-sm font-semibold text-gray-500 mb-2">{milestone.year}</div>
                      <h4 className="text-xl font-bold text-black mb-2">{milestone.event}</h4>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  )}
                </div>

                <div className="relative flex items-center justify-center w-12 h-12 bg-black rounded-full border-4 border-white shadow-lg z-10">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>

                <div className="flex-1 md:pl-8">
                  {index % 2 !== 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                      <div className="text-sm font-semibold text-gray-500 mb-2">{milestone.year}</div>
                      <h4 className="text-xl font-bold text-black mb-2">{milestone.event}</h4>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">Built with Modern Technology</h3>
            <p className="text-xl text-gray-600">
              Leveraging the best tools and frameworks
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: 'React', description: 'UI Framework' },
              { name: 'Ethereum', description: 'Blockchain' },
              { name: 'IPFS', description: 'Storage' },
              { name: 'Socket.IO', description: 'Real-time' },
              { name: 'Web3.js', description: 'Blockchain SDK' },
              { name: 'Node.js', description: 'Backend' },
              { name: 'MongoDB', description: 'Database' },
              { name: 'AWS', description: 'Cloud Infrastructure' }
            ].map((tech, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
                <div className="text-lg font-bold text-black mb-1">{tech.name}</div>
                <div className="text-sm text-gray-600">{tech.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Open Source & Community Driven</h3>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Dchat is open source and welcomes contributions from developers worldwide. 
            Join us in building the future of decentralized communication.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open('https://github.com/everest-an/dchat', '_blank')}
              className="px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-semibold"
            >
              View on GitHub
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-all duration-300 font-semibold"
            >
              Get in Touch
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <DchatLogo size={32} className="text-white" />
            <span className="text-xl font-bold">Dchat</span>
          </div>
          <p className="text-gray-400 mb-4">
            Secure, Decentralized, Professional Communication
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
              Terms of Service
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">
              Contact
            </button>
          </div>
          <div className="mt-8 text-sm text-gray-500">
            © 2024 Dchat. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
