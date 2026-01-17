import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QRCodeDialog from '../QRCodeDialog'
import ScanQRDialog from '../ScanQRDialog'
import { ToastProvider } from '../../contexts/ToastContext'
import { BrowserRouter } from 'react-router-dom'

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }) => <canvas data-testid="qr-canvas" data-value={value} />
}))

// Mock jsQR
vi.mock('jsqr', () => ({
  default: vi.fn()
}))

// Mock UserProfileService
vi.mock('../../services/UserProfileService', () => ({
  UserProfileService: {
    getProfile: () => ({ username: 'TestUser', bio: 'Test Bio' }),
    getDisplayName: () => 'TestUser',
    getDisplayAvatar: () => '👤',
    saveProfile: vi.fn(),
    getDefaultUsername: () => 'User',
    getDefaultAvatar: () => '👤'
  }
}))

describe('QRCode Components', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'

  describe('QRCodeDialog', () => {
    it('renders QR code when open', () => {
      render(
        <ToastProvider>
          <QRCodeDialog isOpen={true} onClose={() => {}} address={mockAddress} />
        </ToastProvider>
      )
      
      expect(screen.getByText('My QR Code')).toBeInTheDocument()
      expect(screen.getByTestId('qr-canvas')).toBeInTheDocument()
      expect(screen.getByText(mockAddress)).toBeInTheDocument()
    })

    it('generates correct QR data', () => {
      render(
        <ToastProvider>
          <QRCodeDialog isOpen={true} onClose={() => {}} address={mockAddress} />
        </ToastProvider>
      )
      
      const canvas = screen.getByTestId('qr-canvas')
      const data = JSON.parse(canvas.getAttribute('data-value'))
      
      expect(data).toEqual({
        type: 'dchat_contact',
        address: mockAddress,
        username: 'TestUser',
        avatar: '👤'
      })
    })
  })

  describe('ScanQRDialog', () => {
    it('renders scan options when open', () => {
      render(
        <BrowserRouter>
          <ToastProvider>
            <ScanQRDialog isOpen={true} onClose={() => {}} />
          </ToastProvider>
        </BrowserRouter>
      )
      
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument()
      expect(screen.getByText('Start Camera')).toBeInTheDocument()
      expect(screen.getByText('Upload QR Code Image')).toBeInTheDocument()
    })
  })
})
