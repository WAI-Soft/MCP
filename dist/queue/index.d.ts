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
 * Offline Queue Manager
 *
 * Manages the sync_queue table for storing and processing pending updates
 * when network connectivity is unavailable.
 */
export declare class OfflineQueue {
    private db;
    private retryConfig;
    constructor(db: Database.Database, retryConfig?: RetryConfig);
    /**
     * Add a pending update to the queue
     *
     * Requirement 1.5: Queue update for later synchronization
     * Requirement 6.1: Queue pending updates locally when network is lost
     *
     * @param update - The update to queue
     * @returns The ID of the queued update
     */
    queueUpdate(update: PendingUpdate): number;
    /**
     * Get queued updates ordered by timestamp
     *
     * Requirement 6.2: Process queued updates in chronological order
     *
     * @param status - Optional status filter (default: 'pending')
     * @param limit - Maximum number of updates to retrieve
     * @returns Array of queued updates ordered by creation time
     */
    getQueuedUpdates(status?: QueueStatus, limit?: number): QueuedUpdate[];
    /**
     * Mark an update as processing
     *
     * @param id - The ID of the update to mark
     */
    markAsProcessing(id: number): void;
    /**
     * Mark an update as completed
     *
     * @param id - The ID of the update to mark
     */
    markAsCompleted(id: number): void;
    /**
     * Increment retry count and calculate next retry time
     *
     * Requirement 1.4: Retry with exponential backoff
     * Requirement 6.3: Retry with exponential backoff for server errors
     *
     * @param id - The ID of the update to increment
     * @returns The updated retry count
     */
    incrementRetryCount(id: number): number;
    /**
     * Calculate next retry time using exponential backoff with jitter
     *
     * @param attemptNumber - The retry attempt number (1-based)
     * @returns The next retry timestamp
     */
    private calculateNextRetryTime;
    /**
     * Get a specific queued update by ID
     *
     * @param id - The ID of the update
     * @returns The queued update or null if not found
     */
    getQueuedUpdate(id: number): QueuedUpdate | null;
    /**
     * Delete a queued update
     *
     * @param id - The ID of the update to delete
     */
    deleteQueuedUpdate(id: number): void;
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
    };
    /**
     * Map database row to QueuedUpdate object
     *
     * @param row - Database row
     * @returns QueuedUpdate object
     */
    private mapRowToQueuedUpdate;
}
/**
 * Create an OfflineQueue instance
 *
 * @param db - Database instance
 * @param retryConfig - Optional retry configuration
 * @returns OfflineQueue instance
 */
export declare function createOfflineQueue(db: Database.Database, retryConfig?: RetryConfig): OfflineQueue;
//# sourceMappingURL=index.d.ts.map