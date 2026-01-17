import { ContractService } from './ContractService'
import UserIdentityV2ABI from '../abis/UserIdentityV2.json'

/**
 * TODO: Translate '用户身份服务'
 * TODO: Translate '管理用户注册'、TODO: Translate '资料'、TODO: Translate '验证等功能'
 */
export class UserIdentityService extends ContractService {
  constructor(provider, signer = null) {
    super('UserIdentityV2', UserIdentityV2ABI.abi, provider, signer)
  }

  /**
   * TODO: Translate '注册用户'
   */
  async registerUser(name, title, company, email, linkedInUrl = '') {
    return await this.send(
      'registerUser',
      name,
      title,
      company,
      email,
      linkedInUrl
    )
  }

  /**
   * TODO: Translate '更新用户资料'
   */
  async updateProfile(name, title, company, email, linkedInUrl = '') {
    return await this.send(
      'updateProfile',
      name,
      title,
      company,
      email,
      linkedInUrl
    )
  }

  /**
   * TODO: Translate '获取用户资料'
   */
  async getProfile(address) {
    const result = await this.call('getProfile', address)
    if (result.success) {
      const profile = result.data
      return {
        success: true,
        profile: {
          owner: profile.owner,
          name: profile.name,
          title: profile.title,
          company: profile.company,
          email: profile.email,
          linkedInUrl: profile.linkedInUrl,
          isVerified: profile.isVerified,
          reputationScore: Number(profile.reputationScore),
          registeredAt: Number(profile.registeredAt),
          lastUpdated: Number(profile.lastUpdated)
        }
      }
    }
    return result
  }

  /**
   * TODO: Translate '检查用户是否已注册'
   */
  async isRegistered(address) {
    return await this.call('isRegistered', address)
  }

  /**
   * TODO: Translate '验证用户'
   */
  async verifyUser(address) {
    return await this.send('verifyUser', address)
  }

  /**
   * TODO: Translate '添加技能'
   */
  async addSkill(skill) {
    return await this.send('addSkill', skill)
  }

  /**
   * TODO: Translate '移除技能'
   */
  async removeSkill(skill) {
    return await this.send('removeSkill', skill)
  }

  /**
   * TODO: Translate '获取用户技能'
   */
  async getUserSkills(address) {
    return await this.call('getUserSkills', address)
  }

  /**
   * TODO: Translate '更新信誉分数'
   */
  async updateReputationScore(address, scoreChange) {
    return await this.send('updateReputationScore', address, scoreChange)
  }

  /**
   * TODO: Translate '获取信誉分数'
   */
  async getReputationScore(address) {
    const result = await this.call('getReputationScore', address)
    if (result.success) {
      return {
        success: true,
        score: Number(result.data)
      }
    }
    return result
  }

  /**
   * TODO: Translate '搜索用户'
   */
  async searchUsersBySkill(skill) {
    return await this.call('searchUsersBySkill', skill)
  }

  /**
   * TODO: Translate '监听用户注册事件'
   */
  onUserRegistered(callback) {
    this.on('UserRegistered', (userAddress, name, timestamp, event) => {
      callback({
        userAddress,
        name,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * TODO: Translate '监听资料更新事件'
   */
  onProfileUpdated(callback) {
    this.on('ProfileUpdated', (userAddress, timestamp, event) => {
      callback({
        userAddress,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * TODO: Translate '监听用户验证事件'
   */
  onUserVerified(callback) {
    this.on('UserVerified', (userAddress, verifier, timestamp, event) => {
      callback({
        userAddress,
        verifier,
        timestamp: Number(timestamp),
        event
      })
    })
  }
}
