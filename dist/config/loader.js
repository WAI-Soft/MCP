/**
 * Configuration Loader
 *
 * This module handles loading and validating configuration from JSON files
 * with support for environment variable overrides.
 *
 * Requirements: 5.2, 5.3, 5.4
 */
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { configSchema, defaultConfig } from '../types/config.js';
import { encrypt, decrypt, isEncrypted } from './encryption.js';
/**
 * Error thrown when configuration is invalid or missing required fields
 */
export class ConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigurationError';
    }
}
/**
 * Environment variable mapping for configuration overrides
 */
const ENV_VAR_MAP = {
    'cirvoy.baseURL': 'CIRVOY_BASE_URL',
    'cirvoy.apiToken': 'CIRVOY_API_TOKEN',
    'cirvoy.webhookSecret': 'CIRVOY_WEBHOOK_SECRET',
    'cirvoy.timeout': 'CIRVOY_TIMEOUT',
    'server.webhookPort': 'SERVER_WEBHOOK_PORT',
    'server.syncInterval': 'SERVER_SYNC_INTERVAL',
    'server.maxRetries': 'SERVER_MAX_RETRIES',
    'server.retryBackoffMs': 'SERVER_RETRY_BACKOFF_MS',
    'storage.dbPath': 'STORAGE_DB_PATH',
    'storage.encryptionKey': 'STORAGE_ENCRYPTION_KEY',
    'logging.level': 'LOGGING_LEVEL',
    'logging.filePath': 'LOGGING_FILE_PATH',
    'performance.maxMemoryMB': 'PERFORMANCE_MAX_MEMORY_MB',
    'performance.batchSize': 'PERFORMANCE_BATCH_SIZE',
    'performance.maxConcurrentSyncs': 'PERFORMANCE_MAX_CONCURRENT_SYNCS',
};
/**
 * Expands tilde (~) in file paths to the user's home directory
 */
function expandPath(path) {
    if (path.startsWith('~/')) {
        return join(homedir(), path.slice(2));
    }
    return path;
}
/**
 * Sets a nested property value in an object using dot notation
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!(key in current)) {
            current[key] = {};
        }
        return current[key];
    }, obj);
    target[lastKey] = value;
}
/**
 * Applies environment variable overrides to the configuration
 */
function applyEnvironmentOverrides(config) {
    for (const [configPath, envVar] of Object.entries(ENV_VAR_MAP)) {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            // Parse numeric values
            if (configPath.includes('timeout') ||
                configPath.includes('Port') ||
                configPath.includes('Interval') ||
                configPath.includes('Retries') ||
                configPath.includes('Ms') ||
                configPath.includes('MB') ||
                configPath.includes('Size') ||
                configPath.includes('Syncs')) {
                setNestedValue(config, configPath, parseInt(envValue, 10));
            }
            else {
                setNestedValue(config, configPath, envValue);
            }
        }
    }
}
/**
 * Validates configuration against the JSON schema
 */
function validateConfig(config) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(configSchema);
    const valid = validate(config);
    if (!valid) {
        const errors = validate.errors || [];
        const missingFields = [];
        const otherErrors = [];
        for (const error of errors) {
            if (error.keyword === 'required') {
                const field = error.params.missingProperty;
                const path = error.instancePath ? `${error.instancePath}.${field}` : field;
                missingFields.push(path.replace(/^\//, '').replace(/\//g, '.'));
            }
            else {
                const path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
                otherErrors.push(`${path}: ${error.message}`);
            }
        }
        let errorMessage = 'Configuration validation failed:\n';
        if (missingFields.length > 0) {
            errorMessage += '\nMissing required fields:\n';
            errorMessage += missingFields.map(field => `  - ${field}`).join('\n');
        }
        if (otherErrors.length > 0) {
            errorMessage += '\n\nValidation errors:\n';
            errorMessage += otherErrors.map(error => `  - ${error}`).join('\n');
        }
        throw new ConfigurationError(errorMessage);
    }
}
/**
 * Expands paths in the configuration (e.g., ~ to home directory)
 */
function expandConfigPaths(config) {
    config.storage.dbPath = expandPath(config.storage.dbPath);
    if (config.logging.filePath) {
        config.logging.filePath = expandPath(config.logging.filePath);
    }
}
/**
 * Decrypts sensitive credentials in the configuration
 *
 * @param config - Configuration object with potentially encrypted credentials
 * @param encryptionKey - Encryption key for decryption
 */
function decryptCredentials(config, encryptionKey) {
    // Decrypt API token if it's encrypted
    if (isEncrypted(config.cirvoy.apiToken)) {
        config.cirvoy.apiToken = decrypt(config.cirvoy.apiToken, encryptionKey);
    }
    // Decrypt webhook secret if it's encrypted
    if (isEncrypted(config.cirvoy.webhookSecret)) {
        config.cirvoy.webhookSecret = decrypt(config.cirvoy.webhookSecret, encryptionKey);
    }
}
/**
 * Encrypts sensitive credentials in the configuration
 *
 * @param config - Configuration object with plaintext credentials
 * @param encryptionKey - Encryption key for encryption
 * @returns Configuration object with encrypted credentials
 */
function encryptCredentials(config, encryptionKey) {
    const encryptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    // Encrypt API token if not already encrypted
    if (!isEncrypted(encryptedConfig.cirvoy.apiToken)) {
        encryptedConfig.cirvoy.apiToken = encrypt(encryptedConfig.cirvoy.apiToken, encryptionKey);
    }
    // Encrypt webhook secret if not already encrypted
    if (!isEncrypted(encryptedConfig.cirvoy.webhookSecret)) {
        encryptedConfig.cirvoy.webhookSecret = encrypt(encryptedConfig.cirvoy.webhookSecret, encryptionKey);
    }
    return encryptedConfig;
}
/**
 * Loads configuration from a JSON file
 *
 * @param configPath - Path to the configuration file (defaults to ~/.kiro/cirvoy-mcp/config.json)
 * @returns Validated configuration object
 * @throws ConfigurationError if configuration is invalid or missing required fields
 */
export function loadConfig(configPath) {
    // Determine config file path
    const defaultConfigPath = join(homedir(), '.kiro', 'cirvoy-mcp', 'config.json');
    const resolvedPath = configPath ? resolve(configPath) : defaultConfigPath;
    let config;
    try {
        // Read and parse JSON file
        const fileContent = readFileSync(resolvedPath, 'utf-8');
        config = JSON.parse(fileContent);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new ConfigurationError(`Configuration file not found: ${resolvedPath}\n` +
                `Please create a configuration file at this location or specify a custom path.\n` +
                `See config/example.config.json for an example configuration.`);
        }
        else if (error instanceof SyntaxError) {
            throw new ConfigurationError(`Invalid JSON in configuration file: ${resolvedPath}\n` +
                `Error: ${error.message}`);
        }
        throw error;
    }
    // Merge with defaults
    config = {
        ...config,
        server: { ...defaultConfig.server, ...config.server },
        logging: { ...defaultConfig.logging, ...config.logging },
        performance: { ...defaultConfig.performance, ...config.performance },
    };
    // Apply environment variable overrides
    applyEnvironmentOverrides(config);
    // Validate configuration
    validateConfig(config);
    // Expand paths
    expandConfigPaths(config);
    // Decrypt credentials using the encryption key
    decryptCredentials(config, config.storage.encryptionKey);
    return config;
}
/**
 * Gets the list of all supported environment variables
 */
export function getSupportedEnvVars() {
    return Object.values(ENV_VAR_MAP);
}
/**
 * Saves configuration to a JSON file with encrypted credentials
 *
 * @param config - Configuration object to save
 * @param configPath - Path to save the configuration file (defaults to ~/.kiro/cirvoy-mcp/config.json)
 * @throws ConfigurationError if saving fails
 */
export function saveConfig(config, configPath) {
    // Determine config file path
    const defaultConfigPath = join(homedir(), '.kiro', 'cirvoy-mcp', 'config.json');
    const resolvedPath = configPath ? resolve(configPath) : defaultConfigPath;
    try {
        // Encrypt credentials before saving
        const encryptedConfig = encryptCredentials(config, config.storage.encryptionKey);
        // Write to file with pretty formatting
        const jsonContent = JSON.stringify(encryptedConfig, null, 2);
        writeFileSync(resolvedPath, jsonContent, 'utf-8');
    }
    catch (error) {
        throw new ConfigurationError(`Failed to save configuration to ${resolvedPath}: ${error.message}`);
    }
}
//# sourceMappingURL=loader.js.map