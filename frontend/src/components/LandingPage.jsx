import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Zap, Globe, Lock, Users } from 'lucide-react';

/**
 * Landing Page - 公开的首页
 * 类似 WeChat/Telegram 的欢迎页面
 * 展示产品特性和登录/注册入口
 */
const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="w-12 h-12 text-blue-500" />,
      title: '端到端加密',
      description: '所有消息都经过端到端加密，确保您的隐私安全'
    },
    {
      icon: <Lock className="w-12 h-12 text-green-500" />,
      title: '区块链存储',
      description: '消息存储在区块链上，永久保存，不可篡改'
    },
    {
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
      title: '即时支付',
      description: '集成加密货币支付，轻松完成商务交易'
    },
    {
      icon: <Users className="w-12 h-12 text-purple-500" />,
      title: '专业网络',
      description: 'LinkedIn 集成，验证身份，建立可信商务关系'
    },
    {
      icon: <Globe className="w-12 h-12 text-indigo-500" />,
      title: 'Web3 原生',
      description: '基于 Web3 技术，真正的去中心化通讯'
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-pink-500" />,
      title: '智能协作',
      description: '项目管理、文件共享、团队协作一站式解决'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dchat
              </h1>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
            >
              登录 / 注册
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            安全商务通讯
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              由 Web3 驱动
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Dchat 是新一代去中心化商务通讯平台，结合端到端加密、区块链存储和专业网络功能，
            为您的商务沟通提供最高级别的安全保障。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg"
            >
              开始使用
            </button>
            <button
              onClick={() => window.open('https://github.com/everest-an/dchat', '_blank')}
              className="px-8 py-4 bg-white text-gray-700 rounded-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg border-2 border-gray-200"
            >
              了解更多
            </button>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 shadow-2xl">
            <div className="aspect-video bg-white rounded-lg shadow-inner flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">应用预览</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              为什么选择 Dchat？
            </h3>
            <p className="text-xl text-gray-600">
              企业级安全，Web3 技术，专业商务通讯的最佳选择
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
              >
                <div className="mb-4">{feature.icon}</div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
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
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            准备好开始了吗？
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            加入 Dchat，体验下一代安全商务通讯
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:shadow-2xl transition-all duration-300 font-bold text-lg"
          >
            立即开始使用
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-lg">Dchat</span>
              </div>
              <p className="text-sm">
                安全商务通讯平台
                <br />
                由 Web3 技术驱动
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">产品</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">功能特性</a></li>
                <li><a href="#" className="hover:text-white transition-colors">价格方案</a></li>
                <li><a href="#" className="hover:text-white transition-colors">企业版</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">资源</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/everest-an/dchat" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">文档</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">支持</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
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
