/**
 * useUIStore unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import useUIStore from '../useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isSidebarOpen: true,
      isGlobalLoading: false,
      globalLoadingMessage: '',
      activeModal: null,
      modalProps: {},
    })
  })

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      expect(useUIStore.getState().isSidebarOpen).toBe(true)

      useUIStore.getState().toggleSidebar()

      expect(useUIStore.getState().isSidebarOpen).toBe(false)
    })

    it('should toggle sidebar from closed to open', () => {
      useUIStore.setState({ isSidebarOpen: false })

      useUIStore.getState().toggleSidebar()

      expect(useUIStore.getState().isSidebarOpen).toBe(true)
    })
  })

  describe('setGlobalLoading', () => {
    it('should set loading state with message', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading data...')

      const state = useUIStore.getState()
      expect(state.isGlobalLoading).toBe(true)
      expect(state.globalLoadingMessage).toBe('Loading data...')
    })

    it('should clear loading state', () => {
      useUIStore.setState({ isGlobalLoading: true, globalLoadingMessage: 'Loading...' })

      useUIStore.getState().setGlobalLoading(false)

      const state = useUIStore.getState()
      expect(state.isGlobalLoading).toBe(false)
      expect(state.globalLoadingMessage).toBe('')
    })
  })

  describe('modal management', () => {
    it('should open a modal with props', () => {
      useUIStore.getState().openModal('payment', { amount: 100 })

      const state = useUIStore.getState()
      expect(state.activeModal).toBe('payment')
      expect(state.modalProps).toEqual({ amount: 100 })
    })

    it('should close a modal', () => {
      useUIStore.setState({ activeModal: 'payment', modalProps: { amount: 100 } })

      useUIStore.getState().closeModal()

      const state = useUIStore.getState()
      expect(state.activeModal).toBeNull()
      expect(state.modalProps).toEqual({})
    })

    it('should open modal with default empty props', () => {
      useUIStore.getState().openModal('settings')

      expect(useUIStore.getState().modalProps).toEqual({})
    })
  })

  describe('setIsMobile', () => {
    it('should update mobile detection state', () => {
      useUIStore.getState().setIsMobile(true)
      expect(useUIStore.getState().isMobile).toBe(true)

      useUIStore.getState().setIsMobile(false)
      expect(useUIStore.getState().isMobile).toBe(false)
    })
  })
})
