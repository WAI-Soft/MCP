/**
 * Offline Queue Component for Cirvoy-Kiro MCP Integration
 * 
 * This module implements the offline queue that stores pending updates when
 * network is unavailable. It provides operations for queueing, retrieving,
 * and processing synchronization operations.
 * 
 * Requirements: 1.5, 6.1, 6.2
 */

import Database from 'better-sqlite3';

/**
 * Queue operation types
 */
export type QueueOperation = 'create' | 'update' | 'delete';

/**
 * Queue sync direction
 */
export type QueueDirection = 'kiro-to-cirvoy' | 'cirvoy-to-kiro';

/**
 * Queue entry status
 */
export type QueueStatus = 'pending' | 'processing' | 'failed' | 'completed';

/**
 * Pending update entry in the queue
 */
export interface PendingUpdate {
  id?: number;
  operation: QueueOperation;
  direction: QueueDirection;
  taskData: any;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: Date;
  createdAt?: Date;
  status?: QueueStatus;
}

/**
 * Queued update with all database fields
 */
export interface QueuedUpdate extends Required<PendingUpdate> {
  id: number;
}

/**
 * Configuration for retry backoff calculation
 */
export interface RetryConfig {
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  jitterMs: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  jitterMs: 500,
};

/**
 * Offline Queue Manager
 * 
 * Manages the sync_queue table for storing and processing pending updates
 * when network connectivity is unavailable.
 */
export class OfflineQueue {
  private db: Database.Database;
  private retryConfig: RetryConfig;

  constructor(db: Database.Database, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.db = db;
    this.retryConfig = retryConfig;
  }

  /**
   * Add a pending update to the queue
   * 
   * Requirement 1.5: Queue update for later synchronization
   * Requirement 6.1: Queue pending updates locally when network is lost
   * 
   * @param update - The update to queue
   * @returns The ID of the queued update
   */
  queueUpdate(update: PendingUpdate): number {
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (
        operation,
        direction,
        task_data,
        retry_count,
        max_retries,
        next_retry_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      update.operation,
      update.direction,
      JSON.stringify(update.taskData),
      update.retryCount ?? 0,
      update.maxRetries ?? 3,
      update.nextRetryAt ? update.nextRetryAt.toISOString() : null,
      update.status ?? 'pending'
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get queued updates ordered by timestamp
   * 
   * Requirement 6.2: Process queued updates in chronological order
   * 
   * @param status - Optional status filter (default: 'pending')
   * @param limit - Maximum number of updates to retrieve
   * @returns Array of queued updates ordered by creation time
   */
  getQueuedUpdates(status: QueueStatus = 'pending', limit?: number): QueuedUpdate[] {
    let query = `
      SELECT 
        id,
        operation,
        direction,
        task_data,
        retry_count,
        max_retries,
        next_retry_at,
        created_at,
        status
      FROM sync_queue
      WHERE status = ?
        AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
      ORDER BY created_at ASC
    `;

    if (limit) {
      query += ` LIMIT ?`;
    }

    const stmt = this.db.prepare(query);
    const rows = limit ? stmt.all(status, limit) : stmt.all(status);

    return rows.map(this.mapRowToQueuedUpdate);
  }

  /**
   * Mark an update as processing
   * 
   * @param id - The ID of the update to mark
   */
  markAsProcessing(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE sync_queue
      SET status = 'processing'
      WHERE id = ?
    `);

    stmt.run(id);
  }

  /**
   * Mark an update as completed
   * 
   * @param id - The ID of the update to mark
   */
  markAsCompleted(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE sync_queue
      SET status = 'completed'
      WHERE id = ?
    `);

    stmt.run(id);
  }

  /**
   * Increment retry count and calculate next retry time
   * 
   * Requirement 1.4: Retry with exponential backoff
   * Requirement 6.3: Retry with exponential backoff for server errors
   * 
   * @param id - The ID of the update to increment
   * @returns The updated retry count
   */
  incrementRetryCount(id: number): number {
    // Get current retry count
    const getStmt = this.db.prepare(`
      SELECT retry_count, max_retries
      FROM sync_queue
      WHERE id = ?
    `);

    const row = getStmt.get(id) as { retry_count: number; max_retries: number } | undefined;

    if (!row) {
      throw new Error(`Queue entry with id ${id} not found`);
    }

    const newRetryCount = row.retry_count + 1;

    // Calculate next retry time with exponential backoff
    const nextRetryAt = this.calculateNextRetryTime(newRetryCount);

    // Determine new status
    const newStatus = newRetryCount >= row.max_retries ? 'failed' : 'pending';

    // Update the entry
    const updateStmt = this.db.prepare(`
      UPDATE sync_queue
      SET 
        retry_count = ?,
        next_retry_at = ?,
        status = ?
      WHERE id = ?
    `);

    updateStmt.run(newRetryCount, nextRetryAt.toISOString(), newStatus, id);

    return newRetryCount;
  }

  /**
   * Calculate next retry time using exponential backoff with jitter
   * 
   * @param attemptNumber - The retry attempt number (1-based)
   * @returns The next retry timestamp
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const { baseDelayMs, backoffMultiplier, maxDelayMs, jitterMs } = this.retryConfig;

    // Calculate exponential delay
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

    // Add random jitter
    const jitter = Math.random() * jitterMs;
    const totalDelay = cappedDelay + jitter;

    // Calculate next retry time
    const nextRetry = new Date();
    nextRetry.setMilliseconds(nextRetry.getMilliseconds() + totalDelay);

    return nextRetry;
  }

  /**
   * Get a specific queued update by ID
   * 
   * @param id - The ID of the update
   * @returns The queued update or null if not found
   */
  getQueuedUpdate(id: number): QueuedUpdate | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        operation,
        direction,
        task_data,
        retry_count,
        max_retries,
        next_retry_at,
        created_at,
        status
      FROM sync_queue
      WHERE id = ?
    `);

    const row = stmt.get(id);

    if (!row) {
      return null;
    }

    return this.mapRowToQueuedUpdate(row);
  }

  /**
   * Delete a queued update
   * 
   * @param id - The ID of the update to delete
   */
  deleteQueuedUpdate(id: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM sync_queue
      WHERE id = ?
    `);

    stmt.run(id);
  }

  /**
   * Get queue statistics
   * 
   * @returns Statistics about the queue
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    failed: number;
    completed: number;
    total: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM sync_queue
      GROUP BY status
    `);

    const rows = stmt.all() as Array<{ status: QueueStatus; count: number }>;

    const stats = {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0,
      total: 0,
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  }

  /**
   * Map database row to QueuedUpdate object
   * 
   * @param row - Database row
   * @returns QueuedUpdate object
   */
  private mapRowToQueuedUpdate(row: any): QueuedUpdate {
    return {
      id: row.id,
      operation: row.operation as QueueOperation,
      direction: row.direction as QueueDirection,
      taskData: JSON.parse(row.task_data),
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : new Date(),
      createdAt: new Date(row.created_at),
      status: row.status as QueueStatus,
    };
  }
}

/**
 * Create an OfflineQueue instance
 * 
 * @param db - Database instance
 * @param retryConfig - Optional retry configuration
 * @returns OfflineQueue instance
 */
export function createOfflineQueue(
  db: Database.Database,
  retryConfig?: RetryConfig
): OfflineQueue {
  return new OfflineQueue(db, retryConfig);
}
