/**
 * Adaptive Bitrate Controller
 *
 * Monitors WebRTC connection stats and adjusts video encoding parameters
 * (resolution, framerate, max bitrate) to match available bandwidth.
 */
import webrtcConfig from '../config/webrtc.config'

const TIERS = ['low', 'medium', 'high']

export default class AdaptiveBitrateController {
  constructor(peerConnection) {
    this.pc = peerConnection
    this.currentTier = 'high'
    this.intervalId = null
    this.prevBytesSent = 0
    this.prevTimestamp = 0
  }

  start() {
    const cfg = webrtcConfig.adaptiveBitrate
    if (!cfg?.enabled || !this.pc) return

    this.intervalId = setInterval(() => this._probe(), cfg.probeIntervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async _probe() {
    if (!this.pc || this.pc.connectionState === 'closed') {
      this.stop()
      return
    }

    try {
      const report = await this.pc.getStats()
      let bytesSent = 0
      let timestamp = 0

      report.forEach(s => {
        if (s.type === 'outbound-rtp' && s.kind === 'video') {
          bytesSent = s.bytesSent || 0
          timestamp = s.timestamp || 0
        }
      })

      if (this.prevBytesSent > 0 && this.prevTimestamp > 0) {
        const dt = (timestamp - this.prevTimestamp) / 1000
        if (dt > 0) {
          const availableBps = ((bytesSent - this.prevBytesSent) * 8) / dt
          this._adjustTier(availableBps)
        }
      }

      this.prevBytesSent = bytesSent
      this.prevTimestamp = timestamp
    } catch {
      // Stats may not be available
    }
  }

  _adjustTier(availableBps) {
    const cfg = webrtcConfig.adaptiveBitrate
    const currentIdx = TIERS.indexOf(this.currentTier)
    const currentBitrate = cfg.tiers[this.currentTier].maxBitrate

    // Check downgrade
    if (currentIdx > 0 && availableBps < currentBitrate * cfg.downgradeThreshold) {
      this._setTier(TIERS[currentIdx - 1])
      return
    }

    // Check upgrade
    if (currentIdx < TIERS.length - 1) {
      const nextTier = TIERS[currentIdx + 1]
      const nextBitrate = cfg.tiers[nextTier].maxBitrate
      if (availableBps > nextBitrate * cfg.upgradeThreshold) {
        this._setTier(nextTier)
      }
    }
  }

  async _setTier(tierName) {
    if (tierName === this.currentTier) return
    this.currentTier = tierName

    const tier = webrtcConfig.adaptiveBitrate.tiers[tierName]
    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video')
    if (!sender) return

    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}]
    }
    params.encodings[0].maxBitrate = tier.maxBitrate
    params.encodings[0].maxFramerate = tier.fps

    try {
      await sender.setParameters(params)
    } catch (err) {
      console.warn('Failed to set encoding params:', err)
    }

    // Also constrain the track resolution
    try {
      await sender.track.applyConstraints({
        width: { ideal: tier.width },
        height: { ideal: tier.height },
        frameRate: { ideal: tier.fps },
      })
    } catch {
      // Constraint application is best-effort
    }
  }

  get tier() {
    return this.currentTier
  }
}
