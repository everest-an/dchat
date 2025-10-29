import { ContractService } from './ContractService'
import LivingPortfolioABI from '../abis/LivingPortfolio.json'

/**
 * Living Portfolio 服务
 * 管理动态作品集、项目、可用性等功能
 */
export class LivingPortfolioService extends ContractService {
  constructor(provider, signer = null) {
    super('LivingPortfolio', LivingPortfolioABI.abi, provider, signer)
  }

  // ========== 作品集管理 ==========

  /**
   * 创建作品集
   */
  async createPortfolio(title, bio, skills, hourlyRate) {
    const hourlyRateWei = ContractService.parseEther(hourlyRate)
    return await this.send('createPortfolio', title, bio, skills, hourlyRateWei)
  }

  /**
   * 更新作品集
   */
  async updatePortfolio(title, bio, skills, hourlyRate) {
    const hourlyRateWei = ContractService.parseEther(hourlyRate)
    return await this.send('updatePortfolio', title, bio, skills, hourlyRateWei)
  }

  /**
   * 获取作品集
   */
  async getPortfolio(address) {
    const result = await this.call('getPortfolio', address)
    if (result.success) {
      const portfolio = result.data
      return {
        success: true,
        portfolio: {
          owner: portfolio.owner,
          title: portfolio.title,
          bio: portfolio.bio,
          skills: portfolio.skills,
          hourlyRate: ContractService.formatEther(portfolio.hourlyRate),
          currentStatus: Number(portfolio.currentStatus),
          reputationScore: Number(portfolio.reputationScore),
          totalProjects: Number(portfolio.totalProjects),
          completedProjects: Number(portfolio.completedProjects),
          createdAt: Number(portfolio.createdAt),
          updatedAt: Number(portfolio.updatedAt)
        }
      }
    }
    return result
  }

  /**
   * 检查作品集是否存在
   */
  async portfolioExists(address) {
    return await this.call('portfolioExists', address)
  }

  // ========== 项目管理 ==========

  /**
   * 添加项目
   */
  async addProject(
    title,
    description,
    category,
    technologies,
    startDate,
    estimatedHours,
    isPublic
  ) {
    return await this.send(
      'addProject',
      title,
      description,
      category,
      technologies,
      startDate,
      estimatedHours,
      isPublic
    )
  }

  /**
   * 更新项目进度
   */
  async updateProjectProgress(projectIndex, status, progress, hoursWorked) {
    return await this.send(
      'updateProjectProgress',
      projectIndex,
      status,
      progress,
      hoursWorked
    )
  }

  /**
   * 完成项目
   */
  async completeProject(projectIndex, completionNotes) {
    return await this.send('completeProject', projectIndex, completionNotes)
  }

  /**
   * 获取用户项目
   */
  async getUserProjects(address) {
    const result = await this.call('getUserProjects', address)
    if (result.success) {
      const projects = result.data.map(project => ({
        title: project.title,
        description: project.description,
        category: project.category,
        technologies: project.technologies,
        status: Number(project.status),
        progress: Number(project.progress),
        startDate: Number(project.startDate),
        completionDate: Number(project.completionDate),
        estimatedHours: Number(project.estimatedHours),
        hoursWorked: Number(project.hoursWorked),
        isPublic: project.isPublic,
        completionNotes: project.completionNotes
      }))
      return { success: true, projects }
    }
    return result
  }

  /**
   * 获取当前项目
   */
  async getCurrentProjects(address) {
    const result = await this.call('getCurrentProjects', address)
    if (result.success) {
      const projects = result.data.map(project => ({
        title: project.title,
        description: project.description,
        category: project.category,
        technologies: project.technologies,
        status: Number(project.status),
        progress: Number(project.progress),
        startDate: Number(project.startDate),
        estimatedHours: Number(project.estimatedHours),
        hoursWorked: Number(project.hoursWorked),
        isPublic: project.isPublic
      }))
      return { success: true, projects }
    }
    return result
  }

  /**
   * 获取公开项目
   */
  async getPublicProjects(address) {
    const result = await this.call('getPublicProjects', address)
    if (result.success) {
      const projects = result.data.map(project => ({
        title: project.title,
        description: project.description,
        category: project.category,
        technologies: project.technologies,
        status: Number(project.status),
        progress: Number(project.progress),
        startDate: Number(project.startDate),
        completionDate: Number(project.completionDate),
        estimatedHours: Number(project.estimatedHours),
        hoursWorked: Number(project.hoursWorked)
      }))
      return { success: true, projects }
    }
    return result
  }

  // ========== 可用性管理 ==========

  /**
   * 更新可用性
   */
  async updateAvailability(
    status,
    availableFrom,
    availableUntil,
    hoursPerWeek,
    notes
  ) {
    return await this.send(
      'updateAvailability',
      status,
      availableFrom,
      availableUntil,
      hoursPerWeek,
      notes
    )
  }

  /**
   * 获取可用性
   */
  async getAvailability(address) {
    const result = await this.call('getAvailability', address)
    if (result.success) {
      const availability = result.data
      return {
        success: true,
        availability: {
          status: Number(availability.status),
          availableFrom: Number(availability.availableFrom),
          availableUntil: Number(availability.availableUntil),
          hoursPerWeek: Number(availability.hoursPerWeek),
          notes: availability.notes,
          lastUpdated: Number(availability.lastUpdated)
        }
      }
    }
    return result
  }

  // ========== 订阅系统 ==========

  /**
   * 订阅用户
   */
  async subscribe(targetAddress, notifyAvailability, notifyNewProjects, notifySkills) {
    return await this.send(
      'subscribe',
      targetAddress,
      notifyAvailability,
      notifyNewProjects,
      notifySkills
    )
  }

  /**
   * 取消订阅
   */
  async unsubscribe(targetAddress) {
    return await this.send('unsubscribe', targetAddress)
  }

  /**
   * 获取订阅列表
   */
  async getSubscriptions(address) {
    return await this.call('getSubscriptions', address)
  }

  /**
   * 获取订阅者列表
   */
  async getSubscribers(address) {
    return await this.call('getSubscribers', address)
  }

  /**
   * 检查是否已订阅
   */
  async isSubscribed(subscriber, target) {
    return await this.call('isSubscribed', subscriber, target)
  }

  // ========== 机会匹配 ==========

  /**
   * 创建机会匹配
   */
  async createOpportunityMatch(requiredSkills) {
    return await this.send('createOpportunityMatch', requiredSkills)
  }

  /**
   * 获取匹配机会
   */
  async getMatchedOpportunities(address) {
    return await this.call('getMatchedOpportunities', address)
  }

  // ========== 凭证系统 ==========

  /**
   * 发行凭证
   */
  async issueCredential(
    recipient,
    credentialType,
    title,
    description,
    relatedProjectId,
    evidenceHash
  ) {
    return await this.send(
      'issueCredential',
      recipient,
      credentialType,
      title,
      description,
      relatedProjectId,
      evidenceHash
    )
  }

  /**
   * 获取用户凭证
   */
  async getUserCredentials(address) {
    const result = await this.call('getUserCredentials', address)
    if (result.success) {
      const credentials = result.data.map(cred => ({
        issuer: cred.issuer,
        recipient: cred.recipient,
        credentialType: cred.credentialType,
        title: cred.title,
        description: cred.description,
        relatedProjectId: Number(cred.relatedProjectId),
        evidenceHash: cred.evidenceHash,
        issuedAt: Number(cred.issuedAt),
        isValid: cred.isValid
      }))
      return { success: true, credentials }
    }
    return result
  }

  /**
   * 撤销凭证
   */
  async revokeCredential(credentialId) {
    return await this.send('revokeCredential', credentialId)
  }

  // ========== 事件监听 ==========

  /**
   * 监听作品集创建事件
   */
  onPortfolioCreated(callback) {
    this.on('PortfolioCreated', (owner, title, timestamp, event) => {
      callback({ owner, title, timestamp: Number(timestamp), event })
    })
  }

  /**
   * 监听项目添加事件
   */
  onProjectAdded(callback) {
    this.on('ProjectAdded', (owner, projectIndex, title, timestamp, event) => {
      callback({
        owner,
        projectIndex: Number(projectIndex),
        title,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听可用性更新事件
   */
  onAvailabilityUpdated(callback) {
    this.on('AvailabilityUpdated', (owner, status, timestamp, event) => {
      callback({
        owner,
        status: Number(status),
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听订阅事件
   */
  onSubscribed(callback) {
    this.on('Subscribed', (subscriber, target, timestamp, event) => {
      callback({
        subscriber,
        target,
        timestamp: Number(timestamp),
        event
      })
    })
  }

  /**
   * 监听机会匹配事件
   */
  onOpportunityMatched(callback) {
    this.on('OpportunityMatched', (matchId, seeker, provider, matchScore, event) => {
      callback({
        matchId: Number(matchId),
        seeker,
        provider,
        matchScore: Number(matchScore),
        event
      })
    })
  }

  /**
   * 监听凭证发行事件
   */
  onCredentialIssued(callback) {
    this.on('CredentialIssued', (credentialId, issuer, recipient, title, event) => {
      callback({
        credentialId: Number(credentialId),
        issuer,
        recipient,
        title,
        event
      })
    })
  }
}

// 枚举类型
export const AvailabilityStatus = {
  UNAVAILABLE: 0,
  AVAILABLE: 1,
  PARTIALLY_AVAILABLE: 2,
  BUSY: 3
}

export const ProjectStatus = {
  PLANNING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  ON_HOLD: 3,
  CANCELLED: 4
}
