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
export declare const configSchema: {
    $schema: string;
    type: string;
    required: string[];
    properties: {
        cirvoy: {
            type: string;
            required: string[];
            properties: {
                baseURL: {
                    type: string;
                    format: string;
                    description: string;
                    minLength: number;
                };
                apiToken: {
                    type: string;
                    description: string;
                    minLength: number;
                };
                webhookSecret: {
                    type: string;
                    description: string;
                    minLength: number;
                };
                timeout: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
        server: {
            type: string;
            required: string[];
            properties: {
                webhookPort: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                syncInterval: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                maxRetries: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                retryBackoffMs: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
        storage: {
            type: string;
            required: string[];
            properties: {
                dbPath: {
                    type: string;
                    description: string;
                    minLength: number;
                };
                encryptionKey: {
                    type: string;
                    description: string;
                    minLength: number;
                };
            };
            additionalProperties: boolean;
        };
        logging: {
            type: string;
            required: string[];
            properties: {
                level: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                filePath: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        performance: {
            type: string;
            required: string[];
            properties: {
                maxMemoryMB: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                batchSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                maxConcurrentSyncs: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
    };
    additionalProperties: boolean;
};
/**
 * Default configuration values
 */
export declare const defaultConfig: Partial<Config>;
//# sourceMappingURL=config.d.ts.map