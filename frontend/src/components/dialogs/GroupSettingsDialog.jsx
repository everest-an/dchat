import React, { useState, useEffect } from 'react'
import { X, Upload, Users, Settings, Trash2, LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWeb3 } from '../../contexts/Web3Context'
import { useToast } from '../../contexts/ToastContext'
import GroupService from '../../services/GroupService'
import AvatarUpload from '../AvatarUpload'

const GroupSettingsDialog = ({ isOpen, onClose, groupId }) => {
  const { t } = useLanguage()
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('info') // info, members, settings
  const [loading, setLoading] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // Form states
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState({})
  const [newMemberAddress, setNewMemberAddress] = useState('')

  // Load group data
  useEffect(() => {
    if (isOpen && groupId) {
      loadGroup()
    }
  }, [isOpen, groupId])

  const loadGroup = () => {
    const groupData = GroupService.getGroup(groupId)
    if (groupData) {
      setGroup(groupData)
      setGroupName(groupData.name)
      setDescription(groupData.description || '')
      setSettings(groupData.settings || {})
    }
  }

  // Check if user is admin
  const isAdmin = group && GroupService.isAdmin(groupId, account)

  // Handle avatar upload
  const handleAvatarUpload = async (avatarData) => {
    try {
      setLoading(true)
      await GroupService.updateGroupAvatar(groupId, avatarData)
      setShowAvatarUpload(false)
      loadGroup()
      success(t('group.avatarUpdated'), t('group.avatarUpdatedDesc'))
    } catch (err) {
      console.error('Error updating avatar:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Update group info
  const handleUpdateInfo = async () => {
    try {
      setLoading(true)
      await GroupService.updateGroup(groupId, {
        name: groupName,
        description
      })
      loadGroup()
      success(t('group.updated'), t('group.updatedDesc'))
    } catch (err) {
      console.error('Error updating group:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Update settings
  const handleUpdateSettings = async () => {
    try {
      setLoading(true)
      await GroupService.updateGroupSettings(groupId, settings)
      loadGroup()
      success(t('group.settingsUpdated'), t('group.settingsUpdatedDesc'))
    } catch (err) {
      console.error('Error updating settings:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Add member
  const handleAddMember = async () => {
    try {
      if (!newMemberAddress.trim()) {
        showError(t('error'), t('group.enterAddress'))
        return
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(newMemberAddress)) {
        showError(t('error'), t('group.invalidAddress'))
        return
      }

      setLoading(true)
      await GroupService.addMember(groupId, newMemberAddress, account)
      setNewMemberAddress('')
      loadGroup()
      success(t('group.memberAdded'), t('group.memberAddedDesc'))
    } catch (err) {
      console.error('Error adding member:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Remove member
  const handleRemoveMember = async (memberAddress) => {
    try {
      setLoading(true)
      await GroupService.removeMember(groupId, memberAddress, account)
      loadGroup()
      success(t('group.memberRemoved'), t('group.memberRemovedDesc'))
    } catch (err) {
      console.error('Error removing member:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Promote member
  const handlePromoteMember = async (memberAddress) => {
    try {
      setLoading(true)
      await GroupService.promoteMember(groupId, memberAddress, account)
      loadGroup()
      success(t('group.memberPromoted'), t('group.memberPromotedDesc'))
    } catch (err) {
      console.error('Error promoting member:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Demote member
  const handleDemoteMember = async (memberAddress) => {
    try {
      setLoading(true)
      await GroupService.demoteMember(groupId, memberAddress, account)
      loadGroup()
      success(t('group.memberDemoted'), t('group.memberDemotedDesc'))
    } catch (err) {
      console.error('Error demoting member:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Leave group
  const handleLeaveGroup = async () => {
    try {
      setLoading(true)
      await GroupService.leaveGroup(groupId, account)
      success(t('group.leftGroup'), t('group.leftGroupDesc'))
      onClose()
      navigate('/chats')
    } catch (err) {
      console.error('Error leaving group:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete group
  const handleDeleteGroup = async () => {
    try {
      setLoading(true)
      await GroupService.deleteGroup(groupId, account)
      success(t('group.deleted'), t('group.deletedDesc'))
      onClose()
      navigate('/chats')
    } catch (err) {
      console.error('Error deleting group:', err)
      showError(t('error'), err.message)
    } finally {
      setLoading(false)
    }
  }

  // Render tab content
  const renderTabContent = () => {
    switch (tab) {
      case 'info':
        return (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold mb-4">
                {group?.avatar?.type === 'ipfs' ? (
                  <img
                    src={group.avatar.url}
                    alt="Group avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{group?.avatar?.emoji || '👥'}</span>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAvatarUpload(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {t('group.changeAvatar')}
                </button>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('group.name')}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!isAdmin || loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('group.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdmin || loading}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 resize-none"
              />
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>{t('group.created')}:</strong> {new Date(group?.createdAt).toLocaleDateString()}</p>
              <p><strong>{t('group.members')}:</strong> {group?.memberCount}</p>
              {group?.ipfsHash && (
                <p className="font-mono text-xs break-all">
                  <strong>IPFS:</strong> {group.ipfsHash}
                </p>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={handleUpdateInfo}
                disabled={loading}
                className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
            )}
          </div>
        )

      case 'members':
        return (
          <div className="space-y-4">
            {/* Add Member */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('group.addMember')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberAddress}
                    onChange={(e) => setNewMemberAddress(e.target.value)}
                    placeholder="0x..."
                    disabled={loading}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={loading}
                    className="px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {group?.members?.map((member) => (
                <div
                  key={member.address}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                      {member.avatar?.type === 'ipfs' ? (
                        <img
                          src={member.avatar.url}
                          alt={member.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{member.avatar?.emoji || '👤'}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {member.address.slice(0, 10)}...{member.address.slice(-8)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>

                  {isAdmin && member.address.toLowerCase() !== account.toLowerCase() && (
                    <div className="flex gap-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handlePromoteMember(member.address)}
                          disabled={loading}
                          className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50"
                          title={t('group.promote')}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDemoteMember(member.address)}
                          disabled={loading}
                          className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50"
                          title={t('group.demote')}
                        >
                          <Shield className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.address)}
                        disabled={loading}
                        className="p-2 hover:bg-red-100 rounded-full disabled:opacity-50"
                        title={t('group.remove')}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-4">
            {/* Privacy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('group.privacy')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={settings.privacy === 'private'}
                    onChange={(e) => setSettings({ ...settings, privacy: e.target.value })}
                    disabled={!isAdmin || loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">{t('group.private')}</p>
                    <p className="text-xs text-gray-500">{t('group.privateDesc')}</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={settings.privacy === 'public'}
                    onChange={(e) => setSettings({ ...settings, privacy: e.target.value })}
                    disabled={!isAdmin || loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">{t('group.public')}</p>
                    <p className="text-xs text-gray-500">{t('group.publicDesc')}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{t('group.joinApproval')}</p>
                  <p className="text-xs text-gray-500">{t('group.joinApprovalDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.joinApproval}
                  onChange={(e) => setSettings({ ...settings, joinApproval: e.target.checked })}
                  disabled={!isAdmin || loading}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{t('group.allowMemberInvite')}</p>
                  <p className="text-xs text-gray-500">{t('group.allowMemberInviteDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowMemberInvite}
                  onChange={(e) => setSettings({ ...settings, allowMemberInvite: e.target.checked })}
                  disabled={!isAdmin || loading}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{t('group.allowFileSharing')}</p>
                  <p className="text-xs text-gray-500">{t('group.allowFileSharingDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowFileSharing}
                  onChange={(e) => setSettings({ ...settings, allowFileSharing: e.target.checked })}
                  disabled={!isAdmin || loading}
                  className="w-5 h-5"
                />
              </label>
            </div>

            {isAdmin && (
              <button
                onClick={handleUpdateSettings}
                disabled={loading}
                className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
            )}

            {/* Danger Zone */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-sm font-medium text-red-600 mb-3">{t('group.dangerZone')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {t('group.leave')}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('group.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen || !group) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">{t('group.settings')}</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setTab('info')}
              className={`flex-1 px-4 py-3 font-medium ${
                tab === 'info'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('group.info')}
            </button>
            <button
              onClick={() => setTab('members')}
              className={`flex-1 px-4 py-3 font-medium ${
                tab === 'members'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('group.members')} ({group.memberCount})
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`flex-1 px-4 py-3 font-medium ${
                tab === 'settings'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('group.settings')}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Avatar Upload Dialog */}
      {showAvatarUpload && (
        <AvatarUpload
          onUpload={handleAvatarUpload}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">{t('group.deleteConfirm')}</h3>
            <p className="text-gray-600 mb-6">{t('group.deleteConfirmDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">{t('group.leaveConfirm')}</h3>
            <p className="text-gray-600 mb-6">{t('group.leaveConfirmDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLeaveGroup}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('common.leaving') : t('group.leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GroupSettingsDialog
