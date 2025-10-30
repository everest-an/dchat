import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { useWeb3 } from '../../contexts/Web3Context'
import { UserProfileService } from '../../services/UserProfileService'
import { subscriptionService } from '../../services/SubscriptionService'
import GroupService from '../../services/GroupService'
import UpgradeDialog from './UpgradeDialog'

const CreateGroupDialog = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { account } = useWeb3()
  const { success, error } = useToast()
  
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [members, setMembers] = useState([])
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState({ title: '', description: '' })

  const handleAddMember = () => {
    if (!memberAddress.trim()) {
      error('Error', 'Please enter a wallet address')
      return
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(memberAddress)) {
      error('Error', 'Invalid Ethereum address')
      return
    }

    if (memberAddress.toLowerCase() === account.toLowerCase()) {
      error('Error', 'You are already a member')
      return
    }

    if (members.some(m => m.address.toLowerCase() === memberAddress.toLowerCase())) {
      error('Error', 'Member already added')
      return
    }

    // Check subscription limit (including creator)
    const totalMembers = members.length + 2 // +1 for creator, +1 for new member
    if (!subscriptionService.canAddGroupMember(account, totalMembers)) {
      const limits = subscriptionService.getUserLimits(account)
      setUpgradeMessage({
        title: 'Group Member Limit Reached',
        description: `Free plan allows up to ${limits.groupMembers} members per group. Upgrade to Pro for unlimited members.`
      })
      setShowUpgradeDialog(true)
      return
    }

    const newMember = {
      address: memberAddress,
      username: UserProfileService.getDisplayName(memberAddress),
      avatar: UserProfileService.getDisplayAvatar(memberAddress),
      role: 'member'
    }

    setMembers([...members, newMember])
    setMemberAddress('')
  }

  const handleRemoveMember = (address) => {
    setMembers(members.filter(m => m.address !== address))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      error('Error', 'Please enter a group name')
      return
    }

    try {
      // use GroupService TODO: Translate '创建群组'
      const groupData = {
        name: groupName,
        description: groupDescription,
        avatar: {
          type: 'emoji',
          emoji: groupName.charAt(0).toUpperCase()
        },
        creator: account,
        members: members.map(m => ({ address: m.address })),
        settings: {
          privacy: 'private',
          joinApproval: true,
          allowMemberInvite: true,
          allowFileSharing: true,
          maxMembers: 100
        }
      }

      const group = await GroupService.createGroup(groupData)

      success('Created!', `Group "${groupName}" created successfully`)
      onClose()
      navigate(`/group/${group.id}`)
    } catch (err) {
      console.error('Error creating group:', err)
      error('Error', err.message || 'Failed to create group')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Create Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              maxLength={50}
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {groupDescription.length}/200 characters
            </p>
          </div>

          {/* Add Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <Button
                onClick={handleAddMember}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Members List */}
          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Members ({members.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.address}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.username}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {member.address.slice(0, 10)}...{member.address.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.address)}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You will be the admin of this group. You can add more members later.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t sticky bottom-0 bg-white">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            className="flex-1 bg-black hover:bg-gray-800 text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title={upgradeMessage.title}
        description={upgradeMessage.description}
      />
    </div>
  )
}

export default CreateGroupDialog
