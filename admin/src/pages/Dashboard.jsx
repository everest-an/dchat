import { useState, useEffect } from 'react'
import {
  Users, MessageSquare, UserPlus,
  Activity, Loader2
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../lib/api'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

function RetentionCard({ retention }) {
  if (!retention) return null
  const items = [
    { label: '7-Day Retention', value: retention.retention_7d, detail: `${retention.active_new_7d}/${retention.new_users_7d}` },
    { label: '30-Day Retention', value: retention.retention_30d, detail: `${retention.active_new_30d}/${retention.new_users_30d}` },
    { label: 'Activation Rate', value: retention.activation_rate, detail: `${retention.activated_users}/${retention.total_users}` },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">User Retention</h2>
      <div className="grid grid-cols-3 gap-4">
        {items.map(({ label, value, detail }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold text-gray-900">{value?.toFixed(1)}%</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
            <p className="text-xs text-gray-400">{detail} users</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [userGrowth, setUserGrowth] = useState([])
  const [messageTrends, setMessageTrends] = useState([])
  const [activeUsers, setActiveUsers] = useState(null)
  const [groupStats, setGroupStats] = useState(null)
  const [retention, setRetention] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, growthRes, msgRes, activeRes, groupRes, retRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/analytics/user-growth?days=30'),
          api.get('/analytics/message-trends?days=30'),
          api.get('/analytics/active-users?days=30'),
          api.get('/analytics/group-stats'),
          api.get('/analytics/retention'),
        ])
        setStats(statsRes.data.data)
        setUserGrowth(growthRes.data.data)
        setMessageTrends(msgRes.data.data)
        setActiveUsers(activeRes.data.data)
        setGroupStats(groupRes.data.data)
        setRetention(retRes.data.data)
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
    )
  }

  const dauData = activeUsers?.daily || []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total_users?.toLocaleString()}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={MessageSquare}
          label="Messages Today"
          value={stats?.messages_today?.toLocaleString()}
          sub={`${stats?.total_messages?.toLocaleString()} total`}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={Activity}
          label="Active (24h)"
          value={stats?.active_users_24h?.toLocaleString()}
          sub={`MAU: ${activeUsers?.mau?.toLocaleString() || 0}`}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={UserPlus}
          label="New Users (7d)"
          value={stats?.new_users_7d?.toLocaleString()}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="User Growth (30 Days)">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => v} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Messages (30 Days)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={messageTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => v} />
              <Bar dataKey="count" fill="#111827" radius={[3, 3, 0, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Active Users (30 Days)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dauData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => v} />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="DAU" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <RetentionCard retention={retention} />
      </div>

      {/* Group Stats */}
      {groupStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Group Overview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{groupStats.total_groups}</p>
                <p className="text-sm text-gray-500">Groups</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{groupStats.total_members}</p>
                <p className="text-sm text-gray-500">Members</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{groupStats.total_group_messages}</p>
                <p className="text-sm text-gray-500">Group Messages</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Top Active Groups (30d)</h2>
            {groupStats.active_groups?.length > 0 ? (
              <div className="space-y-3">
                {groupStats.active_groups.slice(0, 5).map((g, i) => (
                  <div key={g.group_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[180px]">{g.group_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{g.message_count} msgs</p>
                      <p className="text-xs text-gray-400">{g.member_count} members</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No group activity yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
