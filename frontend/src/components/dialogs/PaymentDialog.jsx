import { useState } from 'react'
import { useWeb3 } from '../../contexts/Web3Context'
import { PaymentEscrowService } from '../../services/PaymentEscrowService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, AlertCircle, CheckCircle2, DollarSign, Shield } from 'lucide-react'
import { formatAddress, getExplorerUrl } from '../../config/web3'

/**
 * 支付对话框组件
 * 创建托管支付
 */
export default function PaymentDialog({ open, onClose, onSuccess, recipientAddress = '' }) {
  const { provider, signer, balance } = useWeb3()
  const [formData, setFormData] = useState({
    recipient: recipientAddress,
    amount: '',
    timeoutDays: '30',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [transactionHash, setTransactionHash] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.recipient || !formData.amount || !formData.timeoutDays) {
      setError('请填写所有必填字段')
      return
    }

    // 验证地址格式
    if (!formData.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('无效的收款地址')
      return
    }

    // 验证金额
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('无效的金额')
      return
    }

    // 检查余额
    if (amount > parseFloat(balance)) {
      setError('余额不足')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const paymentService = new PaymentEscrowService(provider, signer)
      
      // 计算超时时间(秒)
      const timeoutDuration = parseInt(formData.timeoutDays) * 24 * 60 * 60
      
      const result = await paymentService.createEscrow(
        formData.recipient,
        formData.amount,
        timeoutDuration,
        formData.description
      )

      if (result.success) {
        setTransactionHash(result.transactionHash)
        setSuccess(true)
        setTimeout(() => {
          if (onSuccess) onSuccess(result)
          handleClose()
        }, 3000)
      } else {
        setError(result.error || '创建托管失败')
      }
    } catch (err) {
      console.error('Error creating escrow:', err)
      setError(err.message || '创建托管失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      recipient: recipientAddress,
      amount: '',
      timeoutDays: '30',
      description: ''
    })
    setError(null)
    setSuccess(false)
    setTransactionHash(null)
    onClose()
  }

  const viewTransaction = () => {
    if (transactionHash) {
      const url = getExplorerUrl('tx', transactionHash)
      window.open(url, '_blank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            创建托管支付
          </DialogTitle>
          <DialogDescription>
            使用智能合约托管,确保交易安全
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 space-y-4">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                托管创建成功!资金已安全锁定在智能合约中
              </AlertDescription>
            </Alert>

            {transactionHash && (
              <div className="space-y-2">
                <p className="text-sm font-medium">交易哈希:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-100 p-2 rounded break-all">
                    {transactionHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={viewTransaction}
                  >
                    查看
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 收款地址 */}
            <div className="space-y-2">
              <Label htmlFor="recipient">收款地址 *</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                disabled={loading || recipientAddress !== ''}
                className="font-mono text-sm"
              />
              {formData.recipient && formData.recipient.match(/^0x[a-fA-F0-9]{40}$/) && (
                <p className="text-sm text-gray-500">
                  {formatAddress(formData.recipient, 10)}
                </p>
              )}
            </div>

            {/* 金额 */}
            <div className="space-y-2">
              <Label htmlFor="amount">金额 (ETH) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-500">
                当前余额: {parseFloat(balance).toFixed(4)} ETH
              </p>
            </div>

            {/* 超时天数 */}
            <div className="space-y-2">
              <Label htmlFor="timeoutDays">托管期限 (天) *</Label>
              <Input
                id="timeoutDays"
                type="number"
                min="1"
                placeholder="30"
                value={formData.timeoutDays}
                onChange={(e) => setFormData({ ...formData, timeoutDays: e.target.value })}
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                超过此期限未释放,付款方可申请退款
              </p>
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">支付说明</Label>
              <Textarea
                id="description"
                placeholder="例如: 项目开发费用"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 说明 */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>托管支付流程:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>资金锁定在智能合约中</li>
                  <li>收款方完成工作后,您可以释放资金</li>
                  <li>如有争议,可以申请退款或仲裁</li>
                  <li>超过托管期限未释放,可自动退款</li>
                </ol>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    创建托管
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
