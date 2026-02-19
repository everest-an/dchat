/**
 * TaskPanel - Task management page with kanban-style columns.
 */
import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Clock, Trash2, ChevronLeft, Calendar, User, Flag } from 'lucide-react'
import TaskService from '../../services/TaskService'

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-500' },
  { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
]

const PRIORITY_COLORS = {
  low: 'bg-gray-200 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export default function TaskPanel({ onBack }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '' })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const res = await TaskService.list()
      setTasks(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTask.title.trim()) return
    try {
      await TaskService.create(newTask)
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' })
      setShowCreate(false)
      loadTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleStatusChange = async (task, newStatus) => {
    try {
      await TaskService.update(task.id, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const handleDelete = async (taskId) => {
    try {
      await TaskService.delete(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const tasksByStatus = (status) => tasks.filter(t => t.status === status)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">Tasks</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreate && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
            placeholder="Task title..."
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2 resize-none"
            rows={2}
          />
          <div className="flex items-center gap-2 mb-2">
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask(p => ({ ...p, priority: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Board */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No tasks yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first task to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {STATUS_COLS.map(col => {
              const colTasks = tasksByStatus(col.key)
              const Icon = col.icon
              return (
                <div key={col.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <span className="text-sm font-medium">{col.label}</span>
                    <span className="text-xs text-gray-400">({colTasks.length})</span>
                  </div>
                  {colTasks.length === 0 ? (
                    <div className="text-xs text-gray-400 pl-6 mb-2">No tasks</div>
                  ) : (
                    <div className="space-y-2">
                      {colTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, onStatusChange, onDelete }) {
  const nextStatus = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border hover:border-gray-300 transition-colors">
      <button
        onClick={() => onStatusChange(task, nextStatus[task.status])}
        className="mt-0.5 flex-shrink-0"
        title={`Move to ${nextStatus[task.status].replace('_', ' ')}`}
      >
        {task.status === 'done' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : task.status === 'in_progress' ? (
          <Clock className="w-5 h-5 text-blue-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
            <Flag className="w-2.5 h-2.5" />
            {task.priority}
          </span>
          {task.due_date && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.assignee && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
              <User className="w-2.5 h-2.5" />
              {task.assignee.name || `User ${task.assignee.id}`}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="p-1 hover:bg-red-50 rounded flex-shrink-0"
        title="Delete task"
      >
        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  )
}
