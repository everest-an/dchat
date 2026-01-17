import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './VerificationBadge.css';

/**
 * VerificationBadge Component
 * Displays a verification badge for KYC/KYB verifications
 */
const VerificationBadge = ({ verification, size = 'medium', showLabel = true, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Badge configuration for different verification types
  const badgeConfig = {
    // KYC (Personal) verifications
    kyc_humanity: { icon: '👤', label: 'Human Verified', color: '#00BCD4', category: 'kyc' },
    kyc_age: { icon: '🎂', label: 'Age Verified', color: '#9C27B0', category: 'kyc' },
    kyc_country: { icon: '🌍', label: 'Country Verified', color: '#4CAF50', category: 'kyc' },
    // KYB (Business) verifications
    kyb_registration: { icon: '🏢', label: 'Company Verified', color: '#2196F3', category: 'kyb' },
    kyb_tax_id: { icon: '📋', label: 'Tax ID Verified', color: '#FF9800', category: 'kyb' },
    kyb_license: { icon: '📜', label: 'Licensed Business', color: '#795548', category: 'kyb' },
    // Legacy types (backward compatibility)
    company: { icon: '🏢', label: 'Company Verified', color: '#4CAF50', category: 'kyb' },
    project: { icon: '🚀', label: 'Project Verified', color: '#2196F3', category: 'kyc' },
    skill: { icon: '⭐', label: 'Skill Verified', color: '#FF9800', category: 'kyc' },
    education: { icon: '🎓', label: 'Education Verified', color: '#9C27B0', category: 'kyc' },
    humanity: { icon: '✓', label: 'Human Verified', color: '#00BCD4', category: 'kyc' }
  };

  if (!verification || !verification.verification_type) {
    return null;
  }

  const config = badgeConfig[verification.verification_type] || {
    icon: '✓',
    label: 'Verified',
    color: '#4CAF50',
    category: 'kyc'
  };

  // Check if verification is active
  const isActive = verification.status === 'active' && 
                   (!verification.expires_at || new Date(verification.expires_at) > new Date());

  if (!isActive) {
    return null;
  }

  // Calculate days until expiry
  const daysUntilExpiry = verification.expires_at 
    ? Math.ceil((new Date(verification.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(verification);
    } else {
      setShowTooltip(!showTooltip);
    }
  };

  return (
    <div 
      className={`verification-badge verification-badge-${size} verification-badge-${config.category}`}
      style={{ 
        borderColor: config.color,
        backgroundColor: `${config.color}15`
      }}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="verification-icon" style={{ color: config.color }}>
        {config.icon}
      </span>
      {showLabel && (
        <span className="verification-label" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
      
      {/* Tooltip with verification details */}
      {showTooltip && (
        <div className="verification-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-icon">{config.icon}</span>
            <span className="tooltip-title">{config.label}</span>
          </div>
          <div className="tooltip-content">
            <div className="tooltip-row">
              <span className="tooltip-label">Type:</span>
              <span className="tooltip-value">{config.category.toUpperCase()}</span>
            </div>
            {verification.issuer_did && (
              <div className="tooltip-row">
                <span className="tooltip-label">Issuer:</span>
                <span className="tooltip-value tooltip-truncate">
                  {verification.issuer_did.substring(0, 20)}...
                </span>
              </div>
            )}
            {verification.verified_at && (
              <div className="tooltip-row">
                <span className="tooltip-label">Verified:</span>
                <span className="tooltip-value">
                  {new Date(verification.verified_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {daysUntilExpiry !== null && (
              <div className="tooltip-row">
                <span className="tooltip-label">Expires:</span>
                <span className={`tooltip-value ${daysUntilExpiry < 30 ? 'expiring-soon' : ''}`}>
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                </span>
              </div>
            )}
          </div>
          <div className="tooltip-footer">
            <span className="zkp-badge">🔐 Zero-Knowledge Proof</span>
          </div>
        </div>
      )}
    </div>
  );
};

VerificationBadge.propTypes = {
  verification: PropTypes.shape({
    verification_type: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    issuer_did: PropTypes.string,
    verified_at: PropTypes.string,
    expires_at: PropTypes.string
  }),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showLabel: PropTypes.bool,
  onClick: PropTypes.func
};

export default VerificationBadge;
