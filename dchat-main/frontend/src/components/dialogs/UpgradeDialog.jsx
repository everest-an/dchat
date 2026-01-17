import { X, Crown, Check, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'

const UpgradeDialog = ({ isOpen, onClose, feature, title, description }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleUpgrade = () => {
    onClose()
    navigate('/subscription')
  }

  const proFeatures = [
    'Unlimited group members',
    'Up to 100MB file size',
    '10GB storage',
    'Unlimited messages',
    'Advanced encryption',
    'Message search',
    'Priority support'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upgrade to Pro</h2>
              <p className="text-sm text-gray-500">Unlock premium features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Feature Info */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-1">
              {title || 'Premium Feature'}
            </h3>
            <p className="text-sm text-blue-800">
              {description || 'This feature is only available in Pro and Enterprise plans'}
            </p>
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-gray-900 mb-1">
              $9.99
              <span className="text-lg font-normal text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-600">14-day free trial • Cancel anytime</p>
          </div>

          {/* Features List */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-700">What's included:</p>
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Free Trial
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-gray-500 mt-4">
            No credit card required for trial
          </p>
        </div>
      </div>
    </div>
  )
}

export default UpgradeDialog
