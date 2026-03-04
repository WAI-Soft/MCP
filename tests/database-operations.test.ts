import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, closeDatabase } from '../src/database/schema';
import { createConnectionManager, DatabaseConnectionManager } from '../src/database/connection';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database Operations', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-test-'));
    dbPath = join(tempDir, 'test.db');
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Schema Creation', () => {
    it('should create all required tables in correct order', () => {
      db = initializeDatabase({ dbPath });
      
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all() as Array<{ name: string }>;
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('task_mappings');
      expect(tableNames).toContain('sync_queue');
      expect(tableNames).toContain('conflicts');
      expect(tableNames).toContain('error_log');
    });

    it('should be idempotent - multiple initializations should not fail', () => {
      db = initializeDatabase({ dbPath });
      
      // Initialize again - should not throw
      expect(() => {
        initializeDatabase({ dbPath });
      }).not.toThrow();
    });

    it('should create all indexes', () => {
      db = initializeDatabase({ dbPath });
      
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index'"
      ).all() as Array<{ name: string }>;
      
      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_cirvoy_id');
      expect(indexNames).toContain('idx_spec_id');
      expect(indexNames).toContain('idx_status_next_retry');
      expect(indexNames).toContain('idx_level_created');
    });
  });

  describe('WAL Mode Configuration', () => {
    it('should enable WAL mode by default', () => {
      db = initializeDatabase({ dbPath });
      
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
    });

    it('should respect enableWAL=false configuration', () => {
      db = initializeDatabase({ dbPath, enableWAL: false });
      
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).not.toBe('wal');
    });

    it('should allow concurrent reads with WAL mode', () => {
      db = initializeDatabase({ dbPath, enableWAL: true });
      
      // Insert test data
      db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `).run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      // Open second connection for concurrent read
      const db2 = new Database(dbPath);
      
      // Both should be able to read
      const result1 = db.prepare('SELECT * FROM task_mappings').all();
      const result2 = db2.prepare('SELECT * FROM task_mappings').all();
      
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      
      db2.close();
    });

    it('should configure WAL checkpoint settings', () => {
      db = initializeDatabase({ dbPath, enableWAL: true });
      
      // WAL mode should be active
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
      
      // Should be able to checkpoint
      const checkpoint = db.pragma('wal_checkpoint(PASSIVE)');
      expect(checkpoint).toBeDefined();
    });
  });

  describe('Transaction Handling', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should support transactions for atomic operations', () => {
      const insertMapping = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((mappings: Array<any>) => {
        for (const mapping of mappings) {
          insertMapping.run(...mapping);
        }
      });
      
      const mappings = [
        ['path/1', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy'],
        ['path/2', 2, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy'],
        ['path/3', 3, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy'],
      ];
      
      transaction(mappings);
      
      const count = db.prepare('SELECT COUNT(*) as count FROM task_mappings').get() as { count: number };
      expect(count.count).toBe(3);
    });

    it('should rollback transaction on error', () => {
      const insertMapping = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((mappings: Array<any>) => {
        for (const mapping of mappings) {
          insertMapping.run(...mapping);
        }
      });
      
      // First mapping is valid, second has duplicate cirvoy_id
      const mappings = [
        ['path/1', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy'],
        ['path/2', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy'], // Duplicate cirvoy_id
      ];
      
      expect(() => transaction(mappings)).toThrow();
      
      // No mappings should be inserted due to rollback
      const count = db.prepare('SELECT COUNT(*) as count FROM task_mappings').get() as { count: number };
      expect(count.count).toBe(0);
    });
  });

  describe('Database Integrity', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should pass integrity check after initialization', () => {
      const result = db.pragma('integrity_check', { simple: true });
      expect(result).toBe('ok');
    });

    it('should maintain referential integrity with constraints', () => {
      // Insert a valid mapping
      db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `).run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      // Try to insert duplicate kiro_path - should fail
      expect(() => {
        db.prepare(`
          INSERT INTO task_mappings 
          (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
          VALUES (?, ?, ?, ?, ?)
        `).run('path/to/task', 2, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      }).toThrow();
      
      // Try to insert duplicate cirvoy_id - should fail
      expect(() => {
        db.prepare(`
          INSERT INTO task_mappings 
          (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
          VALUES (?, ?, ?, ?, ?)
        `).run('path/to/task2', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      }).toThrow();
    });

    it('should handle foreign key constraints properly', () => {
      // SQLite foreign keys are disabled by default, but we can enable them
      db.pragma('foreign_keys = ON');
      
      const foreignKeys = db.pragma('foreign_keys', { simple: true });
      expect(foreignKeys).toBe(1);
    });
  });

  describe('Connection Manager Integration', () => {
    let manager: DatabaseConnectionManager;

    afterEach(async () => {
      if (manager) {
        await manager.disconnect();
      }
    });

    it('should initialize schema through connection manager', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      const db = manager.getDatabase();
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as Array<{ name: string }>;
      
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should maintain WAL mode after reconnection', async () => {
      manager = createConnectionManager({ dbPath, enableWAL: true });
      await manager.connect();
      
      let db = manager.getDatabase();
      let journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
      
      await manager.reconnect();
      
      db = manager.getDatabase();
      journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
    });

    it('should handle schema operations with retry logic', async () => {
      manager = createConnectionManager({ dbPath, maxRetries: 2, retryDelayMs: 10 });
      await manager.connect();
      
      const result = await manager.executeWithRetry((db) => {
        return db.prepare('SELECT COUNT(*) as count FROM task_mappings').get() as { count: number };
      });
      
      expect(result.count).toBe(0);
    });
  });

  describe('Schema Migrations', () => {
    it('should support adding new columns without breaking existing data', () => {
      db = initializeDatabase({ dbPath });
      
      // Insert data with current schema
      db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `).run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      // Simulate migration: add new column
      db.exec('ALTER TABLE task_mappings ADD COLUMN metadata TEXT');
      
      // Existing data should still be accessible
      const result = db.prepare('SELECT * FROM task_mappings WHERE kiro_path = ?').get('path/to/task') as any;
      expect(result.kiro_path).toBe('path/to/task');
      expect(result.cirvoy_id).toBe(1);
      expect(result.metadata).toBeNull();
    });

    it('should support creating new indexes on existing tables', () => {
      db = initializeDatabase({ dbPath });
      
      // Insert test data
      db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `).run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      // Create new index
      db.exec('CREATE INDEX IF NOT EXISTS idx_updated_at ON task_mappings(updated_at)');
      
      // Verify index was created
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_updated_at'"
      ).all();
      expect(indexes).toHaveLength(1);
      
      // Data should still be accessible
      const result = db.prepare('SELECT * FROM task_mappings').all();
      expect(result).toHaveLength(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous inserts to different tables', () => {
      db = initializeDatabase({ dbPath, enableWAL: true });
      
      // Insert to multiple tables simultaneously
      const insertMapping = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const insertQueue = db.prepare(`
        INSERT INTO sync_queue (operation, direction, task_data)
        VALUES (?, ?, ?)
      `);
      
      const insertError = db.prepare(`
        INSERT INTO error_log (level, message)
        VALUES (?, ?)
      `);
      
      insertMapping.run('path/1', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      insertQueue.run('update', 'kiro-to-cirvoy', '{}');
      insertError.run('info', 'Test message');
      
      // Verify all inserts succeeded
      const mappingCount = db.prepare('SELECT COUNT(*) as count FROM task_mappings').get() as { count: number };
      const queueCount = db.prepare('SELECT COUNT(*) as count FROM sync_queue').get() as { count: number };
      const errorCount = db.prepare('SELECT COUNT(*) as count FROM error_log').get() as { count: number };
      
      expect(mappingCount.count).toBe(1);
      expect(queueCount.count).toBe(1);
      expect(errorCount.count).toBe(1);
    });
  });
});
