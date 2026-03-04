/**
 * Database module exports
 *
 * Provides database schema initialization and connection management
 * for the Cirvoy-Kiro MCP Integration server.
 */
export { initializeDatabase, closeDatabase, type DatabaseConfig, } from './schema';
export { DatabaseConnectionManager, createConnectionManager, type ConnectionManagerConfig, type ConnectionHealth, } from './connection';
//# sourceMappingURL=index.d.ts.map