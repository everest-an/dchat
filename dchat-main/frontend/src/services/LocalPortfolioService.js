/**
 * LocalPortfolioService
 * localStorage-based portfolio management for non-Web3 users
 * Mirrors the interface of LivingPortfolioService
 */

export const AvailabilityStatus = {
    AVAILABLE: 0,
    PARTIALLY_AVAILABLE: 1,
    BUSY: 2,
    UNAVAILABLE: 3
}

export const ProjectStatus = {
    PLANNING: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    ON_HOLD: 3,
    CANCELLED: 4
}

class LocalPortfolioService {
    constructor(userAddress) {
        this.userAddress = userAddress
        this.storagePrefix = 'dchat_local_'
    }

    // Helper: Get storage key
    getKey(type) {
        return `${this.storagePrefix}${type}_${this.userAddress}`
    }

    // Helper: Safe JSON parse
    getData(type, defaultValue = null) {
        try {
            const data = localStorage.getItem(this.getKey(type))
            return data ? JSON.parse(data) : defaultValue
        } catch (error) {
            console.error(`Error reading ${type}:`, error)
            return defaultValue
        }
    }

    // Helper: Safe JSON save
    setData(type, data) {
        try {
            localStorage.setItem(this.getKey(type), JSON.stringify(data))
            return { success: true }
        } catch (error) {
            console.error(`Error saving ${type}:`, error)
            return { success: false, error: error.message }
        }
    }

    // Check if portfolio exists
    async portfolioExists(address) {
        const portfolio = this.getData('portfolio')
        return {
            success: true,
            data: portfolio !== null
        }
    }

