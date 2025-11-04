/**
 * Web3 Authentication Service
 * 处理基于签名的 Web3 认证流程
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dchat.pro/api';

class Web3AuthService {
  /**
   * 获取登录 nonce
   * @param {string} address - 钱包地址
   * @returns {Promise<{nonce: string, timestamp: number, message: string}>}
   */
  async getNonce(address) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/nonce?address=${address}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get nonce');
      }
      
      return {
        nonce: data.nonce,
        timestamp: data.timestamp,
        message: data.message
      };
    } catch (error) {
      console.error('Get nonce error:', error);
      throw error;
    }
  }

  /**
   * 请求用户签名消息
   * @param {string} address - 钱包地址
   * @param {string} message - 要签名的消息
   * @returns {Promise<string>} 签名
   */
  async signMessage(address, message) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // 使用 personal_sign 方法（MetaMask 推荐）
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      return signature;
    } catch (error) {
      console.error('Sign message error:', error);
      throw error;
    }
  }

  /**
   * 验证签名并登录
   * @param {string} address - 钱包地址
   * @param {string} signature - 签名
   * @returns {Promise<{token: string, user: object}>}
   */
  async verifyAndLogin(address, signature) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet_address: address,
          signature: signature
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // 保存 token 到 localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return {
        token: data.token,
        user: data.user
      };
    } catch (error) {
      console.error('Verify and login error:', error);
      throw error;
    }
  }

  /**
   * 完整的 Web3 登录流程
   * @param {string} address - 钱包地址
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(address) {
    try {
      // 1. 获取 nonce
      const { message } = await this.getNonce(address);

      // 2. 请求用户签名
      const signature = await this.signMessage(address, message);

      // 3. 验证签名并登录
      const result = await this.verifyAndLogin(address, signature);

      return result;
    } catch (error) {
      console.error('Web3 login error:', error);
      throw error;
    }
  }

  /**
   * 注册用户公钥（用于端到端加密）
   * @param {string} publicKey - RSA 公钥
   * @returns {Promise<boolean>}
   */
  async registerPublicKey(publicKey) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/register-public-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ public_key: publicKey })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to register public key');
      }

      return true;
    } catch (error) {
      console.error('Register public key error:', error);
      throw error;
    }
  }

  /**
   * 获取用户公钥
   * @param {string} address - 钱包地址
   * @returns {Promise<string>} 公钥
   */
  async getPublicKey(address) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/public-key/${address}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get public key');
      }

      return data.public_key;
    } catch (error) {
      console.error('Get public key error:', error);
      throw error;
    }
  }

  /**
   * 验证 token 是否有效
   * @returns {Promise<{user: object}>}
   */
  async verifyToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        // Token 无效，清除本地存储
        this.logout();
        throw new Error(data.error || 'Token invalid');
      }

      return { user: data.user };
    } catch (error) {
      console.error('Verify token error:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
  }

  /**
   * 获取当前用户
   * @returns {object|null}
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 获取当前 token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * 检查是否已登录
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new Web3AuthService();
