/**
 * End-to-End Encryption Service for Dchat
 * Uses Web Crypto API for RSA + AES hybrid encryption
 * Enhanced with digital signatures for message authentication
 */

class EncryptionService {
    constructor() {
        this.keyPair = null;
        this.publicKeyPem = null;
        this.privateKeyPem = null;
        this.signingKeyPair = null; // For digital signatures
    }

    /**
     * Generate RSA key pair for encryption
     * @returns {Promise<{publicKey: string, privateKey: CryptoKey}>}
     */
    async generateKeyPair() {
        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );

            this.keyPair = keyPair;

            // Export public key to PEM format
            const publicKeyBuffer = await crypto.subtle.exportKey(
                "spki",
                keyPair.publicKey
            );
            this.publicKeyPem = this.arrayBufferToPem(publicKeyBuffer, "PUBLIC KEY");

            // Store private key
            this.privateKey = keyPair.privateKey;

            return {
                publicKey: this.publicKeyPem,
                privateKey: keyPair.privateKey,
            };
        } catch (error) {
            console.error("Error generating key pair:", error);
            throw error;
        }
    }

    /**
     * Generate RSA key pair for digital signatures (RSASSA-PKCS1-v1_5)
     * @returns {Promise<{publicKey: string, privateKey: CryptoKey}>}
     */
    async generateSigningKeyPair() {
        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"]
            );

            this.signingKeyPair = keyPair;

            // Export public key to PEM format
            const publicKeyBuffer = await crypto.subtle.exportKey(
                "spki",
                keyPair.publicKey
            );
            const signingPublicKeyPem = this.arrayBufferToPem(publicKeyBuffer, "PUBLIC KEY");

            return {
                publicKey: signingPublicKeyPem,
                privateKey: keyPair.privateKey,
            };
        } catch (error) {
            console.error("Error generating signing key pair:", error);
            throw error;
        }
    }

    /**
     * Sign a message using RSASSA-PKCS1-v1_5
     * @param {string} message - Message to sign
     * @param {CryptoKey} privateKey - Signing private key
     * @returns {Promise<string>} Base64 encoded signature
     */
    async signMessage(message, privateKey) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            const signature = await crypto.subtle.sign(
                {
                    name: "RSASSA-PKCS1-v1_5",
                },
                privateKey,
                data
            );

            return this.arrayBufferToBase64(signature);
        } catch (error) {
            console.error("Error signing message:", error);
            throw error;
        }
    }

    /**
     * Verify a message signature
     * @param {string} message - Original message
     * @param {string} signatureBase64 - Base64 encoded signature
     * @param {string} publicKeyPem - Signer's public key in PEM format
     * @returns {Promise<boolean>} True if signature is valid
     */
    async verifySignature(message, signatureBase64, publicKeyPem) {
        try {
            const publicKey = await this.importSigningPublicKey(publicKeyPem);
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const signature = this.base64ToArrayBuffer(signatureBase64);

            const isValid = await crypto.subtle.verify(
                {
                    name: "RSASSA-PKCS1-v1_5",
                },
                publicKey,
                signature,
                data
            );

            return isValid;
        } catch (error) {
            console.error("Error verifying signature:", error);
            return false;
        }
    }

    /**
     * Import signing public key from PEM string
     * @param {string} pemKey - PEM formatted public key
     * @returns {Promise<CryptoKey>}
     */
    async importSigningPublicKey(pemKey) {
        try {
            const binaryKey = this.pemToArrayBuffer(pemKey);
            return await crypto.subtle.importKey(
                "spki",
                binaryKey,
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: "SHA-256",
                },
                true,
                ["verify"]
            );
        } catch (error) {
            console.error("Error importing signing public key:", error);
            throw error;
        }
    }

    /**
     * Create a signed and encrypted message envelope
     * @param {string} message - Plain text message
     * @param {string} recipientPublicKeyPem - Recipient's encryption public key
     * @param {CryptoKey} senderSigningPrivateKey - Sender's signing private key
     * @param {string} senderAddress - Sender's wallet address
     * @returns {Promise<Object>} Message envelope with encrypted content and signature
     */
    async createMessageEnvelope(message, recipientPublicKeyPem, senderSigningPrivateKey, senderAddress) {
        try {
            // 1. Create message payload with metadata
            const payload = {
                content: message,
                sender: senderAddress,
                timestamp: Date.now(),
                nonce: crypto.getRandomValues(new Uint8Array(16)).join('')
            };
            const payloadString = JSON.stringify(payload);

            // 2. Sign the payload
            const signature = await this.signMessage(payloadString, senderSigningPrivateKey);

            // 3. Encrypt the payload
            const encrypted = await this.encryptMessage(payloadString, recipientPublicKeyPem);

            // 4. Return envelope
            return {
                version: '1.0',
                encrypted: encrypted,
                signature: signature,
                sender: senderAddress,
                timestamp: payload.timestamp
            };
        } catch (error) {
            console.error("Error creating message envelope:", error);
            throw error;
        }
    }

    /**
     * Open and verify a message envelope
     * @param {Object} envelope - Message envelope
     * @param {CryptoKey} recipientPrivateKey - Recipient's decryption private key
     * @param {string} senderSigningPublicKeyPem - Sender's signing public key
     * @returns {Promise<{content: string, verified: boolean, sender: string, timestamp: number}>}
     */
    async openMessageEnvelope(envelope, recipientPrivateKey, senderSigningPublicKeyPem) {
        try {
            // 1. Decrypt the payload
            const payloadString = await this.decryptMessage(envelope.encrypted, recipientPrivateKey);
            const payload = JSON.parse(payloadString);

            // 2. Verify signature if signing key is provided
            let verified = false;
            if (senderSigningPublicKeyPem && envelope.signature) {
                verified = await this.verifySignature(payloadString, envelope.signature, senderSigningPublicKeyPem);
            }

            // 3. Verify sender matches
            const senderMatches = payload.sender === envelope.sender;

            return {
                content: payload.content,
                verified: verified && senderMatches,
                sender: payload.sender,
                timestamp: payload.timestamp,
                signatureValid: verified,
                senderMatches: senderMatches
            };
        } catch (error) {
            console.error("Error opening message envelope:", error);
            throw error;
        }
    }

    /**
     * Import RSA public key from PEM string
     * @param {string} pemKey - PEM formatted public key
     * @returns {Promise<CryptoKey>}
     */
    async importPublicKey(pemKey) {
        try {
            const binaryKey = this.pemToArrayBuffer(pemKey);
            return await crypto.subtle.importKey(
                "spki",
                binaryKey,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            );
        } catch (error) {
            console.error("Error importing public key:", error);
            throw error;
        }
    }

    /**
     * Encrypt message using hybrid encryption (AES + RSA)
     * @param {string} message - Plain text message
     * @param {string} recipientPublicKeyPem - Recipient's public key in PEM format
     * @returns {Promise<{encryptedMessage: string, encryptedKey: string, iv: string}>}
     */
    async encryptMessage(message, recipientPublicKeyPem) {
        try {
            // 1. Generate random AES key
            const aesKey = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256,
                },
                true,
                ["encrypt", "decrypt"]
            );

            // 2. Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // 3. Encrypt message with AES
            const encoder = new TextEncoder();
            const messageBuffer = encoder.encode(message);
            const encryptedMessageBuffer = await crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                aesKey,
                messageBuffer
            );

            // 4. Export AES key
            const aesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);

            // 5. Encrypt AES key with recipient's RSA public key
            const recipientPublicKey = await this.importPublicKey(
                recipientPublicKeyPem
            );
            const encryptedKeyBuffer = await crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP",
                },
                recipientPublicKey,
                aesKeyBuffer
            );

            // 6. Convert to base64 for transmission
            return {
                encryptedMessage: this.arrayBufferToBase64(encryptedMessageBuffer),
                encryptedKey: this.arrayBufferToBase64(encryptedKeyBuffer),
                iv: this.arrayBufferToBase64(iv),
            };
        } catch (error) {
            console.error("Error encrypting message:", error);
            throw error;
        }
    }

    /**
     * Decrypt message using hybrid decryption
     * @param {Object} encryptedPackage - {encryptedMessage, encryptedKey, iv}
     * @param {CryptoKey} privateKey - User's private key
     * @returns {Promise<string>} Decrypted message
     */
    async decryptMessage(encryptedPackage, privateKey) {
        try {
            const { encryptedMessage, encryptedKey, iv } = encryptedPackage;

            // 1. Decrypt AES key with RSA private key
            const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKey);
            const aesKeyBuffer = await crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP",
                },
                privateKey,
                encryptedKeyBuffer
            );

            // 2. Import AES key
            const aesKey = await crypto.subtle.importKey(
                "raw",
                aesKeyBuffer,
                {
                    name: "AES-GCM",
                    length: 256,
                },
                false,
                ["decrypt"]
            );

            // 3. Decrypt message with AES key
            const encryptedMessageBuffer = this.base64ToArrayBuffer(encryptedMessage);
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivBuffer,
                },
                aesKey,
                encryptedMessageBuffer
            );

            // 4. Convert to string
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error("Error decrypting message:", error);
            throw error;
        }
    }

    /**
     * Generate content hash for blockchain storage
     * @param {string} content - Content to hash
     * @returns {Promise<string>} Hex string hash
     */
    async generateContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return this.arrayBufferToHex(hashBuffer);
    }

    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    arrayBufferToPem(buffer, type) {
        const base64 = this.arrayBufferToBase64(buffer);
        const lines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`;
    }

    pemToArrayBuffer(pem) {
        const base64 = pem
            .replace(/-----BEGIN [^-]+-----/, "")
            .replace(/-----END [^-]+-----/, "")
            .replace(/\s/g, "");
        return this.base64ToArrayBuffer(base64);
    }

    /**
     * Store keys in localStorage
     * @param {CryptoKey} privateKey - Encryption private key
     * @param {string} publicKeyPem - Encryption public key
     * @param {CryptoKey} signingPrivateKey - Signing private key (optional)
     * @param {string} signingPublicKeyPem - Signing public key (optional)
     */
    async storeKeys(privateKey, publicKeyPem, signingPrivateKey = null, signingPublicKeyPem = null) {
        try {
            // Export encryption private key for storage
            const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", privateKey);
            const privateKeyBase64 = this.arrayBufferToBase64(privateKeyBuffer);

            localStorage.setItem("dchat_public_key", publicKeyPem);
            localStorage.setItem("dchat_private_key", privateKeyBase64);

            // Store signing keys if provided
            if (signingPrivateKey && signingPublicKeyPem) {
                const signingPrivateKeyBuffer = await crypto.subtle.exportKey("pkcs8", signingPrivateKey);
                const signingPrivateKeyBase64 = this.arrayBufferToBase64(signingPrivateKeyBuffer);

                localStorage.setItem("dchat_signing_public_key", signingPublicKeyPem);
                localStorage.setItem("dchat_signing_private_key", signingPrivateKeyBase64);
            }
        } catch (error) {
            console.error("Error storing keys:", error);
            throw error;
        }
    }

    /**
     * Load keys from localStorage
     * @returns {Promise<{publicKey: string, privateKey: CryptoKey, signingPublicKey?: string, signingPrivateKey?: CryptoKey}>}
     */
    async loadKeys() {
        try {
            const publicKeyPem = localStorage.getItem("dchat_public_key");
            const privateKeyBase64 = localStorage.getItem("dchat_private_key");

            if (!publicKeyPem || !privateKeyBase64) {
                return null;
            }

            const privateKeyBuffer = this.base64ToArrayBuffer(privateKeyBase64);
            const privateKey = await crypto.subtle.importKey(
                "pkcs8",
                privateKeyBuffer,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["decrypt"]
            );

            this.publicKeyPem = publicKeyPem;
            this.privateKey = privateKey;

            const result = {
                publicKey: publicKeyPem,
                privateKey: privateKey,
            };

            // Load signing keys if available
            const signingPublicKeyPem = localStorage.getItem("dchat_signing_public_key");
            const signingPrivateKeyBase64 = localStorage.getItem("dchat_signing_private_key");

            if (signingPublicKeyPem && signingPrivateKeyBase64) {
                const signingPrivateKeyBuffer = this.base64ToArrayBuffer(signingPrivateKeyBase64);
                const signingPrivateKey = await crypto.subtle.importKey(
                    "pkcs8",
                    signingPrivateKeyBuffer,
                    {
                        name: "RSASSA-PKCS1-v1_5",
                        hash: "SHA-256",
                    },
                    true,
                    ["sign"]
                );

                result.signingPublicKey = signingPublicKeyPem;
                result.signingPrivateKey = signingPrivateKey;
            }

            return result;
        } catch (error) {
            console.error("Error loading keys:", error);
            return null;
        }
    }

    /**
     * Initialize all keys (encryption + signing)
     * @returns {Promise<Object>} All keys
     */
    async initializeAllKeys() {
        try {
            // Try to load existing keys
            const existingKeys = await this.loadKeys();
            if (existingKeys && existingKeys.signingPrivateKey) {
                return existingKeys;
            }

            // Generate new encryption keys if needed
            let encryptionKeys = existingKeys;
            if (!encryptionKeys) {
                encryptionKeys = await this.generateKeyPair();
            }

            // Generate signing keys
            const signingKeys = await this.generateSigningKeyPair();

            // Store all keys
            await this.storeKeys(
                encryptionKeys.privateKey,
                encryptionKeys.publicKey,
                signingKeys.privateKey,
                signingKeys.publicKey
            );

            return {
                publicKey: encryptionKeys.publicKey,
                privateKey: encryptionKeys.privateKey,
                signingPublicKey: signingKeys.publicKey,
                signingPrivateKey: signingKeys.privateKey
            };
        } catch (error) {
            console.error("Error initializing all keys:", error);
            throw error;
        }
    }
}

export default new EncryptionService();
