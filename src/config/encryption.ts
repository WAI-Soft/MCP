/**
 * Credential Encryption Module
 * 
 * This module provides AES-256-GCM encryption and decryption for sensitive credentials
 * such as API tokens and webhook secrets.
 * 
 * Requirements: 4.4
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Error thrown when encryption or decryption operations fail
 */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Validates that the encryption key has the correct length
 */
function validateKey(key: string): void {
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Encryption key must be exactly ${KEY_LENGTH} characters (256 bits). ` +
      `Provided key length: ${key.length}`
    );
  }
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * 
 * @param plaintext - The text to encrypt (e.g., API token)
 * @param key - 32-character encryption key (256 bits)
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 * @throws EncryptionError if encryption fails or key is invalid
 */
export function encrypt(plaintext: string, key: string): string {
  try {
    validateKey(key);
    
    // Generate random initialization vector
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
    
    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:ciphertext (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 * 
 * @param encrypted - Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 * @param key - 32-character encryption key (256 bits)
 * @returns Decrypted plaintext string
 * @throws EncryptionError if decryption fails, format is invalid, or authentication fails
 */
export function decrypt(encrypted: string, key: string): string {
  try {
    validateKey(key);
    
    // Parse the encrypted string
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new EncryptionError(
        'Invalid encrypted format. Expected format: iv:authTag:ciphertext'
      );
    }
    
    const [ivHex, authTagHex, ciphertext] = parts;
    
    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError(
        `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
      );
    }
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Checks if a string appears to be encrypted (has the expected format)
 * 
 * @param value - String to check
 * @returns true if the string appears to be encrypted, false otherwise
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }
  
  // Check if all parts are valid hex strings
  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every(part => hexPattern.test(part) && part.length > 0);
}
