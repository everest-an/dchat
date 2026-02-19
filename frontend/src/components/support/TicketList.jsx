/**
 * TicketList - Main support page showing all user tickets.
 */
import { useState, useEffect } from 'react'
import { Plus, HelpCircle, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import TicketService from '../../services/TicketService'
import CreateTicketDialog from './CreateTicketDialog'
import TicketDetail from './TicketDetail'

const STATUS_BADGE = {
  open: { bg: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { bg: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  resolved: { bg: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { bg: 'bg-gray-100 text-gray-700', icon: CheckCircle },
}

const PRIORITY_DOT = {
  low: 'bg-gray-400',
  medium: 'bg-blue-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
}

export default function TicketList() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      const res = await TicketService.list()
      setTickets(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  if (selectedId) {
    return (
      <TicketDetail
        ticketId={selectedId}
        onBack={() => { setSelectedId(null); loadTickets(); }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Help & Support</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <HelpCircle className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No tickets yet</h3>
            <p className="text-gray-500 text-sm mb-4">Need help? Create a support ticket and our team will assist you.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        ) : (
          tickets.map((ticket) => {
            const status = STATUS_BADGE[ticket.status] || STATUS_BADGE.open
            const StatusIcon = status.icon
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority] || 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{ticket.subject}</span>
                    <span className="text-xs text-gray-400">#{ticket.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bg}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">{ticket.category}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            )
          })
        )}
      </div>

      <CreateTicketDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadTickets()}
      />
    </div>
  )
}
