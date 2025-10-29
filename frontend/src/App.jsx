import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// 导入组件
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import ResponsiveContainer from './components/ResponsiveContainer'
import { LanguageProvider } from './contexts/LanguageContext'
import { Web3Provider } from './contexts/Web3Context'
import { ToastProvider } from './contexts/ToastContext'
import { Toaster } from './components/ui/toaster'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从localStorage恢复登录状态
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setIsAuthenticated(true)
        setUser(userData)
      } catch (error) {
        console.error('Failed to restore user session:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
    // 保存用户信息到localStorage
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  // 加载中显示
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
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? 
                    <LoginScreen onLogin={handleLogin} /> : 
                    <Navigate to="/" replace />
                } 
              />
              <Route 
                path="/*" 
                element={
                  isAuthenticated ? 
                    <MainApp user={user} onLogout={handleLogout} /> : 
                    <Navigate to="/login" replace />
                } 
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
