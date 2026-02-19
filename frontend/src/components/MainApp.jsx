import { Routes, Route, useLocation } from 'react-router-dom'
import BottomNavigation from './BottomNavigation'
import ChatList from './ChatList'
import ChatRoom from './ChatRoom'

import Moments from './Moments'
import Projects from './Projects'
import Profile from './Profile'
import Portfolio from './Portfolio'
import OpportunityMatching from './OpportunityMatching'
import SubscriptionManager from './SubscriptionManager'
import PaymentManager from './PaymentManager'
import NotificationCenter from './NotificationCenter'
import GroupChat from './GroupChat'
import GroupSettingsPanel from './group/GroupSettingsPanel'
import SubscriptionPage from './SubscriptionPage'
import EncryptionSettings from './EncryptionSettings'
import TicketList from './support/TicketList'
import TaskCalendarPage from './task/TaskCalendarPage'
import DAOPage from './dao/DAOPage'
import CRMPage from './crm/CRMPage'
import BlockchainExplorer from './blockchain/BlockchainExplorer'
import BotManager from './bot/BotManager'

const MainApp = ({ user, onLogout }) => {
  const location = useLocation()

  // Check whether to show bottom navigation（Not shown on chat room and group pages）
  const showBottomNav = !location.pathname.startsWith('/chat/') && !location.pathname.startsWith('/group/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top notification bar */}
      {showBottomNav && (
        <div className="flex items-center justify-end px-4 py-2 border-b bg-white">
          <NotificationCenter />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatList user={user} />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/group/:id" element={<GroupChat />} />
          <Route path="/group/:id/settings" element={<GroupSettingsPanel />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/portfolio" element={<Portfolio user={user} />} />
          <Route path="/matching" element={<OpportunityMatching user={user} />} />
          <Route path="/subscriptions" element={<SubscriptionManager user={user} />} />
          <Route path="/payments" element={<PaymentManager user={user} />} />
          <Route path="/profile" element={<Profile user={user} onLogout={onLogout} />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/encryption" element={<EncryptionSettings />} />
          <Route path="/support" element={<TicketList />} />
          <Route path="/tasks" element={<TaskCalendarPage />} />
          <Route path="/dao" element={<DAOPage />} />
          <Route path="/crm" element={<CRMPage />} />
          <Route path="/explorer" element={<BlockchainExplorer />} />
          <Route path="/bots" element={<BotManager />} />
        </Routes>
      </div>

      {/* Bottom navigation bar */}
      {showBottomNav && <BottomNavigation />}
    </div>
  )
}

export default MainApp

