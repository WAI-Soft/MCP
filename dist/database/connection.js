import { initializeDatabase } from './schema';
/**
 * Database connection manager with retry logic and health monitoring
 */
export class DatabaseConnectionManager {
    constructor(config) {
        this.db = null;
        this.healthCheckInterval = null;
        this.config = config;
        this.maxRetries = config.maxRetries ?? 3;
        this.retryDelayMs = config.retryDelayMs ?? 1000;
        this.health = {
            isHealthy: false,
            lastCheck: new Date(),
        };
    }
    /**
     * Connect to the database with retry logic
     *
     * Attempts to establish a database connection with exponential backoff retry.
     * Requirement 6.5: Handle connection errors gracefully
     *
     * @returns Promise that resolves when connection is established
     * @throws Error if all retry attempts fail
     */
    async connect() {
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                this.db = initializeDatabase(this.config);
                // Verify connection with a simple query
                await this.healthCheck();
                if (this.health.isHealthy) {
                    // Start periodic health checks
                    this.startHealthChecks();
                    return;
                }
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.maxRetries) {
                    // Calculate exponential backoff delay
                    const delay = this.retryDelayMs * Math.pow(2, attempt);
                    await this.sleep(delay);
                }
            }
        }
        throw new Error(`Failed to connect to database after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
    }
    /**
     * Perform a health check query to verify database connectivity
     *
     * Executes a simple query to ensure the database is responsive.
     * Updates the health status based on the result.
     *
     * @returns Promise that resolves with health status
     */
    async healthCheck() {
        const now = new Date();
        try {
            if (!this.db) {
                throw new Error('Database connection not initialized');
            }
            // Execute a simple query to verify connectivity
            const result = this.db.prepare('SELECT 1 as health').get();
            if (result.health === 1) {
                this.health = {
                    isHealthy: true,
                    lastCheck: now,
                };
            }
            else {
                throw new Error('Health check query returned unexpected result');
            }
        }
        catch (error) {
            this.health = {
                isHealthy: false,
                lastCheck: now,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
        return this.health;
    }
    /**
     * Start periodic health checks
     *
     * Runs health checks at regular intervals to monitor database connectivity.
     */
    startHealthChecks() {
        const intervalMs = this.config.healthCheckIntervalMs ?? 30000; // Default 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.healthCheck().catch((error) => {
                console.error('Health check failed:', error);
            });
        }, intervalMs);
    }
    /**
     * Stop periodic health checks
     */
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    /**
     * Get the database instance
     *
     * @returns Database instance
     * @throws Error if not connected
     */
    getDatabase() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
    /**
     * Get current health status
     *
     * @returns Current health status
     */
    getHealth() {
        return { ...this.health };
    }
    /**
     * Check if database is currently healthy
     *
     * @returns true if database is healthy
     */
    isHealthy() {
        return this.health.isHealthy;
    }
    /**
     * Disconnect from the database gracefully
     *
     * Stops health checks and closes the database connection.
     */
    async disconnect() {
        this.stopHealthChecks();
        if (this.db) {
            try {
                this.db.close();
            }
            catch (error) {
                console.error('Error closing database:', error);
            }
            finally {
                this.db = null;
                this.health.isHealthy = false;
            }
        }
    }
    /**
     * Reconnect to the database
     *
     * Disconnects and then reconnects with retry logic.
     * Useful for recovering from connection issues.
     *
     * @returns Promise that resolves when reconnected
     */
    async reconnect() {
        await this.disconnect();
        await this.connect();
    }
    /**
     * Execute a query with automatic retry on connection failure
     *
     * If a query fails due to connection issues, attempts to reconnect
     * and retry the query.
     *
     * @param fn - Function that executes the query
     * @returns Result of the query
     */
    async executeWithRetry(fn) {
        try {
            const db = this.getDatabase();
            return fn(db);
        }
        catch (error) {
            // Check if it's a connection error
            if (this.isConnectionError(error)) {
                // Attempt to reconnect
                await this.reconnect();
                // Retry the query once
                const db = this.getDatabase();
                return fn(db);
            }
            // Re-throw non-connection errors
            throw error;
        }
    }
    /**
     * Check if an error is a connection-related error
     *
     * @param error - Error to check
     * @returns true if error is connection-related
     */
    isConnectionError(error) {
        if (!(error instanceof Error)) {
            return false;
        }
        const message = error.message.toLowerCase();
        return (message.includes('database') ||
            message.includes('connection') ||
            message.includes('sqlite') ||
            message.includes('not open'));
    }
    /**
     * Sleep for specified milliseconds
     *
     * @param ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
/**
 * Create a new database connection manager
 *
 * @param config - Connection manager configuration
 * @returns DatabaseConnectionManager instance
 */
export function createConnectionManager(config) {
    return new DatabaseConnectionManager(config);
}
//# sourceMappingURL=connection.js.map