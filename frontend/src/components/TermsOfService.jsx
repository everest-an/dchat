import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * Terms of Service Page
 * Legal terms and conditions for using Dchat
 */
const TermsOfService = () => {
  const navigate = useNavigate();

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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-black mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">
            Last Updated: November 2, 2025
          </p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Dchat ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, please do not use the Service. We reserve the right to modify these 
                Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">2. Description of Service</h2>
              <p>
                Dchat is a decentralized business communication platform that provides end-to-end encrypted messaging, 
                blockchain-based message storage, cryptocurrency payments, and professional networking features. The 
                Service integrates Web3 technologies including smart contracts on Ethereum and Polygon networks.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">3. User Accounts and Registration</h2>
              <p className="mb-4">
                To use certain features of the Service, you must create an account. You may register using:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>MetaMask or other Web3 wallet (wallet address serves as your identity)</li>
                <li>Email address with password authentication</li>
                <li>Phone number with SMS verification</li>
              </ul>
              <p className="mt-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">4. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your 
                personal information. By using the Service, you consent to our collection and use of your data as 
                described in the Privacy Policy.
              </p>
              <p className="mt-4">
                <strong>Key Privacy Features:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>End-to-end encryption for all messages</li>
                <li>Blockchain storage for message immutability</li>
                <li>Optional quantum-resistant encryption</li>
                <li>No third-party access to encrypted content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">5. User Conduct and Prohibited Activities</h2>
              <p className="mb-4">
                You agree not to use the Service for any unlawful or prohibited purpose. Prohibited activities include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violating any applicable laws or regulations</li>
                <li>Infringing on intellectual property rights</li>
                <li>Transmitting malware, viruses, or harmful code</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Engaging in fraudulent or deceptive practices</li>
                <li>Attempting to gain unauthorized access to the Service</li>
                <li>Using the Service for spam or unsolicited commercial messages</li>
                <li>Impersonating another person or entity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">6. Blockchain and Cryptocurrency</h2>
              <p>
                Dchat utilizes blockchain technology and may involve cryptocurrency transactions. You acknowledge and 
                agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Blockchain transactions are irreversible and cannot be undone</li>
                <li>You are responsible for gas fees and transaction costs</li>
                <li>Cryptocurrency values are volatile and may fluctuate</li>
                <li>We are not responsible for losses due to market volatility</li>
                <li>You must comply with all applicable tax laws regarding cryptocurrency</li>
                <li>Smart contract interactions are at your own risk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">7. Intellectual Property Rights</h2>
              <p>
                The Service and its original content, features, and functionality are owned by Dchat and are protected 
                by international copyright, trademark, patent, trade secret, and other intellectual property laws. You 
                may not copy, modify, distribute, sell, or lease any part of the Service without our express written 
                permission.
              </p>
              <p className="mt-4">
                You retain ownership of any content you create and share through the Service. By posting content, you 
                grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and display your content 
                solely for the purpose of operating and improving the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">8. Payment and Subscription</h2>
              <p>
                Certain features of the Service may require payment or subscription. Payment terms include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Subscription fees are billed in advance on a recurring basis</li>
                <li>You may cancel your subscription at any time</li>
                <li>No refunds for partial subscription periods</li>
                <li>We reserve the right to change pricing with 30 days notice</li>
                <li>Payment processing is handled by third-party providers (Stripe, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">9. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without cause, and with 
                or without notice. Upon termination, your right to use the Service will immediately cease. You may also 
                terminate your account at any time by contacting us or using the account deletion feature.
              </p>
              <p className="mt-4">
                Note: Messages stored on the blockchain cannot be deleted due to the immutable nature of blockchain 
                technology. Account deletion will remove your profile and access to the Service, but blockchain records 
                will remain.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">10. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
                IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR 
                ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">11. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DCHAT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR 
                INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Your use or inability to use the Service</li>
                <li>Any unauthorized access to or use of our servers</li>
                <li>Any bugs, viruses, or harmful code transmitted through the Service</li>
                <li>Any errors or omissions in any content</li>
                <li>Cryptocurrency price volatility or transaction failures</li>
                <li>Smart contract vulnerabilities or exploits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">12. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless Dchat and its officers, directors, employees, and 
                agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, 
                arising out of or in any way connected with your access to or use of the Service, your violation of these 
                Terms, or your violation of any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">13. Governing Law and Dispute Resolution</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
                Dchat is registered, without regard to its conflict of law provisions. Any disputes arising from these 
                Terms or the Service shall be resolved through binding arbitration, except where prohibited by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">14. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. If we make material changes, we will notify you 
                by email or through a notice on the Service. Your continued use of the Service after such modifications 
                constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">15. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p><strong>Email:</strong> legal@dchat.pro</p>
                <p><strong>GitHub:</strong> https://github.com/everest-an/dchat</p>
                <p><strong>Website:</strong> https://dchat.pro</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">16. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited 
                or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force 
                and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">17. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Dchat 
                regarding the use of the Service and supersede all prior agreements and understandings.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600">
              By using Dchat, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={() => navigate('/privacy')}
                className="text-black hover:underline font-medium"
              >
                Privacy Policy
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

export default TermsOfService;
