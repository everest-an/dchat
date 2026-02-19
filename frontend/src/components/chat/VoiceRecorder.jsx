/**
 * VoiceRecorder Component
 *
 * Records audio using the MediaRecorder API.
 * Shows recording duration and waveform animation while recording.
 */
import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import api from '../../services/apiClient'

/**
 * @param {{
 *   onVoiceSend: (fileData: { file_url: string, file_name: string, file_size: number, duration: number }) => void,
 *   disabled?: boolean,
 * }} props
 */
const VoiceRecorder = ({ onVoiceSend, disabled }) => {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)

  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)
  const startTime = useRef(0)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Choose supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timerRef.current)

        const finalDuration = (Date.now() - startTime.current) / 1000
        const blob = new Blob(chunks.current, { type: mimeType })

        // Skip very short recordings (< 0.5s)
        if (finalDuration < 0.5) {
          setRecording(false)
          setDuration(0)
          return
        }

        // Upload
        setUploading(true)
        try {
          const ext = mimeType.includes('webm') ? '.webm' : '.ogg'
          const file = new File([blob], `voice${ext}`, { type: mimeType })
          const formData = new FormData()
          formData.append('file', file)

          const res = await api.upload('/api/files/upload', formData)
          const data = res.data || res

          onVoiceSend({
            file_url: data.file_url,
            file_name: data.file_name,
            file_size: data.file_size,
            duration: Math.round(finalDuration * 10) / 10,
          })
        } catch (err) {
          console.error('Failed to upload voice message:', err)
        } finally {
          setUploading(false)
          setDuration(0)
        }
      }

      mediaRecorder.current = recorder
      startTime.current = Date.now()
      recorder.start(250) // collect data every 250ms
      setRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTime.current) / 1000)
      }, 100)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }, [onVoiceSend])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    setRecording(false)
  }, [])

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (uploading) {
    return (
      <button disabled className="p-2 rounded-full opacity-50">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </button>
    )
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        {/* Waveform animation */}
        <div className="flex items-center gap-0.5 h-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${8 + Math.random() * 12}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-red-600 font-mono min-w-[3rem]">
          {formatDuration(duration)}
        </span>
        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
          title="Stop recording"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
      title="Record voice message"
    >
      <Mic className="w-5 h-5" />
    </button>
  )
}

export default VoiceRecorder
