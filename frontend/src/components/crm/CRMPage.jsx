/**
 * CRMPage - Tab-based CRM page with Contacts and Deals.
 */
import { useState } from 'react'
import { Users, TrendingUp } from 'lucide-react'
import ContactManager from './ContactManager'
import DealBoard from './DealBoard'

const TABS = [
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'deals', label: 'Deals', icon: TrendingUp },
]

export default function CRMPage() {
  const [tab, setTab] = useState('contacts')

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
        {tab === 'contacts' ? <ContactManager /> : <DealBoard />}
      </div>
    </div>
  )
}
