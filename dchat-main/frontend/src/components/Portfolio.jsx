import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useLanguage } from '../contexts/LanguageContext'
import { LivingPortfolioService, AvailabilityStatus, ProjectStatus } from '../services/LivingPortfolioService'
import { LocalPortfolioService } from '../services/LocalPortfolioService'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  Briefcase,
  Plus,
  Edit,
  Clock,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import CreatePortfolioDialog from './dialogs/CreatePortfolioDialog'
import AddProjectDialog from './dialogs/AddProjectDialog'
import UpdateAvailabilityDialog from './dialogs/UpdateAvailabilityDialog'
import ProjectCard from './cards/ProjectCard'
import CredentialCard from './cards/CredentialCard'

/**
 * Portfolio 页面组件
 * 显示和管理用户的动态作品集
 * 支持 Web3（区块链）和 localStorage（本地）两种模式
 */
export default function Portfolio({ user }) {
  const { t } = useLanguage()
  const { account, provider, signer, isConnected } = useWeb3()

  // Use Web3 account or fallback to user data
  const userAddress = account || user?.walletAddress || user?.email || 'guest'

  // Initialize service based on Web3 connection
  const [portfolioService, setPortfolioService] = useState(null)

  useEffect(() => {
    if (isConnected && provider && signer) {
      // Use blockchain service for Web3 users
      setPortfolioService(new LivingPortfolioService(provider, signer))
    } else {
      // Use localStorage service for non-Web3 users
      setPortfolioService(new LocalPortfolioService(userAddress))
    }
  }, [isConnected, provider, signer, userAddress])

  // State variables
  const [portfolio, setPortfolio] = useState(null)
  const [projects, setProjects] = useState([])
  const [currentProjects, setCurrentProjects] = useState([])
  const [credentials, setCredentials] = useState([])
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showUpdateAvailability, setShowUpdateAvailability] = useState(false)

  // 加载作品集数据
  const loadPortfolio = async () => {
    if (!userAddress || !portfolioService) return

    try {
      setLoading(true)
      setError(null)

      // TODO: Translate '检查作品集是否存在'
      const existsResult = await portfolioService.portfolioExists(userAddress)

      if (!existsResult.success || !existsResult.data) {
        setPortfolio(null)
        setLoading(false)
        return
      }

      // TODO: Translate '加载作品集'
      const portfolioResult = await portfolioService.getPortfolio(userAddress)
      if (portfolioResult.success) {
        setPortfolio(portfolioResult.portfolio)
      }

      // TODO: Translate '加载项目'
      const projectsResult = await portfolioService.getUserProjects(userAddress)
      if (projectsResult.success) {
        setProjects(projectsResult.projects)
      }

      // TODO: Translate '加载当前项目'
      const currentResult = await portfolioService.getCurrentProjects(userAddress)
      if (currentResult.success) {
        setCurrentProjects(currentResult.projects)
      }

      // TODO: Translate '加载可用性'
      const availabilityResult = await portfolioService.getAvailability(userAddress)
      if (availabilityResult.success) {
        setAvailability(availabilityResult.availability)
      }

      // TODO: Translate '加载凭证'
      const credentialsResult = await portfolioService.getUserCredentials(userAddress)
      if (credentialsResult.success) {
        setCredentials(credentialsResult.credentials)
      }

    } catch (err) {
      console.error('Error loading portfolio:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress && portfolioService) {
      loadPortfolio()
    }
  }, [userAddress, portfolioService])

  // TODO: Translate '创建作品集成功回调'
  const handlePortfolioCreated = () => {
    setShowCreatePortfolio(false)
    loadPortfolio()
  }

  // TODO: Translate '添加项目成功回调'
  const handleProjectAdded = () => {
    setShowAddProject(false)
    loadPortfolio()
  }

  // TODO: Translate '更新可用性成功回调'
  const handleAvailabilityUpdated = () => {
    setShowUpdateAvailability(false)
    loadPortfolio()
  }

  // TODO: Translate '获取可用性状态文本'
  const getAvailabilityStatusText = (status) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return '可用'
      case AvailabilityStatus.PARTIALLY_AVAILABLE:
        return '部分可用'
      case AvailabilityStatus.BUSY:
        return '忙碌'
      case AvailabilityStatus.UNAVAILABLE:
        return '不可用'
      default:
        return '未知'
    }
  }

  // TODO: Translate '获取可用性状态颜色'
  const getAvailabilityStatusColor = (status) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'bg-green-500'
      case AvailabilityStatus.PARTIALLY_AVAILABLE:
        return 'bg-yellow-500'
      case AvailabilityStatus.BUSY:
        return 'bg-orange-500'
      case AvailabilityStatus.UNAVAILABLE:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('portfolio.loadingPortfolio')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              {t('portfolio.loadFailed')}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadPortfolio}>{t('portfolio.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // TODO: Translate '如果没有作品集',TODO: Translate '显示创建界面'
  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <CardTitle>{t('portfolio.createYourPortfolio')}</CardTitle>
            <CardDescription>
              {t('portfolio.showcaseSkills')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold mb-1">{t('portfolio.autoDisplay')}</h3>
                  <p className="text-sm text-gray-500">
                    {t('portfolio.autoDisplayDesc')}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Award className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold mb-1">{t('portfolio.onChainCredentials')}</h3>
                  <p className="text-sm text-gray-500">
                    {t('portfolio.onChainCredentialsDesc')}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-semibold mb-1">{t('portfolio.smartMatching')}</h3>
                  <p className="text-sm text-gray-500">
                    {t('portfolio.smartMatchingDesc')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreatePortfolio(true)}
                className="w-full"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('portfolio.createPortfolio')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <CreatePortfolioDialog
          open={showCreatePortfolio}
          onClose={() => setShowCreatePortfolio(false)}
          onSuccess={handlePortfolioCreated}
          userAddress={userAddress}
        />
      </div>
    )
  }

  // TODO: Translate '显示作品集'
  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* TODO: Translate '作品集头部' */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{portfolio.title}</CardTitle>
              <CardDescription className="text-base">{portfolio.bio}</CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="outline" className="text-base">
                  <Clock className="w-4 h-4 mr-1" />
                  {portfolio.hourlyRate} {t('portfolio.ethPerHour')}
                </Badge>
                <Badge variant="outline" className="text-base">
                  <Award className="w-4 h-4 mr-1" />
                  {t('portfolio.reputationScore')}: {portfolio.reputationScore}
                </Badge>
                <Badge variant="outline" className="text-base">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {portfolio.completedProjects}/{portfolio.totalProjects} {t('portfolio.projectsCompleted')}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* TODO: Translate '技能标签' */}
          <div className="space-y-2">
            <h3 className="font-semibold">{t('portfolio.skills')}</h3>
            <div className="flex flex-wrap gap-2">
              {portfolio.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* TODO: Translate '可用性状态' */}
          {availability && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t('portfolio.currentStatus')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpdateAvailability(true)}
                >
                  {t('portfolio.updateAvailability')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getAvailabilityStatusColor(availability.status)}`} />
                <span className="font-medium">
                  {getAvailabilityStatusText(availability.status)}
                </span>
                {availability.hoursPerWeek > 0 && (
                  <span className="text-gray-500">
                    - {availability.hoursPerWeek} {t('portfolio.hoursPerWeek')}
                  </span>
                )}
              </div>
              {availability.notes && (
                <p className="text-sm text-gray-500 mt-2">{availability.notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TODO: Translate '标签页' */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">{t('portfolio.currentProjects')}</TabsTrigger>
          <TabsTrigger value="all">{t('portfolio.allProjects')}</TabsTrigger>
          <TabsTrigger value="credentials">{t('portfolio.credentials')}</TabsTrigger>
        </TabsList>

        {/* TODO: Translate '当前项目' */}
        <TabsContent value="current" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('portfolio.currentProjects')}</h2>
            <Button onClick={() => setShowAddProject(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('portfolio.addProject')}
            </Button>
          </div>

          {currentProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {t('portfolio.noCurrentProjects')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentProjects.map((project, index) => (
                <ProjectCard key={index} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TODO: Translate '所有项目' */}
        <TabsContent value="all" className="space-y-4">
          <h2 className="text-xl font-semibold">{t('portfolio.allProjects')}</h2>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {t('portfolio.noProjects')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project, index) => (
                <ProjectCard key={index} project={project} showAll />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TODO: Translate '凭证' */}
        <TabsContent value="credentials" className="space-y-4">
          <h2 className="text-xl font-semibold">{t('portfolio.earnedCredentials')}</h2>

          {credentials.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {t('portfolio.noCredentials')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {credentials.map((credential, index) => (
                <CredentialCard key={index} credential={credential} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* TODO: Translate '对话框' */}
      <CreatePortfolioDialog
        open={showCreatePortfolio}
        onClose={() => setShowCreatePortfolio(false)}
        onSuccess={handlePortfolioCreated}
      />

      <AddProjectDialog
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        onSuccess={handleProjectAdded}
      />

      <UpdateAvailabilityDialog
        open={showUpdateAvailability}
        onClose={() => setShowUpdateAvailability(false)}
        onSuccess={handleAvailabilityUpdated}
        currentAvailability={availability}
      />
    </div>
  )
}
