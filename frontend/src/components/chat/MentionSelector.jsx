/**
 * MentionSelector Component
 *
 * Dropdown that appears when a user types "@" in the group chat input.
 * Shows group members for selection, including an @all option.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { Users } from 'lucide-react'

/**
 * @param {{
 *   members: Array<{ user_id: number, User?: object, nickname?: string, role: string }>,
 *   query: string,
 *   onSelect: (member: { user_id: number, name: string, isAll?: boolean }) => void,
 *   onClose: () => void,
 *   visible: boolean,
 * }} props
 */
const MentionSelector = ({ members, query, onSelect, onClose, visible }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef(null)

  // Build the options list: @all + filtered members
  const options = useMemo(() => {
    const lowerQuery = query.toLowerCase()
    const allOption = { user_id: 0, name: 'all', isAll: true }
    const memberOptions = members.map(m => ({
      user_id: m.user_id,
      name: m.User?.name || m.nickname || `User #${m.user_id}`,
      role: m.role,
    }))

    const filtered = [allOption, ...memberOptions].filter(opt =>
      opt.name.toLowerCase().includes(lowerQuery)
    )

    return filtered.slice(0, 10) // cap at 10 results
  }, [members, query])

  // Reset selection when query or visibility changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, visible])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex]
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (options[selectedIndex]) {
          onSelect(options[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, options, selectedIndex, onSelect, onClose])

  if (!visible || options.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-4 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
      <div className="py-1" ref={listRef}>
        {options.map((opt, idx) => (
          <button
            key={opt.isAll ? 'all' : opt.user_id}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              idx === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            onMouseDown={(e) => {
              e.preventDefault() // prevent input blur
              onSelect(opt)
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            {opt.isAll ? (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white text-sm font-bold">
                {opt.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">
                {opt.isAll ? '@all (everyone)' : opt.name}
              </span>
              {opt.role && !opt.isAll && (
                <span className="text-xs text-gray-400">{opt.role}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default MentionSelector
