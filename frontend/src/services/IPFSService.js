import { create } from 'ipfs-http-client'

/**
 * IPFS TODO: Translate '服务'
 * TODO: Translate '管理文件上传和检索'
 */
export class IPFSService {
  constructor() {
    // TODO: Translate '使用公共' IPFS TODO: Translate '网关'
    this.client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https'
    })
    
    this.gatewayUrl = 'https://ipfs.io/ipfs/'
  }

  /**
   * TODO: Translate '上传文件到' IPFS
   */
  async uploadFile(file, onProgress) {
    try {
      const added = await this.client.add(file, {
        progress: (bytes) => {
          if (onProgress) {
            const progress = (bytes / file.size) * 100
            onProgress(Math.min(progress, 100))
          }
        }
      })

      return {
        success: true,
        hash: added.path,
        url: this.getFileUrl(added.path),
        size: added.size
      }
    } catch (err) {
      console.error('IPFS upload error:', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  /**
   * TODO: Translate '上传' JSON TODO: Translate '数据'
   */
  async uploadJSON(data) {
    try {
      const json = JSON.stringify(data)
      const added = await this.client.add(json)

      return {
        success: true,
        hash: added.path,
        url: this.getFileUrl(added.path)
      }
    } catch (err) {
      console.error('IPFS JSON upload error:', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  /**
   * TODO: Translate '获取文件' URL
   */
  getFileUrl(hash) {
    return `${this.gatewayUrl}${hash}`
  }

  /**
   * TODO: Translate '检查文件类型'
   */
  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase()
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const videoExts = ['mp4', 'webm', 'ogg', 'mov']
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a']
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'md']
    
    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (audioExts.includes(ext)) return 'audio'
    if (docExts.includes(ext)) return 'document'
    
    return 'file'
  }

  /**
   * TODO: Translate '格式化文件大小'
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// TODO: Translate '创建单例'
export const ipfsService = new IPFSService()
