import { ContractService } from './ContractService'
import MessageStorageV2ABI from '../abis/MessageStorageV2.json'

/**
 * 消息存储服务
 * 管理加密消息的链上存储和检索
 */
export class MessageStorageService extends ContractService {
  constructor(provider, signer = null) {
    super('MessageStorageV2', MessageStorageV2ABI.abi, provider, signer)
  }

  /**
   * 存储消息
   */
  async storeMessage(recipient, encryptedContent, ipfsHash = '', metadata = '') {
    return await this.send(
      'storeMessage',
      recipient,
      encryptedContent,
      ipfsHash,
      metadata
    )
  }

  /**
   * 存储群组消息
   */
  async storeGroupMessage(
    groupId,
    encryptedContent,
    ipfsHash = '',
    metadata = ''
  ) {
    return await this.send(
      'storeGroupMessage',
      groupId,
      encryptedContent,
      ipfsHash,
      metadata
    )
  }

  /**
   * 获取用户消息
   */
  async getUserMessages(address, offset = 0, limit = 50) {
    const result = await this.call('getUserMessages', address, offset, limit)
    if (result.success) {
      const messages = result.data.map(msg => ({
        messageId: Number(msg.messageId),
        sender: msg.sender,
        recipient: msg.recipient,
        encryptedContent: msg.encryptedContent,
        ipfsHash: msg.ipfsHash,
        metadata: msg.metadata,
        timestamp: Number(msg.timestamp),
        isRead: msg.isRead,
        isDeleted: msg.isDeleted
      }))
      return { success: true, messages }
    }
    return result
  }

  /**
   * 获取对话消息
   */
  async getConversationMessages(address1, address2, offset = 0, limit = 50) {
    const result = await this.call(
      'getConversationMessages',
      address1,
      address2,
      offset,
      limit
    )
    if (result.success) {
      const messages = result.data.map(msg => ({
        messageId: Number(msg.messageId),
        sender: msg.sender,
        recipient: msg.recipient,
        encryptedContent: msg.encryptedContent,
        ipfsHash: msg.ipfsHash,
        metadata: msg.metadata,
        timestamp: Number(msg.timestamp),
        isRead: msg.isRead,
        isDeleted: msg.isDeleted
      }))
      return { success: true, messages }
    }
    return result
  }

  /**
   * 获取群组消息
   */
  async getGroupMessages(groupId, offset = 0, limit = 50) {
    const result = await this.call('getGroupMessages', groupId, offset, limit)
    if (result.success) {
      const messages = result.data.map(msg => ({
        messageId: Number(msg.messageId),
        sender: msg.sender,
        groupId: Number(msg.groupId),
        encryptedContent: msg.encryptedContent,
        ipfsHash: msg.ipfsHash,
        metadata: msg.metadata,
        timestamp: Number(msg.timestamp),
        isDeleted: msg.isDeleted
      }))
      return { success: true, messages }
    }
    return result
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId) {
    return await this.send('markAsRead', messageId)
  }

  /**
   * 批量标记消息为已读
   */
  async markMultipleAsRead(messageIds) {
    return await this.send('markMultipleAsRead', messageIds)
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId) {
    return await this.send('deleteMessage', messageId)
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(address) {
    const result = await this.call('getUnreadCount', address)
    if (result.success) {
      return { success: true, count: Number(result.data) }
    }
    return result
  }

  /**
   * 获取对话未读数量
   */
  async getConversationUnreadCount(recipient, sender) {
    const result = await this.call('getConversationUnreadCount', recipient, sender)
    if (result.success) {
      return { success: true, count: Number(result.data) }
    }
    return result
  }

  /**
   * 创建群组
   */
  async createGroup(name, members) {
    return await this.send('createGroup', name, members)
  }

  /**
   * 添加群组成员
   */
  async addGroupMember(groupId, member) {
    return await this.send('addGroupMember', groupId, member)
  }

  /**
   * 移除群组成员
   */
  async removeGroupMember(groupId, member) {
    return await this.send('removeGroupMember', groupId, member)
  }

  /**
   * 获取用户群组
   */
  async getUserGroups(address) {
    const result = await this.call('getUserGroups', address)
    if (result.success) {
      const groups = result.data.map(group => ({
        groupId: Number(group.groupId),
        name: group.name,
        creator: group.creator,
        members: group.members,
        createdAt: Number(group.createdAt),
        isActive: group.isActive
      }))
      return { success: true, groups }
    }
    return result
  }

  /**
   * 获取群组信息
   */
  async getGroupInfo(groupId) {
    const result = await this.call('getGroupInfo', groupId)
    if (result.success) {
      const group = result.data
      return {
        success: true,
        group: {
          groupId: Number(group.groupId),
          name: group.name,
          creator: group.creator,
          members: group.members,
          createdAt: Number(group.createdAt),
          isActive: group.isActive
        }
      }
    }
    return result
  }

  // ========== 事件监听 ==========

  /**
   * 监听消息存储事件
   */
  onMessageStored(callback) {
    this.on('MessageStored', (messageId, sender, recipient, timestamp, event) => {
      callback({
        messageId: Number(messageId),
        sender,
        recipient,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听群组消息事件
   */
  onGroupMessageStored(callback) {
    this.on('GroupMessageStored', (messageId, sender, groupId, timestamp, event) => {
      callback({
        messageId: Number(messageId),
        sender,
        groupId: Number(groupId),
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听消息已读事件
   */
  onMessageRead(callback) {
    this.on('MessageRead', (messageId, reader, timestamp, event) => {
      callback({
        messageId: Number(messageId),
        reader,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听群组创建事件
   */
  onGroupCreated(callback) {
    this.on('GroupCreated', (groupId, creator, name, timestamp, event) => {
      callback({
        groupId: Number(groupId),
        creator,
        name,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听群组成员添加事件
   */
  onGroupMemberAdded(callback) {
    this.on('GroupMemberAdded', (groupId, member, timestamp, event) => {
      callback({
        groupId: Number(groupId),
        member,
        timestamp: Number(timestamp),
        event
      })
    })
  }
}
