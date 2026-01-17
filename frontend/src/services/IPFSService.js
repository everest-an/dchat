/**
 * IPFS Service for Dchat
 * Uses Pinata as IPFS gateway for storing encrypted messages
 */

class IPFSService {
    constructor() {
        // Pinata API configuration
        // Support both JWT and API Key authentication
        this.pinataJWT = import.meta.env.VITE_PINATA_JWT || '';
        this.pinataApiKey = import.meta.env.VITE_PINATA_API_KEY || '';
        this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY || '';
        this.pinataGateway = import.meta.env.VITE_PINATA_GATEWAY || 'https://green-jittery-gecko-888.mypinata.cloud/ipfs/';
        this.pinataApiUrl = 'https://api.pinata.cloud';

        console.log('🔧 Pinata Configuration:', {
            hasJWT: !!this.pinataJWT,
            hasApiKey: !!this.pinataApiKey,
            gateway: this.pinataGateway
        });
    }

    /**
     * Get authorization headers for Pinata API
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        if (this.pinataJWT) {
            return {
                'Authorization': `Bearer ${this.pinataJWT}`,
            };
        } else if (this.pinataApiKey && this.pinataSecretKey) {
            return {
                'pinata_api_key': this.pinataApiKey,
                'pinata_secret_api_key': this.pinataSecretKey,
            };
        }
        return {};
    }

    /**
     * Check if Pinata is configured
     * @returns {boolean}
     */
    isPinataConfigured() {
        return !!(this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey));
    }

    /**
     * Upload encrypted message to IPFS
     * @param {Object} encryptedData - Encrypted message package
     * @returns {Promise<string>} IPFS hash (CID)
     */
    async uploadEncryptedMessage(encryptedData) {
        try {
            // Fallback to localStorage if Pinata is not configured
            if (!this.isPinataConfigured()) {
                console.warn('⚠️  Pinata not configured, using mock storage');
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
                    ...this.getAuthHeaders(),
                },
                body: data,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Pinata API Error:', errorText);
                throw new Error(`Failed to upload to IPFS: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Uploaded to IPFS:', result.IpfsHash);
            return result.IpfsHash;
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            // Fallback to localStorage storage
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
            // Fallback to localStorage storage
            return this.mockRetrieve(ipfsHash);
        }
    }

    /**
     * Fallback storage using localStorage when IPFS is unavailable
     * @param {Object} data
     * @returns {string} Mock IPFS hash
     */
    mockUpload(data) {
        const mockHash = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store in localStorage as fallback
        const storage = JSON.parse(localStorage.getItem('dchat_ipfs_storage') || '{}');
        storage[mockHash] = data;
        localStorage.setItem('dchat_ipfs_storage', JSON.stringify(storage));

        console.log(`📦 Mock IPFS Upload: ${mockHash}`);
        return mockHash;
    }

    /**
     * Retrieve from localStorage fallback storage
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
            if (!this.isPinataConfigured()) {
                console.warn('⚠️  Pinata not configured, using mock file storage');
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
                    ...this.getAuthHeaders(),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Pinata File Upload Error:', errorText);
                throw new Error(`Failed to upload file to IPFS: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ File uploaded to IPFS:', result.IpfsHash);
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
            if (!this.isPinataConfigured()) {
                return true; // Mock success
            }

            const data = JSON.stringify({
                hashToPin: ipfsHash,
            });

            const response = await fetch(`${this.pinataApiUrl}/pinning/pinByHash`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
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
