import Database from 'better-sqlite3';
/**
 * Initialize the database schema with all required tables and indexes
 *
 * @param config - Database configuration
 * @returns Initialized database instance
 */
export function initializeDatabase(config) {
    const db = new Database(config.dbPath);
    // Enable WAL mode for better concurrency (Requirement 6.1, 7.2)
    if (config.enableWAL !== false) {
        db.pragma('journal_mode = WAL');
    }
    // Create all tables
    createTaskMappingsTable(db);
    createSyncQueueTable(db);
    createConflictsTable(db);
    createErrorLogTable(db);
    return db;
}
/**
 * Create task_mappings table with indexes
 *
 * Stores mappings between Kiro task paths and Cirvoy task IDs
 * Requirement 3.2: Task mapping storage in persistent database
 */
function createTaskMappingsTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS task_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiro_path TEXT NOT NULL UNIQUE,
      cirvoy_id INTEGER NOT NULL UNIQUE,
      spec_id TEXT NOT NULL,
      last_synced_at DATETIME NOT NULL,
      last_sync_direction TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Create indexes for efficient lookups (Requirement 3.3)
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cirvoy_id ON task_mappings(cirvoy_id);
  `);
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_spec_id ON task_mappings(spec_id);
  `);
}
/**
 * Create sync_queue table with indexes
 *
 * Stores pending synchronization operations for offline support
 * Requirement 6.1: Queue pending updates locally when network is lost
 */
function createSyncQueueTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      direction TEXT NOT NULL,
      task_data TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      next_retry_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending'
    );
  `);
    // Create composite index for efficient queue processing
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_status_next_retry 
    ON sync_queue(status, next_retry_at);
  `);
}
/**
 * Create conflicts table
 *
 * Stores detected conflicts when same task is modified in both systems
 * Requirement 7.2: Preserve both versions of task data when conflict detected
 */
function createConflictsTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiro_path TEXT NOT NULL,
      cirvoy_id INTEGER NOT NULL,
      kiro_version TEXT NOT NULL,
      cirvoy_version TEXT NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      resolution_strategy TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );
  `);
}
/**
 * Create error_log table with indexes
 *
 * Comprehensive error logging for debugging and monitoring
 * Requirement 6.5: Maintain error log with timestamps and details
 */
function createErrorLogTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      task_path TEXT,
      cirvoy_id INTEGER,
      error_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Create composite index for efficient log queries
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_level_created 
    ON error_log(level, created_at);
  `);
}
/**
 * Close database connection properly
 *
 * @param db - Database instance to close
 */
export function closeDatabase(db) {
    db.close();
}
//# sourceMappingURL=schema.js.map