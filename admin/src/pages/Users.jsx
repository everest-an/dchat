import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Ban, CheckCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

export default function Users() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [bannedFilter, setBannedFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (bannedFilter) params.banned = bannedFilter
      const { data } = await api.get('/users', { params })
      setUsers(data.data.items || [])
      setTotal(data.data.total || 0)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, roleFilter, bannedFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const totalPages = Math.ceil(total / pageSize)

  const handleBan = async (userId) => {
    const reason = prompt('Ban reason (optional):')
    if (reason === null) return
    setActionLoading(userId)
    try {
      await api.put(`/users/${userId}/ban`, { reason })
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to ban user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnban = async (userId) => {
    setActionLoading(userId)
    try {
      await api.put(`/users/${userId}/unban`)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to unban user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    setActionLoading(userId)
    try {
      await api.delete(`/users/${userId}`)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId)
    try {
      await api.put(`/users/${userId}/role`, { role: newRole })
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to change role')
    } finally {
      setActionLoading(null)
    }
  }

  const roleBadge = (role) => {
    const styles = {
      super_admin: 'bg-red-100 text-red-700',
      admin: 'bg-orange-100 text-orange-700',
      moderator: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] || styles.user}`}>
        {role}
      </span>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select
          value={bannedFilter}
          onChange={(e) => { setBannedFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
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
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No users found</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{u.name || u.username}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {u.wallet_address ? `${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}` : '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={actionLoading === u.id}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_banned ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Banned</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.is_banned ? (
                        <button
                          onClick={() => handleUnban(u.id)}
                          disabled={actionLoading === u.id}
                          className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 disabled:opacity-50"
                          title="Unban"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(u.id)}
                          disabled={actionLoading === u.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                          title="Ban"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={actionLoading === u.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
