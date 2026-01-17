import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService } from '../services/LivingPortfolioService'
import { LocalPortfolioService } from '../services/LocalPortfolioService'
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

/**
 * Opportunity Matching Page Component
 * Display and manage skill-based matching opportunities
 * Supports both Web3 (blockchain) and localStorage (local) modes
 */
export default function OpportunityMatching({ user }) {
  const { account, provider, signer, isConnected } = useWeb3()

  // Use account from useWeb3 or user.walletAddress or email
  const userAddress = account || user?.walletAddress || user?.email || 'guest'

  // Initialize service based on Web3 connection
  const [portfolioService, setPortfolioService] = useState(null)

  useEffect(() => {
    if (isConnected && provider && signer) {
      setPortfolioService(new LivingPortfolioService(provider, signer))
    } else {
      setPortfolioService(new LocalPortfolioService(userAddress))
    }
  }, [isConnected, provider, signer, userAddress])

  const [matches, setMatches] = useState([])
  const [matchedProfiles, setMatchedProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateMatch, setShowCreateMatch] = useState(false)

  const identityService = isConnected && provider && signer
    ? new UserIdentityService(provider, signer)
    : null

  // Load matching data
  const loadMatches = async () => {
    if (!userAddress || !portfolioService) return

    try {
      setLoading(true)
      setError(null)

      // Get matched opportunities
      const matchesResult = await portfolioService.getMatchedOpportunities(userAddress)

      if (matchesResult.success && matchesResult.data) {
        const matchData = matchesResult.data
        setMatches(matchData)

        // Load profiles of matched users
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
    if (userAddress && portfolioService) {
      loadMatches()
    }
  }, [userAddress, portfolioService])

  // Match created callback
  const handleMatchCreated = () => {
    setShowCreateMatch(false)
    loadMatches()
  }

  // Get match score color
  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // Get match score label
  const getMatchScoreLabel = (score) => {
    if (score >= 80) return 'High Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Low Match'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Opportunity Matching
          </h1>
          <p className="text-gray-500 mt-1">
            Skill-based intelligent matching to discover collaboration opportunities
          </p>
        </div>
        <Button onClick={() => setShowCreateMatch(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Match Request
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Matches
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
              High Matches
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
              Average Match Rate
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

      {/* Match List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Match Results</h2>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-2">No matches yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Create a match request and the system will automatically find suitable experts for you
              </p>
              <Button onClick={() => setShowCreateMatch(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Match Request
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
                      {/* Avatar */}
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="text-lg">
                          {matchAddress.slice(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Information */}
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

                          {/* Match Score */}
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${getMatchScoreColor(match.matchScore)}`}>
                              {match.matchScore}%
                            </div>
                            <p className="text-sm text-gray-500">
                              {getMatchScoreLabel(match.matchScore)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <Progress value={match.matchScore} className="h-2" />
                        </div>

                        {/* Role Badges */}
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant={isSeeker ? 'default' : 'secondary'}>
                            {isSeeker ? 'You are seeking expert' : 'Expert match'}
                          </Badge>
                          {profile?.isVerified && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verified
                            </Badge>
                          )}
                          {profile?.reputationScore && (
                            <Badge variant="outline">
                              Reputation: {profile.reputationScore}
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4">
                          <Button size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Send Message
                          </Button>
                          <SubscribeButton
                            targetAddress={matchAddress}
                            variant="outline"
                            size="sm"
                          />
                          <Button variant="outline" size="sm">
                            View Portfolio
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

      {/* Create Match Dialog */}
      <CreateMatchDialog
        open={showCreateMatch}
        onClose={() => setShowCreateMatch(false)}
        onSuccess={handleMatchCreated}
      />
    </div>
  )
}
