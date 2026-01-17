/**
 * Public Key Controller
 * 管理用户公钥的存储、检索和轮换
 */

const { getSupabase } = require('../config/supabase');

const publicKeyController = {
  /**
   * 注册用户公钥
   * POST /api/public-keys/register
   */
  async registerPublicKey(req, res) {
    try {
      const { userId, walletAddress, publicKey, keyFormat = 'PEM' } = req.body;
      
      // 验证必填字段
      if (!publicKey) {
        return res.status(400).json({
          success: false,
          error: 'Public key is required'
        });
      }
      
      if (!walletAddress && !userId) {
        return res.status(400).json({
          success: false,
          error: 'Either wallet address or user ID is required'
        });
      }
      
      // 验证密钥格式
      if (!publicKeyController.validateKeyFormat(publicKey, keyFormat)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid public key format'
        });
      }
      
      const supabase = getSupabase();
      const normalizedAddress = walletAddress?.toLowerCase();
      
      // 检查是否已存在当前密钥
      const { data: existingKey } = await supabase
        .from('public_keys')
        .select('id, public_key')
        .eq('wallet_address', normalizedAddress)
        .eq('is_current', true)
        .single();
      
      if (existingKey) {
        // 如果密钥相同，直接返回成功
        if (existingKey.public_key === publicKey) {
          return res.json({
            success: true,
            message: 'Public key already registered',
            data: { id: existingKey.id }
          });
        }
        
        // 否则执行密钥轮换
        return publicKeyController.rotateKey(req, res);
      }
      
      // 插入新密钥
      const { data, error } = await supabase
        .from('public_keys')
        .insert({
          user_id: userId || req.user_id,
          wallet_address: normalizedAddress,
          public_key: publicKey,
          key_format: keyFormat,
          is_current: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error registering public key:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to register public key'
        });
      }
      
      res.json({
        success: true,
        message: 'Public key registered successfully',
        data: {
          id: data.id,
          walletAddress: data.wallet_address,
          createdAt: data.created_at
        }
      });
    } catch (error) {
      console.error('Register public key error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 通过钱包地址获取公钥
   * GET /api/public-keys/address/:address
   */
  async getPublicKeyByAddress(req, res) {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const supabase = getSupabase();
      const normalizedAddress = address.toLowerCase();
      
      const { data, error } = await supabase
        .from('public_keys')
        .select('id, public_key, key_format, created_at, user_id')
        .eq('wallet_address', normalizedAddress)
        .eq('is_current', true)
        .single();
      
      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: 'Public key not found for this address'
        });
      }
      
      res.json({
        success: true,
        data: {
          publicKey: data.public_key,
          keyFormat: data.key_format,
          userId: data.user_id,
          createdAt: data.created_at,
          verified: true
        }
      });
    } catch (error) {
      console.error('Get public key by address error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 通过用户 ID 获取公钥
   * GET /api/public-keys/user/:userId
   */
  async getPublicKeyByUserId(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('public_keys')
        .select('id, public_key, key_format, wallet_address, created_at')
        .eq('user_id', userId)
        .eq('is_current', true)
        .single();
      
      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: 'Public key not found for this user'
        });
      }
      
      res.json({
        success: true,
        data: {
          publicKey: data.public_key,
          keyFormat: data.key_format,
          walletAddress: data.wallet_address,
          createdAt: data.created_at,
          verified: true
        }
      });
    } catch (error) {
      console.error('Get public key by user ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 轮换密钥
   * POST /api/public-keys/rotate
   */
  async rotateKey(req, res) {
    try {
      const { walletAddress, newPublicKey, keyFormat = 'PEM' } = req.body;
      const userId = req.user_id;
      
      if (!newPublicKey) {
        return res.status(400).json({
          success: false,
          error: 'New public key is required'
        });
      }
      
      if (!walletAddress && !userId) {
        return res.status(400).json({
          success: false,
          error: 'Either wallet address or user ID is required'
        });
      }
      
      // 验证密钥格式
      if (!publicKeyController.validateKeyFormat(newPublicKey, keyFormat)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid public key format'
        });
      }
      
      const supabase = getSupabase();
      const normalizedAddress = walletAddress?.toLowerCase();
      
      // 获取当前密钥
      const { data: currentKey, error: fetchError } = await supabase
        .from('public_keys')
        .select('*')
        .eq('wallet_address', normalizedAddress)
        .eq('is_current', true)
        .single();
      
      if (fetchError || !currentKey) {
        // 如果没有当前密钥，直接注册新密钥
        return publicKeyController.registerPublicKey(req, res);
      }
      
      // 将当前密钥移到历史记录
      const { error: historyError } = await supabase
        .from('public_key_history')
        .insert({
          user_id: currentKey.user_id,
          wallet_address: currentKey.wallet_address,
          public_key: currentKey.public_key,
          valid_from: currentKey.created_at,
          valid_until: new Date().toISOString()
        });
      
      if (historyError) {
        console.error('Error saving key history:', historyError);
      }
      
      // 更新当前密钥
      const { data: updatedKey, error: updateError } = await supabase
        .from('public_keys')
        .update({
          public_key: newPublicKey,
          key_format: keyFormat,
          rotated_at: new Date().toISOString()
        })
        .eq('id', currentKey.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error rotating key:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to rotate key'
        });
      }
      
      res.json({
        success: true,
        message: 'Key rotated successfully',
        data: {
          id: updatedKey.id,
          rotatedAt: updatedKey.rotated_at
        }
      });
    } catch (error) {
      console.error('Rotate key error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 获取密钥历史
   * GET /api/public-keys/history/:address
   */
  async getKeyHistory(req, res) {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const supabase = getSupabase();
      const normalizedAddress = address.toLowerCase();
      
      const { data, error } = await supabase
        .from('public_key_history')
        .select('id, public_key, valid_from, valid_until, created_at')
        .eq('wallet_address', normalizedAddress)
        .order('valid_until', { ascending: false });
      
      if (error) {
        console.error('Error fetching key history:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch key history'
        });
      }
      
      res.json({
        success: true,
        data: data || []
      });
    } catch (error) {
      console.error('Get key history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 批量获取公钥
   * POST /api/public-keys/batch
   */
  async getPublicKeysBatch(req, res) {
    try {
      const { addresses } = req.body;
      
      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Addresses array is required'
        });
      }
      
      if (addresses.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 addresses per request'
        });
      }
      
      const supabase = getSupabase();
      const normalizedAddresses = addresses.map(a => a.toLowerCase());
      
      const { data, error } = await supabase
        .from('public_keys')
        .select('wallet_address, public_key, key_format')
        .in('wallet_address', normalizedAddresses)
        .eq('is_current', true);
      
      if (error) {
        console.error('Error fetching batch public keys:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch public keys'
        });
      }
      
      // 转换为 map 格式
      const keyMap = {};
      (data || []).forEach(item => {
        keyMap[item.wallet_address] = {
          publicKey: item.public_key,
          keyFormat: item.key_format
        };
      });
      
      res.json({
        success: true,
        data: keyMap
      });
    } catch (error) {
      console.error('Get batch public keys error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * 验证密钥格式
   */
  validateKeyFormat(key, format) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    if (format === 'PEM') {
      // 检查 PEM 格式
      return key.includes('-----BEGIN') && key.includes('-----END');
    } else if (format === 'JWK') {
      // 检查 JWK 格式
      try {
        const parsed = JSON.parse(key);
        return parsed.kty && (parsed.n || parsed.x);
      } catch {
        return false;
      }
    } else if (format === 'BASE64') {
      // 检查 Base64 格式
      try {
        return Buffer.from(key, 'base64').toString('base64') === key;
      } catch {
        return false;
      }
    }
    
    return true; // 默认接受
  }
};

module.exports = publicKeyController;
