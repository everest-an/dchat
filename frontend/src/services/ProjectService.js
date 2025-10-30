/**
 * 项目管理服务
 * 管理用户项目的本地存储和检索
 */

const STORAGE_KEY = 'dchat_user_projects'

export class ProjectService {
  /**
   * 获取用户的所有项目
   */
  static getProjects(address) {
    if (!address) return []
    
    const allProjects = this.getAllProjects()
    return allProjects[address.toLowerCase()] || []
  }

  /**
   * 添加新项目
   */
  static addProject(address, project) {
    if (!address || !project) return false
    
    const allProjects = this.getAllProjects()
    const userProjects = allProjects[address.toLowerCase()] || []
    
    const newProject = {
      id: Date.now(),
      ...project,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    userProjects.push(newProject)
    allProjects[address.toLowerCase()] = userProjects
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    return newProject
  }

  /**
   * 更新项目
   */
  static updateProject(address, projectId, updates) {
    if (!address || !projectId) return false
    
    const allProjects = this.getAllProjects()
    const userProjects = allProjects[address.toLowerCase()] || []
    
    const index = userProjects.findIndex(p => p.id === projectId)
    if (index === -1) return false
    
    userProjects[index] = {
      ...userProjects[index],
      ...updates,
      updatedAt: Date.now()
    }
    
    allProjects[address.toLowerCase()] = userProjects
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    return true
  }

  /**
   * 删除项目
   */
  static deleteProject(address, projectId) {
    if (!address || !projectId) return false
    
    const allProjects = this.getAllProjects()
    const userProjects = allProjects[address.toLowerCase()] || []
    
    const filtered = userProjects.filter(p => p.id !== projectId)
    allProjects[address.toLowerCase()] = filtered
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    return true
  }

  /**
   * 获取所有项目
   */
  static getAllProjects() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (err) {
      console.error('Error loading projects:', err)
      return {}
    }
  }
}
