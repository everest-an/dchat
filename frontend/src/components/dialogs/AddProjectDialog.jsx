import { useState } from 'react'
import { useWeb3 } from '../../contexts/Web3Context'
import { LivingPortfolioService } from '../../services/LivingPortfolioService'
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
import { Badge } from '../ui/badge'
import { Switch } from '../ui/switch'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

/**
 * TODO: Translate '添加项目对话框'
 */
export default function AddProjectDialog({ open, onClose, onSuccess }) {
  const { t } = useLanguage()

  const { provider, signer } = useWeb3()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    technologies: [],
    estimatedHours: '',
    isPublic: true
  })
  const [techInput, setTechInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.category || 
        formData.technologies.length === 0 || !formData.estimatedHours) {
      setError('请填写所有必填字段')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const portfolioService = new LivingPortfolioService(provider, signer)
      
      const startDate = Math.floor(Date.now() / 1000)
      
      const result = await portfolioService.addProject(
        formData.title,
        formData.description,
        formData.category,
        formData.technologies,
        startDate,
        parseInt(formData.estimatedHours),
        formData.isPublic
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        setError(result.error || '添加项目失败')
      }
    } catch (err) {
      console.error('Error adding project:', err)
      setError(err.message || '添加项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      technologies: [],
      estimatedHours: '',
      isPublic: true
    })
    setTechInput('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  const addTechnology = () => {
    if (techInput.trim() && !formData.technologies.includes(techInput.trim())) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, techInput.trim()]
      })
      setTechInput('')
    }
  }

  const removeTechnology = (techToRemove) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(tech => tech !== techToRemove)
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTechnology()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加新项目</DialogTitle>
          <DialogDescription>
            添加您正在进行或计划开始的项目
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                项目添加成功!正在刷新...
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* TODO: Translate '项目标题' */}
            <div className="space-y-2">
              <Label htmlFor="title">项目标题 *</Label>
              <Input
                id="title"
                placeholder="例如: DeFi 协议开发"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* TODO: Translate '项目描述' */}
            <div className="space-y-2">
              <Label htmlFor="description">项目描述 *</Label>
              <Textarea
                id="description"
                placeholder="详细描述项目内容和目标..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* TODO: Translate '项目分类' */}
            <div className="space-y-2">
              <Label htmlFor="category">项目分类 *</Label>
              <Input
                id="category"
                placeholder="例如: DeFi, NFT, Web3"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* TODO: Translate '技术栈' */}
            <div className="space-y-2">
              <Label htmlFor="technologies">技术栈 *</Label>
              <div className="flex gap-2">
                <Input
                  id="technologies"
                  placeholder="输入技术并按回车添加"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTechnology}
                  disabled={loading || !techInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTechnology(tech)}
                        disabled={loading}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* TODO: Translate '预计工时' */}
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">预计工时 (小时) *</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="1"
                placeholder="160"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* TODO: Translate '是否公开' */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">公开项目</Label>
                <p className="text-sm text-gray-500">
                  公开后其他用户可以看到此项目
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
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
                    添加中...
                  </>
                ) : (
                  '添加项目'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
