/**
 * NetworkQualityIndicator - Shows real-time network quality during calls.
 *
 * Monitors RTCPeerConnection stats (RTT, packet loss, bitrate) and
 * displays a visual signal-strength indicator with optional detail tooltip.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import webrtcConfig from '../../config/webrtc.config'

const QUALITY_LEVELS = {
  excellent: { label: 'Excellent', color: '#22c55e', bars: 4 },
  good:      { label: 'Good',      color: '#84cc16', bars: 3 },
  fair:      { label: 'Fair',      color: '#f59e0b', bars: 2 },
  poor:      { label: 'Poor',      color: '#ef4444', bars: 1 },
  unknown:   { label: 'Checking…', color: '#9ca3af', bars: 0 },
}

function classifyQuality(rttMs, lossPercent) {
  const { rttThresholds, lossThresholds } = webrtcConfig.networkQuality
  if (rttMs <= rttThresholds.excellent && lossPercent <= lossThresholds.excellent) return 'excellent'
  if (rttMs <= rttThresholds.good && lossPercent <= lossThresholds.good) return 'good'
  if (rttMs <= rttThresholds.fair && lossPercent <= lossThresholds.fair) return 'fair'
  return 'poor'
}

export default function NetworkQualityIndicator({ peerConnection }) {
  const [quality, setQuality] = useState('unknown')
  const [stats, setStats] = useState({ rtt: 0, loss: 0, bitrate: 0 })
  const [showDetail, setShowDetail] = useState(false)
  const prevBytesRef = useRef(0)
  const prevTimestampRef = useRef(0)

  const sampleStats = useCallback(async () => {
    if (!peerConnection || peerConnection.connectionState === 'closed') return

    try {
      const report = await peerConnection.getStats()
      let rtt = 0
      let packetsLost = 0
      let packetsReceived = 0
      let bytesReceived = 0
      let timestamp = 0

      report.forEach(s => {
        if (s.type === 'candidate-pair' && s.state === 'succeeded') {
          rtt = s.currentRoundTripTime ? s.currentRoundTripTime * 1000 : 0
        }
        if (s.type === 'inbound-rtp' && s.kind === 'video') {
          packetsLost += s.packetsLost || 0
          packetsReceived += s.packetsReceived || 0
          bytesReceived = s.bytesReceived || 0
          timestamp = s.timestamp || 0
        }
      })

      const totalPackets = packetsReceived + packetsLost
      const lossPercent = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0

      let bitrate = 0
      if (prevBytesRef.current > 0 && prevTimestampRef.current > 0) {
        const dt = (timestamp - prevTimestampRef.current) / 1000
        if (dt > 0) {
          bitrate = ((bytesReceived - prevBytesRef.current) * 8) / dt
        }
      }
      prevBytesRef.current = bytesReceived
      prevTimestampRef.current = timestamp

      const level = classifyQuality(rtt, lossPercent)
      setQuality(level)
      setStats({
        rtt: Math.round(rtt),
        loss: Math.round(lossPercent * 10) / 10,
        bitrate: Math.round(bitrate / 1000),
      })
    } catch {
      // Stats may not be available yet
    }
  }, [peerConnection])

  useEffect(() => {
    if (!webrtcConfig.networkQuality?.enabled) return
    const interval = setInterval(sampleStats, webrtcConfig.networkQuality.sampleIntervalMs)
    return () => clearInterval(interval)
  }, [sampleStats])

  const q = QUALITY_LEVELS[quality]

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => setShowDetail(prev => !prev)}
    >
      {/* Signal bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4 + i * 4,
              borderRadius: 1,
              backgroundColor: i <= q.bars ? q.color : '#4b5563',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>

      {/* Detail tooltip */}
      {showDetail && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 0,
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            whiteSpace: 'nowrap',
            zIndex: 10,
            minWidth: 140,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: q.color }}>{q.label}</div>
          <div>RTT: {stats.rtt} ms</div>
          <div>Loss: {stats.loss}%</div>
          <div>Bitrate: {stats.bitrate} kbps</div>
        </div>
      )}
    </div>
  )
}