    // Create portfolio
    async createPortfolio(title, bio, skills, hourlyRate) {
        const portfolio = {
            owner: this.userAddress,
            title,
            bio,
            skills,
            hourlyRate,
            reputationScore: 0,
            totalProjects: 0,
            completedProjects: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        const result = this.setData('portfolio', portfolio)
        if (result.success) {
            // Initialize empty projects and credentials
            this.setData('projects', [])
            this.setData('credentials', [])
            this.setData('availability', {
                status: AvailabilityStatus.AVAILABLE,
                hoursPerWeek: 40,
                notes: '',
                updatedAt: Date.now()
            })
        }

        return {
            success: result.success,
            portfolio: result.success ? portfolio : null,
            error: result.error
        }
    }

    // Get portfolio
    async getPortfolio(address) {
        const portfolio = this.getData('portfolio')

        if (!portfolio) {
            return {
                success: false,
                error: 'Portfolio not found'
            }
        }

        return {
            success: true,
            portfolio
        }
    }

    // Update portfolio
    async updatePortfolio(updates) {
        const portfolio = this.getData('portfolio')

        if (!portfolio) {
            return {
                success: false,
                error: 'Portfolio not found'
            }
        }

        const updatedPortfolio = {
            ...portfolio,
            ...updates,
            updatedAt: Date.now()
        }

        return this.setData('portfolio', updatedPortfolio)
    }

    // Add project
    async addProject(projectData) {
        const projects = this.getData('projects', [])
        const portfolio = this.getData('portfolio')

        const newProject = {
            id: Date.now(),
            ...projectData,
            owner: this.userAddress,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        projects.push(newProject)
        const result = this.setData('projects', projects)

        if (result.success && portfolio) {
            portfolio.totalProjects = projects.length
            portfolio.completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length
            this.setData('portfolio', portfolio)
        }

        return {
            success: result.success,
            project: result.success ? newProject : null,
            error: result.error
        }
    }

    // Get user projects
    async getUserProjects(address) {
        const projects = this.getData('projects', [])

        return {
            success: true,
            projects
        }
    }

    // Get current projects
    async getCurrentProjects(address) {
        const projects = this.getData('projects', [])
        const currentProjects = projects.filter(p =>
            p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.PLANNING
        )

        return {
            success: true,
            projects: currentProjects
        }
    }

    // Update project
    async updateProject(projectId, updates) {
        const projects = this.getData('projects', [])
        const projectIndex = projects.findIndex(p => p.id === projectId)

        if (projectIndex === -1) {
            return {
                success: false,
                error: 'Project not found'
            }
        }

        projects[projectIndex] = {
            ...projects[projectIndex],
            ...updates,
            updatedAt: Date.now()
        }

        const result = this.setData('projects', projects)

        // Update portfolio stats
        if (result.success) {
            const portfolio = this.getData('portfolio')
            if (portfolio) {
                portfolio.completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length
                this.setData('portfolio', portfolio)
            }
        }

        return result
    }

    // Update availability
    async updateAvailability(status, hoursPerWeek, notes) {
        const availability = {
            status,
            hoursPerWeek,
            notes,
            updatedAt: Date.now()
        }

        return {
            ...this.setData('availability', availability),
            availability
        }
    }

    // Get availability
    async getAvailability(address) {
        const availability = this.getData('availability', {
            status: AvailabilityStatus.AVAILABLE,
            hoursPerWeek: 0,
            notes: '',
            updatedAt: Date.now()
        })

        return {
            success: true,
            availability
        }
    }

    // Add credential
    async addCredential(credentialData) {
        const credentials = this.getData('credentials', [])

        const newCredential = {
            id: Date.now(),
            ...credentialData,
            owner: this.userAddress,
            createdAt: Date.now()
        }

        credentials.push(newCredential)

        return {
            ...this.setData('credentials', credentials),
            credential: newCredential
        }
    }

    // Get user credentials
    async getUserCredentials(address) {
        const credentials = this.getData('credentials', [])

        return {
            success: true,
            credentials
        }
    }

    // Subscribe to user
    async subscribe(targetAddress) {
        const subscriptions = this.getData('subscriptions', [])

        if (!subscriptions.includes(targetAddress)) {
            subscriptions.push(targetAddress)
            const result = this.setData('subscriptions', subscriptions)

            // Also update target's subscribers
            const targetKey = `${this.storagePrefix}subscribers_${targetAddress}`
            const targetSubscribers = JSON.parse(localStorage.getItem(targetKey) || '[]')
            if (!targetSubscribers.includes(this.userAddress)) {
                targetSubscribers.push(this.userAddress)
                localStorage.setItem(targetKey, JSON.stringify(targetSubscribers))
            }

            return result
        }

        return { success: true }
    }

    // Unsubscribe from user
    async unsubscribe(targetAddress) {
        const subscriptions = this.getData('subscriptions', [])
        const filtered = subscriptions.filter(addr => addr !== targetAddress)
        const result = this.setData('subscriptions', filtered)

        // Also update target's subscribers
        const targetKey = `${this.storagePrefix}subscribers_${targetAddress}`
        const targetSubscribers = JSON.parse(localStorage.getItem(targetKey) || '[]')
        const filteredSubscribers = targetSubscribers.filter(addr => addr !== this.userAddress)
        localStorage.setItem(targetKey, JSON.stringify(filteredSubscribers))

        return result
    }

    // Get subscriptions
    async getSubscriptions(address) {
        const subscriptions = this.getData('subscriptions', [])

        return {
            success: true,
            data: subscriptions
        }
    }

    // Get subscribers
    async getSubscribers(address) {
        const subscribers = this.getData('subscribers', [])

        return {
            success: true,
            data: subscribers
        }
    }

    // Get matched opportunities (simple skill-based matching)
    async getMatchedOpportunities(address) {
        const myPortfolio = this.getData('portfolio')

        if (!myPortfolio) {
            return {
                success: true,
                data: []
            }
        }

        // Get all stored portfolios from localStorage
        const allKeys = Object.keys(localStorage)
        const portfolioKeys = allKeys.filter(key => key.includes('dchat_local_portfolio_') && !key.includes(this.userAddress))

        const matches = []

        for (const key of portfolioKeys) {
            try {
                const otherPortfolio = JSON.parse(localStorage.getItem(key))
                if (!otherPortfolio || !otherPortfolio.skills) continue

                // Calculate match score based on common skills
                const mySkills = myPortfolio.skills || []
                const theirSkills = otherPortfolio.skills || []
                const commonSkills = mySkills.filter(skill => theirSkills.includes(skill))
                const matchScore = Math.min(100, Math.round((commonSkills.length / Math.max(mySkills.length, theirSkills.length)) * 100))

                if (matchScore > 20) {  // Only show matches above 20%
                    matches.push({
                        seeker: this.userAddress,
                        provider: otherPortfolio.owner,
                        matchScore,
                        matchedSkills: commonSkills,
                        createdAt: Date.now()
                    })
                }
            } catch (error) {
                console.error('Error processing portfolio:', error)
            }
        }

        // Sort by match score
        matches.sort((a, b) => b.matchScore - a.matchScore)

        return {
            success: true,
            data: matches
        }
    }
}

export { LocalPortfolioService }
