/**
 * Unit tests for configuration loader
 * 
 * Tests configuration loading, validation, environment variable overrides,
 * and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, saveConfig, ConfigurationError } from '../src/config/loader.js';
import { encrypt } from '../src/config/encryption.js';

describe('Configuration Loader', () => {
  let testDir: string;
  let testConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temporary directory for test configs
    testDir = join(tmpdir(), `cirvoy-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testConfigPath = join(testDir, 'config.json');
    
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Restore original environment
    process.env = originalEnv;
  });

  const validConfig = {
    cirvoy: {
      baseURL: 'https://cirvoy.example.com/api',
      apiToken: 'test-token-123',
      webhookSecret: 'test-secret-456',
      timeout: 30000
    },
    server: {
      webhookPort: 3000,
      syncInterval: 5,
      maxRetries: 3,
      retryBackoffMs: 1000
    },
    storage: {
      dbPath: '/tmp/test.db',
      encryptionKey: '12345678901234567890123456789012'
    },
    logging: {
      level: 'info' as const
    },
    performance: {
      maxMemoryMB: 100,
      batchSize: 10,
      maxConcurrentSyncs: 5
    }
  };

  describe('Valid Configuration Loading', () => {
    it('should load a valid configuration file', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.baseURL).toBe('https://cirvoy.example.com/api');
      expect(config.cirvoy.apiToken).toBe('test-token-123');
      expect(config.server.webhookPort).toBe(3000);
      expect(config.storage.encryptionKey).toBe('12345678901234567890123456789012');
    });

    it('should merge with default values for optional fields', () => {
      const minimalConfig = {
        cirvoy: {
          baseURL: 'https://cirvoy.example.com/api',
          apiToken: 'test-token',
          webhookSecret: 'test-secret',
          timeout: 30000
        },
        storage: {
          dbPath: '/tmp/test.db',
          encryptionKey: '12345678901234567890123456789012'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(minimalConfig));
      
      const config = loadConfig(testConfigPath);
      
      // Should have default values
      expect(config.server.webhookPort).toBe(3000);
      expect(config.server.maxRetries).toBe(3);
      expect(config.logging.level).toBe('info');
      expect(config.performance.maxMemoryMB).toBe(100);
    });

    it('should expand tilde paths in storage.dbPath', () => {
      const configWithTilde = {
        ...validConfig,
        storage: {
          ...validConfig.storage,
          dbPath: '~/test.db'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configWithTilde));
      
      const config = loadConfig(testConfigPath);
      
      expect(config.storage.dbPath).not.toContain('~');
      expect(config.storage.dbPath).toContain('test.db');
    });

    it('should expand tilde paths in logging.filePath', () => {
      const configWithTilde = {
        ...validConfig,
        logging: {
          level: 'info' as const,
          filePath: '~/logs/server.log'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configWithTilde));
      
      const config = loadConfig(testConfigPath);
      
      expect(config.logging.filePath).not.toContain('~');
      expect(config.logging.filePath).toContain('logs/server.log');
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override cirvoy.baseURL from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.CIRVOY_BASE_URL = 'https://override.example.com/api';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.baseURL).toBe('https://override.example.com/api');
    });

    it('should override cirvoy.apiToken from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.CIRVOY_API_TOKEN = 'override-token';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.apiToken).toBe('override-token');
    });

    it('should override cirvoy.webhookSecret from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.CIRVOY_WEBHOOK_SECRET = 'override-secret';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.webhookSecret).toBe('override-secret');
    });

    it('should override numeric values from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.CIRVOY_TIMEOUT = '60000';
      process.env.SERVER_WEBHOOK_PORT = '4000';
      process.env.SERVER_MAX_RETRIES = '5';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.timeout).toBe(60000);
      expect(config.server.webhookPort).toBe(4000);
      expect(config.server.maxRetries).toBe(5);
    });

    it('should override storage paths from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.STORAGE_DB_PATH = '/override/path/db.sqlite';
      process.env.STORAGE_ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 characters
      
      const config = loadConfig(testConfigPath);
      
      expect(config.storage.dbPath).toBe('/override/path/db.sqlite');
      expect(config.storage.encryptionKey).toBe('12345678901234567890123456789012');
    });

    it('should override logging configuration from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.LOGGING_LEVEL = 'debug';
      process.env.LOGGING_FILE_PATH = '/var/log/cirvoy.log';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.logging.level).toBe('debug');
      expect(config.logging.filePath).toBe('/var/log/cirvoy.log');
    });

    it('should override performance settings from environment', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.PERFORMANCE_MAX_MEMORY_MB = '200';
      process.env.PERFORMANCE_BATCH_SIZE = '20';
      process.env.PERFORMANCE_MAX_CONCURRENT_SYNCS = '10';
      
      const config = loadConfig(testConfigPath);
      
      expect(config.performance.maxMemoryMB).toBe(200);
      expect(config.performance.batchSize).toBe(20);
      expect(config.performance.maxConcurrentSyncs).toBe(10);
    });

    it('should prioritize environment variables over file values', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      process.env.CIRVOY_API_TOKEN = 'env-token';
      process.env.SERVER_WEBHOOK_PORT = '5000';
      
      const config = loadConfig(testConfigPath);
      
      // Environment values should override file values
      expect(config.cirvoy.apiToken).toBe('env-token');
      expect(config.server.webhookPort).toBe(5000);
      
      // Non-overridden values should remain from file
      expect(config.cirvoy.baseURL).toBe('https://cirvoy.example.com/api');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should throw ConfigurationError for missing file', () => {
      const nonExistentPath = join(testDir, 'nonexistent.json');
      
      expect(() => loadConfig(nonExistentPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(nonExistentPath)).toThrow(/Configuration file not found/);
    });

    it('should throw ConfigurationError for invalid JSON', () => {
      writeFileSync(testConfigPath, '{ invalid json }');
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(testConfigPath)).toThrow(/Invalid JSON/);
    });

    it('should throw ConfigurationError with helpful message for missing cirvoy.baseURL', () => {
      const invalidConfig = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          baseURL: undefined
        }
      };
      delete invalidConfig.cirvoy.baseURL;
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(testConfigPath)).toThrow(/cirvoy.baseURL/);
    });

    it('should throw ConfigurationError with helpful message for missing cirvoy.apiToken', () => {
      const invalidConfig = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: undefined
        }
      };
      delete invalidConfig.cirvoy.apiToken;
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(testConfigPath)).toThrow(/cirvoy.apiToken/);
    });

    it('should throw ConfigurationError with helpful message for missing storage.encryptionKey', () => {
      const invalidConfig = {
        ...validConfig,
        storage: {
          ...validConfig.storage,
          encryptionKey: undefined
        }
      };
      delete invalidConfig.storage.encryptionKey;
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(testConfigPath)).toThrow(/storage.encryptionKey/);
    });

    it('should throw ConfigurationError for multiple missing fields', () => {
      const invalidConfig = {
        cirvoy: {
          timeout: 30000
        },
        storage: {
          dbPath: '/tmp/test.db'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      const error = (() => {
        try {
          loadConfig(testConfigPath);
          return null;
        } catch (e) {
          return e as ConfigurationError;
        }
      })();
      
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error?.message).toContain('cirvoy.baseURL');
      expect(error?.message).toContain('cirvoy.apiToken');
      expect(error?.message).toContain('storage.encryptionKey');
    });

    it('should throw ConfigurationError for encryption key too short', () => {
      const invalidConfig = {
        ...validConfig,
        storage: {
          ...validConfig.storage,
          encryptionKey: 'too-short'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
      expect(() => loadConfig(testConfigPath)).toThrow(/storage.encryptionKey/);
    });

    it('should throw ConfigurationError for invalid timeout value', () => {
      const invalidConfig = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          timeout: 500 // Too low (minimum is 1000)
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid port number', () => {
      const invalidConfig = {
        ...validConfig,
        server: {
          ...validConfig.server,
          webhookPort: 100 // Too low (minimum is 1024)
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid log level', () => {
      const invalidConfig = {
        ...validConfig,
        logging: {
          level: 'invalid' as any
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
    });
  });

  describe('Credential Encryption', () => {
    const encryptionKey = '12345678901234567890123456789012'; // 32 characters

    it('should decrypt encrypted API token when loading config', () => {
      const encryptedToken = encrypt('my-secret-token', encryptionKey);
      const configWithEncrypted = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: encryptedToken
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configWithEncrypted));
      
      const config = loadConfig(testConfigPath);
      
      // Should be decrypted
      expect(config.cirvoy.apiToken).toBe('my-secret-token');
      expect(config.cirvoy.apiToken).not.toBe(encryptedToken);
    });

    it('should decrypt encrypted webhook secret when loading config', () => {
      const encryptedSecret = encrypt('my-webhook-secret', encryptionKey);
      const configWithEncrypted = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          webhookSecret: encryptedSecret
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configWithEncrypted));
      
      const config = loadConfig(testConfigPath);
      
      // Should be decrypted
      expect(config.cirvoy.webhookSecret).toBe('my-webhook-secret');
      expect(config.cirvoy.webhookSecret).not.toBe(encryptedSecret);
    });

    it('should handle plaintext credentials (not encrypted)', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      
      const config = loadConfig(testConfigPath);
      
      // Should work with plaintext
      expect(config.cirvoy.apiToken).toBe('test-token-123');
      expect(config.cirvoy.webhookSecret).toBe('test-secret-456');
    });

    it('should decrypt both encrypted and plaintext credentials in same config', () => {
      const encryptedToken = encrypt('encrypted-token', encryptionKey);
      const configMixed = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: encryptedToken,
          webhookSecret: 'plaintext-secret'
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configMixed));
      
      const config = loadConfig(testConfigPath);
      
      expect(config.cirvoy.apiToken).toBe('encrypted-token');
      expect(config.cirvoy.webhookSecret).toBe('plaintext-secret');
    });

    it('should save config with encrypted credentials', () => {
      const config = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: 'plaintext-token',
          webhookSecret: 'plaintext-secret'
        }
      };
      
      saveConfig(config, testConfigPath);
      
      // Load the saved config and verify it was encrypted
      const loadedConfig = loadConfig(testConfigPath);
      
      expect(loadedConfig.cirvoy.apiToken).toBe('plaintext-token');
      expect(loadedConfig.cirvoy.webhookSecret).toBe('plaintext-secret');
    });

    it('should not double-encrypt already encrypted credentials when saving', () => {
      const encryptedToken = encrypt('my-token', encryptionKey);
      const config = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: encryptedToken,
          webhookSecret: 'plaintext-secret'
        }
      };
      
      saveConfig(config, testConfigPath);
      
      const loadedConfig = loadConfig(testConfigPath);
      
      // Should still decrypt correctly
      expect(loadedConfig.cirvoy.apiToken).toBe('my-token');
      expect(loadedConfig.cirvoy.webhookSecret).toBe('plaintext-secret');
    });

    it('should handle environment variable override of encrypted credentials', () => {
      const encryptedToken = encrypt('file-token', encryptionKey);
      const configWithEncrypted = {
        ...validConfig,
        cirvoy: {
          ...validConfig.cirvoy,
          apiToken: encryptedToken
        }
      };
      
      writeFileSync(testConfigPath, JSON.stringify(configWithEncrypted));
      process.env.CIRVOY_API_TOKEN = 'env-override-token';
      
      const config = loadConfig(testConfigPath);
      
      // Environment variable should override encrypted file value
      expect(config.cirvoy.apiToken).toBe('env-override-token');
    });
  });
});
