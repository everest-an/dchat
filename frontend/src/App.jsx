import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// 导入组件
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import { LanguageProvider } from './contexts/LanguageContext'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
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

