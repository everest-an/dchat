import { ContractService } from './ContractService'
import PaymentEscrowABI from '../abis/PaymentEscrow.json'

/**
 * TODO: Translate '支付托管服务'
 * TODO: Translate '管理加密货币支付和托管功能'
 */
export class PaymentEscrowService extends ContractService {
  constructor(provider, signer = null) {
    super('PaymentEscrow', PaymentEscrowABI.abi, provider, signer)
  }

  /**
   * TODO: Translate '创建托管'
   */
  async createEscrow(recipient, amount, timeoutDuration, description = '') {
    const amountWei = ContractService.parseEther(amount)
    return await this.send('createEscrow', recipient, timeoutDuration, description, {
      value: amountWei
    })
  }

  /**
   * TODO: Translate '释放托管'
   */
  async releaseEscrow(escrowId) {
    return await this.send('releaseEscrow', escrowId)
  }

  /**
   * TODO: Translate '退款'
   */
  async refund(escrowId) {
    return await this.send('refund', escrowId)
  }

  /**
   * TODO: Translate '提起争议'
   */
  async raiseDispute(escrowId, reason) {
    return await this.send('raiseDispute', escrowId, reason)
  }

  /**
   * TODO: Translate '解决争议'
   */
  async resolveDispute(escrowId, releaseToRecipient) {
    return await this.send('resolveDispute', escrowId, releaseToRecipient)
  }

  /**
   * TODO: Translate '获取托管信息'
   */
  async getEscrow(escrowId) {
    const result = await this.call('getEscrow', escrowId)
    if (result.success) {
      const escrow = result.data
      return {
        success: true,
        escrow: {
          escrowId: Number(escrow.escrowId),
          payer: escrow.payer,
          recipient: escrow.recipient,
          amount: ContractService.formatEther(escrow.amount),
          status: Number(escrow.status),
          createdAt: Number(escrow.createdAt),
          timeoutDuration: Number(escrow.timeoutDuration),
          releasedAt: Number(escrow.releasedAt),
          description: escrow.description,
          disputeReason: escrow.disputeReason
        }
      }
    }
    return result
  }

  /**
   * TODO: Translate '获取用户托管列表'
   */
  async getUserEscrows(address) {
    const result = await this.call('getUserEscrows', address)
    if (result.success) {
      const escrowIds = result.data
      const escrows = []

      for (const id of escrowIds) {
        const detailResult = await this.getEscrow(id)
        if (detailResult.success) {
          escrows.push(detailResult.escrow)
        }
      }

      return { success: true, escrows }
    }
    return result
  }

  /**
   * TODO: Translate '获取作为付款方的托管'
   */
  async getPayerEscrows(address) {
    return await this.call('getPayerEscrows', address)
  }

  /**
   * TODO: Translate '获取作为收款方的托管'
   */
  async getRecipientEscrows(address) {
    return await this.call('getRecipientEscrows', address)
  }

  /**
   * TODO: Translate '检查托管是否超时'
   */
  async isEscrowTimedOut(escrowId) {
    return await this.call('isEscrowTimedOut', escrowId)
  }

  /**
   * TODO: Translate '获取托管状态'
   */
  async getEscrowStatus(escrowId) {
    const result = await this.call('getEscrowStatus', escrowId)
    if (result.success) {
      return { success: true, status: Number(result.data) }
    }
    return result
  }

  // ========== TODO: Translate '事件监听' ==========

  /**
   * TODO: Translate '监听托管创建事件'
   */
  onEscrowCreated(callback) {
    this.on('EscrowCreated', (escrowId, payer, recipient, amount, event) => {
      callback({
        escrowId: Number(escrowId),
        payer,
        recipient,
        amount: ContractService.formatEther(amount),
        event
      })
    })
  }

  /**
   * TODO: Translate '监听托管释放事件'
   */
  onEscrowReleased(callback) {
    this.on('EscrowReleased', (escrowId, recipient, amount, event) => {
      callback({
        escrowId: Number(escrowId),
        recipient,
        amount: ContractService.formatEther(amount),
        event
      })
    })
  }

  /**
   * TODO: Translate '监听退款事件'
   */
  onRefunded(callback) {
    this.on('Refunded', (escrowId, payer, amount, event) => {
      callback({
        escrowId: Number(escrowId),
        payer,
        amount: ContractService.formatEther(amount),
        event
      })
    })
  }

  /**
   * TODO: Translate '监听争议提起事件'
   */
  onDisputeRaised(callback) {
    this.on('DisputeRaised', (escrowId, raisedBy, reason, event) => {
      callback({
        escrowId: Number(escrowId),
        raisedBy,
        reason,
        event
      })
    })
  }

  /**
   * TODO: Translate '监听争议解决事件'
   */
  onDisputeResolved(callback) {
    this.on('DisputeResolved', (escrowId, resolvedBy, releaseToRecipient, event) => {
      callback({
        escrowId: Number(escrowId),
        resolvedBy,
        releaseToRecipient,
        event
      })
    })
  }
}

// TODO: Translate '托管状态枚举'
export const EscrowStatus = {
  PENDING: 0,
  RELEASED: 1,
  REFUNDED: 2,
  DISPUTED: 3,
  RESOLVED: 4,
  CANCELLED: 5
}
