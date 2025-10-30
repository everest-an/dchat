import { useState } from 'react'
import { Search, Calendar, User, X } from 'lucide-react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'

const MessageSearch = ({ recipientAddress, onClose, onMessageClick }) => {
  const { account } = useWeb3()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({
    sender: 'all', // 'all', 'me', 'other'
    dateFrom: '',
    dateTo: ''
  })

  const handleSearch = () => {
    const storageKey = `dchat_messages_${account}_${recipientAddress}`
    const stored = localStorage.getItem(storageKey)
    const messages = stored ? JSON.parse(stored) : []

    let filtered = messages

    // TODO: Translate '文本搜索'
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(m => 
        m.text && m.text.toLowerCase().includes(lowerQuery)
      )
    }

    // TODO: Translate '发送者筛选'
    if (filters.sender !== 'all') {
      filtered = filtered.filter(m => m.sender === filters.sender)
    }

    // TODO: Translate '日期筛选'
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(m => {
        const msgDate = new Date(m.timestamp)
        return msgDate >= fromDate
      })
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(m => {
        const msgDate = new Date(m.timestamp)
        return msgDate <= toDate
      })
    }

    setResults(filtered)
  }

  const highlightText = (text) => {
    if (!query.trim() || !text) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1">{part}</mark>
      ) : part
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Search Messages</h2>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            autoFocus
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.sender}
            onChange={(e) => setFilters({...filters, sender: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Messages</option>
            <option value="me">My Messages</option>
            <option value="other">Their Messages</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="From"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="To"
          />

          <Button
            onClick={handleSearch}
            className="bg-black hover:bg-gray-800 text-white"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {query ? 'No results found' : 'Enter a search query'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map(msg => (
              <div
                key={msg.id}
                onClick={() => onMessageClick && onMessageClick(msg)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${
                    msg.sender === 'me' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {msg.sender === 'me' ? 'You' : 'Them'}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{msg.timestamp}</span>
                </div>
                <p className="text-sm">
                  {highlightText(msg.text)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageSearch
