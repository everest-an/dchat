import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Bell } from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * Privacy Policy Page
 * Explains how Dchat collects, uses, and protects user data
 */
const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const privacyFeatures = [
    {
      icon: <Lock className="w-8 h-8 text-black" />,
      title: 'End-to-End Encryption',
      description: 'All messages are encrypted on your device before transmission'
    },
    {
      icon: <Database className="w-8 h-8 text-black" />,
      title: 'Blockchain Storage',
      description: 'Messages stored on blockchain, immutable and decentralized'
    },
    {
      icon: <Eye className="w-8 h-8 text-black" />,
      title: 'No Third-Party Access',
      description: 'We cannot read your encrypted messages'
    },
    {
      icon: <Shield className="w-8 h-8 text-black" />,
      title: 'Quantum-Resistant',
      description: 'Optional post-quantum cryptography for future-proof security'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <DchatLogo size={32} className="text-black" />
              <span className="text-xl font-bold text-black">Dchat</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-300">
            Your privacy is our top priority. Learn how we protect your data.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Last Updated: November 2, 2025
          </p>
        </div>
      </section>

      {/* Privacy Features */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {privacyFeatures.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold text-black mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">1. Introduction</h2>
              <p>
                Welcome to Dchat's Privacy Policy. This policy explains how we collect, use, disclose, and safeguard 
                your information when you use our decentralized business communication platform. We are committed to 
                protecting your privacy and ensuring the security of your personal information.
              </p>
              <p className="mt-4">
                By using Dchat, you agree to the collection and use of information in accordance with this policy. If 
                you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.1 Information You Provide</h3>
              <p className="mb-4">We collect information that you voluntarily provide when using our Service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Wallet address (MetaMask), email address, phone number, username, profile picture</li>
                <li><strong>Profile Data:</strong> Bio, skills, work experience, portfolio projects, credentials</li>
                <li><strong>Communication Data:</strong> Messages, files, images, and other content you share (encrypted)</li>
                <li><strong>Payment Information:</strong> Cryptocurrency wallet addresses, transaction history (on-chain data)</li>
                <li><strong>LinkedIn Data:</strong> If you connect your LinkedIn account, we may access your profile information and connections</li>
              </ul>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <p className="mb-4">We automatically collect certain information when you use our Service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device model, IP address</li>
                <li><strong>Log Data:</strong> Access times, error logs, performance metrics</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies to maintain your session and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.3 Blockchain Data</h3>
              <p>
                Certain data is stored on public blockchains (Ethereum, Polygon) and is publicly accessible. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Wallet addresses</li>
                <li>Transaction hashes and amounts</li>
                <li>Smart contract interactions</li>
                <li>Encrypted message hashes (content is encrypted and not readable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Provide the Service:</strong> Enable messaging, file sharing, project collaboration, and payment features</li>
                <li><strong>Account Management:</strong> Create and maintain your account, authenticate your identity</li>
                <li><strong>Communication:</strong> Send you service updates, security alerts, and support messages</li>
                <li><strong>Personalization:</strong> Customize your experience, recommend connections and opportunities</li>
                <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security threats</li>
                <li><strong>Analytics:</strong> Analyze usage patterns to improve our Service</li>
                <li><strong>Compliance:</strong> Comply with legal obligations and enforce our Terms of Service</li>
                <li><strong>Marketing:</strong> Send promotional materials (with your consent, opt-out available)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">4. Data Security and Encryption</h2>
              
              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.1 End-to-End Encryption</h3>
              <p>
                All messages sent through Dchat are end-to-end encrypted using industry-standard encryption protocols. 
                This means that only you and the intended recipient can read the messages. We cannot access the content 
                of your encrypted messages.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.2 Quantum-Resistant Encryption</h3>
              <p>
                We offer optional post-quantum cryptography to protect your messages against future quantum computing 
                threats. This feature uses advanced algorithms that are resistant to quantum attacks.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.3 Blockchain Security</h3>
              <p>
                Messages are stored on blockchain with cryptographic hashes, ensuring immutability and integrity. The 
                blockchain provides a tamper-proof record of all communications.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.4 Security Measures</h3>
              <p className="mb-4">We implement various security measures to protect your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL/TLS encryption for data in transit</li>
                <li>Secure key management and storage</li>
                <li>Regular security audits and penetration testing</li>
                <li>Two-factor authentication (2FA) support</li>
                <li>Automated threat detection and monitoring</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">5. Data Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.1 We Do Not Sell Your Data</h3>
              <p>
                We do not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.2 Service Providers</h3>
              <p className="mb-4">
                We may share your information with trusted third-party service providers who assist us in operating 
                our Service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Hosting Providers:</strong> Vercel (frontend), AWS (backend)</li>
                <li><strong>Database:</strong> Supabase (encrypted data storage)</li>
                <li><strong>Payment Processing:</strong> Stripe (subscription payments)</li>
                <li><strong>Analytics:</strong> Anonymous usage analytics</li>
                <li><strong>Email Service:</strong> Transactional email delivery</li>
              </ul>
              <p className="mt-4">
                These providers are contractually obligated to protect your data and use it only for the purposes we specify.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.3 Legal Requirements</h3>
              <p className="mb-4">
                We may disclose your information if required by law or in response to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Valid legal process (subpoena, court order)</li>
                <li>Government or regulatory requests</li>
                <li>Protection of our rights and safety</li>
                <li>Prevention of fraud or illegal activity</li>
              </ul>
              <p className="mt-4">
                Note: Due to end-to-end encryption, we cannot access the content of your messages even if legally required.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.4 Business Transfers</h3>
              <p>
                If Dchat is involved in a merger, acquisition, or sale of assets, your information may be transferred. 
                We will notify you before your information is transferred and becomes subject to a different privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide the Service and fulfill the 
                purposes outlined in this policy. Retention periods vary based on data type:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li><strong>Account Data:</strong> Retained until you delete your account</li>
                <li><strong>Messages:</strong> Stored on blockchain indefinitely (encrypted, immutable)</li>
                <li><strong>Usage Logs:</strong> Retained for 90 days</li>
                <li><strong>Payment Records:</strong> Retained for 7 years (legal requirement)</li>
              </ul>
              <p className="mt-4">
                <strong>Important:</strong> Messages stored on the blockchain cannot be deleted due to the immutable 
                nature of blockchain technology. However, they remain encrypted and are not readable without your 
                private keys.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">7. Your Privacy Rights</h2>
              <p className="mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data (except blockchain data)</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing (where applicable)</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us at privacy@dchat.pro. We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Understand how you use our Service (anonymized)</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Note that disabling essential cookies may affect 
                Service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">9. Third-Party Links and Services</h2>
              <p>
                Our Service may contain links to third-party websites and services (e.g., LinkedIn, GitHub). We are not 
                responsible for the privacy practices of these third parties. We encourage you to review their privacy 
                policies before providing any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">10. Children's Privacy</h2>
              <p>
                Dchat is not intended for users under the age of 18. We do not knowingly collect personal information 
                from children. If you believe we have inadvertently collected information from a child, please contact 
                us immediately, and we will delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">11. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. These countries 
                may have different data protection laws. By using Dchat, you consent to the transfer of your information 
                to these countries. We ensure appropriate safeguards are in place to protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Posting the new policy on this page</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending you an email notification (for significant changes)</li>
              </ul>
              <p className="mt-4">
                Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">13. Contact Us</h2>
              <p className="mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <div className="mt-4 p-6 bg-gray-50 rounded-lg">
                <p className="mb-2"><strong>Email:</strong> privacy@dchat.pro</p>
                <p className="mb-2"><strong>Legal:</strong> legal@dchat.pro</p>
                <p className="mb-2"><strong>GitHub:</strong> https://github.com/everest-an/dchat</p>
                <p><strong>Website:</strong> https://dchat.pro</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">14. Data Protection Officer</h2>
              <p>
                For users in the European Union and other jurisdictions requiring a Data Protection Officer (DPO), 
                you may contact our DPO at dpo@dchat.pro for any data protection inquiries.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600 mb-6">
              Your privacy and security are fundamental to everything we do at Dchat.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/terms')}
                className="text-black hover:underline font-medium"
              >
                Terms of Service
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => navigate('/contact')}
                className="text-black hover:underline font-medium"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
