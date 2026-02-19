/**
 * TicketDetail - Displays a single ticket with its message thread.
 */
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import TicketService from '../../services/TicketService'

const STATUS_STYLES = {
  open: { bg: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { bg: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  resolved: { bg: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { bg: 'bg-gray-100 text-gray-700', icon: CheckCircle },
}

export default function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!ticketId) return
    loadTicket()
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const loadTicket = async () => {
    try {
      const data = await TicketService.get(ticketId)
      setTicket(data)
    } catch (err) {
      console.error('Failed to load ticket:', err)
    }
  }

  const handleReply = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      await TicketService.reply(ticketId, reply.trim())
      setReply('')
      await loadTicket()
    } catch (err) {
      console.error('Failed to reply:', err)
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    try {
      await TicketService.updateStatus(ticketId, 'resolved')
      await loadTicket()
    } catch (err) {
      console.error('Failed to resolve:', err)
    }
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open
  const StatusIcon = statusStyle.icon

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg}`}>
              <StatusIcon className="w-3 h-3" />
              {ticket.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">#{ticket.id}</span>
            <span className="text-xs text-gray-400">{ticket.category}</span>
          </div>
        </div>
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <button
            onClick={handleResolve}
            className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            Mark Resolved
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(ticket.messages || []).map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[75%] rounded-xl px-4 py-2 ${
              msg.is_staff
                ? 'bg-gray-100 text-gray-800'
                : 'bg-black text-white'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium opacity-70">
                  {msg.is_staff ? 'Support' : 'You'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-[10px] opacity-50 mt-1 block">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {ticket.status !== 'closed' && (
        <div className="px-4 py-3 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              placeholder="Type your reply..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <button
              onClick={handleReply}
              disabled={!reply.trim() || sending}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
