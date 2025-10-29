import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService, AvailabilityStatus, ProjectStatus } from '../services/LivingPortfolioService'
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
 */
export default function Portfolio() {
  const { account, provider, signer, isConnected } = useWeb3()
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

  // 初始化服务
  const portfolioService = new LivingPortfolioService(provider, signer)

  // 加载作品集数据
  const loadPortfolio = async () => {
    if (!account) return

    try {
      setLoading(true)
      setError(null)

      // 检查作品集是否存在
      const existsResult = await portfolioService.portfolioExists(account)
      
      if (!existsResult.success || !existsResult.data) {
        setPortfolio(null)
        setLoading(false)
        return
      }

      // 加载作品集
      const portfolioResult = await portfolioService.getPortfolio(account)
      if (portfolioResult.success) {
        setPortfolio(portfolioResult.portfolio)
      }

      // 加载项目
      const projectsResult = await portfolioService.getUserProjects(account)
      if (projectsResult.success) {
        setProjects(projectsResult.projects)
      }

      // 加载当前项目
      const currentResult = await portfolioService.getCurrentProjects(account)
      if (currentResult.success) {
        setCurrentProjects(currentResult.projects)
      }

      // 加载可用性
      const availabilityResult = await portfolioService.getAvailability(account)
      if (availabilityResult.success) {
        setAvailability(availabilityResult.availability)
      }

      // 加载凭证
      const credentialsResult = await portfolioService.getUserCredentials(account)
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
    if (isConnected && account) {
      loadPortfolio()
    }
  }, [isConnected, account])

  // 创建作品集成功回调
  const handlePortfolioCreated = () => {
    setShowCreatePortfolio(false)
    loadPortfolio()
  }

  // 添加项目成功回调
  const handleProjectAdded = () => {
    setShowAddProject(false)
    loadPortfolio()
  }

  // 更新可用性成功回调
  const handleAvailabilityUpdated = () => {
    setShowUpdateAvailability(false)
    loadPortfolio()
  }

  // 获取可用性状态文本
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

  // 获取可用性状态颜色
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

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先连接钱包</CardTitle>
            <CardDescription>
              您需要连接 Web3 钱包才能查看和管理作品集
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载作品集...</p>
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
              加载失败
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadPortfolio}>重试</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 如果没有作品集,显示创建界面
  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <CardTitle>创建您的动态作品集</CardTitle>
            <CardDescription>
              展示您的技能、项目和可用性,让机会自动找到您
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold mb-1">自动展示</h3>
                  <p className="text-sm text-gray-500">
                    实时更新项目进度和可用性
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Award className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold mb-1">链上凭证</h3>
                  <p className="text-sm text-gray-500">
                    获得可验证的成就证明
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-semibold mb-1">智能匹配</h3>
                  <p className="text-sm text-gray-500">
                    自动匹配合适的机会
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowCreatePortfolio(true)}
                className="w-full"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建作品集
              </Button>
            </div>
          </CardContent>
        </Card>

        <CreatePortfolioDialog
          open={showCreatePortfolio}
          onClose={() => setShowCreatePortfolio(false)}
          onSuccess={handlePortfolioCreated}
        />
      </div>
    )
  }

  // 显示作品集
  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* 作品集头部 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{portfolio.title}</CardTitle>
              <CardDescription className="text-base">{portfolio.bio}</CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="outline" className="text-base">
                  <Clock className="w-4 h-4 mr-1" />
                  {portfolio.hourlyRate} ETH/小时
                </Badge>
                <Badge variant="outline" className="text-base">
                  <Award className="w-4 h-4 mr-1" />
                  信誉分数: {portfolio.reputationScore}
                </Badge>
                <Badge variant="outline" className="text-base">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {portfolio.completedProjects}/{portfolio.totalProjects} 项目完成
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 技能标签 */}
          <div className="space-y-2">
            <h3 className="font-semibold">技能</h3>
            <div className="flex flex-wrap gap-2">
              {portfolio.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* 可用性状态 */}
          {availability && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">当前状态</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUpdateAvailability(true)}
                >
                  更新状态
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getAvailabilityStatusColor(availability.status)}`} />
                <span className="font-medium">
                  {getAvailabilityStatusText(availability.status)}
                </span>
                {availability.hoursPerWeek > 0 && (
                  <span className="text-gray-500">
                    - 每周 {availability.hoursPerWeek} 小时
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

      {/* 标签页 */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">当前项目</TabsTrigger>
          <TabsTrigger value="all">所有项目</TabsTrigger>
          <TabsTrigger value="credentials">凭证</TabsTrigger>
        </TabsList>

        {/* 当前项目 */}
        <TabsContent value="current" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">当前项目</h2>
            <Button onClick={() => setShowAddProject(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加项目
            </Button>
          </div>
          
          {currentProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无进行中的项目
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

        {/* 所有项目 */}
        <TabsContent value="all" className="space-y-4">
          <h2 className="text-xl font-semibold">所有项目</h2>
          
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无项目
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

        {/* 凭证 */}
        <TabsContent value="credentials" className="space-y-4">
          <h2 className="text-xl font-semibold">已验证凭证</h2>
          
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无凭证
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

      {/* 对话框 */}
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
