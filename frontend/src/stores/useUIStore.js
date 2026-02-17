/**
 * UI Store (Zustand)
 * 
 * Global UI state management for modals, sidebars, loading states, etc.
 */
import { create } from 'zustand'

const useUIStore = create((set) => ({
  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  // Global loading overlay
  isGlobalLoading: false,
  globalLoadingMessage: '',
  setGlobalLoading: (loading, message = '') =>
    set({ isGlobalLoading: loading, globalLoadingMessage: message }),

  // Active modal
  activeModal: null,
  modalProps: {},
  openModal: (name, props = {}) => set({ activeModal: name, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),

  // Mobile detection
  isMobile: window.innerWidth < 768,
  setIsMobile: (isMobile) => set({ isMobile }),
}))

export default useUIStore
