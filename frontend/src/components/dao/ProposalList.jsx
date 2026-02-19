/**
 * ProposalList - List and create governance proposals, cast votes.
 */
import { useState, useEffect } from 'react'
import { Plus, ThumbsUp, ThumbsDown, Clock, CheckCircle2, XCircle, X, ChevronLeft } from 'lucide-react'
import DAOService from '../../services/DAOService'

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  passed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

const CATEGORIES = ['general', 'funding', 'governance', 'technical', 'community']

export default function ProposalList() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('')
  const [newProposal, setNewProposal] = useState({
    title: '', description: '', category: 'general', quorum: 10,
    ends_at: '',
  })

  useEffect(() => { loadProposals() }, [filter])

  const loadProposals = async () => {
    try {
      const params = {}
      if (filter) params.status = filter
      const res = await DAOService.listProposals(params)
      setProposals(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newProposal.title.trim() || !newProposal.ends_at) return
    try {
      await DAOService.createProposal({
        ...newProposal,
        ends_at: new Date(newProposal.ends_at).toISOString(),
      })
      setShowCreate(false)
      setNewProposal({ title: '', description: '', category: 'general', quorum: 10, ends_at: '' })
      loadProposals()
    } catch (err) {
      console.error('Failed to create proposal:', err)
    }
  }

  const handleVote = async (proposalId, choice) => {
    try {
      await DAOService.castVote(proposalId, { choice, weight: 1 })
      if (selected?.id === proposalId) {
        const res = await DAOService.getProposal(proposalId)
        setSelected(res.data || res)
      }
      loadProposals()
    } catch (err) {
      console.error('Failed to vote:', err)
    }
  }

  const getVotePercent = (p) => {
    const total = (p.votes_for || 0) + (p.votes_against || 0)
    if (total === 0) return 50
    return Math.round(((p.votes_for || 0) / total) * 100)
  }

  if (selected) {
    const p = selected
    const pct = getVotePercent(p)
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
          <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold truncate flex-1">{p.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.pending}`}>
            {p.status}
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <span className="text-xs text-gray-500 uppercase">{p.category}</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{p.description}</p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>For: {p.votes_for || 0}</span>
              <span>Against: {p.votes_against || 0}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="bg-green-500 transition-all" style={{ width: `${pct}%` }} />
              <div className="bg-red-400 transition-all" style={{ width: `${100 - pct}%` }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Quorum: {p.quorum} | Ends: {new Date(p.ends_at).toLocaleDateString()}
            </div>
          </div>

          {p.status === 'active' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleVote(p.id, 'for')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100"
              >
                <ThumbsUp className="w-4 h-4" /> Vote For
              </button>
              <button
                onClick={() => handleVote(p.id, 'against')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100"
              >
                <ThumbsDown className="w-4 h-4" /> Vote Against
              </button>
            </div>
          )}

          {p.votes && p.votes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">Recent Votes</h4>
              <div className="space-y-1">
                {p.votes.slice(0, 20).map(v => (
                  <div key={v.id} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Voter #{v.voter_id}</span>
                    <span className={v.choice === 'for' ? 'text-green-600' : 'text-red-600'}>
                      {v.choice} (weight: {v.weight})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-lg font-semibold">Proposals</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b">
        {['', 'active', 'passed', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
              filter === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ScrollText className="w-8 h-8 mb-2" />
            <p className="text-sm">No proposals yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {proposals.map(p => {
              const pct = getVotePercent(p)
              const StatusIcon = p.status === 'passed' ? CheckCircle2 : p.status === 'rejected' ? XCircle : Clock
              return (
                <button
                  key={p.id}
                  onClick={async () => {
                    try {
                      const res = await DAOService.getProposal(p.id)
                      setSelected(res.data || res)
                    } catch { setSelected(p) }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      p.status === 'active' ? 'text-green-500' : p.status === 'passed' ? 'text-blue-500' : p.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{p.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{p.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                          <div className="bg-green-500" style={{ width: `${pct}%` }} />
                          <div className="bg-red-400" style={{ width: `${100 - pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {p.votes_for || 0}/{p.votes_against || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Proposal Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">New Proposal</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newProposal.title}
                onChange={e => setNewProposal(p => ({ ...p, title: e.target.value }))}
                placeholder="Proposal title"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <textarea
                value={newProposal.description}
                onChange={e => setNewProposal(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the proposal..."
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={4}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    value={newProposal.category}
                    onChange={e => setNewProposal(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Quorum</label>
                  <input
                    type="number"
                    value={newProposal.quorum}
                    onChange={e => setNewProposal(p => ({ ...p, quorum: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Voting Ends</label>
                <input
                  type="datetime-local"
                  value={newProposal.ends_at}
                  onChange={e => setNewProposal(p => ({ ...p, ends_at: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newProposal.title.trim() || !newProposal.ends_at}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Create Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
