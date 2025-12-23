import { useState, useCallback } from 'react'

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }) => {
    const id = toastId++
    
    setToasts((prev) => [
      ...prev,
      {
        id,
        title,
        description,
        variant,
        open: true,
      },
    ])

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }, [])

  const dismiss = useCallback((toastId) => {
    setToasts((prev) =>
      prev.map((t) =>
        t.id === toastId ? { ...t, open: false } : t
      )
    )

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    }, 200)
  }, [])

  // Convenience methods
  const success = useCallback((title, description) => {
    return toast({ title, description, variant: 'success' })
  }, [toast])

  const error = useCallback((title, description) => {
    return toast({ title, description, variant: 'destructive', duration: 5000 })
  }, [toast])

  const info = useCallback((title, description) => {
    return toast({ title, description, variant: 'default' })
  }, [toast])

  return {
    toasts,
    toast,
    success,
    error,
    info,
    dismiss,
  }
}
