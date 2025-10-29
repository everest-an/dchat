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
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * 创建作品集对话框
 */
export default function CreatePortfolioDialog({ open, onClose, onSuccess }) {
  const { provider, signer } = useWeb3()
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    skills: [],
    hourlyRate: ''
  })
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.bio || formData.skills.length === 0 || !formData.hourlyRate) {
      setError('请填写所有必填字段')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const portfolioService = new LivingPortfolioService(provider, signer)
      
      const result = await portfolioService.createPortfolio(
        formData.title,
        formData.bio,
        formData.skills,
        formData.hourlyRate
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        setError(result.error || '创建作品集失败')
      }
    } catch (err) {
      console.error('Error creating portfolio:', err)
      setError(err.message || '创建作品集失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      bio: '',
      skills: [],
      hourlyRate: ''
    })
    setSkillInput('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建动态作品集</DialogTitle>
          <DialogDescription>
            填写您的专业信息,创建您的动态作品集
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                作品集创建成功!正在跳转...
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

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">职位/标题 *</Label>
              <Input
                id="title"
                placeholder="例如: 全栈开发工程师"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <Label htmlFor="bio">个人简介 *</Label>
              <Textarea
                id="bio"
                placeholder="简要介绍您的专业背景和经验..."
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 技能 */}
            <div className="space-y-2">
              <Label htmlFor="skills">技能 *</Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  placeholder="输入技能并按回车添加"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSkill}
                  disabled={loading || !skillInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
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

            {/* 时薪 */}
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">时薪 (ETH) *</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.1"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                您的标准时薪费率 (以 ETH 计价)
              </p>
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
                    创建中...
                  </>
                ) : (
                  '创建作品集'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
