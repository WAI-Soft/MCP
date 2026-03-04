/**
 * API Client for Cirvoy REST API
 * 
 * This module provides an HTTP client for communicating with the Cirvoy project management system.
 * It handles authentication, request/response processing, timeout configuration, and retry logic.
 * 
 * Requirements: 4.1, 4.2
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
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
export class APIClient {
  private client: AxiosInstance;
  private token: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private retryBackoffMs: number;

  /**
   * Creates a new API client instance
   * 
   * @param config - Configuration options for the client
   */
  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.token = config.token;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBackoffMs = config.retryBackoffMs ?? 1000;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    });

    // Add request interceptor for logging and token injection
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Ensure token is always set
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
        
        if (!config) {
          return Promise.reject(error);
        }

        // Initialize retry count
        config._retryCount = config._retryCount ?? 0;

        // Check if we should retry
        const shouldRetry = this.shouldRetry(error, config._retryCount);
        
        if (shouldRetry && config._retryCount < this.maxRetries) {
          config._retryCount++;
          
          // Calculate delay with exponential backoff and jitter
          const delay = this.calculateRetryDelay(config._retryCount);
          
          // Wait before retrying
          await this.sleep(delay);
          
          // Retry the request
          return this.client.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticates with the Cirvoy API using the provided token
   * 
   * @param token - API authentication token
   * @returns Promise that resolves to true if authentication succeeds
   * @throws Error if authentication fails
   */
  async authenticate(token: string): Promise<boolean> {
    try {
      // Test the token by making a request to a validation endpoint
      // Assuming Cirvoy has a /auth/validate or similar endpoint
      const response = await this.client.get('/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        this.token = token;
        return true;
      }

      return false;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed: Invalid or expired token');
        }
      }
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets the authentication token for subsequent requests
   * 
   * @param token - API authentication token
   */
  setToken(token: string): void {
    this.token = token;
    // Update default headers
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Sets the base URL for API requests
   * 
   * @param url - Base URL for the Cirvoy API
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * Sets the request timeout
   * 
   * @param ms - Timeout in milliseconds
   */
  setTimeout(ms: number): void {
    this.timeout = ms;
    this.client.defaults.timeout = ms;
  }

  /**
   * Gets the current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Gets the current timeout value
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Gets the axios instance for making custom requests
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Determines if a request should be retried based on the error
   * 
   * @param error - The axios error
   * @param retryCount - Current retry attempt count
   * @returns true if the request should be retried
   */
  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exceeded max retries
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.response.status >= 500 && error.response.status < 600) {
      return true;
    }

    // Retry on 429 (rate limit)
    if (error.response.status === 429) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429)
    if (error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    return false;
  }

  /**
   * Calculates the delay before the next retry attempt using exponential backoff with jitter
   * 
   * @param attemptNumber - The current retry attempt number (1-indexed)
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const maxDelayMs = 30000; // 30 seconds max
    const jitterMs = 500;
    
    // Exponential backoff: baseDelay * 2^(attemptNumber - 1)
    const exponentialDelay = this.retryBackoffMs * Math.pow(2, attemptNumber - 1);
    
    // Cap the delay at maxDelayMs
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    
    // Add random jitter
    const jitter = Math.random() * jitterMs;
    
    return cappedDelay + jitter;
  }

  /**
   * Sleeps for the specified duration
   * 
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

    /**
     * Gets a task from Cirvoy by ID
     *
     * @param taskId - The Cirvoy task ID
     * @returns Promise that resolves to the task data
     * @throws Error if the task is not found or request fails
     */
    async getTask(taskId: number): Promise<CirvoyTask> {
      try {
        const response = await this.client.get(`/tasks/${taskId}`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            throw new Error(`Task ${taskId} not found`);
          }
          throw new Error(`Failed to get task ${taskId}: ${error.response?.statusText || error.message}`);
        }
        throw error;
      }
    }

    /**
     * Updates a task in Cirvoy
     *
     * @param taskId - The Cirvoy task ID to update
     * @param updates - Partial task data to update
     * @returns Promise that resolves to the updated task data
     * @throws Error if the update fails
     */
    async updateTask(taskId: number, updates: Partial<CirvoyTask>): Promise<CirvoyTask> {
      try {
        const response = await this.client.put(`/tasks/${taskId}`, updates);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            throw new Error(`Task ${taskId} not found`);
          }
          throw new Error(`Failed to update task ${taskId}: ${error.response?.statusText || error.message}`);
        }
        throw error;
      }
    }

    /**
     * Creates a new task in Cirvoy
     *
     * @param task - Partial task data for the new task
     * @returns Promise that resolves to the created task data
     * @throws Error if the creation fails
     */
    async createTask(task: Partial<CirvoyTask>): Promise<CirvoyTask> {
      try {
        const response = await this.client.post('/tasks', task);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Failed to create task: ${error.response?.statusText || error.message}`);
        }
        throw error;
      }
    }

    /**
     * Batch updates multiple tasks in Cirvoy
     *
     * This method is used when more than 10 tasks need to be updated to reduce network overhead.
     *
     * @param updates - Array of task updates
     * @returns Promise that resolves to the batch update result
     * @throws Error if the batch update fails
     */
    async batchUpdateTasks(updates: TaskUpdate[]): Promise<BatchUpdateResult> {
      try {
        const response = await this.client.post('/tasks/batch', { updates });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Failed to batch update tasks: ${error.response?.statusText || error.message}`);
        }
        throw error;
      }
    }
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
  failed: Array<{ taskId: number; error: string }>;
}
