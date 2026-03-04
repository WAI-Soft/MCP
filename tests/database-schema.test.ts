import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, closeDatabase } from '../src/database/schema';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database Schema', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-test-'));
    dbPath = join(tempDir, 'test.db');
  });

  afterEach(() => {
    // Clean up
    if (db) {
      closeDatabase(db);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Database Initialization', () => {
    it('should create database file', () => {
      db = initializeDatabase({ dbPath });
      expect(db).toBeDefined();
    });

    it('should enable WAL mode by default', () => {
      db = initializeDatabase({ dbPath });
      const result = db.pragma('journal_mode', { simple: true });
      expect(result).toBe('wal');
    });

    it('should not enable WAL mode when explicitly disabled', () => {
      db = initializeDatabase({ dbPath, enableWAL: false });
      const result = db.pragma('journal_mode', { simple: true });
      expect(result).not.toBe('wal');
    });
  });

  describe('task_mappings Table', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should create task_mappings table', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='task_mappings'"
      ).all();
      expect(tables).toHaveLength(1);
    });

    it('should have all required columns', () => {
      const columns = db.pragma('table_info(task_mappings)') as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('kiro_path');
      expect(columnNames).toContain('cirvoy_id');
      expect(columnNames).toContain('spec_id');
      expect(columnNames).toContain('last_synced_at');
      expect(columnNames).toContain('last_sync_direction');
      expect(columnNames).toContain('version');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should have unique constraint on kiro_path', () => {
      const insert = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insert.run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      expect(() => {
        insert.run('path/to/task', 2, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      }).toThrow();
    });

    it('should have unique constraint on cirvoy_id', () => {
      const insert = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insert.run('path/to/task1', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      expect(() => {
        insert.run('path/to/task2', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      }).toThrow();
    });

    it('should have index on cirvoy_id', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='task_mappings' AND name='idx_cirvoy_id'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should have index on spec_id', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='task_mappings' AND name='idx_spec_id'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should set default version to 1', () => {
      const insert = db.prepare(`
        INSERT INTO task_mappings 
        (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insert.run('path/to/task', 1, 'spec1', new Date().toISOString(), 'kiro-to-cirvoy');
      
      const result = db.prepare('SELECT version FROM task_mappings WHERE kiro_path = ?').get('path/to/task') as any;
      expect(result.version).toBe(1);
    });
  });

  describe('sync_queue Table', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should create sync_queue table', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_queue'"
      ).all();
      expect(tables).toHaveLength(1);
    });

    it('should have all required columns', () => {
      const columns = db.pragma('table_info(sync_queue)') as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('operation');
      expect(columnNames).toContain('direction');
      expect(columnNames).toContain('task_data');
      expect(columnNames).toContain('retry_count');
      expect(columnNames).toContain('max_retries');
      expect(columnNames).toContain('next_retry_at');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('status');
    });

    it('should have composite index on status and next_retry_at', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sync_queue' AND name='idx_status_next_retry'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should set default status to pending', () => {
      const insert = db.prepare(`
        INSERT INTO sync_queue (operation, direction, task_data)
        VALUES (?, ?, ?)
      `);
      
      insert.run('update', 'kiro-to-cirvoy', '{}');
      
      const result = db.prepare('SELECT status FROM sync_queue WHERE id = 1').get() as any;
      expect(result.status).toBe('pending');
    });

    it('should set default retry_count to 0', () => {
      const insert = db.prepare(`
        INSERT INTO sync_queue (operation, direction, task_data)
        VALUES (?, ?, ?)
      `);
      
      insert.run('update', 'kiro-to-cirvoy', '{}');
      
      const result = db.prepare('SELECT retry_count FROM sync_queue WHERE id = 1').get() as any;
      expect(result.retry_count).toBe(0);
    });

    it('should set default max_retries to 3', () => {
      const insert = db.prepare(`
        INSERT INTO sync_queue (operation, direction, task_data)
        VALUES (?, ?, ?)
      `);
      
      insert.run('update', 'kiro-to-cirvoy', '{}');
      
      const result = db.prepare('SELECT max_retries FROM sync_queue WHERE id = 1').get() as any;
      expect(result.max_retries).toBe(3);
    });
  });

  describe('conflicts Table', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should create conflicts table', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='conflicts'"
      ).all();
      expect(tables).toHaveLength(1);
    });

    it('should have all required columns', () => {
      const columns = db.pragma('table_info(conflicts)') as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('kiro_path');
      expect(columnNames).toContain('cirvoy_id');
      expect(columnNames).toContain('kiro_version');
      expect(columnNames).toContain('cirvoy_version');
      expect(columnNames).toContain('resolved');
      expect(columnNames).toContain('resolution_strategy');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('resolved_at');
    });

    it('should set default resolved to false', () => {
      const insert = db.prepare(`
        INSERT INTO conflicts (kiro_path, cirvoy_id, kiro_version, cirvoy_version)
        VALUES (?, ?, ?, ?)
      `);
      
      insert.run('path/to/task', 1, '{}', '{}');
      
      const result = db.prepare('SELECT resolved FROM conflicts WHERE id = 1').get() as any;
      expect(result.resolved).toBe(0); // SQLite stores boolean as 0/1
    });
  });

  describe('error_log Table', () => {
    beforeEach(() => {
      db = initializeDatabase({ dbPath });
    });

    it('should create error_log table', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='error_log'"
      ).all();
      expect(tables).toHaveLength(1);
    });

    it('should have all required columns', () => {
      const columns = db.pragma('table_info(error_log)') as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('level');
      expect(columnNames).toContain('message');
      expect(columnNames).toContain('task_path');
      expect(columnNames).toContain('cirvoy_id');
      expect(columnNames).toContain('error_details');
      expect(columnNames).toContain('created_at');
    });

    it('should have composite index on level and created_at', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='error_log' AND name='idx_level_created'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should allow inserting error logs', () => {
      const insert = db.prepare(`
        INSERT INTO error_log (level, message, task_path, cirvoy_id, error_details)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insert.run('error', 'Test error', 'path/to/task', 1, '{"stack":"..."}');
      
      const result = db.prepare('SELECT * FROM error_log WHERE id = 1').get() as any;
      expect(result.level).toBe('error');
      expect(result.message).toBe('Test error');
      expect(result.task_path).toBe('path/to/task');
      expect(result.cirvoy_id).toBe(1);
    });
  });
});
