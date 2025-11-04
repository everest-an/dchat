/**
 * NFT Avatar Selector Component
 * 
 * Allows users to select and set an NFT as their avatar.
 * Requires Pro or Enterprise subscription.
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react'
import { Image, Loader2, CheckCircle, AlertCircle, Upload, X, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { nftAvatarService, NFT_STANDARDS } from '../services/NFTAvatarService'
import { web3SubscriptionService, SUBSCRIPTION_TIERS } from '../services/Web3SubscriptionService'

const NFTAvatarSelector = () => {
  const { account, isConnected } = useWeb3()
  const { success, error: showError, info } = useToast()
  
  const [currentAvatar, setCurrentAvatar] = useState(null)
  const [avatarHistory, setAvatarHistory] = useState([])
  const [userTier, setUserTier] = useState(SUBSCRIPTION_TIERS.FREE)
  const [loading, setLoading] = useState(true)
  const [showSetAvatarModal, setShowSetAvatarModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Form state
  const [nftContract, setNftContract] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [nftStandard, setNftStandard] = useState('ERC721')
  const [step, setStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')

  useEffect(() => {
    if (account && isConnected) {
      loadData()
    }
  }, [account, isConnected])

  /**
   * Load avatar data and user tier
   */
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load user tier
      const tier = await web3SubscriptionService.getUserTier(account)
      setUserTier(tier)
      
      // Load current avatar
      const avatar = await nftAvatarService.getUserAvatar(account)
      setCurrentAvatar(avatar)
      
      // Load avatar history
      const history = await nftAvatarService.getUserAvatarHistory(account)
      setAvatarHistory(history)
      
    } catch (err) {
      console.error('Error loading data:', err)
      showError('Failed to load avatar data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Check if user has required subscription
   */
  const hasRequiredSubscription = () => {
    return userTier >= SUBSCRIPTION_TIERS.PRO
  }

  /**
   * Handle set avatar
   */
  const handleSetAvatar = async () => {
    try {
      // Validate inputs
      if (!nftContract || !tokenId) {
        showError('Please enter NFT contract address and token ID')
        return
      }

      // Validate contract address
      if (!nftContract.match(/^0x[a-fA-F0-9]{40}$/)) {
        showError('Invalid contract address')
        return
      }

      setProcessing(true)
      setStep(0)

      // Set avatar with progress callback
      const result = await nftAvatarService.setNFTAvatar(
        nftContract,
        tokenId,
        nftStandard,
        (progress) => {
          setStep(progress.step)
          setStepMessage(progress.message)
        }
      )

      // Success
      success('Avatar set successfully!', 'Your NFT avatar has been updated')
      setShowSetAvatarModal(false)
      
      // Reload data
      await loadData()
      
      // Reset form
      setNftContract('')
      setTokenId('')
      setNftStandard('ERC721')

    } catch (err) {
      console.error('Error setting avatar:', err)
      showError('Failed to set avatar', err.message)
    } finally {
      setProcessing(false)
      setStep(0)
    }
  }

  /**
   * Handle remove avatar
   */
  const handleRemoveAvatar = async () => {
    try {
      if (!confirm('Are you sure you want to remove your NFT avatar?')) {
        return
      }

      setProcessing(true)
      
      await nftAvatarService.removeNFTAvatar()
      
      success('Avatar removed', 'Your NFT avatar has been removed')
      
      // Reload data
      await loadData()
      
    } catch (err) {
      console.error('Error removing avatar:', err)
      showError('Failed to remove avatar', err.message)
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Verify avatar ownership
   */
  const handleVerifyOwnership = async () => {
    try {
      setProcessing(true)
      
      const isValid = await nftAvatarService.verifyAvatarOwnership(account)
      
      if (isValid) {
        success('Ownership verified', 'You still own this NFT')
      } else {
        showError('Ownership verification failed', 'You no longer own this NFT')
      }
      
    } catch (err) {
      console.error('Error verifying ownership:', err)
      showError('Failed to verify ownership')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Check subscription requirement
  if (!hasRequiredSubscription()) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>NFT Avatar</CardTitle>
          <CardDescription>Use your NFT as your profile avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              NFT avatars are available for Pro and Enterprise subscribers only.
              <Button variant="link" className="ml-2" onClick={() => window.location.href = '/subscription'}>
                Upgrade Now
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Current Avatar */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current NFT Avatar</CardTitle>
              <CardDescription>Your active NFT avatar</CardDescription>
            </div>
            <Badge variant={currentAvatar ? 'success' : 'secondary'}>
              {currentAvatar ? 'Active' : 'Not Set'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentAvatar ? (
            <div className="space-y-4">
              {/* Avatar Display */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Image className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">Contract Address</div>
                  <code className="text-xs break-all">{currentAvatar.contractAddress}</code>
                  <div className="text-sm text-gray-500 mt-2 mb-1">Token ID</div>
                  <div className="font-medium">{currentAvatar.tokenId}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{currentAvatar.standard}</Badge>
                    <span className="text-xs text-gray-500">
                      Set on {currentAvatar.setAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyOwnership}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span className="ml-2">Verify Ownership</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${currentAvatar.contractAddress}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="ml-2">View on Etherscan</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={processing}
                >
                  <X className="w-4 h-4" />
                  <span className="ml-2">Remove</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No NFT avatar set yet
              </p>
              <Button onClick={() => setShowSetAvatarModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Set NFT Avatar
              </Button>
            </div>
          )}
        </CardContent>
        {currentAvatar && (
          <CardFooter>
            <Button className="w-full" onClick={() => setShowSetAvatarModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Change Avatar
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Avatar History */}
      {avatarHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Avatar History</CardTitle>
            <CardDescription>Your previous NFT avatars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {avatarHistory.map((avatar, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Image className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Token ID: {avatar.tokenId}</div>
                    <code className="text-xs break-all">{avatar.contractAddress}</code>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{avatar.standard}</Badge>
                      <span className="text-xs text-gray-500">
                        {avatar.setAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Set Avatar Modal */}
      <Dialog open={showSetAvatarModal} onOpenChange={setShowSetAvatarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set NFT Avatar</DialogTitle>
            <DialogDescription>
              Enter your NFT details to set it as your avatar
            </DialogDescription>
          </DialogHeader>

          {!processing ? (
            <div className="space-y-4 py-4">
              {/* NFT Standard */}
              <div>
                <Label htmlFor="standard">NFT Standard</Label>
                <Select value={nftStandard} onValueChange={setNftStandard}>
                  <SelectTrigger id="standard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ERC721">ERC-721</SelectItem>
                    <SelectItem value="ERC1155">ERC-1155</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contract Address */}
              <div>
                <Label htmlFor="contract">Contract Address</Label>
                <Input
                  id="contract"
                  placeholder="0x..."
                  value={nftContract}
                  onChange={(e) => setNftContract(e.target.value)}
                />
              </div>

              {/* Token ID */}
              <div>
                <Label htmlFor="tokenId">Token ID</Label>
                <Input
                  id="tokenId"
                  placeholder="123"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Make sure you own this NFT. Ownership will be verified before setting.
                </AlertDescription>
              </Alert>

              <Button className="w-full" onClick={handleSetAvatar}>
                Set Avatar
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <div className="font-medium text-sm">Step {step}/5</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {stepMessage}
                  </div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Please do not close this window
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NFTAvatarSelector
