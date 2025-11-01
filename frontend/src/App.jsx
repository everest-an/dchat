import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Import components
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import LandingPage from './components/LandingPage'
import ResponsiveContainer from './components/ResponsiveContainer'
import { LanguageProvider } from './contexts/LanguageContext'
import { Web3Provider } from './contexts/Web3Context'
import { ToastProvider } from './contexts/ToastContext'
import { Toaster } from './components/ui/toaster'
import authService from './services/AuthService'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从 localStorage 恢复登录状态 - 使用 AuthService
  useEffect(() => {
    // Try to restore session from AuthService
    let restoredUser = authService.restoreSession()
    
    // If no AuthService session, check for old localStorage format and migrate
    if (!restoredUser) {
      const oldUser = localStorage.getItem('user')
      const oldToken = localStorage.getItem('authToken')
      
      if (oldUser && oldToken) {
        try {
          const userData = JSON.parse(oldUser)
          console.log('🔄 Migrating old session to AuthService format')
          
          // Save to new format
          authService.saveSession(userData, undefined, true)
          
          // Clean up old format
          localStorage.removeItem('user')
          localStorage.removeItem('authToken')
          
          restoredUser = userData
          console.log('✅ Old session migrated successfully')
        } catch (error) {
          console.error('❌ Failed to migrate old session:', error)
        }
      }
    }
    
    if (restoredUser) {
      console.log('✅ Session restored successfully')
      setIsAuthenticated(true)
      setUser(restoredUser)
    } else {
      console.log('ℹ️ No valid session found')
    }
    
    setIsLoading(false)
    
    // Setup activity tracking and auto-refresh
    authService.setupActivityTracking()
    authService.setupAutoRefresh()
  }, [])

  const handleLogin = (userData, rememberMe = true) => {
    setIsAuthenticated(true)
    setUser(userData)
    
    // Use AuthService to save session (default 30 days)
    authService.saveSession(userData, undefined, rememberMe)
    
    console.log('✅ User logged in successfully', {
      username: userData.username || userData.email,
      loginMethod: userData.loginMethod,
      rememberMe
    })
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    
    // 使用 AuthService 清除会话
    authService.logout()
    
    console.log('👋 User logged out successfully')
  }

  // Loading 显示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Web3Provider>
      <ToastProvider>
        <LanguageProvider>
        <Router>
          <ResponsiveContainer>
            <Routes>
              {/* 首页路由 - 类似 Telegram/WeChat 的设计 */}
              <Route 
                path="/" 
                element={
                  isAuthenticated ? 
                    // 已登录用户：直接进入聊天主界面
                    <MainApp user={user} onLogout={handleLogout} /> : 
                    // 未登录用户：显示产品介绍页
                    <LandingPage />
                } 
              />
              
              {/* 登录页面路由 */}
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? 
                    <LoginScreen onLogin={handleLogin} /> : 
                    // 已登录用户访问登录页：重定向到首页（聊天界面）
                    <Navigate to="/" replace />
                } 
              />
              
              {/* 主应用路由（聊天、群组、个人页面等） */}
              <Route 
                path="/app/*" 
                element={
                  isAuthenticated ? 
                    <MainApp user={user} onLogout={handleLogout} /> : 
                    // 未登录用户：重定向到登录页
                    <Navigate to="/login" replace />
                } 
              />
              
              {/* 404 处理 - 重定向到首页 */}
              <Route 
                path="*" 
                element={<Navigate to="/" replace />} 
              />
            </Routes>
          </ResponsiveContainer>
          <Toaster />
        </Router>
        </LanguageProvider>
      </ToastProvider>
    </Web3Provider>
  )
}

export default App
