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
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, X, Plus, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

/**
 * TODO: Translate '创建机会匹配对话框'
 */
export default function CreateMatchDialog({ open, onClose, onSuccess }) {
  const { t } = useLanguage()

  const { provider, signer } = useWeb3()
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [matchResults, setMatchResults] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (skills.length === 0) {
      setError('请至少添加一个技能')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const portfolioService = new LivingPortfolioService(provider, signer)
      
      const result = await portfolioService.createOpportunityMatch(skills)

      if (result.success) {
        // TODO: Translate '解析匹配结果'
        const matchIds = result.receipt?.logs
          ?.filter(log => log.topics[0] === portfolioService.contract.interface.getEvent('OpportunityMatched').topicHash)
          ?.map(log => portfolioService.contract.interface.parseLog(log))
          ?.map(parsed => ({
            matchId: Number(parsed.args.matchId),
            provider: parsed.args.provider,
            matchScore: Number(parsed.args.matchScore)
          })) || []

        setMatchResults({
          count: matchIds.length,
          matches: matchIds
        })
        
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 3000)
      } else {
        setError(result.error || '创建匹配失败')
      }
    } catch (err) {
      console.error('Error creating match:', err)
      setError(err.message || '创建匹配失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSkills([])
    setSkillInput('')
    setError(null)
    setSuccess(false)
    setMatchResults(null)
    onClose()
  }

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  // TODO: Translate '常用技能快捷添加'
  const commonSkills = [
    'Solidity',
    'React',
    'Node.js',
    'Python',
    'Web3',
    'Smart Contracts',
    'DeFi',
    'NFT',
    'Frontend',
    'Backend',
    'UI/UX',
    'DevOps'
  ]

  const addCommonSkill = (skill) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            创建机会匹配
          </DialogTitle>
          <DialogDescription>
            输入您需要的技能,系统将自动为您匹配合适的专家
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 space-y-4">
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                匹配创建成功!
                {matchResults && matchResults.count > 0 && (
                  <span className="block mt-2">
                    找到 <strong>{matchResults.count}</strong> 个匹配的专家
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {matchResults && matchResults.matches.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">匹配结果:</p>
                {matchResults.matches.map((match, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-mono">
                      {match.provider.slice(0, 6)}...{match.provider.slice(-4)}
                    </span>
                    <Badge variant="secondary">
                      匹配度: {match.matchScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* TODO: Translate '技能输入' */}
            <div className="space-y-2">
              <Label htmlFor="skills">需要的技能 *</Label>
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

              {/* TODO: Translate '已添加的技能' */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="default" className="gap-1">
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

              <p className="text-sm text-gray-500">
                已添加 {skills.length} 个技能
              </p>
            </div>

            {/* TODO: Translate '常用技能快捷选择' */}
            <div className="space-y-2">
              <Label>常用技能 (点击快速添加)</Label>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className={`cursor-pointer hover:bg-gray-100 ${
                      skills.includes(skill) ? 'bg-gray-200' : ''
                    }`}
                    onClick={() => addCommonSkill(skill)}
                  >
                    {skills.includes(skill) ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* TODO: Translate '说明' */}
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                系统将根据您选择的技能,在网络中搜索匹配的专家,并计算匹配分数。
                匹配分数越高,表示该专家的技能越符合您的需求。
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
              <Button type="submit" disabled={loading || skills.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    匹配中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始匹配
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
