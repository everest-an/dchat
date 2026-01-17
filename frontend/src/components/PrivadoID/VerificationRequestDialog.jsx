import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import PrivadoIDService from '../../services/privadoid/PrivadoIDService';
import './VerificationRequestDialog.css';

/**
 * VerificationRequestDialog Component
 * Displays a dialog for creating and showing verification requests
 */
const VerificationRequestDialog = ({ isOpen, onClose, onSuccess, verificationType }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationRequest, setVerificationRequest] = useState(null);
  const [step, setStep] = useState('loading'); // 'loading', 'qr', 'success', 'error'
  const [pollingInterval, setPollingInterval] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // Verification type labels and icons
  const typeConfig = {
    kyc_humanity: { label: 'Humanity Verification', icon: '👤', color: '#00BCD4' },
    kyc_age: { label: 'Age Verification', icon: '🎂', color: '#9C27B0' },
    kyc_country: { label: 'Country Verification', icon: '🌍', color: '#4CAF50' },
    kyb_registration: { label: 'Company Registration', icon: '🏢', color: '#2196F3' },
    kyb_tax_id: { label: 'Tax ID Verification', icon: '📋', color: '#FF9800' },
    kyb_license: { label: 'Business License', icon: '📜', color: '#795548' }
  };

  const createRequest = useCallback(async () => {
    if (!verificationType) return;
    
    setLoading(true);
    setError(null);
    setStep('loading');

    try {
      const response = await PrivadoIDService.createVerificationRequest({
        type: verificationType
      });
      
      setVerificationRequest(response);
      setDemoMode(PrivadoIDService.isDemoMode());
      setStep('qr');
      
      // Start polling for verification status
      if (response.request_id && !response.request_id.startsWith('demo_')) {
        startPolling(response.request_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to create verification request');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, [verificationType]);

  useEffect(() => {
    if (isOpen && verificationType) {
      createRequest();
    }
    
    return () => {
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, verificationType, createRequest]);

  const startPolling = (requestId) => {
    const interval = setInterval(async () => {
      try {
        const status = await PrivadoIDService.checkVerificationStatus(requestId);
        
        if (status.status === 'completed' || status.status === 'active') {
          clearInterval(interval);
          setStep('success');
          setTimeout(() => {
            onSuccess?.();
          }, 2000);
        } else if (status.status === 'expired' || status.status === 'failed') {
          clearInterval(interval);
          setError('Verification request expired or failed');
          setStep('error');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    setVerificationRequest(null);
    setStep('loading');
    setError(null);
    onClose();
  };

  const handleCopyLink = () => {
    if (verificationRequest?.deep_link) {
      navigator.clipboard.writeText(verificationRequest.deep_link);
      alert('Link copied to clipboard!');
    }
  };

  const handleOpenWallet = () => {
    if (verificationRequest?.deep_link) {
      window.open(verificationRequest.deep_link, '_blank');
    }
  };

  const handleDemoVerify = () => {
    // Simulate successful verification in demo mode
    setStep('success');
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  const config = typeConfig[verificationType] || { label: 'Verification', icon: '✓', color: '#4CAF50' };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="verification-dialog-overlay" onClick={handleClose}>
      <div className="verification-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="verification-dialog-header">
          <div className="header-title">
            <span className="header-icon" style={{ color: config.color }}>{config.icon}</span>
            <h2>{config.label}</h2>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="verification-dialog-content">
          {/* Demo Mode Banner */}
          {demoMode && (
            <div className="demo-banner">
              <span>🔧 Demo Mode - Backend not connected</span>
            </div>
          )}

          {/* Loading State */}
          {step === 'loading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Creating verification request...</p>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="error-state">
              <div className="error-icon">❌</div>
              <p className="error-message">{error}</p>
              <button className="retry-button" onClick={createRequest}>Try Again</button>
            </div>
          )}

          {/* QR Code State */}
          {step === 'qr' && verificationRequest && (
            <div className="qr-state">
              <p className="instruction">
                Scan this QR code with your Privado ID wallet to verify your identity
              </p>

              <div className="qr-code-container">
                {/* Simple QR code display using data URL or text */}
                <div className="qr-placeholder" style={{ borderColor: config.color }}>
                  <div className="qr-inner">
                    <span className="qr-icon">{config.icon}</span>
                    <p className="qr-text">Scan with Privado ID</p>
                    <code className="qr-id">{verificationRequest.request_id?.substring(0, 12)}...</code>
                  </div>
                </div>
              </div>

              <div className="alternative-options">
                <p className="or-divider">— OR —</p>
                
                <button 
                  className="wallet-button"
                  onClick={handleOpenWallet}
                  style={{ backgroundColor: config.color }}
                >
                  📱 Open in Wallet App
                </button>

                <button 
                  className="copy-link-button"
                  onClick={handleCopyLink}
                >
                  📋 Copy Verification Link
                </button>

                {demoMode && (
                  <button 
                    className="demo-verify-button"
                    onClick={handleDemoVerify}
                  >
                    ✅ Simulate Verification (Demo)
                  </button>
                )}
              </div>

              <div className="help-text">
                <p>
                  Don't have Privado ID wallet?{' '}
                  <a href="https://www.privado.id/" target="_blank" rel="noopener noreferrer">
                    Get it here
                  </a>
                </p>
              </div>

              {verificationRequest.expires_at && (
                <div className="expiry-notice">
                  <p>Request expires: {new Date(verificationRequest.expires_at).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="success-state">
              <div className="success-icon" style={{ color: config.color }}>✓</div>
              <h3>Verification Successful!</h3>
              <p>Your {config.label.toLowerCase()} has been verified.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

VerificationRequestDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  verificationType: PropTypes.string
};

export default VerificationRequestDialog;
