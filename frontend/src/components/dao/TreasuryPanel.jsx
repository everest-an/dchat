/**
 * TreasuryPanel - View DAO treasury transactions.
 */
import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react'
import DAOService from '../../services/DAOService'

const TYPE_ICONS = {
  inflow: ArrowDownLeft,
  outflow: ArrowUpRight,
}

const TYPE_STYLES = {
  inflow: 'text-green-600 bg-green-50',
  outflow: 'text-red-600 bg-red-50',
}

export default function TreasuryPanel() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTreasury() }, [])

  const loadTreasury = async () => {
    try {
      const res = await DAOService.getTreasury()
      setTransactions(Array.isArray(res) ? res : res.items || [])
    } catch (err) {
      console.error('Failed to load treasury:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white">
        <h2 className="text-lg font-semibold">Treasury</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Wallet className="w-8 h-8 mb-2" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map(tx => {
              const Icon = TYPE_ICONS[tx.type] || ArrowUpRight
              const style = TYPE_STYLES[tx.type] || TYPE_STYLES.outflow
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${style}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {tx.type === 'inflow' ? '+' : '-'}{tx.amount} {tx.currency || 'ETH'}
                    </div>
                    {tx.recipient && (
                      <p className="text-xs text-gray-500 truncate">
                        To: {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                      </p>
                    )}
                    {tx.tx_hash && (
                      <p className="text-[10px] text-gray-400 truncate">
                        Tx: {tx.tx_hash.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
