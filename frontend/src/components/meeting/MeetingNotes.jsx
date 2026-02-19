/**
 * MeetingNotes - Display and manage meeting notes after a call ends.
 * Shows transcript, AI-generated summary, and action items.
 * Supports export to text/markdown.
 */
import { useState, useEffect } from 'react'
import MeetingService from '../../services/MeetingService'

export default function MeetingNotes({ meetingId, onClose }) {
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summarizing, setSummarizing] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('summary')

  useEffect(() => {
    if (!meetingId) return
    const fetch = async () => {
      try {
        const data = await MeetingService.get(meetingId)
        setMeeting(data)
      } catch (e) {
        setError(e.message || 'Failed to load meeting')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [meetingId])

  const handleSummarize = async () => {
    setSummarizing(true)
    setError('')
    try {
      const result = await MeetingService.summarize(meetingId)
      setMeeting((prev) => ({
        ...prev,
        summary: result.summary,
        action_items: result.action_items,
      }))
      setTab('summary')
    } catch (e) {
      setError(e.message || 'Failed to generate summary')
    } finally {
      setSummarizing(false)
    }
  }

  const handleExport = (format) => {
    if (!meeting) return

    let content = ''
    const title = meeting.title || 'Meeting Notes'
    const date = new Date(meeting.started_at).toLocaleString()

    if (format === 'markdown') {
      content = `# ${title}\n\n**Date:** ${date}\n**Duration:** ${formatDuration(meeting.duration)}\n\n`
      if (meeting.summary) {
        content += `## Summary\n\n${meeting.summary}\n\n`
      }
      if (meeting.action_items?.length > 0) {
        content += `## Action Items\n\n${meeting.action_items.map((item) => `- [ ] ${item}`).join('\n')}\n\n`
      }
      if (meeting.transcript) {
        content += `## Transcript\n\n${meeting.transcript}\n`
      }
    } else {
      content = `${title}\nDate: ${date}\nDuration: ${formatDuration(meeting.duration)}\n\n`
      if (meeting.summary) content += `Summary:\n${meeting.summary}\n\n`
      if (meeting.action_items?.length > 0) {
        content += `Action Items:\n${meeting.action_items.map((item) => `- ${item}`).join('\n')}\n\n`
      }
      if (meeting.transcript) content += `Transcript:\n${meeting.transcript}\n`
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-notes-${meetingId}.${format === 'markdown' ? 'md' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-500">Loading meeting notes...</p>
        </div>
      </div>
    )
  }

  if (!meeting) return null

  const actionItems = Array.isArray(meeting.action_items)
    ? meeting.action_items
    : typeof meeting.action_items === 'string'
      ? (() => { try { return JSON.parse(meeting.action_items) } catch { return [] } })()
      : []

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'actions', label: `Actions (${actionItems.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{meeting.title || 'Meeting Notes'}</h2>
            <p className="text-sm text-gray-500">
              {new Date(meeting.started_at).toLocaleString()} · {formatDuration(meeting.duration)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'summary' && (
            <div>
              {meeting.summary ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{meeting.summary}</div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No summary yet</p>
                  {meeting.transcript && (
                    <button
                      onClick={handleSummarize}
                      disabled={summarizing}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {summarizing ? 'Generating...' : 'Generate Summary with AI'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'transcript' && (
            <div>
              {meeting.transcript ? (
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-mono bg-gray-50 p-4 rounded-lg">
                  {meeting.transcript}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No transcript available</p>
              )}
            </div>
          )}

          {tab === 'actions' && (
            <div>
              {actionItems.length > 0 ? (
                <ul className="space-y-3">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="mt-1 rounded" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No action items yet</p>
                  {meeting.transcript && !meeting.summary && (
                    <button
                      onClick={handleSummarize}
                      disabled={summarizing}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {summarizing ? 'Generating...' : 'Generate with AI'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('markdown')}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              Export .md
            </button>
            <button
              onClick={() => handleExport('text')}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              Export .txt
            </button>
          </div>
          {meeting.transcript && !meeting.summary && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {summarizing ? 'Generating...' : 'Summarize'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
