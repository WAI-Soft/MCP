/**
 * Configuration types for the Cirvoy-Kiro MCP Integration Server
 * 
 * This module defines the TypeScript interfaces and JSON schema for server configuration.
 * The configuration includes Cirvoy connection settings, server settings, storage settings,
 * logging settings, and performance settings.
 * 
 * Requirements: 5.1, 5.5
 */

/**
 * Cirvoy API connection configuration
 */
export interface CirvoyConfig {
  /** Base URL for the Cirvoy API (e.g., https://cirvoy.example.com/api) */
  baseURL: string;
  
  /** API authentication token for Cirvoy system */
  apiToken: string;
  
  /** Secret key for verifying webhook HMAC signatures */
  webhookSecret: string;
  
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * MCP Server configuration
 */
export interface ServerConfig {
  /** Port for the webhook HTTP server */
  webhookPort: number;
  
  /** Interval between sync checks in seconds */
  syncInterval: number;
  
  /** Maximum number of retry attempts for failed operations */
  maxRetries: number;
  
  /** Base delay in milliseconds for exponential backoff retry strategy */
  retryBackoffMs: number;
}

/**
 * Storage and database configuration
 */
export interface StorageConfig {
  /** Path to the SQLite database file */
  dbPath: string;
  
  /** Encryption key for securing stored credentials */
  encryptionKey: string;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level: debug, info, warning, or error */
  level: 'debug' | 'info' | 'warning' | 'error';
  
  /** Optional path to log file (if not specified, logs only to database) */
  filePath?: string;
}

/**
 * Performance and resource management configuration
 */
export interface PerformanceConfig {
  /** Maximum memory usage in megabytes */
  maxMemoryMB: number;
  
  /** Number of tasks to process in a single batch operation */
  batchSize: number;
  
  /** Maximum number of concurrent synchronization operations */
  maxConcurrentSyncs: number;
}

/**
 * Complete server configuration
 */
export interface Config {
  /** Cirvoy API connection settings */
  cirvoy: CirvoyConfig;
  
  /** Server operation settings */
  server: ServerConfig;
  
  /** Storage and database settings */
  storage: StorageConfig;
  
  /** Logging settings */
  logging: LoggingConfig;
  
  /** Performance settings */
  performance: PerformanceConfig;
}

/**
 * JSON Schema for configuration validation
 * This schema is used to validate configuration files and ensure all required fields are present
 */
export const configSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['cirvoy', 'server', 'storage', 'logging', 'performance'],
  properties: {
    cirvoy: {
      type: 'object',
      required: ['baseURL', 'apiToken', 'webhookSecret', 'timeout'],
      properties: {
        baseURL: {
          type: 'string',
          format: 'uri',
          description: 'Base URL for the Cirvoy API',
          minLength: 1
        },
        apiToken: {
          type: 'string',
          description: 'API authentication token for Cirvoy system',
          minLength: 1
        },
        webhookSecret: {
          type: 'string',
          description: 'Secret key for verifying webhook HMAC signatures',
          minLength: 1
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds',
          minimum: 1000,
          maximum: 60000
        }
      },
      additionalProperties: false
    },
    server: {
      type: 'object',
      required: ['webhookPort', 'syncInterval', 'maxRetries', 'retryBackoffMs'],
      properties: {
        webhookPort: {
          type: 'number',
          description: 'Port for the webhook HTTP server',
          minimum: 1024,
          maximum: 65535
        },
        syncInterval: {
          type: 'number',
          description: 'Interval between sync checks in seconds',
          minimum: 1,
          maximum: 3600
        },
        maxRetries: {
          type: 'number',
          description: 'Maximum number of retry attempts for failed operations',
          minimum: 0,
          maximum: 10
        },
        retryBackoffMs: {
          type: 'number',
          description: 'Base delay in milliseconds for exponential backoff retry strategy',
          minimum: 100,
          maximum: 10000
        }
      },
      additionalProperties: false
    },
    storage: {
      type: 'object',
      required: ['dbPath', 'encryptionKey'],
      properties: {
        dbPath: {
          type: 'string',
          description: 'Path to the SQLite database file',
          minLength: 1
        },
        encryptionKey: {
          type: 'string',
          description: 'Encryption key for securing stored credentials',
          minLength: 32
        }
      },
      additionalProperties: false
    },
    logging: {
      type: 'object',
      required: ['level'],
      properties: {
        level: {
          type: 'string',
          enum: ['debug', 'info', 'warning', 'error'],
          description: 'Log level'
        },
        filePath: {
          type: 'string',
          description: 'Optional path to log file'
        }
      },
      additionalProperties: false
    },
    performance: {
      type: 'object',
      required: ['maxMemoryMB', 'batchSize', 'maxConcurrentSyncs'],
      properties: {
        maxMemoryMB: {
          type: 'number',
          description: 'Maximum memory usage in megabytes',
          minimum: 50,
          maximum: 1024
        },
        batchSize: {
          type: 'number',
          description: 'Number of tasks to process in a single batch operation',
          minimum: 1,
          maximum: 1000
        },
        maxConcurrentSyncs: {
          type: 'number',
          description: 'Maximum number of concurrent synchronization operations',
          minimum: 1,
          maximum: 100
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

/**
 * Default configuration values
 */
export const defaultConfig: Partial<Config> = {
  server: {
    webhookPort: 3000,
    syncInterval: 5,
    maxRetries: 3,
    retryBackoffMs: 1000
  },
  logging: {
    level: 'info'
  },
  performance: {
    maxMemoryMB: 100,
    batchSize: 10,
    maxConcurrentSyncs: 5
  }
};
