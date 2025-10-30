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
 * TODO: Translate '支付管理页面组件'
 * TODO: Translate '管理托管支付'
 */
export default function PaymentManager({ user }) {
  const { account, provider, signer, isConnected } = useWeb3()
  
  // useWeb3 accountTODO: Translate '或'user.walletAddress
  const userAddress = account || user?.walletAddress
  const isDemoMode = !isConnected && !!user?.walletAddress
  const [escrows, setEscrows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('sent')

  const paymentService = new PaymentEscrowService(provider, signer)

  // TODO: Translate '加载托管数据'
  const loadEscrows = async () => {
    if (!userAddress) return
    
    // DemoTODO: Translate '模式'：uselocalStorage
    if (isDemoMode) {
      try {
        setLoading(true)
        const savedEscrows = localStorage.getItem(`escrows_${userAddress}`)
        if (savedEscrows) {
          setEscrows(JSON.parse(savedEscrows))
        }
      } catch (err) {
        console.error('Error loading escrows from localStorage:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

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
  }, [userAddress, isDemoMode])

  // TODO: Translate '释放托管'
  const handleRelease = async (escrowId) => {
    if (!confirm('确认释放托管资金?')) return

    try {
      const result = await paymentService.releaseEscrow(escrowId)
      if (result.success) {
        alert('托管已释放')
        await loadEscrows()
      } else {
        alert(`释放失败: ${result.error}`)
      }
    } catch (err) {
      alert(`释放失败: ${err.message}`)
    }
  }

  // TODO: Translate '申请退款'
  const handleRefund = async (escrowId) => {
    if (!confirm('确认申请退款?')) return

    try {
      const result = await paymentService.refund(escrowId)
      if (result.success) {
        alert('退款成功')
        await loadEscrows()
      } else {
        alert(`退款失败: ${result.error}`)
      }
    } catch (err) {
      alert(`退款失败: ${err.message}`)
    }
  }

  // TODO: Translate '提起争议'
  const handleDispute = async (escrowId) => {
    const reason = prompt('请输入争议原因:')
    if (!reason) return

    try {
      const result = await paymentService.raiseDispute(escrowId, reason)
      if (result.success) {
        alert('争议已提交')
        await loadEscrows()
      } else {
        alert(`提交失败: ${result.error}`)
      }
    } catch (err) {
      alert(`提交失败: ${err.message}`)
    }
  }

  // TODO: Translate '获取状态文本'
  const getStatusText = (status) => {
    switch (status) {
      case EscrowStatus.PENDING:
        return '待处理'
      case EscrowStatus.RELEASED:
        return '已释放'
      case EscrowStatus.REFUNDED:
        return '已退款'
      case EscrowStatus.DISPUTED:
        return '争议中'
      case EscrowStatus.RESOLVED:
        return '已解决'
      case EscrowStatus.CANCELLED:
        return '已取消'
      default:
        return '未知'
    }
  }

  // TODO: Translate '获取状态颜色'
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

  // TODO: Translate '格式化日期'
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  // TODO: Translate '过滤托管'
  const sentEscrows = escrows.filter(e => e.payer === userAddress)
  const receivedEscrows = escrows.filter(e => e.recipient === userAddress)

  if (!userAddress) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>
              您需要登录才能使用支付功能
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
          <p className="text-gray-500">加载支付数据...</p>
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
            <Wallet className="w-6 h-6" />
            支付管理
          </h1>
          <p className="text-gray-500 mt-1">
            使用智能合约托管,确保交易安全
          </p>
        </div>
        <Button onClick={() => setShowPaymentDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建支付
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
              发送的支付
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
              收到的支付
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
              待处理
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

      {/* TODO: Translate '标签页' */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent">
            <Send className="w-4 h-4 mr-2" />
            发送的 ({sentEscrows.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            <Inbox className="w-4 h-4 mr-2" />
            收到的 ({receivedEscrows.length})
          </TabsTrigger>
        </TabsList>

        {/* TODO: Translate '发送的支付' */}
        <TabsContent value="sent" className="space-y-4">
          {sentEscrows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">暂无发送的支付</p>
                <Button onClick={() => setShowPaymentDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建支付
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
                          收款方: {formatAddress(escrow.recipient, 8)}
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
                        <span className="text-gray-500">创建时间:</span>
                        <p>{formatDate(escrow.createdAt)}</p>
                      </div>
                      {escrow.releasedAt > 0 && (
                        <div>
                          <span className="text-gray-500">释放时间:</span>
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
                          释放资金
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDispute(escrow.escrowId)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          提起争议
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TODO: Translate '收到的支付' */}
        <TabsContent value="received" className="space-y-4">
          {receivedEscrows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">暂无收到的支付</p>
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
                          付款方: {formatAddress(escrow.payer, 8)}
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
                        <span className="text-gray-500">创建时间:</span>
                        <p>{formatDate(escrow.createdAt)}</p>
                      </div>
                      {escrow.releasedAt > 0 && (
                        <div>
                          <span className="text-gray-500">释放时间:</span>
                          <p>{formatDate(escrow.releasedAt)}</p>
                        </div>
                      )}
                    </div>

                    {escrow.status === EscrowStatus.PENDING && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          等待付款方释放资金。完成工作后请联系付款方。
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* TODO: Translate '支付对话框' */}
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={() => loadEscrows()}
      />
    </div>
  )
}
