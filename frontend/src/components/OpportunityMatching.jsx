import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService } from '../services/LivingPortfolioService'
import { UserIdentityService } from '../services/UserIdentityService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Target, 
  Plus, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Users,
  Sparkles,
  MessageCircle
} from 'lucide-react'
import { formatAddress } from '../config/web3'
import CreateMatchDialog from './dialogs/CreateMatchDialog'
import SubscribeButton from './SubscribeButton'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * TODO: Translate '机会匹配页面组件'
 * TODO: Translate '显示和管理技能匹配的机会'
 */
export default function OpportunityMatching({ user }) {
  const { t } = useLanguage()

  const { account, provider, signer, isConnected } = useWeb3()
  
  // useWeb3 accountTODO: Translate '或'user.walletAddress
  const userAddress = account || user?.walletAddress
  const [matches, setMatches] = useState([])
  const [matchedProfiles, setMatchedProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateMatch, setShowCreateMatch] = useState(false)

  const portfolioService = new LivingPortfolioService(provider, signer)
  const identityService = new UserIdentityService(provider, signer)

  // TODO: Translate '加载匹配数据'
  const loadMatches = async () => {
    if (!userAddress) return
    
    try {
      setLoading(true)
      setError(null)

      // TODO: Translate '获取匹配的机会'
      const matchesResult = await portfolioService.getMatchedOpportunities(userAddress)
      
      if (matchesResult.success && matchesResult.data) {
        const matchData = matchesResult.data
        setMatches(matchData)

        // TODO: Translate '加载匹配用户的资料'
        const profiles = {}
        for (const match of matchData) {
          try {
            const profileResult = await identityService.getProfile(match.seeker || match.provider)
            if (profileResult.success) {
              profiles[match.seeker || match.provider] = profileResult.profile
            }
          } catch (err) {
            console.error('Error loading profile:', err)
          }
        }
        setMatchedProfiles(profiles)
      }

    } catch (err) {
      console.error('Error loading matches:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress) {
      loadMatches()
    }
  }, [userAddress])

  // TODO: Translate '创建匹配成功回调'
  const handleMatchCreated = () => {
    setShowCreateMatch(false)
    loadMatches()
  }

  // TODO: Translate '获取匹配分数颜色'
  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // TODO: Translate '获取匹配分数等级'
  const getMatchScoreLabel = (score) => {
    if (score >= 80) return '高度匹配'
    if (score >= 60) return '良好匹配'
    if (score >= 40) return '一般匹配'
    return '低匹配'
  }

  if (!userAddress) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>
              您需要登录才能使用机会匹配功能
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
          <p className="text-gray-500">加载匹配数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* TODO: Translate '头部' */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            机会匹配
          </h1>
          <p className="text-gray-500 mt-1">
            基于技能的智能匹配,发现合作机会
          </p>
        </div>
        <Button onClick={() => setShowCreateMatch(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建匹配需求
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* TODO: Translate '统计卡片' */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              总匹配数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{matches.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              高度匹配
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">
                {matches.filter(m => m.matchScore >= 80).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              平均匹配度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold">
                {matches.length > 0
                  ? Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Translate '匹配列表' */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">匹配结果</h2>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-2">暂无匹配结果</p>
              <p className="text-sm text-gray-400 mb-4">
                创建匹配需求,系统将自动为您寻找合适的专家
              </p>
              <Button onClick={() => setShowCreateMatch(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建匹配需求
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches.map((match, index) => {
              const matchAddress = match.seeker === account ? match.provider : match.seeker
              const profile = matchedProfiles[matchAddress]
              const isSeeker = match.seeker === account

              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* TODO: Translate '头像' */}
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="text-lg">
                          {matchAddress.slice(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {profile?.name || formatAddress(matchAddress, 8)}
                            </h3>
                            {profile?.title && (
                              <p className="text-gray-600">{profile.title}</p>
                            )}
                            {profile?.company && (
                              <p className="text-sm text-gray-500">{profile.company}</p>
                            )}
                          </div>

                          {/* TODO: Translate '匹配分数' */}
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${getMatchScoreColor(match.matchScore)}`}>
                              {match.matchScore}%
                            </div>
                            <p className="text-sm text-gray-500">
                              {getMatchScoreLabel(match.matchScore)}
                            </p>
                          </div>
                        </div>

                        {/* TODO: Translate '进度条' */}
                        <div className="mt-4">
                          <Progress value={match.matchScore} className="h-2" />
                        </div>

                        {/* TODO: Translate '角色标签' */}
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant={isSeeker ? 'default' : 'secondary'}>
                            {isSeeker ? '您在寻找专家' : '专家匹配'}
                          </Badge>
                          {profile?.isVerified && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              已验证
                            </Badge>
                          )}
                          {profile?.reputationScore && (
                            <Badge variant="outline">
                              信誉: {profile.reputationScore}
                            </Badge>
                          )}
                        </div>

                        {/* TODO: Translate '操作按钮' */}
                        <div className="flex items-center gap-2 mt-4">
                          <Button size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            发送消息
                          </Button>
                          <SubscribeButton 
                            targetAddress={matchAddress}
                            variant="outline"
                            size="sm"
                          />
                          <Button variant="outline" size="sm">
                            查看作品集
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* TODO: Translate '创建匹配对话框' */}
      <CreateMatchDialog
        open={showCreateMatch}
        onClose={() => setShowCreateMatch(false)}
        onSuccess={handleMatchCreated}
      />
    </div>
  )
}
