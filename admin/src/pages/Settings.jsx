import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'

const DEFAULT_SETTINGS = [
  { key: 'max_message_length', value: '10000' },
  { key: 'file_upload_limit_mb', value: '50' },
  { key: 'recall_window_seconds', value: '120' },
  { key: 'edit_window_seconds', value: '300' },
]

export default function Settings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings')
        const existing = data.data || []
        if (existing.length === 0) {
          setSettings(DEFAULT_SETTINGS.map((s) => ({ ...s })))
        } else {
          setSettings(existing.map((s) => ({ key: s.key, value: s.value })))
        }
      } catch {
        setSettings(DEFAULT_SETTINGS.map((s) => ({ ...s })))
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleChange = (index, field, value) => {
    setSettings((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAdd = () => {
    setSettings((prev) => [...prev, { key: '', value: '' }])
  }

  const handleRemove = (index) => {
    setSettings((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const valid = settings.filter((s) => s.key.trim() && s.value.trim())
    if (valid.length === 0) {
      setMessage({ type: 'error', text: 'At least one setting is required' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.put('/settings', { settings: valid })
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Key</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Value</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3 w-16">
                <button
                  onClick={handleAdd}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500"
                  title="Add setting"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={setting.key}
                    onChange={(e) => handleChange(i, 'key', e.target.value)}
                    placeholder="setting_key"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={setting.value}
                    onChange={(e) => handleChange(i, 'value', e.target.value)}
                    placeholder="value"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
