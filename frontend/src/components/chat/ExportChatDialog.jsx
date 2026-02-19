/**
 * ExportChatDialog - Dialog for exporting chat history with format and date range selection.
 */
import { useState } from 'react'
import { X, Download, FileText, FileJson } from 'lucide-react'
import api from '../../services/apiClient'

export default function ExportChatDialog({ open, onClose, userId, isGroup, groupId }) {
  const [format, setFormat] = useState('txt')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  if (!open) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const endpoint = isGroup
        ? `/api/groups/${groupId}/messages/export?${params}`
        : `/api/messages/export/${userId}?${params}`

      const res = await api.get(endpoint, { rawResponse: true })
      const blob = await res.blob()

      const ext = format === 'json' ? 'json' : 'txt'
      const filename = isGroup ? `group_${groupId}_export.${ext}` : `chat_export.${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[380px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-lg">Export Chat History</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('txt')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm transition-colors ${
                  format === 'txt'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Plain Text
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm transition-colors ${
                  format === 'json'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Leave dates empty to export the entire history.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Download Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
