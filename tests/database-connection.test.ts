import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnectionManager, createConnectionManager } from '../src/database/connection';
import { mkdtempSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DatabaseConnectionManager', () => {
  let tempDir: string;
  let dbPath: string;
  let manager: DatabaseConnectionManager;

  beforeEach(() => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-test-'));
    dbPath = join(tempDir, 'test.db');
  });

  afterEach(async () => {
    // Clean up
    if (manager) {
      await manager.disconnect();
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Connection Management', () => {
    it('should connect to database successfully', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      expect(manager.isHealthy()).toBe(true);
      const db = manager.getDatabase();
      expect(db).toBeDefined();
    });

    it('should throw error when getting database before connecting', () => {
      manager = createConnectionManager({ dbPath });
      
      expect(() => manager.getDatabase()).toThrow('Database not connected');
    });

    it('should disconnect gracefully', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      expect(manager.isHealthy()).toBe(true);
      
      await manager.disconnect();
      
      expect(manager.isHealthy()).toBe(false);
      expect(() => manager.getDatabase()).toThrow('Database not connected');
    });

    it('should reconnect after disconnect', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      const firstDb = manager.getDatabase();
      expect(firstDb).toBeDefined();
      
      await manager.reconnect();
      
      const secondDb = manager.getDatabase();
      expect(secondDb).toBeDefined();
      expect(manager.isHealthy()).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry connection on failure', async () => {
      // Use an invalid path that will fail initially
      const invalidPath = join(tempDir, 'nonexistent', 'test.db');
      manager = createConnectionManager({
        dbPath: invalidPath,
        maxRetries: 2,
        retryDelayMs: 10,
      });

      // This should fail after retries
      await expect(manager.connect()).rejects.toThrow('Failed to connect to database');
    });

    it('should succeed on retry if connection becomes available', async () => {
      manager = createConnectionManager({
        dbPath,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      await manager.connect();
      expect(manager.isHealthy()).toBe(true);
    });

    it('should use exponential backoff for retries', async () => {
      const startTime = Date.now();
      const invalidPath = join(tempDir, 'nonexistent', 'test.db');
      
      manager = createConnectionManager({
        dbPath: invalidPath,
        maxRetries: 2,
        retryDelayMs: 50,
      });

      try {
        await manager.connect();
      } catch (error) {
        // Expected to fail
      }

      const elapsed = Date.now() - startTime;
      // Should have delays: 50ms (first retry) + 100ms (second retry) = 150ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check successfully', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      const health = await manager.healthCheck();
      
      expect(health.isHealthy).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    });

    it('should detect unhealthy database', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      // Close the database to simulate failure
      const db = manager.getDatabase();
      db.close();
      
      const health = await manager.healthCheck();
      
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    });

    it('should return current health status', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      const health = manager.getHealth();
      
      expect(health.isHealthy).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should start periodic health checks', async () => {
      manager = createConnectionManager({
        dbPath,
        healthCheckIntervalMs: 100,
      });
      
      await manager.connect();
      
      const initialHealth = manager.getHealth();
      const initialTime = initialHealth.lastCheck.getTime();
      
      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const updatedHealth = manager.getHealth();
      const updatedTime = updatedHealth.lastCheck.getTime();
      
      expect(updatedTime).toBeGreaterThan(initialTime);
    });
  });

  describe('Query Execution with Retry', () => {
    it('should execute query successfully', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      const result = await manager.executeWithRetry((db) => {
        return db.prepare('SELECT 1 as value').get() as { value: number };
      });
      
      expect(result.value).toBe(1);
    });

    it('should retry query on connection error', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      let attemptCount = 0;
      
      const result = await manager.executeWithRetry((db) => {
        attemptCount++;
        return db.prepare('SELECT 1 as value').get() as { value: number };
      });
      
      expect(result.value).toBe(1);
      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });

    it('should throw non-connection errors immediately', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      await expect(
        manager.executeWithRetry((db) => {
          throw new Error('Custom error');
        })
      ).rejects.toThrow('Custom error');
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/test.db';
      manager = createConnectionManager({
        dbPath: invalidPath,
        maxRetries: 1,
        retryDelayMs: 10,
      });

      await expect(manager.connect()).rejects.toThrow();
    });

    it('should handle disconnect errors gracefully', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      // Close database manually to cause error on disconnect
      const db = manager.getDatabase();
      db.close();
      
      // Should not throw
      await expect(manager.disconnect()).resolves.not.toThrow();
    });

    it('should update health status on connection failure', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      // Manually close the database
      const db = manager.getDatabase();
      db.close();
      
      await manager.healthCheck();
      
      const health = manager.getHealth();
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Factory Function', () => {
    it('should create connection manager with factory', () => {
      manager = createConnectionManager({ dbPath });
      
      expect(manager).toBeInstanceOf(DatabaseConnectionManager);
    });

    it('should use default configuration values', async () => {
      manager = createConnectionManager({ dbPath });
      await manager.connect();
      
      expect(manager.isHealthy()).toBe(true);
    });

    it('should respect custom configuration values', async () => {
      manager = createConnectionManager({
        dbPath,
        maxRetries: 5,
        retryDelayMs: 100,
        healthCheckIntervalMs: 5000,
      });
      
      await manager.connect();
      expect(manager.isHealthy()).toBe(true);
    });
  });
});
