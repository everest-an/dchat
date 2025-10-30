import { useState, useEffect } from 'react'
import { useWeb3 } from '../../contexts/Web3Context'
import { LivingPortfolioService, AvailabilityStatus } from '../../services/LivingPortfolioService'
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * TODO: Translate '更新可用性对话框'
 */
export default function UpdateAvailabilityDialog({ open, onClose, onSuccess, currentAvailability }) {
  const { provider, signer } = useWeb3()
  const [formData, setFormData] = useState({
    status: AvailabilityStatus.AVAILABLE,
    availableFrom: '',
    availableUntil: '',
    hoursPerWeek: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // TODO: Translate '初始化表单数据'
  useEffect(() => {
    if (currentAvailability) {
      const fromDate = currentAvailability.availableFrom 
        ? new Date(currentAvailability.availableFrom * 1000).toISOString().split('T')[0]
        : ''
      const untilDate = currentAvailability.availableUntil
        ? new Date(currentAvailability.availableUntil * 1000).toISOString().split('T')[0]
        : ''
      
      setFormData({
        status: currentAvailability.status,
        availableFrom: fromDate,
        availableUntil: untilDate,
        hoursPerWeek: currentAvailability.hoursPerWeek.toString(),
        notes: currentAvailability.notes || ''
      })
    }
  }, [currentAvailability])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.hoursPerWeek) {
      setError('请填写每周可用时间')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const portfolioService = new LivingPortfolioService(provider, signer)
      
      const availableFrom = formData.availableFrom 
        ? Math.floor(new Date(formData.availableFrom).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
      
      const availableUntil = formData.availableUntil
        ? Math.floor(new Date(formData.availableUntil).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // default1TODO: Translate '年后'
      
      const result = await portfolioService.updateAvailability(
        formData.status,
        availableFrom,
        availableUntil,
        parseInt(formData.hoursPerWeek),
        formData.notes
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        setError(result.error || '更新可用性失败')
      }
    } catch (err) {
      console.error('Error updating availability:', err)
      setError(err.message || '更新可用性失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setSuccess(false)
    onClose()
  }

  const statusOptions = [
    { value: AvailabilityStatus.AVAILABLE, label: '可用', description: '完全可用,可以接受新项目' },
    { value: AvailabilityStatus.PARTIALLY_AVAILABLE, label: '部分可用', description: '有限时间可用' },
    { value: AvailabilityStatus.BUSY, label: '忙碌', description: '当前忙碌,但可以考虑紧急项目' },
    { value: AvailabilityStatus.UNAVAILABLE, label: '不可用', description: '暂时不接受新项目' }
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>更新可用性状态</DialogTitle>
          <DialogDescription>
            更新您的工作状态和可用时间
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                可用性更新成功!正在刷新...
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* TODO: Translate '状态选择' */}
            <div className="space-y-3">
              <Label>当前状态 *</Label>
              <RadioGroup
                value={formData.status.toString()}
                onValueChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                disabled={loading}
              >
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value={option.value.toString()} id={`status-${option.value}`} />
                    <div className="flex-1">
                      <Label htmlFor={`status-${option.value}`} className="font-medium">
                        {option.label}
                      </Label>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* TODO: Translate '可用时间段' */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availableFrom">可用开始日期</Label>
                <Input
                  id="availableFrom"
                  type="date"
                  value={formData.availableFrom}
                  onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUntil">可用结束日期</Label>
                <Input
                  id="availableUntil"
                  type="date"
                  value={formData.availableUntil}
                  onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* TODO: Translate '每周可用时间' */}
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">每周可用时间 (小时) *</Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min="0"
                max="168"
                placeholder="40"
                value={formData.hoursPerWeek}
                onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                您每周可以投入的工作时间
              </p>
            </div>

            {/* TODO: Translate '备注' */}
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="添加关于您可用性的额外说明..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
              />
            </div>

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
                    更新中...
                  </>
                ) : (
                  '更新状态'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
