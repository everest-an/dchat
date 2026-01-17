import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyManagementService } from '../KeyManagementService'

describe('KeyManagementService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should return own public key when getting key for self', async () => {
    const myAddress = '0x1234567890123456789012345678901234567890'
    const myKeys = {
      publicKey: 'my-public-key',
      privateKey: 'my-private-key'
    }

    // 模拟当前登录用户
    localStorage.setItem('user', JSON.stringify({ walletAddress: myAddress }))
    // 模拟本地存储的密钥
    localStorage.setItem(`dchat_keys_${myAddress.toLowerCase()}`, JSON.stringify(myKeys))

    const publicKey = await KeyManagementService.getPublicKey(myAddress)
    
    expect(publicKey).toBe('my-public-key')
  })

  it('should fetch from registry for other users', async () => {
    const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const otherPublicKey = 'other-public-key'

    // 模拟注册表中的公钥
    localStorage.setItem(`dchat_public_registry_${otherAddress.toLowerCase()}`, otherPublicKey)

    const publicKey = await KeyManagementService.getPublicKey(otherAddress)
    
    expect(publicKey).toBe(otherPublicKey)
    // 验证是否缓存
    expect(localStorage.getItem(`dchat_pk_cache_${otherAddress.toLowerCase()}`)).toBe(otherPublicKey)
  })

  it('should return null if key not found', async () => {
    const unknownAddress = '0x0000000000000000000000000000000000000000'
    const publicKey = await KeyManagementService.getPublicKey(unknownAddress)
    expect(publicKey).toBeNull()
  })
})
