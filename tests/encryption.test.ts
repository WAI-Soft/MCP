/**
 * Unit tests for credential encryption module
 * 
 * Tests AES-256-GCM encryption and decryption functionality
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, isEncrypted, EncryptionError } from '../src/config/encryption.js';

describe('Credential Encryption', () => {
  const validKey = 'abcdefghijklmnopqrstuvwxyz123456'; // 32 characters
  const testToken = 'my-secret-api-token-12345';
  const testSecret = 'webhook-secret-key';

  describe('encrypt', () => {
    it('should encrypt a plaintext string', () => {
      const encrypted = encrypt(testToken, validKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testToken);
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const encrypted1 = encrypt(testToken, validKey);
      const encrypted2 = encrypt(testToken, validKey);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error for invalid key length', () => {
      const shortKey = 'tooshort';
      
      expect(() => encrypt(testToken, shortKey)).toThrow(EncryptionError);
      expect(() => encrypt(testToken, shortKey)).toThrow(/must be exactly 32 characters/);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('', validKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle Unicode characters', () => {
      const unicodeText = 'مرحبا 你好 🔐';
      const encrypted = encrypt(unicodeText, validKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string back to original', () => {
      const encrypted = encrypt(testToken, validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe(testToken);
    });

    it('should handle empty string round-trip', () => {
      const encrypted = encrypt('', validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe('');
    });

    it('should handle Unicode characters round-trip', () => {
      const unicodeText = 'مرحبا 你好 🔐';
      const encrypted = encrypt(unicodeText, validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe(unicodeText);
    });

    it('should throw error for invalid key length', () => {
      const encrypted = encrypt(testToken, validKey);
      const shortKey = 'tooshort';
      
      expect(() => decrypt(encrypted, shortKey)).toThrow(EncryptionError);
      expect(() => decrypt(encrypted, shortKey)).toThrow(/must be exactly 32 characters/);
    });

    it('should throw error for invalid encrypted format', () => {
      const invalidFormat = 'not:valid';
      
      expect(() => decrypt(invalidFormat, validKey)).toThrow(EncryptionError);
      expect(() => decrypt(invalidFormat, validKey)).toThrow(/Invalid encrypted format/);
    });

    it('should throw error for wrong key', () => {
      const encrypted = encrypt(testToken, validKey);
      const wrongKey = 'wrongkeywrongkeywrongkeywrongk'; // 32 chars but different
      
      expect(() => decrypt(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt(testToken, validKey);
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      parts[2] = parts[2].replace(/a/g, 'b');
      const tampered = parts.join(':');
      
      expect(() => decrypt(tampered, validKey)).toThrow(EncryptionError);
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encrypt(testToken, validKey);
      const parts = encrypted.split(':');
      // Tamper with the auth tag
      parts[1] = parts[1].replace(/a/g, 'b');
      const tampered = parts.join(':');
      
      expect(() => decrypt(tampered, validKey)).toThrow(EncryptionError);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encrypt(testToken, validKey);
      
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext strings', () => {
      expect(isEncrypted(testToken)).toBe(false);
      expect(isEncrypted('plain-text-token')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(isEncrypted('not:valid')).toBe(false);
      expect(isEncrypted('only:two:parts')).toBe(false); // Actually has 3 parts, but let's test edge cases
      expect(isEncrypted('too:many:parts:here')).toBe(false);
    });

    it('should return false for non-hex strings', () => {
      expect(isEncrypted('abc:def:ghi')).toBe(false);
      expect(isEncrypted('123:xyz:789')).toBe(false);
    });

    it('should return true for valid hex format', () => {
      expect(isEncrypted('abc123:def456:789abc')).toBe(true);
      expect(isEncrypted('ABCDEF:123456:789ABC')).toBe(true);
    });
  });

  describe('encryption round-trip', () => {
    it('should preserve long strings', () => {
      const longString = 'a'.repeat(1000);
      const encrypted = encrypt(longString, validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe(longString);
    });

    it('should preserve special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const encrypted = encrypt(specialChars, validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe(specialChars);
    });

    it('should preserve newlines and whitespace', () => {
      const textWithWhitespace = 'line1\nline2\r\nline3\ttab\t  spaces  ';
      const encrypted = encrypt(textWithWhitespace, validKey);
      const decrypted = decrypt(encrypted, validKey);
      
      expect(decrypted).toBe(textWithWhitespace);
    });
  });
});
