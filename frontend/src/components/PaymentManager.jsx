import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { PaymentEscrowService, EscrowStatus } from '../services/PaymentEscrowService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Wallet, 
  Plus, 
  Loader2, 
  AlertCircle,
  DollarSign,
  Send,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { formatAddress, getExplorerUrl } from '../config/web3'
import PaymentDialog from './dialogs/PaymentDialog'

/**
 * Payment Management Page Component
 * Manage escrow payments
 */
export default function PaymentManager({ user }) {
  const { account, provider, signer, isConnected } = useWeb3()
  
  // Use account from useWeb3 or user.walletAddress
  const userAddress = account || user?.walletAddress
  const [escrows, setEscrows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('sent')

  const paymentService = new PaymentEscrowService(provider, signer)

  // Load escrow data
  const loadEscrows = async () => {
    if (!userAddress) return
    
    try {
      setLoading(true)
      setError(null)

      const result = await paymentService.getUserEscrows(userAddress)
      if (result.success) {
        setEscrows(result.escrows || [])
      }
    } catch (err) {
      console.error('Error loading escrows:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress) {
      loadEscrows()
    }
  }, [userAddress])

  // Release escrow
  const handleRelease = async (escrowId) => {
    if (!confirm('Confirm release of escrow funds?')) return

    try {
      const result = await paymentService.releaseEscrow(escrowId)
      if (result.success) {
        alert('Escrow released')
        await loadEscrows()
      } else {
        alert(`Release failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Release failed: ${err.message}`)
    }
  }

  // Request refund
  const handleRefund = async (escrowId) => {
    if (!confirm('Confirm refund request?')) return

    try {
      const result = await paymentService.refund(escrowId)
      if (result.success) {
        alert('Refund successful')
        await loadEscrows()
      } else {
        alert(`Refund failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Refund failed: ${err.message}`)
    }
  }

  // Raise dispute
  const handleDispute = async (escrowId) => {
    const reason = prompt('Please enter dispute reason:')
    if (!reason) return

    try {
      const result = await paymentService.raiseDispute(escrowId, reason)
      if (result.success) {
        alert('Dispute submitted')
        await loadEscrows()
      } else {
        alert(`Submission failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Submission failed: ${err.message}`)
    }
  }

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case EscrowStatus.PENDING:
        return 'Pending'
      case EscrowStatus.RELEASED:
        return 'Released'
      case EscrowStatus.REFUNDED:
        return 'Refunded'
      case EscrowStatus.DISPUTED:
        return 'Disputed'
      case EscrowStatus.RESOLVED:
        return 'Resolved'
      case EscrowStatus.CANCELLED:
        return 'Cancelled'
      default:
        return 'Unknown'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case EscrowStatus.PENDING:
        return 'bg-yellow-500'
      case EscrowStatus.RELEASED:
        return 'bg-green-500'
      case EscrowStatus.REFUNDED:
        return 'bg-blue-500'
      case EscrowStatus.DISPUTED:
        return 'bg-red-500'
      case EscrowStatus.RESOLVED:
        return 'bg-purple-500'
      case EscrowStatus.CANCELLED:
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleString('en-US')
  }

  // Filter escrows
  const sentEscrows = escrows.filter(e => e.payer === userAddress)
  const receivedEscrows = escrows.filter(e => e.recipient === userAddress)

  if (!userAddress) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Please Login First</CardTitle>
            <CardDescription>
              You need to login to use payment features
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
          <p className="text-gray-500">Loading payment data...</p>
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
            <Wallet className="w-6 h-6" />
            Payment Management
          </h1>
          <p className="text-gray-500 mt-1">
            Use smart contract escrow to ensure secure transactions
          </p>
        </div>
        <Button onClick={() => setShowPaymentDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Payment
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
              Sent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{sentEscrows.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Received Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{receivedEscrows.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {escrows.filter(e => e.status === EscrowStatus.PENDING).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent">
            <Send className="w-4 h-4 mr-2" />
            Sent ({sentEscrows.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            <Inbox className="w-4 h-4 mr-2" />
            Received ({receivedEscrows.length})
          </TabsTrigger>
        </TabsList>

        {/* Sent Payments */}
        <TabsContent value="sent" className="space-y-4">
          {sentEscrows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">No sent payments yet</p>
                <Button onClick={() => setShowPaymentDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Payment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentEscrows.map((escrow, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold">{escrow.amount} ETH</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Recipient: {formatAddress(escrow.recipient, 8)}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(escrow.status)}`} />
                        {getStatusText(escrow.status)}
                      </Badge>
                    </div>

                    {escrow.description && (
                      <p className="text-sm mb-4">{escrow.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p>{formatDate(escrow.createdAt)}</p>
                      </div>
                      {escrow.releasedAt > 0 && (
                        <div>
                          <span className="text-gray-500">Released:</span>
                          <p>{formatDate(escrow.releasedAt)}</p>
                        </div>
                      )}
                    </div>

                    {escrow.status === EscrowStatus.PENDING && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRelease(escrow.escrowId)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Release Funds
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDispute(escrow.escrowId)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Raise Dispute
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Received Payments */}
        <TabsContent value="received" className="space-y-4">
          {receivedEscrows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No received payments yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedEscrows.map((escrow, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold">{escrow.amount} ETH</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          From: {formatAddress(escrow.payer, 8)}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(escrow.status)}`} />
                        {getStatusText(escrow.status)}
                      </Badge>
                    </div>

                    {escrow.description && (
                      <p className="text-sm mb-4">{escrow.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p>{formatDate(escrow.createdAt)}</p>
                      </div>
                      {escrow.releasedAt > 0 && (
                        <div>
                          <span className="text-gray-500">Released:</span>
                          <p>{formatDate(escrow.releasedAt)}</p>
                        </div>
                      )}
                    </div>

                    {escrow.status === EscrowStatus.PENDING && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefund(escrow.escrowId)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Request Refund
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDispute(escrow.escrowId)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Raise Dispute
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={() => {
          setShowPaymentDialog(false)
          loadEscrows()
        }}
      />
    </div>
  )
}
