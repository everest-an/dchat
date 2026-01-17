import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import QRCode from 'qrcode.react';
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
  const [step, setStep] = useState('form'); // 'form', 'qr', 'success'

  useEffect(() => {
    if (isOpen && verificationType) {
      createRequest();
    }
  }, [isOpen, verificationType]);

  const createRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        type: verificationType,
        required_claim: {},
        schema: getSchemaForType(verificationType),
        allowed_issuers: ['*']
      };

      const response = await PrivadoIDService.createVerificationRequest(request);
      setVerificationRequest(response);
      setStep('qr');
    } catch (err) {
      setError(err.message || 'Failed to create verification request');
    } finally {
      setLoading(false);
    }
  };

  const getSchemaForType = (type) => {
    // In production, these would be actual IPFS URLs
    const schemas = {
      company: 'ipfs://QmCompanyEmployeeSchema',
      project: 'ipfs://QmProjectParticipantSchema',
      skill: 'ipfs://QmSkillCertificateSchema',
      education: 'ipfs://QmEducationCredentialSchema',
      humanity: 'ipfs://QmHumanityProofSchema'
    };
    return schemas[type] || '';
  };

  const getTypeLabel = (type) => {
    const labels = {
      company: 'Company Affiliation',
      project: 'Project Participation',
      skill: 'Professional Skill',
      education: 'Education Background',
      humanity: 'Proof of Humanity'
    };
    return labels[type] || 'Verification';
  };

  const handleCopyLink = () => {
    if (verificationRequest?.universal_link) {
      navigator.clipboard.writeText(verificationRequest.universal_link);
      alert('Link copied to clipboard!');
    }
  };

  const handleOpenWallet = () => {
    if (verificationRequest?.deep_link) {
      window.location.href = verificationRequest.deep_link;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="verification-dialog-overlay" onClick={onClose}>
      <div className="verification-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="verification-dialog-header">
          <h2>Add {getTypeLabel(verificationType)}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="verification-dialog-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Creating verification request...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button onClick={createRequest}>Try Again</button>
            </div>
          )}

          {step === 'qr' && verificationRequest && (
            <div className="qr-state">
              <p className="instruction">
                Scan this QR code with your Privado ID wallet to verify your {getTypeLabel(verificationType).toLowerCase()}
              </p>

              <div className="qr-code-container">
                <QRCode 
                  value={verificationRequest.qr_code}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="alternative-options">
                <p className="or-divider">OR</p>
                
                <button 
                  className="wallet-button"
                  onClick={handleOpenWallet}
                >
                  Open in Wallet App
                </button>

                <button 
                  className="copy-link-button"
                  onClick={handleCopyLink}
                >
                  Copy Link
                </button>
              </div>

              <div className="help-text">
                <p>
                  Don't have Privado ID wallet? 
                  <a href="https://wallet.privado.id" target="_blank" rel="noopener noreferrer">
                    Get it here
                  </a>
                </p>
              </div>
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
