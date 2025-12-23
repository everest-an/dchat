/**
 * StatusBadge Component
 * 
 * A small colored dot indicator showing user's online status
 * 
 * Features:
 * - Colored dot (green/yellow/red/gray)
 * - Size variants (sm/md/lg)
 * - Pulse animation for online status
 * - Tooltip with status text
 * 
 * @version 1.0.0
 * @created 2025-10-30
 */

import React, { useState, useEffect } from 'react';
import presenceService, { PresenceStatus } from '../services/PresenceService';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * StatusBadge Component
 * 
 * @param {Object} props
 * @param {string} props.userId - User's wallet address (optional, if provided will fetch status)
 * @param {string} props.status - Status type (online/away/busy/offline) - used if userId not provided
 * @param {string} props.size - Size variant (sm/md/lg)
 * @param {boolean} props.showPulse - Show pulse animation for online status
 * @param {boolean} props.showTooltip - Show tooltip on hover
 * @param {string} props.className - Additional CSS classes
 */
const StatusBadge = ({ 
  userId,
  status: propStatus,
  size = 'md',
  showPulse = true,
  showTooltip = true,
  className = ''
}) => {
  const { t } = useLanguage();
  const [userStatus, setUserStatus] = useState(propStatus || PresenceStatus.OFFLINE);

  // Load user status if userId is provided
  useEffect(() => {
    if (!userId) {
      setUserStatus(propStatus || PresenceStatus.OFFLINE);
      return;
    }

    const loadStatus = () => {
      const status = presenceService.getUserStatus(userId);
      setUserStatus(status.status);
    };

    loadStatus();

    // Subscribe to status changes
    const unsubscribe = presenceService.onStatusChange((changedUserId) => {
      if (changedUserId === userId) {
        loadStatus();
      }
    });

    return unsubscribe;
  }, [userId, propStatus]);

  const status = userStatus;

  // Size classes
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  // Status colors
  const statusColors = {
    [PresenceStatus.ONLINE]: 'bg-green-500',
    [PresenceStatus.AWAY]: 'bg-yellow-500',
    [PresenceStatus.BUSY]: 'bg-red-500',
    [PresenceStatus.OFFLINE]: 'bg-gray-400'
  };

  // Status labels
  const statusLabels = {
    [PresenceStatus.ONLINE]: t('presence.online'),
    [PresenceStatus.AWAY]: t('presence.away'),
    [PresenceStatus.BUSY]: t('presence.busy'),
    [PresenceStatus.OFFLINE]: t('presence.offline')
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = statusColors[status] || statusColors[PresenceStatus.OFFLINE];
  const label = statusLabels[status] || statusLabels[PresenceStatus.OFFLINE];

  // Don't show if user has hidden their status
  if (userId) {
    const userStatusData = presenceService.getUserStatus(userId);
    if (!userStatusData.isVisible) {
      return null;
    }
  }

  return (
    <div 
      className={`relative inline-block ${className}`}
      title={showTooltip ? label : undefined}
    >
      {/* Status dot */}
      <div className={`${sizeClass} ${colorClass} rounded-full`} />
      
      {/* Pulse animation for online status */}
      {showPulse && status === PresenceStatus.ONLINE && (
        <div className={`absolute inset-0 ${sizeClass} ${colorClass} rounded-full animate-ping opacity-75`} />
      )}
    </div>
  );
};

export default StatusBadge;
