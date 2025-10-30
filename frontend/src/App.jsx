import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Importcomponents
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
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

  // fromlocalStoragerestoreloginstate - useAuthService
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
    
    // useAuthServiceclearsession
    authService.logout()
    
    console.log('👋 User logged out successfully')
  }

  // Loading display
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
