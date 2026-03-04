/**
 * Credential Encryption Module
 *
 * This module provides AES-256-GCM encryption and decryption for sensitive credentials
 * such as API tokens and webhook secrets.
 *
 * Requirements: 4.4
 */
/**
 * Error thrown when encryption or decryption operations fail
 */
export declare class EncryptionError extends Error {
    constructor(message: string);
}
/**
 * Encrypts a plaintext string using AES-256-GCM
 *
 * @param plaintext - The text to encrypt (e.g., API token)
 * @param key - 32-character encryption key (256 bits)
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 * @throws EncryptionError if encryption fails or key is invalid
 */
export declare function encrypt(plaintext: string, key: string): string;
/**
 * Decrypts an encrypted string using AES-256-GCM
 *
 * @param encrypted - Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 * @param key - 32-character encryption key (256 bits)
 * @returns Decrypted plaintext string
 * @throws EncryptionError if decryption fails, format is invalid, or authentication fails
 */
export declare function decrypt(encrypted: string, key: string): string;
/**
 * Checks if a string appears to be encrypted (has the expected format)
 *
 * @param value - String to check
 * @returns true if the string appears to be encrypted, false otherwise
 */
export declare function isEncrypted(value: string): boolean;
//# sourceMappingURL=encryption.d.ts.map