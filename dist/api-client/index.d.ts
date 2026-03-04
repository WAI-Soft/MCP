/**
 * API Client for Cirvoy REST API
 *
 * This module provides an HTTP client for communicating with the Cirvoy project management system.
 * It handles authentication, request/response processing, timeout configuration, and retry logic.
 *
 * Requirements: 4.1, 4.2
 */
import { AxiosInstance } from 'axios';
import { CirvoyTask } from '../types/task.js';
/**
 * Configuration options for the API client
 */
export interface APIClientConfig {
    /** Base URL for the Cirvoy API */
    baseURL: string;
    /** API authentication token */
    token: string;
    /** Request timeout in milliseconds */
    timeout: number;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Base delay for exponential backoff in milliseconds */
    retryBackoffMs?: number;
}
/**
 * API Client for Cirvoy REST API
 *
 * Provides methods for authenticating and communicating with the Cirvoy system.
 * Includes automatic retry logic with exponential backoff for transient failures.
 */
export declare class APIClient {
    private client;
    private token;
    private baseURL;
    private timeout;
    private maxRetries;
    private retryBackoffMs;
    /**
     * Creates a new API client instance
     *
     * @param config - Configuration options for the client
     */
    constructor(config: APIClientConfig);
    /**
     * Authenticates with the Cirvoy API using the provided token
     *
     * @param token - API authentication token
     * @returns Promise that resolves to true if authentication succeeds
     * @throws Error if authentication fails
     */
    authenticate(token: string): Promise<boolean>;
    /**
     * Sets the authentication token for subsequent requests
     *
     * @param token - API authentication token
     */
    setToken(token: string): void;
    /**
     * Sets the base URL for API requests
     *
     * @param url - Base URL for the Cirvoy API
     */
    setBaseURL(url: string): void;
    /**
     * Sets the request timeout
     *
     * @param ms - Timeout in milliseconds
     */
    setTimeout(ms: number): void;
    /**
     * Gets the current base URL
     */
    getBaseURL(): string;
    /**
     * Gets the current timeout value
     */
    getTimeout(): number;
    /**
     * Gets the axios instance for making custom requests
     */
    getClient(): AxiosInstance;
    /**
     * Determines if a request should be retried based on the error
     *
     * @param error - The axios error
     * @param retryCount - Current retry attempt count
     * @returns true if the request should be retried
     */
    private shouldRetry;
    /**
     * Calculates the delay before the next retry attempt using exponential backoff with jitter
     *
     * @param attemptNumber - The current retry attempt number (1-indexed)
     * @returns Delay in milliseconds
     */
    private calculateRetryDelay;
    /**
     * Sleeps for the specified duration
     *
     * @param ms - Duration in milliseconds
     */
    private sleep;
    /**
     * Gets a task from Cirvoy by ID
     *
     * @param taskId - The Cirvoy task ID
     * @returns Promise that resolves to the task data
     * @throws Error if the task is not found or request fails
     */
    getTask(taskId: number): Promise<CirvoyTask>;
    /**
     * Updates a task in Cirvoy
     *
     * @param taskId - The Cirvoy task ID to update
     * @param updates - Partial task data to update
     * @returns Promise that resolves to the updated task data
     * @throws Error if the update fails
     */
    updateTask(taskId: number, updates: Partial<CirvoyTask>): Promise<CirvoyTask>;
    /**
     * Creates a new task in Cirvoy
     *
     * @param task - Partial task data for the new task
     * @returns Promise that resolves to the created task data
     * @throws Error if the creation fails
     */
    createTask(task: Partial<CirvoyTask>): Promise<CirvoyTask>;
    /**
     * Batch updates multiple tasks in Cirvoy
     *
     * This method is used when more than 10 tasks need to be updated to reduce network overhead.
     *
     * @param updates - Array of task updates
     * @returns Promise that resolves to the batch update result
     * @throws Error if the batch update fails
     */
    batchUpdateTasks(updates: TaskUpdate[]): Promise<BatchUpdateResult>;
}
/**
 * Task update for batch operations
 */
export interface TaskUpdate {
    /** The Cirvoy task ID to update */
    taskId: number;
    /** Partial task data to update */
    updates: Partial<CirvoyTask>;
}
/**
 * Result of a batch update operation
 */
export interface BatchUpdateResult {
    /** Array of task IDs that were successfully updated */
    successful: number[];
    /** Array of failed updates with error details */
    failed: Array<{
        taskId: number;
        error: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map