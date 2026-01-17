import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import PrivadoIDService from '../../services/privadoid/PrivadoIDService';
import VerificationBadge from './VerificationBadge';
import VerificationRequestDialog from './VerificationRequestDialog';
import './VerificationManager.css';

/**
 * VerificationManager Component
 * Manages user's Privado ID verifications
 */
const VerificationManager = ({ userId }) => {
  const [verifications, setVerifications] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [verificationsData, typesData] = await Promise.all([
        PrivadoIDService.getUserVerifications(userId),
        PrivadoIDService.getVerificationTypes()
      ]);

      setVerifications(verificationsData || []);
      setAvailableTypes(typesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVerification = (type) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  const handleDeleteVerification = async (verificationId) => {
    if (!window.confirm('Are you sure you want to remove this verification?')) {
      return;
    }

    try {
      await PrivadoIDService.deleteVerification(verificationId);
      await loadData(); // Reload verifications
    } catch (err) {
      alert('Failed to delete verification: ' + err.message);
    }
  };

  const handleVerificationSuccess = () => {
    setDialogOpen(false);
    loadData(); // Reload verifications
  };

  const getVerifiedTypes = () => {
    return verifications
      .filter(v => v.status === 'active')
      .map(v => v.verification_type);
  };

  const getAvailableTypesToAdd = () => {
    const verifiedTypes = getVerifiedTypes();
    return availableTypes.filter(type => !verifiedTypes.includes(type.type));
  };

  if (loading) {
    return (
      <div className="verification-manager loading">
        <div className="spinner"></div>
        <p>Loading verifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-manager error">
        <p className="error-message">{error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="verification-manager">
      <div className="verification-manager-header">
        <h3>Identity Verifications</h3>
        <p className="subtitle">
          Add verifiable credentials to build trust with your community
        </p>
      </div>

      {verifications.length > 0 && (
        <div className="current-verifications">
          <h4>Your Verifications</h4>
          <div className="verifications-list">
            {verifications.map((verification) => (
              <div key={verification.id} className="verification-item">
                <VerificationBadge 
                  verification={verification} 
                  size="large"
                  showLabel={true}
                />
                <div className="verification-details">
                  <p className="issuer">
                    Issued by: {verification.issuer_did.substring(0, 20)}...
                  </p>
                  <p className="date">
                    Verified: {new Date(verification.verified_at).toLocaleDateString()}
                  </p>
                  {verification.expires_at && (
                    <p className="expiry">
                      Expires: {new Date(verification.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteVerification(verification.id)}
                  title="Remove verification"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {getAvailableTypesToAdd().length > 0 && (
        <div className="available-verifications">
          <h4>Add New Verification</h4>
          <div className="verification-types-grid">
            {getAvailableTypesToAdd().map((type) => (
              <div key={type.type} className="verification-type-card">
                <h5>{type.label}</h5>
                <p>{type.description}</p>
                <button 
                  className="add-button"
                  onClick={() => handleAddVerification(type.type)}
                >
                  Add Verification
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {verifications.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔐</div>
          <h4>No Verifications Yet</h4>
          <p>
            Add verifiable credentials to prove your identity, skills, and affiliations
            using zero-knowledge proofs.
          </p>
        </div>
      )}

      <VerificationRequestDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleVerificationSuccess}
        verificationType={selectedType}
      />
    </div>
  );
};

VerificationManager.propTypes = {
  userId: PropTypes.number.isRequired
};

export default VerificationManager;
