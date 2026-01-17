import React from 'react';
import PropTypes from 'prop-types';
import './VerificationBadge.css';

/**
 * VerificationBadge Component
 * Displays a verification badge for a user
 */
const VerificationBadge = ({ verification, size = 'medium', showLabel = true }) => {
  const getIcon = (type) => {
    const icons = {
      company: '🏢',
      project: '🚀',
      skill: '⭐',
      education: '🎓',
      humanity: '✓'
    };
    return icons[type] || '✓';
  };

  const getLabel = (type) => {
    const labels = {
      company: 'Company Verified',
      project: 'Project Verified',
      skill: 'Skill Verified',
      education: 'Education Verified',
      humanity: 'Human Verified'
    };
    return labels[type] || 'Verified';
  };

  const getColor = (type) => {
    const colors = {
      company: '#4CAF50',
      project: '#2196F3',
      skill: '#FF9800',
      education: '#9C27B0',
      humanity: '#00BCD4'
    };
    return colors[type] || '#4CAF50';
  };

  if (!verification || !verification.verification_type) {
    return null;
  }

  const isActive = verification.status === 'active' && 
                   (!verification.expires_at || new Date(verification.expires_at) > new Date());

  if (!isActive) {
    return null;
  }

  return (
    <div 
      className={`verification-badge verification-badge-${size}`}
      style={{ borderColor: getColor(verification.verification_type) }}
      title={`Verified by ${verification.issuer_did}`}
    >
      <span className="verification-icon">
        {getIcon(verification.verification_type)}
      </span>
      {showLabel && (
        <span className="verification-label">
          {getLabel(verification.verification_type)}
        </span>
      )}
    </div>
  );
};

VerificationBadge.propTypes = {
  verification: PropTypes.shape({
    verification_type: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    issuer_did: PropTypes.string.isRequired,
    expires_at: PropTypes.string
  }),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showLabel: PropTypes.bool
};

export default VerificationBadge;
