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
import SubscriptionPage from './SubscriptionPage'
import EncryptionSettings from './EncryptionSettings'

const MainApp = ({ user, onLogout }) => {
  const location = useLocation()
  
  // 判断是否显示底部导航栏（聊天室和群组页面不显示）
  const showBottomNav = !location.pathname.startsWith('/chat/') && !location.pathname.startsWith('/group/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部通知栏 */}
      {showBottomNav && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <h1 className="text-lg font-semibold">DChat</h1>
          <NotificationCenter />
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/group/:id" element={<GroupChat />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/matching" element={<OpportunityMatching />} />
          <Route path="/subscriptions" element={<SubscriptionManager />} />
          <Route path="/payments" element={<PaymentManager />} />
          <Route path="/profile" element={<Profile user={user} onLogout={onLogout} />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/encryption" element={<EncryptionSettings />} />
        </Routes>
      </div>

      {/* 底部导航栏 */}
      {showBottomNav && <BottomNavigation />}
    </div>
  )
}

export default MainApp

