import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyManagementService } from '../KeyManagementService'

/**
 * Create a real Map-backed localStorage mock so setItem/getItem work.
 */
function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }
}

describe('KeyManagementService', () => {
  beforeEach(() => {
    global.localStorage = createLocalStorageMock()
    vi.clearAllMocks()
    // Mock fetch to return 404 so backend calls don't interfere.
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
  })

  it('should return own public key when getting key for self', async () => {
    const myAddress = '0x1234567890123456789012345678901234567890'
    const myKeys = {
      publicKey: 'my-public-key',
      privateKey: 'my-private-key',
    }

    localStorage.setItem('user', JSON.stringify({ walletAddress: myAddress }))
    localStorage.setItem(
      `dchat_keys_${myAddress.toLowerCase()}`,
      JSON.stringify(myKeys)
    )

    const publicKey = await KeyManagementService.getPublicKey(myAddress)
    expect(publicKey).toBe('my-public-key')
  })

  it('should fetch from local registry for other users when backend unavailable', async () => {
    const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const otherPublicKey = 'other-public-key'

    localStorage.setItem(
      `dchat_public_registry_${otherAddress.toLowerCase()}`,
      otherPublicKey
    )

    const publicKey = await KeyManagementService.getPublicKey(otherAddress)
    expect(publicKey).toBe(otherPublicKey)
  })

  it('should return null if key not found anywhere', async () => {
    const unknownAddress = '0x0000000000000000000000000000000000000000'
    const publicKey = await KeyManagementService.getPublicKey(unknownAddress)
    expect(publicKey).toBeNull()
  })

  it('should return null for getKeys when no keys stored', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const keys = KeyManagementService.getKeys(address)
    expect(keys).toBeNull()
  })
})
