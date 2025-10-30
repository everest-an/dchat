import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { ProjectStatus } from '../../services/LivingPortfolioService'
import { Clock, Calendar, TrendingUp } from 'lucide-react'

/**
 * TODO: Translate '项目卡片组件'
 */
export default function ProjectCard({ project, showAll = false }) {
  const getStatusText = (status) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return '计划中'
      case ProjectStatus.IN_PROGRESS:
        return '进行中'
      case ProjectStatus.COMPLETED:
        return '已完成'
      case ProjectStatus.ON_HOLD:
        return '暂停'
      case ProjectStatus.CANCELLED:
        return '已取消'
      default:
        return '未知'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-blue-500'
      case ProjectStatus.IN_PROGRESS:
        return 'bg-green-500'
      case ProjectStatus.COMPLETED:
        return 'bg-purple-500'
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-500'
      case ProjectStatus.CANCELLED:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{project.title}</CardTitle>
          <Badge variant="outline" className="gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
            {getStatusText(project.status)}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-2">{project.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TODO: Translate '分类' */}
        <div>
          <Badge variant="secondary">{project.category}</Badge>
        </div>

        {/* TODO: Translate '技术栈' */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {/* TODO: Translate '进度' */}
        {project.status === ProjectStatus.IN_PROGRESS && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">进度</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
        )}

        {/* TODO: Translate '工时信息' */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-500">预计工时</p>
              <p className="font-medium">{project.estimatedHours}h</p>
            </div>
          </div>
          {project.hoursWorked > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">已工作</p>
                <p className="font-medium">{project.hoursWorked}h</p>
              </div>
            </div>
          )}
        </div>

        {/* TODO: Translate '日期信息' */}
        {showAll && (
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>开始: {formatDate(project.startDate)}</span>
            </div>
            {project.completionDate > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>完成: {formatDate(project.completionDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* TODO: Translate '完成备注' */}
        {project.completionNotes && showAll && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-500">完成备注:</p>
            <p className="text-sm mt-1">{project.completionNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
