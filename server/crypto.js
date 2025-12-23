/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-CBC encryption for SMTP passwords and other secrets
 */

import crypto from 'crypto';

// Use environment variable for production, fallback for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'streamdock-dev-key-change-prod';

/**
 * Encrypt a plaintext string using AES-256-CBC
 * Returns a string in format: iv:encryptedData (both hex encoded)
 */
export function encrypt(text) {
    if (!text) return '';

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create a 32-byte key from the encryption key using scrypt
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'streamdock-salt', 32);

    // Create cipher and encrypt
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ]);

    // Return iv:encrypted as hex strings
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a string that was encrypted with the encrypt function
 * Expects input in format: iv:encryptedData (both hex encoded)
 */
export function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return '';

    try {
        const [ivHex, dataHex] = encryptedText.split(':');

        // Recreate the key using the same parameters
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'streamdock-salt', 32);
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedData = Buffer.from(dataHex, 'hex');

        // Create decipher and decrypt
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption failed:', error);
        return '';
    }
}

/**
 * Check if a string appears to be encrypted (has our iv:data format)
 */
export function isEncrypted(text) {
    if (!text) return false;
    const parts = text.split(':');
    // Should have exactly 2 parts, iv should be 32 hex chars (16 bytes)
    return parts.length === 2 && parts[0].length === 32 && /^[a-f0-9]+$/i.test(parts[0]);
}
