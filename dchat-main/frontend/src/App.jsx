import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Import components
import ErrorBoundary from './components/ErrorBoundary'
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import LandingPage from './components/LandingPage'
import ResponsiveContainer from './components/ResponsiveContainer'
import TermsOfService from './components/TermsOfService'
import PrivacyPolicy from './components/PrivacyPolicy'
import FeaturesPage from './components/FeaturesPage'
import PricingPage from './components/PricingPage'
import ContactPage from './components/ContactPage'
import AboutPage from './components/AboutPage'
import LinkedInCallback from './components/LinkedInCallback'
import { LanguageProvider } from './contexts/LanguageContext'
import { Web3Provider } from './contexts/Web3Context'
import WagmiWeb3Provider from './components/Web3Provider'
import { ToastProvider } from './contexts/ToastContext'
import { Toaster } from './components/ui/toaster'
import authService from './services/AuthService'
import pushNotificationService from './services/PushNotificationService'

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

  const handleLogin = async (userData, token, rememberMe = true) => {
    setIsAuthenticated(true)
    setUser(userData)
    
    // Use AuthService to save session (default 30 days)
    authService.saveSession(userData, token, rememberMe)
    
    // Initialize push notifications
    try {
      const initialized = await pushNotificationService.initialize()
      if (initialized) {
        console.log('✅ Push notifications initialized')
      }
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error)
    }
    
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
    <ErrorBoundary>
      <WagmiWeb3Provider>
      <Web3Provider>
        <ToastProvider>
          <LanguageProvider>
          <Router>
          <ResponsiveContainer>
            <Routes>
              {/* Landing Page - for unauthenticated users */}
              <Route 
                path="/" 
                element={
                  !isAuthenticated ? 
                    <LandingPage /> :
                    <Navigate to="/app" replace />
                } 
              />
              
              {/* Login Page */}
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? 
                    <LoginScreen onLogin={handleLogin} /> : 
                    <Navigate to="/app" replace />
                } 
              />
              
              {/* Public Pages */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
              
              {/* Main App - all authenticated routes */}
              <Route 
                path="/app/*" 
                element={
                  isAuthenticated ? 
                    <MainApp user={user} onLogout={handleLogout} /> : 
                    <Navigate to="/login" replace />
                } 
              />
              
              {/* Catch all - redirect based on auth status */}
              <Route 
                path="*" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/app" replace /> :
                    <Navigate to="/" replace />
                } 
              />
            </Routes>
          </ResponsiveContainer>
          <Toaster />
          </Router>
          </LanguageProvider>
        </ToastProvider>
      </Web3Provider>
      </WagmiWeb3Provider>
    </ErrorBoundary>
  )
}

export default App
