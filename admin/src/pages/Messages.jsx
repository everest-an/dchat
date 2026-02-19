import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

export default function Messages() {
  const [messages, setMessages] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (search) params.search = search
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const { data } = await api.get('/messages', { params })
      setMessages(data.data.items || [])
      setTotal(data.data.total || 0)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, fromDate, toDate])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const totalPages = Math.ceil(total / pageSize)

  const handleDelete = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    setActionLoading(msgId)
    try {
      await api.delete(`/messages/${msgId}`)
      fetchMessages()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete message')
    } finally {
      setActionLoading(null)
    }
  }

  const truncate = (str, len = 60) => {
    if (!str) return '-'
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Message Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Sender</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Receiver</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Content</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Date</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">No messages found</td>
                </tr>
              ) : messages.map((msg) => (
                <tr key={msg.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">#{msg.id}</td>
                  <td className="px-4 py-3 text-sm">{msg.sender?.name || msg.sender?.username || `User #${msg.sender_id}`}</td>
                  <td className="px-4 py-3 text-sm">{msg.receiver?.name || msg.receiver?.username || `User #${msg.receiver_id}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px]">
                    {msg.recalled ? (
                      <span className="italic text-gray-400">Recalled</span>
                    ) : (
                      truncate(msg.content)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {msg.recalled ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Recalled</span>
                    ) : msg.edited ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Edited</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {msg.created_at ? format(new Date(msg.created_at), 'MMM d, HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      {!msg.recalled && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          disabled={actionLoading === msg.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
