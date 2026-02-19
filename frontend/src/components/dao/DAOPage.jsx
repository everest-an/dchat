/**
 * DAOPage - Tab-based DAO governance page with Proposals, Voting, and Treasury.
 */
import { useState } from 'react'
import { ScrollText, Wallet } from 'lucide-react'
import ProposalList from './ProposalList'
import TreasuryPanel from './TreasuryPanel'

const TABS = [
  { key: 'proposals', label: 'Proposals', icon: ScrollText },
  { key: 'treasury', label: 'Treasury', icon: Wallet },
]

export default function DAOPage() {
  const [tab, setTab] = useState('proposals')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b bg-white">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                active ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'proposals' ? <ProposalList /> : <TreasuryPanel />}
      </div>
    </div>
  )
}
