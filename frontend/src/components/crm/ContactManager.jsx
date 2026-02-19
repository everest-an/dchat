/**
 * ContactManager - CRM contacts list with search, create, and detail view.
 */
import { useState, useEffect } from 'react'
import { Plus, Search, User, Building2, Mail, Phone, Trash2, X, ChevronLeft } from 'lucide-react'
import CRMService from '../../services/CRMService'

export default function ContactManager() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '', email: '', phone: '', company: '', position: '', wallet_address: '', notes: '',
  })

  useEffect(() => { loadContacts() }, [search])

  const loadContacts = async () => {
    try {
      const params = {}
      if (search) params.search = search
      const res = await CRMService.listContacts(params)
      setContacts(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newContact.name.trim()) return
    try {
      await CRMService.createContact(newContact)
      setShowCreate(false)
      setNewContact({ name: '', email: '', phone: '', company: '', position: '', wallet_address: '', notes: '' })
      loadContacts()
    } catch (err) {
      console.error('Failed to create contact:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await CRMService.deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Failed to delete contact:', err)
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
          <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold truncate flex-1">{selected.name}</h2>
          <button onClick={() => handleDelete(selected.id)} className="p-1 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <div className="font-medium">{selected.name}</div>
              {selected.position && selected.company && (
                <div className="text-xs text-gray-500">{selected.position} at {selected.company}</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {selected.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{selected.email}</span>
              </div>
            )}
            {selected.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{selected.phone}</span>
              </div>
            )}
            {selected.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{selected.company}</span>
              </div>
            )}
            {selected.wallet_address && (
              <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg font-mono">
                {selected.wallet_address}
              </div>
            )}
          </div>

          {selected.notes && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}

          {selected.tags && (
            <div className="flex flex-wrap gap-1">
              {selected.tags.split(',').filter(Boolean).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-400">
            Source: {selected.source || 'manual'} | Added: {new Date(selected.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="px-4 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <User className="w-8 h-8 mb-2" />
            <p className="text-sm">No contacts yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[c.position, c.company].filter(Boolean).join(' at ') || c.email || 'No details'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">New Contact</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newContact.name}
                onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                placeholder="Name *"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newContact.company}
                  onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))}
                  placeholder="Company"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={newContact.position}
                  onChange={e => setNewContact(p => ({ ...p, position: e.target.value }))}
                  placeholder="Position"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <input
                type="text"
                value={newContact.wallet_address}
                onChange={e => setNewContact(p => ({ ...p, wallet_address: e.target.value }))}
                placeholder="Wallet address (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-xs"
              />
              <textarea
                value={newContact.notes}
                onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newContact.name.trim()}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
