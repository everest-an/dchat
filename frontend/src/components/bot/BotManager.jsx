/**
 * BotManager - Create and manage programmable bots with webhook configuration.
 */
import { useState, useEffect } from 'react'
import { Plus, Bot, Settings, Trash2, RefreshCw, Copy, X, ChevronLeft, Activity, Eye, EyeOff } from 'lucide-react'
import BotService from '../../services/BotService'

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function BotManager() {
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showToken, setShowToken] = useState(null) // { token, secret }
  const [newBot, setNewBot] = useState({
    name: '', description: '', webhook_url: '', permissions: 'send_messages,read_messages',
  })

  useEffect(() => { loadBots() }, [])

  const loadBots = async () => {
    try {
      const res = await BotService.listBots()
      setBots(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      console.error('Failed to load bots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newBot.name.trim()) return
    try {
      const res = await BotService.createBot({
        ...newBot,
        permissions: newBot.permissions,
      })
      const data = res.data || res
      setShowCreate(false)
      setShowToken({ token: data.api_token, secret: data.secret })
      setNewBot({ name: '', description: '', webhook_url: '', permissions: 'send_messages,read_messages' })
      loadBots()
    } catch (err) {
      console.error('Failed to create bot:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bot?')) return
    try {
      await BotService.deleteBot(id)
      setBots(prev => prev.filter(b => b.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Failed to delete bot:', err)
    }
  }

  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerate API token? The old token will stop working.')) return
    try {
      const res = await BotService.regenerateToken(id)
      const data = res.data || res
      setShowToken({ token: data.api_token, secret: null })
    } catch (err) {
      console.error('Failed to regenerate token:', err)
    }
  }

  const loadEvents = async (botId) => {
    try {
      const res = await BotService.getBotEvents(botId)
      setEvents(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    }
  }

  // Bot detail view
  if (selected) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
          <button onClick={() => { setSelected(null); setEvents([]) }} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Bot className="w-5 h-5 text-gray-500" />
          <h2 className="text-sm font-semibold truncate flex-1">{selected.name}</h2>
          <button onClick={() => handleDelete(selected.id)} className="p-1 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-700">{selected.description || 'No description'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                selected.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>{selected.status}</span>
              <span className="text-[10px] text-gray-400">
                Created {new Date(selected.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {selected.webhook_url && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Webhook URL</h4>
              <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="text-xs font-mono truncate flex-1">{selected.webhook_url}</span>
                <button onClick={() => copyToClipboard(selected.webhook_url)} className="p-1 hover:bg-gray-200 rounded">
                  <Copy className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleRegenerate(selected.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate Token
            </button>
            <button
              onClick={() => loadEvents(selected.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <Activity className="w-3.5 h-3.5" /> View Events
            </button>
          </div>

          {events.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">Recent Events</h4>
              <div className="space-y-1">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded">
                    <span className="font-mono">{e.event_type}</span>
                    <span className={
                      e.delivery_status === 'delivered' ? 'text-green-600' :
                      e.delivery_status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }>{e.delivery_status}</span>
                    <span className="text-gray-400">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-lg font-semibold">Bots</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Create Bot
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Bot className="w-8 h-8 mb-2" />
            <p className="text-sm">No bots yet</p>
            <p className="text-xs mt-1">Create a bot to automate tasks via webhooks</p>
          </div>
        ) : (
          <div className="divide-y">
            {bots.map(b => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{b.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{b.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{b.description || b.webhook_url || 'No description'}</p>
                </div>
                <Settings className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Token display modal */}
      {showToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Bot Credentials</h3>
              <button onClick={() => setShowToken(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-red-500 font-medium">Save these now — they won't be shown again!</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API Token</label>
                <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-[10px] font-mono truncate flex-1">{showToken.token}</span>
                  <button onClick={() => copyToClipboard(showToken.token)} className="p-1 hover:bg-gray-200 rounded">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {showToken.secret && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Webhook Secret</label>
                  <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-[10px] font-mono truncate flex-1">{showToken.secret}</span>
                    <button onClick={() => copyToClipboard(showToken.secret)} className="p-1 hover:bg-gray-200 rounded">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t">
              <button onClick={() => setShowToken(null)} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Create Bot</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newBot.name}
                onChange={e => setNewBot(p => ({ ...p, name: e.target.value }))}
                placeholder="Bot name *"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <textarea
                value={newBot.description}
                onChange={e => setNewBot(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
              />
              <input
                type="url"
                value={newBot.webhook_url}
                onChange={e => setNewBot(p => ({ ...p, webhook_url: e.target.value }))}
                placeholder="Webhook URL (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-xs"
              />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Permissions (comma-separated)</label>
                <input
                  type="text"
                  value={newBot.permissions}
                  onChange={e => setNewBot(p => ({ ...p, permissions: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newBot.name.trim()}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Create Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
