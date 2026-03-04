import Database from 'better-sqlite3';
/**
 * Database schema initialization for Cirvoy-Kiro MCP Integration
 *
 * This module creates and manages the SQLite database schema including:
 * - task_mappings: Links between Kiro task paths and Cirvoy task IDs
 * - sync_queue: Offline queue for pending synchronization operations
 * - conflicts: Log of detected conflicts between systems
 * - error_log: Comprehensive error logging with timestamps
 */
export interface DatabaseConfig {
    dbPath: string;
    enableWAL?: boolean;
}
/**
 * Initialize the database schema with all required tables and indexes
 *
 * @param config - Database configuration
 * @returns Initialized database instance
 */
export declare function initializeDatabase(config: DatabaseConfig): Database.Database;
/**
 * Close database connection properly
 *
 * @param db - Database instance to close
 */
export declare function closeDatabase(db: Database.Database): void;
//# sourceMappingURL=schema.d.ts.map