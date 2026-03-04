/**
 * Property-based tests for configuration loader
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing.
 * 
 * Feature: cirvoy-kiro-mcp-integration
 * Properties: 16, 17, 18
 * Requirements: 5.2, 5.3, 5.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import fc from 'fast-check';
import { loadConfig, ConfigurationError } from '../src/config/loader.js';
import type { Config } from '../src/types/config.js';

describe('Configuration Loader - Property Tests', () => {
  let testDir: string;
  let testConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temporary directory for test configs
    testDir = join(tmpdir(), `cirvoy-test-${Date.now()}-${Math.random()}`);
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

  // Arbitrary generators for configuration values
  const arbitraryURL = () => fc.webUrl({ validSchemes: ['https'] });
  
  const arbitraryToken = () => fc.string({ minLength: 10, maxLength: 100 });
  
  const arbitraryEncryptionKey = () => fc.string({ minLength: 32, maxLength: 32 });
  
  const arbitraryTimeout = () => fc.integer({ min: 1000, max: 60000 });
  
  const arbitraryPort = () => fc.integer({ min: 1024, max: 65535 });
  
  const arbitrarySyncInterval = () => fc.integer({ min: 1, max: 3600 });
  
  const arbitraryRetries = () => fc.integer({ min: 0, max: 10 });
  
  const arbitraryBackoff = () => fc.integer({ min: 100, max: 10000 });
  
  const arbitraryLogLevel = () => fc.constantFrom('debug', 'info', 'warning', 'error');
  
  const arbitraryMemory = () => fc.integer({ min: 50, max: 1024 });
  
  const arbitraryBatchSize = () => fc.integer({ min: 1, max: 1000 });
  
  const arbitraryConcurrentSyncs = () => fc.integer({ min: 1, max: 100 });
  
  const arbitraryPath = () => fc.string({ minLength: 1, maxLength: 100 })
    .map(s => `/tmp/${s.replace(/[^a-zA-Z0-9_-]/g, '_')}`);

  // Generator for valid configuration
  const arbitraryValidConfig = () => fc.record({
    cirvoy: fc.record({
      baseURL: arbitraryURL(),
      apiToken: arbitraryToken(),
      webhookSecret: arbitraryToken(),
      timeout: arbitraryTimeout()
    }),
    server: fc.record({
      webhookPort: arbitraryPort(),
      syncInterval: arbitrarySyncInterval(),
      maxRetries: arbitraryRetries(),
      retryBackoffMs: arbitraryBackoff()
    }),
    storage: fc.record({
      dbPath: arbitraryPath(),
      encryptionKey: arbitraryEncryptionKey()
    }),
    logging: fc.record({
      level: arbitraryLogLevel(),
      filePath: fc.option(arbitraryPath(), { nil: undefined })
    }),
    performance: fc.record({
      maxMemoryMB: arbitraryMemory(),
      batchSize: arbitraryBatchSize(),
      maxConcurrentSyncs: arbitraryConcurrentSyncs()
    })
  });

  /**
   * Property 16: Configuration Validation
   * 
   * **Validates: Requirements 5.2**
   * 
   * For any configuration provided to the MCP Server, all required fields should be 
   * validated on startup before the server begins operation.
   */
  describe('Property 16: Configuration Validation', () => {
    it('should validate all required fields for any valid configuration', () => {
      fc.assert(
        fc.property(arbitraryValidConfig(), (config) => {
          // Write config to file
          writeFileSync(testConfigPath, JSON.stringify(config));
          
          // Should load without throwing
          const loadedConfig = loadConfig(testConfigPath);
          
          // All required fields should be present
          expect(loadedConfig.cirvoy).toBeDefined();
          expect(loadedConfig.cirvoy.baseURL).toBeDefined();
          expect(loadedConfig.cirvoy.apiToken).toBeDefined();
          expect(loadedConfig.cirvoy.webhookSecret).toBeDefined();
          expect(loadedConfig.cirvoy.timeout).toBeDefined();
          
          expect(loadedConfig.server).toBeDefined();
          expect(loadedConfig.server.webhookPort).toBeDefined();
          expect(loadedConfig.server.syncInterval).toBeDefined();
          expect(loadedConfig.server.maxRetries).toBeDefined();
          expect(loadedConfig.server.retryBackoffMs).toBeDefined();
          
          expect(loadedConfig.storage).toBeDefined();
          expect(loadedConfig.storage.dbPath).toBeDefined();
          expect(loadedConfig.storage.encryptionKey).toBeDefined();
          
          expect(loadedConfig.logging).toBeDefined();
          expect(loadedConfig.logging.level).toBeDefined();
          
          expect(loadedConfig.performance).toBeDefined();
          expect(loadedConfig.performance.maxMemoryMB).toBeDefined();
          expect(loadedConfig.performance.batchSize).toBeDefined();
          expect(loadedConfig.performance.maxConcurrentSyncs).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject configuration with invalid field values', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          fc.constantFrom(
            'timeout',
            'webhookPort',
            'syncInterval',
            'maxRetries',
            'retryBackoffMs',
            'maxMemoryMB',
            'batchSize',
            'maxConcurrentSyncs'
          ),
          (config, fieldToInvalidate) => {
            // Create invalid config by setting a numeric field to an invalid value
            const invalidConfig = JSON.parse(JSON.stringify(config));
            
            switch (fieldToInvalidate) {
              case 'timeout':
                invalidConfig.cirvoy.timeout = 500; // Too low (min 1000)
                break;
              case 'webhookPort':
                invalidConfig.server.webhookPort = 100; // Too low (min 1024)
                break;
              case 'syncInterval':
                invalidConfig.server.syncInterval = 0; // Too low (min 1)
                break;
              case 'maxRetries':
                invalidConfig.server.maxRetries = -1; // Negative
                break;
              case 'retryBackoffMs':
                invalidConfig.server.retryBackoffMs = 50; // Too low (min 100)
                break;
              case 'maxMemoryMB':
                invalidConfig.performance.maxMemoryMB = 10; // Too low (min 50)
                break;
              case 'batchSize':
                invalidConfig.performance.batchSize = 0; // Too low (min 1)
                break;
              case 'maxConcurrentSyncs':
                invalidConfig.performance.maxConcurrentSyncs = 0; // Too low (min 1)
                break;
            }
            
            writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
            
            // Should throw ConfigurationError
            expect(() => loadConfig(testConfigPath)).toThrow(ConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 17: Missing Configuration Error Messages
   * 
   * **Validates: Requirements 5.3**
   * 
   * For any missing required configuration field, the error message should 
   * explicitly indicate which field is missing.
   */
  describe('Property 17: Missing Configuration Error Messages', () => {
    it('should provide helpful error message for any missing required field', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          fc.constantFrom(
            'cirvoy.baseURL',
            'cirvoy.apiToken',
            'cirvoy.webhookSecret',
            'cirvoy.timeout',
            'storage.dbPath',
            'storage.encryptionKey'
          ),
          (config, fieldToRemove) => {
            // Create config with missing field
            const incompleteConfig = JSON.parse(JSON.stringify(config));
            
            const [section, field] = fieldToRemove.split('.');
            delete incompleteConfig[section][field];
            
            writeFileSync(testConfigPath, JSON.stringify(incompleteConfig));
            
            // Should throw ConfigurationError with field name in error message
            try {
              loadConfig(testConfigPath);
              // If we get here, the test should fail
              return false;
            } catch (error) {
              // Should be a ConfigurationError
              if (!(error instanceof ConfigurationError)) {
                return false;
              }
              // Error message should contain the field path
              return (error as Error).message.includes(fieldToRemove);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should list all missing fields when multiple fields are missing', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          fc.array(
            fc.constantFrom(
              'cirvoy.baseURL',
              'cirvoy.apiToken',
              'storage.dbPath',
              'storage.encryptionKey'
            ),
            { minLength: 2, maxLength: 4 }
          ).map(arr => [...new Set(arr)]), // Remove duplicates
          (config, fieldsToRemove) => {
            // Skip if we don't have at least 2 unique fields
            if (fieldsToRemove.length < 2) return true;
            
            // Create config with multiple missing fields
            const incompleteConfig = JSON.parse(JSON.stringify(config));
            
            for (const fieldPath of fieldsToRemove) {
              const [section, field] = fieldPath.split('.');
              delete incompleteConfig[section][field];
            }
            
            writeFileSync(testConfigPath, JSON.stringify(incompleteConfig));
            
            // Should throw with all field names in error message
            try {
              loadConfig(testConfigPath);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(ConfigurationError);
              const errorMessage = (error as Error).message;
              
              // All missing fields should be mentioned
              for (const fieldPath of fieldsToRemove) {
                expect(errorMessage).toContain(fieldPath);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Environment Variable Override
   * 
   * **Validates: Requirements 5.4**
   * 
   * For any configuration field that has both a file value and an environment 
   * variable value, the environment variable value should take precedence.
   */
  describe('Property 18: Environment Variable Override', () => {
    it('should override cirvoy configuration from environment variables', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryURL(),
          arbitraryToken(),
          arbitraryToken(),
          arbitraryTimeout(),
          (fileConfig, envURL, envToken, envSecret, envTimeout) => {
            // Write file config
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            // Set environment variables
            process.env.CIRVOY_BASE_URL = envURL;
            process.env.CIRVOY_API_TOKEN = envToken;
            process.env.CIRVOY_WEBHOOK_SECRET = envSecret;
            process.env.CIRVOY_TIMEOUT = envTimeout.toString();
            
            const config = loadConfig(testConfigPath);
            
            // Environment variables should override file values
            expect(config.cirvoy.baseURL).toBe(envURL);
            expect(config.cirvoy.apiToken).toBe(envToken);
            expect(config.cirvoy.webhookSecret).toBe(envSecret);
            expect(config.cirvoy.timeout).toBe(envTimeout);
            
            // Clean up
            delete process.env.CIRVOY_BASE_URL;
            delete process.env.CIRVOY_API_TOKEN;
            delete process.env.CIRVOY_WEBHOOK_SECRET;
            delete process.env.CIRVOY_TIMEOUT;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should override server configuration from environment variables', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryPort(),
          arbitrarySyncInterval(),
          arbitraryRetries(),
          arbitraryBackoff(),
          (fileConfig, envPort, envInterval, envRetries, envBackoff) => {
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            process.env.SERVER_WEBHOOK_PORT = envPort.toString();
            process.env.SERVER_SYNC_INTERVAL = envInterval.toString();
            process.env.SERVER_MAX_RETRIES = envRetries.toString();
            process.env.SERVER_RETRY_BACKOFF_MS = envBackoff.toString();
            
            const config = loadConfig(testConfigPath);
            
            expect(config.server.webhookPort).toBe(envPort);
            expect(config.server.syncInterval).toBe(envInterval);
            expect(config.server.maxRetries).toBe(envRetries);
            expect(config.server.retryBackoffMs).toBe(envBackoff);
            
            // Clean up
            delete process.env.SERVER_WEBHOOK_PORT;
            delete process.env.SERVER_SYNC_INTERVAL;
            delete process.env.SERVER_MAX_RETRIES;
            delete process.env.SERVER_RETRY_BACKOFF_MS;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should override storage configuration from environment variables', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryPath(),
          arbitraryEncryptionKey(),
          (fileConfig, envPath, envKey) => {
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            process.env.STORAGE_DB_PATH = envPath;
            process.env.STORAGE_ENCRYPTION_KEY = envKey;
            
            const config = loadConfig(testConfigPath);
            
            expect(config.storage.dbPath).toBe(envPath);
            expect(config.storage.encryptionKey).toBe(envKey);
            
            // Clean up
            delete process.env.STORAGE_DB_PATH;
            delete process.env.STORAGE_ENCRYPTION_KEY;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should override logging configuration from environment variables', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryLogLevel(),
          arbitraryPath(),
          (fileConfig, envLevel, envPath) => {
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            process.env.LOGGING_LEVEL = envLevel;
            process.env.LOGGING_FILE_PATH = envPath;
            
            const config = loadConfig(testConfigPath);
            
            expect(config.logging.level).toBe(envLevel);
            expect(config.logging.filePath).toBe(envPath);
            
            // Clean up
            delete process.env.LOGGING_LEVEL;
            delete process.env.LOGGING_FILE_PATH;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should override performance configuration from environment variables', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryMemory(),
          arbitraryBatchSize(),
          arbitraryConcurrentSyncs(),
          (fileConfig, envMemory, envBatch, envSyncs) => {
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            process.env.PERFORMANCE_MAX_MEMORY_MB = envMemory.toString();
            process.env.PERFORMANCE_BATCH_SIZE = envBatch.toString();
            process.env.PERFORMANCE_MAX_CONCURRENT_SYNCS = envSyncs.toString();
            
            const config = loadConfig(testConfigPath);
            
            expect(config.performance.maxMemoryMB).toBe(envMemory);
            expect(config.performance.batchSize).toBe(envBatch);
            expect(config.performance.maxConcurrentSyncs).toBe(envSyncs);
            
            // Clean up
            delete process.env.PERFORMANCE_MAX_MEMORY_MB;
            delete process.env.PERFORMANCE_BATCH_SIZE;
            delete process.env.PERFORMANCE_MAX_CONCURRENT_SYNCS;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve non-overridden file values when some env vars are set', () => {
      fc.assert(
        fc.property(
          arbitraryValidConfig(),
          arbitraryToken(),
          (fileConfig, envToken) => {
            writeFileSync(testConfigPath, JSON.stringify(fileConfig));
            
            // Only override one field
            process.env.CIRVOY_API_TOKEN = envToken;
            
            const config = loadConfig(testConfigPath);
            
            // Overridden field should use env value
            expect(config.cirvoy.apiToken).toBe(envToken);
            
            // Non-overridden fields should use file values
            expect(config.cirvoy.baseURL).toBe(fileConfig.cirvoy.baseURL);
            expect(config.cirvoy.webhookSecret).toBe(fileConfig.cirvoy.webhookSecret);
            expect(config.cirvoy.timeout).toBe(fileConfig.cirvoy.timeout);
            
            // Clean up
            delete process.env.CIRVOY_API_TOKEN;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
