import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// 导入组件
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import { LanguageProvider } from './contexts/LanguageContext'

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-background">
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
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App

