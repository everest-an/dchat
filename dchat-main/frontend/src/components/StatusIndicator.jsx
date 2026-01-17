/**
 * StatusIndicator Component
 * 
 * Status indicator with text label, last seen time, and custom status
 * 
 * Features:
 * - Status badge + text label
 * - Last seen time display
 * - Custom status message
 * - Real-time updates
 * 
 * @version 1.0.0
 * @created 2025-10-30
 */

import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import presenceService, { PresenceStatus } from '../services/PresenceService';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * StatusIndicator Component
 * 
 * @param {Object} props
 * @param {string} props.userId - User's wallet address
 * @param {boolean} props.showLabel - Show status text label
 * @param {boolean} props.showLastSeen - Show last seen time
 * @param {boolean} props.showCustomStatus - Show custom status message
 * @param {string} props.size - Badge size (sm/md/lg)
 * @param {string} props.className - Additional CSS classes
 */
const StatusIndicator = ({
  userId,
  showLabel = true,
  showLastSeen = false,
  showCustomStatus = true,
  size = 'md',
  className = ''
}) => {
  const { t } = useLanguage();
  const [userStatus, setUserStatus] = useState(null);
  const [lastSeenText, setLastSeenText] = useState('');

  // Load user status
  useEffect(() => {
    if (!userId) return;

    const loadStatus = () => {
      const status = presenceService.getUserStatus(userId);
      setUserStatus(status);

      if (showLastSeen && status.lastSeen) {
        const text = presenceService.getLastSeenText(status.lastSeen);
        setLastSeenText(text);
      }
    };

    // Initial load
    loadStatus();

    // Subscribe to status changes
    const unsubscribe = presenceService.onStatusChange((changedUserId) => {
      if (changedUserId === userId) {
        loadStatus();
      }
    });

    // Update last seen text every minute
    const interval = setInterval(() => {
      if (showLastSeen && userStatus?.lastSeen) {
        const text = presenceService.getLastSeenText(userStatus.lastSeen);
        setLastSeenText(text);
      }
    }, 60000); // 1 minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [userId, showLastSeen]);

  if (!userStatus) {
    return null;
  }

  // Don't show if user has hidden their status
  if (!userStatus.isVisible) {
    return null;
  }

  // Status labels
  const statusLabels = {
    [PresenceStatus.ONLINE]: t('presence.online'),
    [PresenceStatus.AWAY]: t('presence.away'),
    [PresenceStatus.BUSY]: t('presence.busy'),
    [PresenceStatus.OFFLINE]: t('presence.offline')
  };

  const statusLabel = statusLabels[userStatus.status] || statusLabels[PresenceStatus.OFFLINE];

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {/* Status badge */}
      <div className="flex-shrink-0 mt-1">
        <StatusBadge 
          status={userStatus.status}
          size={size}
          showPulse={true}
          showTooltip={false}
        />
      </div>

      {/* Status info */}
      <div className="flex-1 min-w-0">
        {/* Status label */}
        {showLabel && (
          <div className="text-sm font-medium text-gray-200">
            {statusLabel}
          </div>
        )}

        {/* Custom status */}
        {showCustomStatus && userStatus.customStatus && (
          <div className="text-xs text-gray-400 truncate">
            {userStatus.customStatus.emoji && (
              <span className="mr-1">{userStatus.customStatus.emoji}</span>
            )}
            {userStatus.customStatus.message}
          </div>
        )}

        {/* Last seen */}
        {showLastSeen && userStatus.status === PresenceStatus.OFFLINE && lastSeenText && (
          <div className="text-xs text-gray-500">
            {t('presence.lastSeen').replace('{time}', lastSeenText)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusIndicator;
