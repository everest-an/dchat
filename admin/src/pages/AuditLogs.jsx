import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

const ACTION_LABELS = {
  ban_user: { label: 'Ban User', color: 'bg-red-100 text-red-700' },
  unban_user: { label: 'Unban User', color: 'bg-green-100 text-green-700' },
  delete_user: { label: 'Delete User', color: 'bg-red-100 text-red-700' },
  update_role: { label: 'Update Role', color: 'bg-blue-100 text-blue-700' },
  delete_message: { label: 'Delete Message', color: 'bg-orange-100 text-orange-700' },
  update_settings: { label: 'Update Settings', color: 'bg-purple-100 text-purple-700' },
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (actionFilter) params.action = actionFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const { data } = await api.get('/audit-logs', { params })
      setLogs(data.data.items || [])
      setTotal(data.data.total || 0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, actionFilter, fromDate, toDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  const actionBadge = (action) => {
    const config = ACTION_LABELS[action] || { label: action, color: 'bg-gray-100 text-gray-700' }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Actions</option>
          <option value="ban_user">Ban User</option>
          <option value="unban_user">Unban User</option>
          <option value="delete_user">Delete User</option>
          <option value="update_role">Update Role</option>
          <option value="delete_message">Delete Message</option>
          <option value="update_settings">Update Settings</option>
        </select>
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
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Admin</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Target</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Detail</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No audit logs found</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.admin?.name || log.admin?.username || `Admin #${log.admin_id}`}
                  </td>
                  <td className="px-4 py-3">{actionBadge(log.action)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{log.target || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{log.detail || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{log.ip || '-'}</td>
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
