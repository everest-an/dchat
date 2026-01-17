/**
 * StatusPicker Component
 * 
 * Dropdown to change user status with custom status support
 * 
 * Features:
 * - Status options dropdown
 * - Custom status input
 * - Emoji picker
 * - Duration selector
 * 
 * @version 1.0.0
 * @created 2025-10-30
 */

import React, { useState } from 'react';
import { PresenceStatus } from '../services/PresenceService';
import { useLanguage } from '../contexts/LanguageContext';
import StatusBadge from './StatusBadge';

/**
 * StatusPicker Component
 * 
 * @param {Object} props
 * @param {string} props.currentStatus - Current status
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {boolean} props.allowCustomStatus - Allow custom status input
 * @param {string} props.className - Additional CSS classes
 */
const StatusPicker = ({
  currentStatus = PresenceStatus.ONLINE,
  onStatusChange,
  allowCustomStatus = true,
  className = ''
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [duration, setDuration] = useState(0);

  // Status options
  const statusOptions = [
    {
      value: PresenceStatus.ONLINE,
      label: t('presence.online'),
      icon: '🟢'
    },
    {
      value: PresenceStatus.AWAY,
      label: t('presence.away'),
      icon: '🟡'
    },
    {
      value: PresenceStatus.BUSY,
      label: t('presence.busy'),
      icon: '🔴'
    },
    {
      value: PresenceStatus.OFFLINE,
      label: t('presence.offline'),
      icon: '⚫'
    }
  ];

  // Common emojis for custom status
  const commonEmojis = ['💻', '📱', '🍕', '☕', '🏃', '😴', '🎮', '📚', '🎵', '✈️'];

  // Duration options (in minutes)
  const durationOptions = [
    { value: 0, label: t('presence.noDuration') || 'No duration' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 240, label: '4 hours' },
    { value: 1440, label: '24 hours' }
  ];

  const handleStatusSelect = (status) => {
    if (onStatusChange) {
      onStatusChange(status, null);
    }
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomStatusSubmit = () => {
    if (!customMessage.trim()) return;

    if (onStatusChange) {
      onStatusChange(currentStatus, {
        emoji: customEmoji,
        message: customMessage,
        duration
      });
    }

    // Reset form
    setCustomEmoji('');
    setCustomMessage('');
    setDuration(0);
    setShowCustomInput(false);
    setIsOpen(false);
  };

  const handleClearCustomStatus = () => {
    if (onStatusChange) {
      onStatusChange(currentStatus, null);
    }
    setShowCustomInput(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <StatusBadge status={currentStatus} size="md" showPulse={false} />
        <span className="text-sm text-gray-200">
          {statusOptions.find(opt => opt.value === currentStatus)?.label}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          {!showCustomInput ? (
            <>
              {/* Status options */}
              <div className="p-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusSelect(option.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                      currentStatus === option.value ? 'bg-gray-700' : ''
                    }`}
                  >
                    <StatusBadge status={option.value} size="md" showPulse={false} />
                    <span className="text-sm text-gray-200">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom status button */}
              {allowCustomStatus && (
                <>
                  <div className="border-t border-gray-700 my-1" />
                  <div className="p-2">
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-lg">✏️</span>
                      <span className="text-sm text-gray-200">{t('presence.setCustomStatus')}</span>
                    </button>
                    <button
                      onClick={handleClearCustomStatus}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-lg">❌</span>
                      <span className="text-sm text-gray-200">{t('presence.clearStatus')}</span>
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Custom status input */
            <div className="p-4">
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-2">
                  {t('presence.emoji')}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setCustomEmoji(emoji)}
                      className={`text-xl p-1 rounded hover:bg-gray-700 ${
                        customEmoji === emoji ? 'bg-gray-700' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-2">
                  {t('presence.message')}
                </label>
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={t('presence.messagePlaceholder')}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  maxLength={50}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">
                  {t('presence.duration')}
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCustomStatusSubmit}
                  disabled={!customMessage.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
                >
                  {t('presence.save')}
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                >
                  {t('presence.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowCustomInput(false);
          }}
        />
      )}
    </div>
  );
};

export default StatusPicker;
