import { Routes, Route, useLocation } from 'react-router-dom'
import BottomNavigation from './BottomNavigation'
import ChatList from './ChatList'
import ChatRoom from './ChatRoom'
import Moments from './Moments'
import Projects from './Projects'
import Profile from './Profile'

const MainApp = ({ user, onLogout }) => {
  const location = useLocation()
  
  // 判断是否显示底部导航栏（聊天室页面不显示）
  const showBottomNav = !location.pathname.startsWith('/chat/')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/profile" element={<Profile user={user} onLogout={onLogout} />} />
        </Routes>
      </div>

      {/* 底部导航栏 */}
      {showBottomNav && <BottomNavigation />}
    </div>
  )
}

export default MainApp

