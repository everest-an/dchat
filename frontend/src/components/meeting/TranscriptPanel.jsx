/**
 * TranscriptPanel - Real-time transcript display during video calls.
 * Shows live transcription text with speaker labels.
 */
import { useState, useRef, useEffect } from 'react'

export default function TranscriptPanel({ transcript, isRecording, onToggleRecording }) {
  const scrollRef = useRef(null)
  const [expanded, setExpanded] = useState(true)

  // Auto-scroll to bottom on new transcript text.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-24 right-4 z-50 px-3 py-2 bg-black text-white rounded-lg text-sm shadow-lg hover:bg-gray-800"
      >
        Show Transcript
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 max-h-64 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="text-sm font-medium">Live Transcript</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleRecording}
            className={`px-2 py-1 text-xs rounded ${
              isRecording
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isRecording ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Transcript content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 text-sm">
        {transcript ? (
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {transcript}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">
            {isRecording ? 'Listening...' : 'Click Start to begin transcription'}
          </p>
        )}
      </div>
    </div>
  )
}
