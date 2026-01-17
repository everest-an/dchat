/**
 * GroupService.js
 * 
 * Manages group CRUD operations, IPFS storage, and blockchain integration
 */

import ipfsService from './IPFSService'
import { UserProfileService } from './UserProfileService'

class GroupService {
  constructor() {
    this.STORAGE_KEY = 'dchat_groups'
    this.USER_GROUPS_KEY = 'dchat_user_groups'
  }

  /**
   * Generate a unique group ID
   */
  generateGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create a new group
   * @param {Object} groupData - Group creation data
   * @returns {Promise<Object>} Created group
   */
  async createGroup(groupData) {
    try {
      console.log('📝 Creating new group:', groupData)

      const {
        name,
        description = '',
        avatar = null,
        creator,
        members = [],
        settings = {}
      } = groupData

      // Validate required fields
      if (!name || !creator) {
        throw new Error('Group name and creator are required')
      }

      // Generate group ID
      const groupId = this.generateGroupId()

      // Prepare group object
      const group = {
        id: groupId,
        name: name.trim(),
        description: description.trim(),
        avatar: avatar || {
          type: 'emoji',
          emoji: '👥'
        },
        creator,
        admins: [creator],
        members: [
          {
            address: creator,
            username: UserProfileService.getDisplayName(creator),
            avatar: UserProfileService.getDisplayAvatar(creator),
            role: 'admin',
            joinedAt: Date.now(),
            permissions: {
              canSendMessages: true,
              canAddMembers: true,
              canRemoveMembers: true,
              canEditGroup: true
            }
          },
          ...members.map(member => ({
            address: member.address || member,
            username: UserProfileService.getDisplayName(member.address || member),
            avatar: UserProfileService.getDisplayAvatar(member.address || member),
            role: 'member',
            joinedAt: Date.now(),
            permissions: {
              canSendMessages: true,
              canAddMembers: false,
              canRemoveMembers: false,
              canEditGroup: false
            }
          }))
        ],
        memberCount: 1 + members.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          privacy: settings.privacy || 'private',
          joinApproval: settings.joinApproval !== false,
          allowMemberInvite: settings.allowMemberInvite !== false,
          allowFileSharing: settings.allowFileSharing !== false,
          maxMembers: settings.maxMembers || 100,
          notifications: {
            enabled: true,
            mentions: true,
            allMessages: false
          }
        },
        ipfsHash: null,
        blockchainTxHash: null
      }

      // Save to localStorage
      this.saveGroupLocally(group)

      // Save to user's group list
      this.addToUserGroups(creator, groupId)

      // Upload to IPFS (async, don't wait)
      this.saveGroupToIPFS(group).catch(err => {
        console.error('Failed to save group to IPFS:', err)
      })

      console.log('✅ Group created successfully:', group)
      return group

    } catch (error) {
      console.error('❌ Error creating group:', error)
      throw error
    }
  }

  /**
   * Save group to localStorage
   */
  saveGroupLocally(group) {
    try {
      const groups = this.getAllGroupsFromStorage()
      const existingIndex = groups.findIndex(g => g.id === group.id)

      if (existingIndex >= 0) {
        groups[existingIndex] = group
      } else {
        groups.push(group)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(groups))
      console.log('💾 Group saved to localStorage:', group.id)
    } catch (error) {
      console.error('Error saving group locally:', error)
      throw error
    }
  }

  /**
   * Get all groups from localStorage
   */
  getAllGroupsFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading groups from storage:', error)
      return []
    }
  }

  /**
   * Add group to user's group list
   */
  addToUserGroups(userAddress, groupId) {
    try {
      const key = `${this.USER_GROUPS_KEY}_${userAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      const userGroups = stored ? JSON.parse(stored) : []

      if (!userGroups.includes(groupId)) {
        userGroups.push(groupId)
        localStorage.setItem(key, JSON.stringify(userGroups))
      }
    } catch (error) {
      console.error('Error adding to user groups:', error)
    }
  }

  /**
   * Remove group from user's group list
   */
  removeFromUserGroups(userAddress, groupId) {
    try {
      const key = `${this.USER_GROUPS_KEY}_${userAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      const userGroups = stored ? JSON.parse(stored) : []

      const filtered = userGroups.filter(id => id !== groupId)
      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error removing from user groups:', error)
    }
  }

  /**
   * Upload group data to IPFS
   */
  async saveGroupToIPFS(group) {
    try {
      console.log('📤 Uploading group to IPFS:', group.id)

      // Prepare data for IPFS
      const ipfsData = {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        creator: group.creator,
        admins: group.admins,
        members: group.members.map(m => ({
          address: m.address,
          role: m.role,
          joinedAt: m.joinedAt
        })),
        memberCount: group.memberCount,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        settings: group.settings
      }

      // Upload to IPFS
      const ipfsHash = await ipfsService.uploadJSON(ipfsData)

      if (ipfsHash) {
        // Update group with IPFS hash
        group.ipfsHash = ipfsHash
        this.saveGroupLocally(group)

        console.log('✅ Group uploaded to IPFS:', ipfsHash)
        return ipfsHash
      }

      return null
    } catch (error) {
      console.error('❌ Error uploading group to IPFS:', error)
      return null
    }
  }

  /**
   * Get a specific group by ID
   */
  getGroup(groupId) {
    try {
      const groups = this.getAllGroupsFromStorage()
      return groups.find(g => g.id === groupId) || null
    } catch (error) {
      console.error('Error getting group:', error)
      return null
    }
  }

  /**
   * Get all groups for a user
   */
  getAllGroups(userAddress) {
    try {
      const key = `${this.USER_GROUPS_KEY}_${userAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      const userGroupIds = stored ? JSON.parse(stored) : []

      const allGroups = this.getAllGroupsFromStorage()
      return allGroups.filter(g => userGroupIds.includes(g.id))
    } catch (error) {
      console.error('Error getting user groups:', error)
      return []
    }
  }

  /**
   * Get group members
   */
  getGroupMembers(groupId) {
    try {
      const group = this.getGroup(groupId)
      return group ? group.members : []
    } catch (error) {
      console.error('Error getting group members:', error)
      return []
    }
  }

  /**
   * Search groups by name
   */
  searchGroups(query, userAddress) {
    try {
      const groups = this.getAllGroups(userAddress)
      const lowerQuery = query.toLowerCase()

      return groups.filter(g =>
        g.name.toLowerCase().includes(lowerQuery) ||
        g.description.toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      console.error('Error searching groups:', error)
      return []
    }
  }

  /**
   * Update group information
   */
  async updateGroup(groupId, updates) {
    try {
      console.log('📝 Updating group:', groupId, updates)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Update fields
      const updatedGroup = {
        ...group,
        ...updates,
        updatedAt: Date.now()
      }

      // Save locally
      this.saveGroupLocally(updatedGroup)

      // Upload to IPFS (async)
      this.saveGroupToIPFS(updatedGroup).catch(err => {
        console.error('Failed to update group on IPFS:', err)
      })

      console.log('✅ Group updated successfully')
      return updatedGroup

    } catch (error) {
      console.error('❌ Error updating group:', error)
      throw error
    }
  }

  /**
   * Update group avatar
   */
  async updateGroupAvatar(groupId, avatarData) {
    try {
      console.log('🖼️ Updating group avatar:', groupId)

      return await this.updateGroup(groupId, { avatar: avatarData })

    } catch (error) {
      console.error('❌ Error updating group avatar:', error)
      throw error
    }
  }

  /**
   * Update group settings
   */
  async updateGroupSettings(groupId, settings) {
    try {
      console.log('⚙️ Updating group settings:', groupId)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      const updatedSettings = {
        ...group.settings,
        ...settings
      }

      return await this.updateGroup(groupId, { settings: updatedSettings })

    } catch (error) {
      console.error('❌ Error updating group settings:', error)
      throw error
    }
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId, userAddress) {
    try {
      console.log('🗑️ Deleting group:', groupId)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if user is admin
      if (!group.admins.includes(userAddress)) {
        throw new Error('Only admins can delete the group')
      }

      // Remove from storage
      const groups = this.getAllGroupsFromStorage()
      const filtered = groups.filter(g => g.id !== groupId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))

      // Remove from all members' user groups
      group.members.forEach(member => {
        this.removeFromUserGroups(member.address, groupId)
      })

      // Delete group messages
      localStorage.removeItem(`dchat_group_messages_${groupId}`)

      console.log('✅ Group deleted successfully')
      return true

    } catch (error) {
      console.error('❌ Error deleting group:', error)
      throw error
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId, userAddress) {
    try {
      console.log('🚪 Leaving group:', groupId)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Remove member
      const updatedMembers = group.members.filter(
        m => m.address.toLowerCase() !== userAddress.toLowerCase()
      )

      // Remove from admins if admin
      const updatedAdmins = group.admins.filter(
        a => a.toLowerCase() !== userAddress.toLowerCase()
      )

      // If last member, delete group
      if (updatedMembers.length === 0) {
        return await this.deleteGroup(groupId, userAddress)
      }

      // If last admin, promote someone
      if (updatedAdmins.length === 0 && updatedMembers.length > 0) {
        updatedAdmins.push(updatedMembers[0].address)
        updatedMembers[0].role = 'admin'
        updatedMembers[0].permissions = {
          canSendMessages: true,
          canAddMembers: true,
          canRemoveMembers: true,
          canEditGroup: true
        }
      }

      // Update group
      await this.updateGroup(groupId, {
        members: updatedMembers,
        admins: updatedAdmins,
        memberCount: updatedMembers.length
      })

      // Remove from user's group list
      this.removeFromUserGroups(userAddress, groupId)

      console.log('✅ Left group successfully')
      return true

    } catch (error) {
      console.error('❌ Error leaving group:', error)
      throw error
    }
  }

  /**
   * Add a member to the group
   */
  async addMember(groupId, memberAddress, addedBy) {
    try {
      console.log('➕ Adding member to group:', groupId, memberAddress)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if already a member
      if (group.members.some(m => m.address.toLowerCase() === memberAddress.toLowerCase())) {
        throw new Error('User is already a member')
      }

      // Check member limit
      if (group.members.length >= group.settings.maxMembers) {
        throw new Error('Group has reached maximum member limit')
      }

      // Add new member
      const newMember = {
        address: memberAddress,
        username: UserProfileService.getDisplayName(memberAddress),
        avatar: UserProfileService.getDisplayAvatar(memberAddress),
        role: 'member',
        joinedAt: Date.now(),
        permissions: {
          canSendMessages: true,
          canAddMembers: false,
          canRemoveMembers: false,
          canEditGroup: false
        }
      }

      const updatedMembers = [...group.members, newMember]

      // Update group
      await this.updateGroup(groupId, {
        members: updatedMembers,
        memberCount: updatedMembers.length
      })

      // Add to user's group list
      this.addToUserGroups(memberAddress, groupId)

      console.log('✅ Member added successfully')
      return newMember

    } catch (error) {
      console.error('❌ Error adding member:', error)
      throw error
    }
  }

  /**
   * Remove a member from the group
   */
  async removeMember(groupId, memberAddress, removedBy) {
    try {
      console.log('➖ Removing member from group:', groupId, memberAddress)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if remover is admin
      if (!group.admins.includes(removedBy)) {
        throw new Error('Only admins can remove members')
      }

      // Can't remove creator
      if (memberAddress.toLowerCase() === group.creator.toLowerCase()) {
        throw new Error('Cannot remove group creator')
      }

      // Remove member
      const updatedMembers = group.members.filter(
        m => m.address.toLowerCase() !== memberAddress.toLowerCase()
      )

      // Remove from admins if admin
      const updatedAdmins = group.admins.filter(
        a => a.toLowerCase() !== memberAddress.toLowerCase()
      )

      // Update group
      await this.updateGroup(groupId, {
        members: updatedMembers,
        admins: updatedAdmins,
        memberCount: updatedMembers.length
      })

      // Remove from user's group list
      this.removeFromUserGroups(memberAddress, groupId)

      console.log('✅ Member removed successfully')
      return true

    } catch (error) {
      console.error('❌ Error removing member:', error)
      throw error
    }
  }

  /**
   * Promote a member to admin
   */
  async promoteMember(groupId, memberAddress, promotedBy) {
    try {
      console.log('⬆️ Promoting member to admin:', groupId, memberAddress)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if promoter is admin
      if (!group.admins.includes(promotedBy)) {
        throw new Error('Only admins can promote members')
      }

      // Check if already admin
      if (group.admins.includes(memberAddress)) {
        throw new Error('User is already an admin')
      }

      // Update member role
      const updatedMembers = group.members.map(m => {
        if (m.address.toLowerCase() === memberAddress.toLowerCase()) {
          return {
            ...m,
            role: 'admin',
            permissions: {
              canSendMessages: true,
              canAddMembers: true,
              canRemoveMembers: true,
              canEditGroup: true
            }
          }
        }
        return m
      })

      // Add to admins
      const updatedAdmins = [...group.admins, memberAddress]

      // Update group
      await this.updateGroup(groupId, {
        members: updatedMembers,
        admins: updatedAdmins
      })

      console.log('✅ Member promoted successfully')
      return true

    } catch (error) {
      console.error('❌ Error promoting member:', error)
      throw error
    }
  }

  /**
   * Demote an admin to member
   */
  async demoteMember(groupId, memberAddress, demotedBy) {
    try {
      console.log('⬇️ Demoting admin to member:', groupId, memberAddress)

      const group = this.getGroup(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Check if demoter is admin
      if (!group.admins.includes(demotedBy)) {
        throw new Error('Only admins can demote members')
      }

      // Can't demote creator
      if (memberAddress.toLowerCase() === group.creator.toLowerCase()) {
        throw new Error('Cannot demote group creator')
      }

      // Can't demote if only one admin
      if (group.admins.length <= 1) {
        throw new Error('Cannot demote the only admin')
      }

      // Update member role
      const updatedMembers = group.members.map(m => {
        if (m.address.toLowerCase() === memberAddress.toLowerCase()) {
          return {
            ...m,
            role: 'member',
            permissions: {
              canSendMessages: true,
              canAddMembers: false,
              canRemoveMembers: false,
              canEditGroup: false
            }
          }
        }
        return m
      })

      // Remove from admins
      const updatedAdmins = group.admins.filter(
        a => a.toLowerCase() !== memberAddress.toLowerCase()
      )

      // Update group
      await this.updateGroup(groupId, {
        members: updatedMembers,
        admins: updatedAdmins
      })

      console.log('✅ Member demoted successfully')
      return true

    } catch (error) {
      console.error('❌ Error demoting member:', error)
      throw error
    }
  }

  /**
   * Check if user is a member of the group
   */
  isMember(groupId, userAddress) {
    try {
      const group = this.getGroup(groupId)
      if (!group) return false

      return group.members.some(
        m => m.address.toLowerCase() === userAddress.toLowerCase()
      )
    } catch (error) {
      console.error('Error checking membership:', error)
      return false
    }
  }

  /**
   * Check if user is an admin of the group
   */
  isAdmin(groupId, userAddress) {
    try {
      const group = this.getGroup(groupId)
      if (!group) return false

      return group.admins.some(
        a => a.toLowerCase() === userAddress.toLowerCase()
      )
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  /**
   * Get member permissions
   */
  getMemberPermissions(groupId, userAddress) {
    try {
      const group = this.getGroup(groupId)
      if (!group) return null

      const member = group.members.find(
        m => m.address.toLowerCase() === userAddress.toLowerCase()
      )

      return member ? member.permissions : null
    } catch (error) {
      console.error('Error getting member permissions:', error)
      return null
    }
  }
}

// Export singleton instance
export default new GroupService()
