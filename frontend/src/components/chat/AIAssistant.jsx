/**
 * AIAssistant - AI-powered chat helper panel.
 * Provides: summarize, suggest replies, translate, draft.
 */
import { useState } from 'react'
import AIService from '../../services/AIService'

const LANGUAGES = ['English', 'Chinese', 'Spanish', 'French', 'Japanese', 'Korean', 'German', 'Arabic']

export default function AIAssistant({ messages, onInsertText, onClose }) {
  const [tab, setTab] = useState('suggest')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [draftPrompt, setDraftPrompt] = useState('')
  const [translateText, setTranslateText] = useState('')
  const [translateLang, setTranslateLang] = useState('English')

  const recentIds = (messages || []).slice(-20).map((m) => m.id).filter(Boolean)

  const handleSummarize = async () => {
    if (recentIds.length === 0) return setError('No messages to summarize')
    setLoading(true)
    setError('')
    try {
      const summary = await AIService.summarize(recentIds)
      setResult({ type: 'summary', content: summary })
    } catch (e) {
      setError(e.message || 'Failed to summarize')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggest = async () => {
    if (recentIds.length === 0) return setError('No messages for suggestions')
    setLoading(true)
    setError('')
    try {
      const suggestions = await AIService.suggestReply(recentIds)
      setResult({ type: 'suggestions', content: suggestions })
    } catch (e) {
      setError(e.message || 'Failed to get suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async () => {
    if (!translateText.trim()) return setError('Enter text to translate')
    setLoading(true)
    setError('')
    try {
      const translated = await AIService.translate(translateText, translateLang)
      setResult({ type: 'translation', content: translated })
    } catch (e) {
      setError(e.message || 'Failed to translate')
    } finally {
      setLoading(false)
    }
  }

  const handleDraft = async () => {
    if (!draftPrompt.trim()) return setError('Describe what you want to write')
    setLoading(true)
    setError('')
    try {
      const draft = await AIService.draft(draftPrompt)
      setResult({ type: 'draft', content: draft })
    } catch (e) {
      setError(e.message || 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'suggest', label: 'Reply' },
    { id: 'summarize', label: 'Summary' },
    { id: 'translate', label: 'Translate' },
    { id: 'draft', label: 'Draft' },
  ]

  return (
    <div className="border-t bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm px-2"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setResult(null); setError('') }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-[250px] overflow-y-auto">
        {/* Suggest Reply Tab */}
        {tab === 'suggest' && (
          <div>
            <button
              onClick={handleSuggest}
              disabled={loading}
              className="w-full py-2 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Thinking...' : 'Get Reply Suggestions'}
            </button>
            {result?.type === 'suggestions' && Array.isArray(result.content) && (
              <div className="mt-3 space-y-2">
                {result.content.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onInsertText?.(s)}
                    className="w-full text-left p-2 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summarize Tab */}
        {tab === 'summarize' && (
          <div>
            <button
              onClick={handleSummarize}
              disabled={loading}
              className="w-full py-2 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Summarizing...' : `Summarize Last ${recentIds.length} Messages`}
            </button>
            {result?.type === 'summary' && (
              <div className="mt-3 p-3 text-sm bg-muted rounded-md whitespace-pre-wrap">
                {result.content}
              </div>
            )}
          </div>
        )}

        {/* Translate Tab */}
        {tab === 'translate' && (
          <div className="space-y-3">
            <textarea
              value={translateText}
              onChange={(e) => setTranslateText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full p-2 text-sm border rounded-md resize-none h-20 bg-background"
            />
            <div className="flex gap-2">
              <select
                value={translateLang}
                onChange={(e) => setTranslateLang(e.target.value)}
                className="flex-1 p-2 text-sm border rounded-md bg-background"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                onClick={handleTranslate}
                disabled={loading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? '...' : 'Translate'}
              </button>
            </div>
            {result?.type === 'translation' && (
              <div className="p-3 text-sm bg-muted rounded-md whitespace-pre-wrap">
                {result.content}
                <button
                  onClick={() => onInsertText?.(result.content)}
                  className="mt-2 text-xs text-primary hover:underline block"
                >
                  Insert into message
                </button>
              </div>
            )}
          </div>
        )}

        {/* Draft Tab */}
        {tab === 'draft' && (
          <div className="space-y-3">
            <textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder="Describe what you want to write, e.g.: 'Politely decline a meeting request for tomorrow'"
              className="w-full p-2 text-sm border rounded-md resize-none h-20 bg-background"
            />
            <button
              onClick={handleDraft}
              disabled={loading}
              className="w-full py-2 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Drafting...' : 'Generate Draft'}
            </button>
            {result?.type === 'draft' && (
              <div className="p-3 text-sm bg-muted rounded-md whitespace-pre-wrap">
                {result.content}
                <button
                  onClick={() => onInsertText?.(result.content)}
                  className="mt-2 text-xs text-primary hover:underline block"
                >
                  Insert into message
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
