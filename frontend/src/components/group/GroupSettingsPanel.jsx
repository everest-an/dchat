import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, UserMinus, ShieldCheck, ShieldOff,
  VolumeX, Volume2, Loader2, Crown, Shield, ShieldAlert,
  Megaphone, UserCheck, UserX, Plus
} from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../../contexts/ToastContext'
import useAuthStore from '../../stores/useAuthStore'
import GroupService from '../../services/GroupService'

const GroupSettingsPanel = () => {
  const navigate = useNavigate()
  const { id: groupId } = useParams()
  const { user } = useAuthStore()
  const { success, error: showError } = useToast()

  const currentUserId = user?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('general') // general | members | announcements | requests

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [maxMembers, setMaxMembers] = useState(200)

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [announcementPinned, setAnnouncementPinned] = useState(false)

  // Join requests
  const [joinRequests, setJoinRequests] = useState([])

  // Mute dialog
  const [muteTarget, setMuteTarget] = useState(null)
  const [muteDuration, setMuteDuration] = useState(60) // minutes

  const loadGroup = useCallback(async () => {
    try {
      const data = await GroupService.getGroup(groupId)
      setGroup(data)
      setName(data.name || '')
      setDescription(data.description || '')
      setIsPublic(data.is_public || false)
      setRequireApproval(data.require_approval ?? true)
      setMaxMembers(data.max_members || 200)
    } catch (err) {
      showError('Error', 'Failed to load group')
    }
  }, [groupId, showError])

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await GroupService.getAnnouncements(groupId)
      setAnnouncements(res.data ?? [])
    } catch (err) {
      console.error('Error loading announcements:', err)
    }
  }, [groupId])

  const loadJoinRequests = useCallback(async () => {
    try {
      const res = await GroupService.getJoinRequests(groupId)
      setJoinRequests(res.data ?? [])
    } catch (err) {
      console.error('Error loading join requests:', err)
    }
  }, [groupId])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadGroup()
      setLoading(false)
    }
    init()
  }, [loadGroup])

  useEffect(() => {
    if (tab === 'announcements') loadAnnouncements()
    if (tab === 'requests') loadJoinRequests()
  }, [tab, loadAnnouncements, loadJoinRequests])

  const members = group?.Members ?? []
  const myRole = members.find(m => m.user_id === currentUserId)?.role
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin' || isOwner

  // Save general settings
  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await GroupService.updateGroup(groupId, {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        require_approval: requireApproval,
        max_members: maxMembers,
      })
      setGroup(updated)
      success('Saved', 'Group settings updated')
    } catch (err) {
      showError('Error', err.message || 'Failed to update group')
    } finally {
      setSaving(false)
    }
  }

  // Delete group
  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return
    try {
      await GroupService.deleteGroup(groupId)
      success('Deleted', 'Group has been deleted')
      navigate('/app')
    } catch (err) {
      showError('Error', err.message || 'Failed to delete group')
    }
  }

  // Remove member
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return
    try {
      await GroupService.removeMember(groupId, userId)
      await loadGroup()
      success('Removed', 'Member removed from group')
    } catch (err) {
      showError('Error', err.message || 'Failed to remove member')
    }
  }

  // Set role
  const handleSetRole = async (userId, role) => {
    try {
      await GroupService.setMemberRole(groupId, userId, role)
      await loadGroup()
      success('Updated', `Role changed to ${role}`)
    } catch (err) {
      showError('Error', err.message || 'Failed to change role')
    }
  }

  // Mute/unmute
  const handleMute = async (userId, muted) => {
    try {
      await GroupService.muteMember(groupId, userId, {
        muted,
        duration_minutes: muted ? muteDuration : 0,
      })
      setMuteTarget(null)
      await loadGroup()
      success(muted ? 'Muted' : 'Unmuted', muted ? 'Member has been muted' : 'Member has been unmuted')
    } catch (err) {
      showError('Error', err.message || 'Failed to update mute status')
    }
  }

  // Create announcement
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.trim()) return
    try {
      await GroupService.createAnnouncement(groupId, {
        content: newAnnouncement.trim(),
        is_pinned: announcementPinned,
      })
      setNewAnnouncement('')
      setAnnouncementPinned(false)
      await loadAnnouncements()
      success('Posted', 'Announcement created')
    } catch (err) {
      showError('Error', err.message || 'Failed to create announcement')
    }
  }

  // Review join request
  const handleReviewRequest = async (requestId, status) => {
    try {
      await GroupService.reviewJoinRequest(groupId, requestId, { status })
      await loadJoinRequests()
      if (status === 'approved') await loadGroup()
      success(status === 'approved' ? 'Approved' : 'Rejected', `Join request ${status}`)
    } catch (err) {
      showError('Error', err.message || 'Failed to review request')
    }
  }

  // Role badge
  const roleBadge = (role) => {
    if (role === 'owner') return <span className="flex items-center gap-1 text-xs text-amber-600"><Crown className="w-3 h-3" /> Owner</span>
    if (role === 'admin') return <span className="flex items-center gap-1 text-xs text-purple-600"><Shield className="w-3 h-3" /> Admin</span>
    return <span className="text-xs text-gray-400">Member</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <ShieldAlert className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">Only admins and owners can access group settings.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Group Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-4">
        {['general', 'members', 'announcements', 'requests'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'requests' && joinRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {joinRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* General Tab */}
        {tab === 'general' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Members</label>
              <input
                type="number"
                value={maxMembers}
                onChange={e => setMaxMembers(parseInt(e.target.value, 10) || 200)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                min={2}
                max={10000}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Public Group</p>
                <p className="text-xs text-gray-500">Anyone can find and view this group</p>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-black' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require Approval</p>
                <p className="text-xs text-gray-500">New members must be approved by admin</p>
              </div>
              <button
                onClick={() => setRequireApproval(!requireApproval)}
                className={`w-11 h-6 rounded-full transition-colors ${requireApproval ? 'bg-black' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${requireApproval ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-black hover:bg-gray-800 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>

            {isOwner && (
              <Button onClick={handleDeleteGroup} variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Group
              </Button>
            )}
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div className="space-y-1">
            {members.map(member => {
              const memberName = member.User?.name || member.nickname || `User #${member.user_id}`
              const isMe = member.user_id === currentUserId
              const canManage = isOwner || (isAdmin && member.role === 'member')

              return (
                <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white font-bold">
                    {memberName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{memberName}</h3>
                      {isMe && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {roleBadge(member.role)}
                      {member.is_muted && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <VolumeX className="w-3 h-3" /> Muted
                        </span>
                      )}
                    </div>
                  </div>

                  {canManage && !isMe && (
                    <div className="flex items-center gap-1">
                      {/* Promote / Demote */}
                      {isOwner && member.role === 'member' && (
                        <button
                          onClick={() => handleSetRole(member.user_id, 'admin')}
                          className="p-1.5 hover:bg-purple-50 rounded text-purple-600"
                          title="Promote to admin"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      {isOwner && member.role === 'admin' && (
                        <button
                          onClick={() => handleSetRole(member.user_id, 'member')}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Demote to member"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      )}

                      {/* Mute / Unmute */}
                      {member.is_muted ? (
                        <button
                          onClick={() => handleMute(member.user_id, false)}
                          className="p-1.5 hover:bg-green-50 rounded text-green-600"
                          title="Unmute"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setMuteTarget(member)}
                          className="p-1.5 hover:bg-orange-50 rounded text-orange-500"
                          title="Mute"
                        >
                          <VolumeX className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Announcements Tab */}
        {tab === 'announcements' && (
          <div className="space-y-4 max-w-lg">
            <div className="space-y-3">
              <textarea
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                placeholder="Write an announcement..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                rows={3}
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={e => setAnnouncementPinned(e.target.checked)}
                    className="accent-black"
                  />
                  Pin announcement
                </label>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={!newAnnouncement.trim()}
                  size="sm"
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <Megaphone className="w-4 h-4 mr-1" /> Post
                </Button>
              </div>
            </div>

            <hr />

            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No announcements yet</p>
            ) : (
              <div className="space-y-3">
                {announcements.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.is_pinned ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                    <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{a.Author?.name || `User #${a.author_id}`}</span>
                      <span>&middot;</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.is_pinned && <span className="text-amber-600 font-medium">Pinned</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Join Requests Tab */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {joinRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No pending join requests</p>
            ) : (
              joinRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300 flex items-center justify-center text-white font-bold">
                    {(req.User?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{req.User?.name || `User #${req.user_id}`}</h3>
                    {req.message && <p className="text-xs text-gray-500 truncate">{req.message}</p>}
                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReviewRequest(req.id, 'approved')}
                      className="p-2 hover:bg-green-50 rounded-full text-green-600"
                      title="Approve"
                    >
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'rejected')}
                      className="p-2 hover:bg-red-50 rounded-full text-red-500"
                      title="Reject"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Mute Dialog */}
      {muteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">
              Mute {muteTarget.User?.name || `User #${muteTarget.user_id}`}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Choose how long to mute this member.</p>
            <div className="space-y-2 mb-4">
              {[
                { label: '1 hour', value: 60 },
                { label: '8 hours', value: 480 },
                { label: '24 hours', value: 1440 },
                { label: '7 days', value: 10080 },
                { label: '30 days', value: 43200 },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${
                  muteDuration === opt.value ? 'border-black bg-gray-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="mute-duration"
                    value={opt.value}
                    checked={muteDuration === opt.value}
                    onChange={() => setMuteDuration(opt.value)}
                    className="accent-black"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setMuteTarget(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => handleMute(muteTarget.user_id, true)}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                <VolumeX className="w-4 h-4 mr-1" /> Mute
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupSettingsPanel
