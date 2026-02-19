/**
 * MentionBadge Component
 *
 * Displays the count of unread @mentions. Polls periodically.
 * Can be placed in the chat list or navigation.
 */
import { useState, useEffect } from 'react'
import { AtSign } from 'lucide-react'
import MentionService from '../services/MentionService'

/**
 * @param {{ className?: string }} props
 */
const MentionBadge = ({ className = '' }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true

    const fetchCount = async () => {
      try {
        const c = await MentionService.getUnreadCount()
        if (mounted) setCount(c)
      } catch {
        // silently ignore
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000) // poll every 30s

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (count === 0) return null

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full ${className}`}
      title={`${count} unread @mention${count > 1 ? 's' : ''}`}
    >
      <AtSign className="w-3 h-3" />
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default MentionBadge
