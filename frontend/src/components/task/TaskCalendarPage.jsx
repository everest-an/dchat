/**
 * TaskCalendarPage - Tab-based page combining Tasks and Calendar views.
 */
import { useState } from 'react'
import { ListTodo, CalendarDays } from 'lucide-react'
import TaskPanel from './TaskPanel'
import CalendarView from '../calendar/CalendarView'

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
]

export default function TaskCalendarPage() {
  const [tab, setTab] = useState('tasks')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b bg-white">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                active ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'tasks' ? <TaskPanel /> : <CalendarView />}
      </div>
    </div>
  )
}
