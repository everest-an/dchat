import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ContactImport from '../ContactImport'
import { ToastProvider } from '../../contexts/ToastContext'
import { Web3Provider } from '../../contexts/Web3Context'
import { BrowserRouter } from 'react-router-dom'

// Mock 依赖
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }) => <div>{children}</div>
}))

vi.mock('../../contexts/Web3Context', () => ({
  useWeb3: () => ({ account: '0x123' }),
  Web3Provider: ({ children }) => <div>{children}</div>
}))

// Mock fetch
global.fetch = vi.fn()

describe('ContactImport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Web3Provider>
          <ToastProvider>
            <ContactImport />
          </ToastProvider>
        </Web3Provider>
      </BrowserRouter>
    )
  }

  it('renders upload button', () => {
    renderComponent()
    expect(screen.getByText(/Select Contact File/i)).toBeInTheDocument()
    expect(screen.getByText(/Upload Contacts/i)).toBeInTheDocument()
  })

  it('handles file upload and displays matches', async () => {
    // Mock API response
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        matches: [
          { id: 1, name: 'Test User', wallet_address: '0xabc', avatar: { emoji: '😀' } }
        ]
      })
    })

    renderComponent()

    // 创建模拟文件
    const file = new File(['BEGIN:VCARD\nFN:Test User\nTEL:1234567890\nEND:VCARD'], 'contacts.vcf', { type: 'text/vcard' })
    const input = screen.getByLabelText(/Select Contact File/i)

    // 触发上传
    fireEvent.change(input, { target: { files: [file] } })

    // 等待结果显示
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText(/Found Contacts/i)).toBeInTheDocument()
    })
  })

  it('handles empty matches', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        matches: []
      })
    })

    renderComponent()

    const file = new File([''], 'contacts.csv', { type: 'text/csv' })
    const input = screen.getByLabelText(/Select Contact File/i)

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/No registered users found/i)).toBeInTheDocument()
    })
  })
})
