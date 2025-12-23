import { createContext, useContext } from 'react'
import { useToast as useToastHook } from '../hooks/useToast'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const toast = useToastHook()

  return (
    <ToastContext.Provider value={toast}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
