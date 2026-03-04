import Database from 'better-sqlite3';
import { DatabaseConfig } from './schema';
/**
 * Database connection manager with retry logic and health checks
 *
 * This module provides:
 * - Connection pool management with retry logic
 * - Health check queries to verify database connectivity
 * - Graceful error handling for connection failures
 *
 * Requirement 6.5: Handle connection errors gracefully
 */
export interface ConnectionManagerConfig extends DatabaseConfig {
    maxRetries?: number;
    retryDelayMs?: number;
    healthCheckIntervalMs?: number;
}
export interface ConnectionHealth {
    isHealthy: boolean;
    lastCheck: Date;
    error?: Error;
}
/**
 * Database connection manager with retry logic and health monitoring
 */
export declare class DatabaseConnectionManager {
    private db;
    private config;
    private health;
    private healthCheckInterval;
    private readonly maxRetries;
    private readonly retryDelayMs;
    constructor(config: ConnectionManagerConfig);
    /**
     * Connect to the database with retry logic
     *
     * Attempts to establish a database connection with exponential backoff retry.
     * Requirement 6.5: Handle connection errors gracefully
     *
     * @returns Promise that resolves when connection is established
     * @throws Error if all retry attempts fail
     */
    connect(): Promise<void>;
    /**
     * Perform a health check query to verify database connectivity
     *
     * Executes a simple query to ensure the database is responsive.
     * Updates the health status based on the result.
     *
     * @returns Promise that resolves with health status
     */
    healthCheck(): Promise<ConnectionHealth>;
    /**
     * Start periodic health checks
     *
     * Runs health checks at regular intervals to monitor database connectivity.
     */
    private startHealthChecks;
    /**
     * Stop periodic health checks
     */
    private stopHealthChecks;
    /**
     * Get the database instance
     *
     * @returns Database instance
     * @throws Error if not connected
     */
    getDatabase(): Database.Database;
    /**
     * Get current health status
     *
     * @returns Current health status
     */
    getHealth(): ConnectionHealth;
    /**
     * Check if database is currently healthy
     *
     * @returns true if database is healthy
     */
    isHealthy(): boolean;
    /**
     * Disconnect from the database gracefully
     *
     * Stops health checks and closes the database connection.
     */
    disconnect(): Promise<void>;
    /**
     * Reconnect to the database
     *
     * Disconnects and then reconnects with retry logic.
     * Useful for recovering from connection issues.
     *
     * @returns Promise that resolves when reconnected
     */
    reconnect(): Promise<void>;
    /**
     * Execute a query with automatic retry on connection failure
     *
     * If a query fails due to connection issues, attempts to reconnect
     * and retry the query.
     *
     * @param fn - Function that executes the query
     * @returns Result of the query
     */
    executeWithRetry<T>(fn: (db: Database.Database) => T): Promise<T>;
    /**
     * Check if an error is a connection-related error
     *
     * @param error - Error to check
     * @returns true if error is connection-related
     */
    private isConnectionError;
    /**
     * Sleep for specified milliseconds
     *
     * @param ms - Milliseconds to sleep
     */
    private sleep;
}
/**
 * Create a new database connection manager
 *
 * @param config - Connection manager configuration
 * @returns DatabaseConnectionManager instance
 */
export declare function createConnectionManager(config: ConnectionManagerConfig): DatabaseConnectionManager;
//# sourceMappingURL=connection.d.ts.map