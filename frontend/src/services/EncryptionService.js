/**
 * End-to-End Encryption Service for Dchat
 * Uses Web Crypto API for RSA + AES hybrid encryption
 */

class EncryptionService {
    constructor() {
        this.keyPair = null;
        this.publicKeyPem = null;
        this.privateKeyPem = null;
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
     * Store keys in IndexedDB
     * @param {CryptoKey} privateKey
     * @param {string} publicKeyPem
     */
    async storeKeys(privateKey, publicKeyPem) {
        try {
            // Export private key for storage
            const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", privateKey);
            const privateKeyBase64 = this.arrayBufferToBase64(privateKeyBuffer);

            localStorage.setItem("dchat_public_key", publicKeyPem);
            localStorage.setItem("dchat_private_key", privateKeyBase64);
        } catch (error) {
            console.error("Error storing keys:", error);
            throw error;
        }
    }

    /**
     * Load keys from IndexedDB
     * @returns {Promise<{publicKey: string, privateKey: CryptoKey}>}
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

            return {
                publicKey: publicKeyPem,
                privateKey: privateKey,
            };
        } catch (error) {
            console.error("Error loading keys:", error);
            return null;
        }
    }
}

export default new EncryptionService();
