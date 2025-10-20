/**
 * IPFS Service for Dchat
 * Uses Pinata as IPFS gateway for storing encrypted messages
 */

class IPFSService {
  constructor() {
    // Pinata API configuration
    this.pinataApiKey = process.env.REACT_APP_PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.REACT_APP_PINATA_SECRET_KEY || '';
    this.pinataGateway = 'https://gateway.pinata.cloud/ipfs/';
    this.pinataApiUrl = 'https://api.pinata.cloud';
  }

  /**
   * Upload encrypted message to IPFS
   * @param {Object} encryptedData - Encrypted message package
   * @returns {Promise<string>} IPFS hash (CID)
   */
  async uploadEncryptedMessage(encryptedData) {
    try {
      // For demo purposes, use a mock implementation
      // In production, this would upload to Pinata
      if (!this.pinataApiKey) {
        return this.mockUpload(encryptedData);
      }

      const data = JSON.stringify({
        pinataContent: encryptedData,
        pinataMetadata: {
          name: `dchat-message-${Date.now()}.json`,
        },
      });

      const response = await fetch(`${this.pinataApiUrl}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      // Fallback to mock for demo
      return this.mockUpload(encryptedData);
    }
  }

  /**
   * Retrieve encrypted message from IPFS
   * @param {string} ipfsHash - IPFS CID
   * @returns {Promise<Object>} Encrypted message package
   */
  async retrieveEncryptedMessage(ipfsHash) {
    try {
      // Check if it's a mock hash
      if (ipfsHash.startsWith('mock_')) {
        return this.mockRetrieve(ipfsHash);
      }

      const response = await fetch(`${this.pinataGateway}${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error('Failed to retrieve from IPFS');
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrieving from IPFS:', error);
      // Fallback to mock for demo
      return this.mockRetrieve(ipfsHash);
    }
  }

  /**
   * Mock upload for demo purposes (stores in localStorage)
   * @param {Object} data
   * @returns {string} Mock IPFS hash
   */
  mockUpload(data) {
    const mockHash = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in localStorage for demo
    const storage = JSON.parse(localStorage.getItem('dchat_ipfs_storage') || '{}');
    storage[mockHash] = data;
    localStorage.setItem('dchat_ipfs_storage', JSON.stringify(storage));
    
    console.log(`📦 Mock IPFS Upload: ${mockHash}`);
    return mockHash;
  }

  /**
   * Mock retrieve for demo purposes
   * @param {string} hash
   * @returns {Object} Stored data
   */
  mockRetrieve(hash) {
    const storage = JSON.parse(localStorage.getItem('dchat_ipfs_storage') || '{}');
    const data = storage[hash];
    
    if (!data) {
      throw new Error('Mock IPFS data not found');
    }
    
    console.log(`📥 Mock IPFS Retrieve: ${hash}`);
    return data;
  }

  /**
   * Upload file to IPFS
   * @param {File} file
   * @returns {Promise<string>} IPFS hash
   */
  async uploadFile(file) {
    try {
      if (!this.pinataApiKey) {
        // Mock file upload
        return `mock_file_${Date.now()}_${file.name}`;
      }

      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: file.name,
      });
      formData.append('pinataMetadata', metadata);

      const response = await fetch(`${this.pinataApiUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to IPFS');
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      return `mock_file_${Date.now()}_${file.name}`;
    }
  }

  /**
   * Get IPFS gateway URL
   * @param {string} ipfsHash
   * @returns {string} Full gateway URL
   */
  getGatewayUrl(ipfsHash) {
    if (ipfsHash.startsWith('mock_')) {
      return `#mock-ipfs://${ipfsHash}`;
    }
    return `${this.pinataGateway}${ipfsHash}`;
  }

  /**
   * Pin existing IPFS hash
   * @param {string} ipfsHash
   * @returns {Promise<boolean>}
   */
  async pinHash(ipfsHash) {
    try {
      if (!this.pinataApiKey) {
        return true; // Mock success
      }

      const data = JSON.stringify({
        hashToPin: ipfsHash,
      });

      const response = await fetch(`${this.pinataApiUrl}/pinning/pinByHash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: data,
      });

      return response.ok;
    } catch (error) {
      console.error('Error pinning hash:', error);
      return false;
    }
  }
}

export default new IPFSService();

