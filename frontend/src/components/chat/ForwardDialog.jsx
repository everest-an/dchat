/**
 * ForwardDialog - Modal for selecting contacts/groups to forward messages to.
 */
import { useState, useEffect } from 'react'
import { X, Search, Send, Users, MessageSquare, Check } from 'lucide-react'
import { UserAvatar } from '../ui/UserAvatar'
import api from '../../services/apiClient'

export default function ForwardDialog({ open, messages, onClose, onForward }) {
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('contacts')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedUsers([])
    setSelectedGroups([])
    setSearch('')

    // Fetch conversations (contacts) and groups.
    const load = async () => {
      try {
        const [convRes, grpRes] = await Promise.all([
          api.get('/api/messages/conversations'),
          api.get('/api/groups'),
        ])
        setContacts(convRes?.data || convRes || [])
        const grpData = grpRes?.data || grpRes || []
        setGroups(Array.isArray(grpData) ? grpData : grpData.items || [])
      } catch {
        // Silently fail — user can still type targets
      }
    }
    load()
  }, [open])

  if (!open || !messages?.length) return null

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const toggleGroup = (id) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const handleForward = async () => {
    if (selectedUsers.length === 0 && selectedGroups.length === 0) return
    setSending(true)
    try {
      await onForward(
        messages.map((m) => m.id),
        selectedUsers,
        selectedGroups
      )
      onClose()
    } finally {
      setSending(false)
    }
  }

  const filteredContacts = contacts.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredGroups = groups.filter(
    (g) =>
      !search || g.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSelected = selectedUsers.length + selectedGroups.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-lg">
            Forward {messages.length > 1 ? `${messages.length} messages` : 'message'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts or groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1 ${
              tab === 'contacts' ? 'border-b-2 border-black text-black' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Contacts
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1 ${
              tab === 'groups' ? 'border-b-2 border-black text-black' : 'text-gray-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Groups
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[340px]">
          {tab === 'contacts' && (
            filteredContacts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No contacts found</p>
            ) : (
              filteredContacts.map((c) => {
                const id = c.user_id || c.id
                const selected = selectedUsers.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleUser(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <UserAvatar address={c.name || c.username || String(id)} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">
                        {c.name || c.username || `User ${id}`}
                      </p>
                    </div>
                  </button>
                )
              })
            )
          )}

          {tab === 'groups' && (
            filteredGroups.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No groups found</p>
            ) : (
              filteredGroups.map((g) => {
                const selected = selectedGroups.includes(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">{g.member_count || ''} members</p>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 rounded-b-xl">
          <span className="text-sm text-gray-500">
            {totalSelected > 0 ? `${totalSelected} selected` : 'Select recipients'}
          </span>
          <button
            onClick={handleForward}
            disabled={totalSelected === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  )
}
