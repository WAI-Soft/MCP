/**
 * Unit tests for Offline Queue component
 * 
 * Tests queue operations including queueing updates, retrieving updates,
 * marking status changes, and retry count management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { OfflineQueue, createOfflineQueue, type PendingUpdate } from '../src/queue';
import { initializeDatabase } from '../src/database/schema';

describe('OfflineQueue', () => {
  let db: Database.Database;
  let queue: OfflineQueue;

  beforeEach(() => {
    // Create in-memory database for testing
    db = initializeDatabase({ dbPath: ':memory:', enableWAL: false });
    queue = createOfflineQueue(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('queueUpdate', () => {
    it('should add a pending update to the queue', () => {
      const update: PendingUpdate = {
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1, title: 'Test Task', status: 'in_progress' },
      };

      const id = queue.queueUpdate(update);

      expect(id).toBeGreaterThan(0);

      const queued = queue.getQueuedUpdate(id);
      expect(queued).toBeDefined();
      expect(queued?.operation).toBe('update');
      expect(queued?.direction).toBe('kiro-to-cirvoy');
      expect(queued?.taskData).toEqual(update.taskData);
      expect(queued?.status).toBe('pending');
      expect(queued?.retryCount).toBe(0);
      expect(queued?.maxRetries).toBe(3);
    });

    it('should respect custom retry count and max retries', () => {
      const update: PendingUpdate = {
        operation: 'create',
        direction: 'cirvoy-to-kiro',
        taskData: { title: 'New Task' },
        retryCount: 2,
        maxRetries: 5,
      };

      const id = queue.queueUpdate(update);
      const queued = queue.getQueuedUpdate(id);

      expect(queued?.retryCount).toBe(2);
      expect(queued?.maxRetries).toBe(5);
    });

    it('should handle complex task data with nested objects', () => {
      const update: PendingUpdate = {
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: {
          id: 1,
          title: 'Complex Task',
          metadata: {
            tags: ['urgent', 'bug'],
            assignee: { name: 'John', id: 42 },
          },
        },
      };

      const id = queue.queueUpdate(update);
      const queued = queue.getQueuedUpdate(id);

      expect(queued?.taskData).toEqual(update.taskData);
      expect(queued?.taskData.metadata.tags).toEqual(['urgent', 'bug']);
      expect(queued?.taskData.metadata.assignee.name).toBe('John');
    });

    it('should handle Unicode characters in task data', () => {
      const update: PendingUpdate = {
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: {
          title: 'مهمة عربية 🚀',
          description: '日本語のタスク',
        },
      };

      const id = queue.queueUpdate(update);
      const queued = queue.getQueuedUpdate(id);

      expect(queued?.taskData.title).toBe('مهمة عربية 🚀');
      expect(queued?.taskData.description).toBe('日本語のタスク');
    });
  });

  describe('getQueuedUpdates', () => {
    it('should return updates ordered by creation timestamp', () => {
      // Add multiple updates with slight delays
      const id1 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const id2 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 2 },
      });

      const id3 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 3 },
      });

      const updates = queue.getQueuedUpdates('pending');

      expect(updates).toHaveLength(3);
      expect(updates[0].id).toBe(id1);
      expect(updates[1].id).toBe(id2);
      expect(updates[2].id).toBe(id3);
    });

    it('should filter by status', () => {
      const id1 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const id2 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 2 },
      });

      queue.markAsProcessing(id1);

      const pending = queue.getQueuedUpdates('pending');
      const processing = queue.getQueuedUpdates('processing');

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id2);

      expect(processing).toHaveLength(1);
      expect(processing[0].id).toBe(id1);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        queue.queueUpdate({
          operation: 'update',
          direction: 'kiro-to-cirvoy',
          taskData: { id: i },
        });
      }

      const updates = queue.getQueuedUpdates('pending', 5);

      expect(updates).toHaveLength(5);
    });

    it('should only return updates ready for retry', () => {
      const id1 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const id2 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 2 },
        nextRetryAt: futureDate,
      });

      const updates = queue.getQueuedUpdates('pending');

      // Should only return id1, not id2 (which has future retry time)
      expect(updates).toHaveLength(1);
      expect(updates[0].id).toBe(id1);
    });
  });

  describe('markAsProcessing', () => {
    it('should change status to processing', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      queue.markAsProcessing(id);

      const update = queue.getQueuedUpdate(id);
      expect(update?.status).toBe('processing');
    });
  });

  describe('markAsCompleted', () => {
    it('should change status to completed', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      queue.markAsCompleted(id);

      const update = queue.getQueuedUpdate(id);
      expect(update?.status).toBe('completed');
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const newCount = queue.incrementRetryCount(id);

      expect(newCount).toBe(1);

      const update = queue.getQueuedUpdate(id);
      expect(update?.retryCount).toBe(1);
    });

    it('should calculate next retry time with exponential backoff', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const beforeIncrement = new Date();
      queue.incrementRetryCount(id);
      const afterIncrement = new Date();

      const update = queue.getQueuedUpdate(id);
      expect(update?.nextRetryAt).toBeDefined();

      // Next retry should be in the future (at least 1 second from now)
      expect(update!.nextRetryAt.getTime()).toBeGreaterThan(beforeIncrement.getTime());

      // But not too far in the future (should be within reasonable bounds)
      const maxExpectedDelay = 5000; // 5 seconds for first retry
      expect(update!.nextRetryAt.getTime()).toBeLessThan(
        afterIncrement.getTime() + maxExpectedDelay
      );
    });

    it('should mark as failed after max retries exceeded', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
        maxRetries: 3,
      });

      // Increment 3 times to reach max retries
      queue.incrementRetryCount(id);
      queue.incrementRetryCount(id);
      queue.incrementRetryCount(id);

      const update = queue.getQueuedUpdate(id);
      expect(update?.retryCount).toBe(3);
      expect(update?.status).toBe('failed');
    });

    it('should throw error for non-existent queue entry', () => {
      expect(() => queue.incrementRetryCount(999)).toThrow('Queue entry with id 999 not found');
    });

    it('should apply exponential backoff correctly', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      // First retry
      queue.incrementRetryCount(id);
      const update1 = queue.getQueuedUpdate(id);
      const delay1 = update1!.nextRetryAt.getTime() - new Date().getTime();

      // Reset for second retry
      db.prepare('UPDATE sync_queue SET status = ? WHERE id = ?').run('pending', id);

      // Second retry
      queue.incrementRetryCount(id);
      const update2 = queue.getQueuedUpdate(id);
      const delay2 = update2!.nextRetryAt.getTime() - new Date().getTime();

      // Second delay should be roughly double the first (with jitter tolerance)
      // We allow for significant variance due to jitter
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
    });
  });

  describe('getQueuedUpdate', () => {
    it('should return null for non-existent ID', () => {
      const update = queue.getQueuedUpdate(999);
      expect(update).toBeNull();
    });

    it('should return the correct update', () => {
      const id = queue.queueUpdate({
        operation: 'delete',
        direction: 'cirvoy-to-kiro',
        taskData: { id: 42 },
      });

      const update = queue.getQueuedUpdate(id);

      expect(update).toBeDefined();
      expect(update?.id).toBe(id);
      expect(update?.operation).toBe('delete');
      expect(update?.direction).toBe('cirvoy-to-kiro');
      expect(update?.taskData.id).toBe(42);
    });
  });

  describe('deleteQueuedUpdate', () => {
    it('should delete a queued update', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      queue.deleteQueuedUpdate(id);

      const update = queue.getQueuedUpdate(id);
      expect(update).toBeNull();
    });

    it('should not throw error for non-existent ID', () => {
      expect(() => queue.deleteQueuedUpdate(999)).not.toThrow();
    });
  });

  describe('getQueueStats', () => {
    it('should return correct statistics', () => {
      // Add various updates with different statuses
      const id1 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 1 },
      });

      const id2 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 2 },
      });

      const id3 = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { id: 3 },
      });

      queue.markAsProcessing(id1);
      queue.markAsCompleted(id2);

      const stats = queue.getQueueStats();

      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.total).toBe(3);
    });

    it('should return zeros for empty queue', () => {
      const stats = queue.getQueueStats();

      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty task data', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: {},
      });

      const update = queue.getQueuedUpdate(id);
      expect(update?.taskData).toEqual({});
    });

    it('should handle null values in task data', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { title: null, description: null },
      });

      const update = queue.getQueuedUpdate(id);
      expect(update?.taskData.title).toBeNull();
      expect(update?.taskData.description).toBeNull();
    });

    it('should handle arrays in task data', () => {
      const id = queue.queueUpdate({
        operation: 'update',
        direction: 'kiro-to-cirvoy',
        taskData: { tags: ['tag1', 'tag2', 'tag3'] },
      });

      const update = queue.getQueuedUpdate(id);
      expect(update?.taskData.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });
});
