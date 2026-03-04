/**
 * Example: Encrypting Credentials
 * 
 * This example demonstrates how to encrypt API tokens and webhook secrets
 * before storing them in the configuration file.
 */

import { encrypt, decrypt, isEncrypted } from '../src/config/index.js';

// Your encryption key (must be exactly 32 characters / 256 bits)
// In production, this should be stored securely (e.g., environment variable)
const encryptionKey = 'your-32-character-encryption-key!';

// Example 1: Encrypt an API token
const apiToken = 'my-secret-api-token-12345';
const encryptedToken = encrypt(apiToken, encryptionKey);

console.log('Original API Token:', apiToken);
console.log('Encrypted API Token:', encryptedToken);
console.log('Is Encrypted?', isEncrypted(encryptedToken));
console.log();

// Example 2: Decrypt the token
const decryptedToken = decrypt(encryptedToken, encryptionKey);
console.log('Decrypted API Token:', decryptedToken);
console.log('Matches Original?', decryptedToken === apiToken);
console.log();

// Example 3: Encrypt a webhook secret
const webhookSecret = 'my-webhook-secret-key';
const encryptedSecret = encrypt(webhookSecret, encryptionKey);

console.log('Original Webhook Secret:', webhookSecret);
console.log('Encrypted Webhook Secret:', encryptedSecret);
console.log();

// Example 4: Check if a value is encrypted
const plaintextValue = 'not-encrypted';
const encryptedValue = encrypt('encrypted', encryptionKey);

console.log('Is plaintext encrypted?', isEncrypted(plaintextValue)); // false
console.log('Is encrypted value encrypted?', isEncrypted(encryptedValue)); // true
console.log();

// Example 5: Using encrypted values in config
const configExample = {
  cirvoy: {
    baseURL: 'https://cirvoy.example.com/api',
    apiToken: encryptedToken, // Use encrypted token
    webhookSecret: encryptedSecret, // Use encrypted secret
    timeout: 30000
  },
  storage: {
    dbPath: '~/.kiro/cirvoy-mcp/data.db',
    encryptionKey: encryptionKey // Store encryption key securely
  }
  // ... other config fields
};

console.log('Example Config with Encrypted Credentials:');
console.log(JSON.stringify(configExample, null, 2));
console.log();

console.log('Note: When you load this config using loadConfig(), the credentials');
console.log('will be automatically decrypted for use in your application.');
