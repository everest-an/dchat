/**
 * DealBoard - CRM deals pipeline view.
 */
import { useState, useEffect } from 'react'
import { Plus, DollarSign, TrendingUp, X, Trash2 } from 'lucide-react'
import CRMService from '../../services/CRMService'

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-700' },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { key: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

export default function DealBoard() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newDeal, setNewDeal] = useState({
    title: '', value: '', currency: 'USD', stage: 'lead', probability: 0,
    close_date: '', contact_id: null,
  })

  useEffect(() => { loadDeals() }, [stageFilter])

  const loadDeals = async () => {
    try {
      const params = {}
      if (stageFilter) params.stage = stageFilter
      const res = await CRMService.listDeals(params)
      setDeals(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load deals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newDeal.title.trim()) return
    try {
      const payload = {
        ...newDeal,
        value: parseFloat(newDeal.value) || 0,
        probability: parseInt(newDeal.probability) || 0,
      }
      if (newDeal.close_date) payload.close_date = new Date(newDeal.close_date).toISOString()
      if (!payload.contact_id) delete payload.contact_id
      await CRMService.createDeal(payload)
      setShowCreate(false)
      setNewDeal({ title: '', value: '', currency: 'USD', stage: 'lead', probability: 0, close_date: '', contact_id: null })
      loadDeals()
    } catch (err) {
      console.error('Failed to create deal:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await CRMService.deleteDeal(id)
      setDeals(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Failed to delete deal:', err)
    }
  }

  const handleStageUpdate = async (deal, newStage) => {
    try {
      await CRMService.updateDeal(deal.id, { stage: newStage })
      loadDeals()
    } catch (err) {
      console.error('Failed to update deal stage:', err)
    }
  }

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
  const getStage = (key) => STAGES.find(s => s.key === key) || STAGES[0]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <h2 className="text-lg font-semibold">Deals</h2>
          <p className="text-xs text-gray-500">
            {deals.length} deals | Total: ${totalValue.toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b">
        <button
          onClick={() => setStageFilter('')}
          className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
            stageFilter === '' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => setStageFilter(s.key)}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
              stageFilter === s.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <TrendingUp className="w-8 h-8 mb-2" />
            <p className="text-sm">No deals yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {deals.map(deal => {
              const stage = getStage(deal.stage)
              return (
                <div key={deal.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{deal.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${stage.color}`}>
                          {stage.label}
                        </span>
                      </div>
                      {deal.Contact && (
                        <p className="text-xs text-gray-500 mt-0.5">{deal.Contact.name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {deal.value > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                            <DollarSign className="w-3 h-3" />
                            {deal.value.toLocaleString()} {deal.currency}
                          </span>
                        )}
                        {deal.probability > 0 && (
                          <span className="text-[10px] text-gray-400">{deal.probability}% likely</span>
                        )}
                        {deal.close_date && (
                          <span className="text-[10px] text-gray-400">
                            Close: {new Date(deal.close_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(deal.id)} className="p-1 hover:bg-red-50 rounded ml-2">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>

                  {/* Stage quick-actions */}
                  <div className="flex gap-1 mt-2 overflow-x-auto">
                    {STAGES.filter(s => s.key !== deal.stage).slice(0, 3).map(s => (
                      <button
                        key={s.key}
                        onClick={() => handleStageUpdate(deal, s.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border hover:opacity-80 ${s.color}`}
                      >
                        → {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Deal Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">New Deal</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newDeal.title}
                onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))}
                placeholder="Deal title *"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Value</label>
                  <input
                    type="number"
                    value={newDeal.value}
                    onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Currency</label>
                  <select
                    value={newDeal.currency}
                    onChange={e => setNewDeal(p => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="ETH">ETH</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stage</label>
                  <select
                    value={newDeal.stage}
                    onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Probability %</label>
                  <input
                    type="number"
                    value={newDeal.probability}
                    onChange={e => setNewDeal(p => ({ ...p, probability: e.target.value }))}
                    min={0} max={100}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Expected Close</label>
                <input
                  type="date"
                  value={newDeal.close_date}
                  onChange={e => setNewDeal(p => ({ ...p, close_date: e.target.value }))}
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
                disabled={!newDeal.title.trim()}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
