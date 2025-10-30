import { ethers } from 'ethers'
import { getContractAddress } from '../config/web3'

/**
 * TODO: Translate '智能合约服务基类'
 * TODO: Translate '提供与智能合约交互的通用方法'
 */
export class ContractService {
  constructor(contractName, abi, provider, signer = null) {
    this.contractName = contractName
    this.abi = abi
    this.provider = provider
    this.signer = signer
    this.address = getContractAddress(contractName)
    
    // TODO: Translate '创建合约实例'
    if (!this.address) {
      throw new Error(`Contract address not found for ${contractName}`)
    }
    
    // TODO: Translate '如果有' signer,use signer(TODO: Translate '可写'),否则use provider(TODO: Translate '只读')
    this.contract = new ethers.Contract(
      this.address,
      abi,
      signer || provider
    )
  }

  /**
   * TODO: Translate '更新' signer (TODO: Translate '用于切换账户')
   */
  updateSigner(signer) {
    this.signer = signer
    this.contract = new ethers.Contract(this.address, this.abi, signer)
  }

  /**
   * TODO: Translate '调用只读方法'
   */
  async call(method, ...args) {
    try {
      const result = await this.contract[method](...args)
      return { success: true, data: result }
    } catch (error) {
      console.error(`Error calling ${method}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * TODO: Translate '发送交易'
   */
  async send(method, ...args) {
    if (!this.signer) {
      return { success: false, error: '请先连接钱包' }
    }

    try {
      // TODO: Translate '估算' gas
      const gasEstimate = await this.contract[method].estimateGas(...args)
      const gasLimit = gasEstimate * 120n / 100n // TODO: Translate '增加' 20% TODO: Translate '作为缓冲'

      // TODO: Translate '发送交易'
      const tx = await this.contract[method](...args, { gasLimit })
      
      // TODO: Translate '等待交易确认'
      const receipt = await tx.wait()
      
      return {
        success: true,
        transaction: tx,
        receipt: receipt,
        transactionHash: receipt.hash
      }
    } catch (error) {
      console.error(`Error sending transaction ${method}:`, error)
      
      // TODO: Translate '解析错误信息'
      let errorMessage = error.message
      if (error.reason) {
        errorMessage = error.reason
      } else if (error.data?.message) {
        errorMessage = error.data.message
      }
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * TODO: Translate '监听事件'
   */
  on(eventName, callback) {
    this.contract.on(eventName, callback)
  }

  /**
   * TODO: Translate '取消监听事件'
   */
  off(eventName, callback) {
    this.contract.off(eventName, callback)
  }

  /**
   * TODO: Translate '查询历史事件'
   */
  async queryFilter(eventName, fromBlock = 0, toBlock = 'latest') {
    try {
      const filter = this.contract.filters[eventName]()
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock)
      return { success: true, events }
    } catch (error) {
      console.error(`Error querying events ${eventName}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * TODO: Translate '获取合约地址'
   */
  getAddress() {
    return this.address
  }

  /**
   * TODO: Translate '格式化以太币金额'
   */
  static formatEther(value) {
    return ethers.utils.formatEther(value)
  }

  /**
   * TODO: Translate '解析以太币金额'
   */
  static parseEther(value) {
    return ethers.utils.parseEther(value.toString())
  }

  /**
   * TODO: Translate '格式化' Token TODO: Translate '金额'
   */
  static formatUnits(value, decimals = 18) {
    return ethers.utils.formatUnits(value, decimals)
  }

  /**
   * TODO: Translate '解析' Token TODO: Translate '金额'
   */
  static parseUnits(value, decimals = 18) {
    return ethers.utils.parseUnits(value.toString(), decimals)
  }
}
