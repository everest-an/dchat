/**
 * CalendarView - Monthly calendar with events.
 */
import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, X, Trash2 } from 'lucide-react'
import CalendarService from '../../services/CalendarService'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_COLORS = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days = []

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, current: false })
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, current: true })
  }
  // Next month padding
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false })
  }

  return days
}

export default function CalendarView({ onBack }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', location: '',
    start_time: '', end_time: '', all_day: false, color: 'blue',
  })

  const days = useMemo(() => getMonthDays(year, month), [year, month])
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    loadEvents()
  }, [year, month])

  const loadEvents = async () => {
    try {
      const from = new Date(year, month, 1).toISOString()
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      const res = await CalendarService.getEvents({ from, to })
      setEvents(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  const eventsForDay = (day) => {
    if (!day.current) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
    return events.filter(e => {
      const start = e.start_time?.slice(0, 10)
      const end = e.end_time?.slice(0, 10)
      return dateStr >= start && dateStr <= end
    })
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const handleCreate = async () => {
    if (!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time) return
    try {
      await CalendarService.createEvent(newEvent)
      setShowCreate(false)
      setNewEvent({ title: '', description: '', location: '', start_time: '', end_time: '', all_day: false, color: 'blue' })
      loadEvents()
    } catch (err) {
      console.error('Failed to create event:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await CalendarService.deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }

  const isToday = (day) => {
    return day.current && day.day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const selectedEvents = selectedDate
    ? eventsForDay({ day: selectedDate, current: true })
    : []

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
          <h2 className="text-lg font-semibold">Calendar</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = eventsForDay(day)
                const selected = selectedDate === day.day && day.current
                return (
                  <button
                    key={idx}
                    onClick={() => day.current && setSelectedDate(day.day)}
                    className={`relative min-h-[56px] p-1 border-b border-r text-left transition-colors
                      ${day.current ? 'hover:bg-gray-50' : 'text-gray-300 bg-gray-50/50'}
                      ${selected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}
                    `}
                  >
                    <span className={`text-xs block text-center mb-0.5
                      ${isToday(day) ? 'bg-black text-white rounded-full w-5 h-5 inline-flex items-center justify-center' : ''}
                    `}>
                      {day.day}
                    </span>
                    {dayEvents.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate mb-0.5 border ${EVENT_COLORS[e.color] || EVENT_COLORS.blue}`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-gray-400 text-center">+{dayEvents.length - 2}</div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day events */}
            {selectedDate && (
              <div className="px-4 py-3 border-t">
                <h3 className="text-sm font-medium mb-2">
                  Events on {month + 1}/{selectedDate}/{year}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-gray-400">No events this day</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map(e => (
                      <div key={e.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border">
                        <div className={`w-1 h-full min-h-[32px] rounded-full ${(EVENT_COLORS[e.color] || EVENT_COLORS.blue).split(' ')[0]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{e.title}</div>
                          {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {e.location && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                                <MapPin className="w-2.5 h-2.5" />
                                {e.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">New Event</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))}
                placeholder="Event title"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
              />
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent(p => ({ ...p, location: e.target.value }))}
                placeholder="Location (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500">Color:</label>
                <div className="flex gap-1.5">
                  {Object.keys(EVENT_COLORS).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewEvent(p => ({ ...p, color }))}
                      className={`w-6 h-6 rounded-full border-2 ${EVENT_COLORS[color].split(' ')[0]} ${newEvent.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newEvent.all_day}
                  onChange={(e) => setNewEvent(p => ({ ...p, all_day: e.target.checked }))}
                  className="rounded"
                />
                All day event
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
