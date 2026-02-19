/**
 * VoicePlayer Component
 *
 * Audio player for voice messages with play/pause, progress bar,
 * duration display, and playback speed controls.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SPEEDS = [1, 1.5, 2]

/**
 * @param {{
 *   fileUrl: string,
 *   duration?: number,
 *   isMe?: boolean,
 * }} props
 */
const VoicePlayer = ({ fileUrl, duration: initialDuration, isMe }) => {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [speedIdx, setSpeedIdx] = useState(0)

  const audioRef = useRef(null)

  // Build full URL if relative
  const src = fileUrl?.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl}`

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setPlaying(false)
      setCurrentTime(0)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [src])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }, [playing])

  const cycleSpeed = useCallback(() => {
    const nextIdx = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(nextIdx)
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[nextIdx]
    }
  }, [speedIdx])

  const handleSeek = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = pct * duration
      if (audioRef.current) {
        audioRef.current.currentTime = time
        setCurrentTime(time)
      }
    },
    [duration],
  )

  const formatTime = (sec) => {
    if (!sec || !isFinite(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[200px] ${
        isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`p-1.5 rounded-full flex-shrink-0 ${
          isMe ? 'hover:bg-white/20' : 'hover:bg-gray-200'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className={`h-1.5 rounded-full cursor-pointer ${
            isMe ? 'bg-white/30' : 'bg-gray-300'
          }`}
          onClick={handleSeek}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isMe ? 'bg-white' : 'bg-black'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
            {formatTime(playing ? currentTime : duration)}
          </span>
          {/* Speed button */}
          <button
            onClick={cycleSpeed}
            className={`text-[10px] font-medium px-1 rounded ${
              isMe ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoicePlayer
