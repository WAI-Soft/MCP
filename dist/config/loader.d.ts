/**
 * Configuration Loader
 *
 * This module handles loading and validating configuration from JSON files
 * with support for environment variable overrides.
 *
 * Requirements: 5.2, 5.3, 5.4
 */
import { Config } from '../types/config.js';
/**
 * Error thrown when configuration is invalid or missing required fields
 */
export declare class ConfigurationError extends Error {
    constructor(message: string);
}
/**
 * Loads configuration from a JSON file
 *
 * @param configPath - Path to the configuration file (defaults to ~/.kiro/cirvoy-mcp/config.json)
 * @returns Validated configuration object
 * @throws ConfigurationError if configuration is invalid or missing required fields
 */
export declare function loadConfig(configPath?: string): Config;
/**
 * Gets the list of all supported environment variables
 */
export declare function getSupportedEnvVars(): string[];
/**
 * Saves configuration to a JSON file with encrypted credentials
 *
 * @param config - Configuration object to save
 * @param configPath - Path to save the configuration file (defaults to ~/.kiro/cirvoy-mcp/config.json)
 * @throws ConfigurationError if saving fails
 */
export declare function saveConfig(config: Config, configPath?: string): void;
//# sourceMappingURL=loader.d.ts.map