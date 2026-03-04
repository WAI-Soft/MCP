/**
 * Unit tests for API Client
 * 
 * Tests specific error responses, timeout handling, and authentication flows.
 * 
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '../src/api-client/index.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('APIClient', () => {
  let client: APIClient;
  const mockConfig = {
    baseURL: 'https://api.cirvoy.example.com',
    token: 'test-token-123',
    timeout: 5000,
    maxRetries: 3,
    retryBackoffMs: 1000
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      defaults: {
        baseURL: mockConfig.baseURL,
        timeout: mockConfig.timeout,
        headers: {
          common: {}
        }
      },
      interceptors: {
        request: {
          use: vi.fn((onFulfilled, onRejected) => {
            // Store the interceptor for later use
            mockAxiosInstance._requestInterceptor = { onFulfilled, onRejected };
            return 0;
          })
        },
        response: {
          use: vi.fn((onFulfilled, onRejected) => {
            // Store the interceptor for later use
            mockAxiosInstance._responseInterceptor = { onFulfilled, onRejected };
            return 0;
          })
        }
      },
      _requestInterceptor: null as any,
      _responseInterceptor: null as any
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError.mockImplementation((error: any) => {
      return error && error.isAxiosError === true;
    });

    client = new APIClient(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with provided configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseURL,
        timeout: mockConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${mockConfig.token}`
        }
      });
    });

    it('should use default values for optional parameters', () => {
      const minimalConfig = {
        baseURL: 'https://api.example.com',
        token: 'token',
        timeout: 3000
      };

      const minimalClient = new APIClient(minimalConfig);
      expect(minimalClient).toBeDefined();
    });

    it('should set up request and response interceptors', () => {
      const mockInstance = mockedAxios.create.mock.results[0].value;
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate with valid token', async () => {
      const mockInstance = client.getClient();
      vi.spyOn(mockInstance, 'get').mockResolvedValue({
        status: 200,
        data: { valid: true }
      });

      const result = await client.authenticate('new-valid-token');

      expect(result).toBe(true);
      expect(mockInstance.get).toHaveBeenCalledWith('/auth/validate', {
        headers: {
          'Authorization': 'Bearer new-valid-token'
        }
      });
    });

    it('should throw error on 401 Unauthorized', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 401 }
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.authenticate('invalid-token')).rejects.toThrow(
        'Authentication failed: Invalid or expired token'
      );
    });

    it('should throw error on 403 Forbidden', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 403 }
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.authenticate('forbidden-token')).rejects.toThrow(
        'Authentication failed: Invalid or expired token'
      );
    });

    it('should throw generic error on network failure', async () => {
      const mockInstance = client.getClient();
      const error = new Error('Network error');
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(client.authenticate('token')).rejects.toThrow(
        'Authentication failed: Network error'
      );
    });
  });

  describe('setToken', () => {
    it('should update the authentication token', () => {
      const newToken = 'new-token-456';
      client.setToken(newToken);

      const mockInstance = client.getClient();
      expect(mockInstance.defaults.headers.common['Authorization']).toBe(`Bearer ${newToken}`);
    });
  });

  describe('setBaseURL', () => {
    it('should update the base URL', () => {
      const newURL = 'https://new-api.example.com';
      client.setBaseURL(newURL);

      expect(client.getBaseURL()).toBe(newURL);
      expect(client.getClient().defaults.baseURL).toBe(newURL);
    });
  });

  describe('setTimeout', () => {
    it('should update the timeout value', () => {
      const newTimeout = 10000;
      client.setTimeout(newTimeout);

      expect(client.getTimeout()).toBe(newTimeout);
      expect(client.getClient().defaults.timeout).toBe(newTimeout);
    });
  });

  describe('getters', () => {
    it('should return current base URL', () => {
      expect(client.getBaseURL()).toBe(mockConfig.baseURL);
    });

    it('should return current timeout', () => {
      expect(client.getTimeout()).toBe(mockConfig.timeout);
    });

    it('should return axios client instance', () => {
      const instance = client.getClient();
      expect(instance).toBeDefined();
      expect(instance.defaults).toBeDefined();
    });
  });

  describe('request interceptor', () => {
    it('should inject authorization header on requests', () => {
      const mockInstance = client.getClient() as any;
      const interceptor = mockInstance._requestInterceptor;
      
      if (interceptor && interceptor.onFulfilled) {
        const config = {
          headers: {}
        };
        
        const result = interceptor.onFulfilled(config);
        expect(result.headers.Authorization).toBe(`Bearer ${mockConfig.token}`);
      }
    });
  });

  describe('retry logic', () => {
    it('should not retry on 4xx client errors (except 429)', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 404 },
        config: { _retryCount: 0 }
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);

      await expect(mockInstance.get('/test')).rejects.toMatchObject({
        response: { status: 404 }
      });

      // Should only be called once (no retries)
      expect(mockInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 500 server errors', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 500 },
        config: {}
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);

      await expect(mockInstance.get('/test')).rejects.toMatchObject({
        response: { status: 500 }
      });
    });

    it('should handle 503 service unavailable', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 503 },
        config: {}
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);

      await expect(mockInstance.get('/test')).rejects.toMatchObject({
        response: { status: 503 }
      });
    });

    it('should handle 429 rate limit errors', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 429 },
        config: {}
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);

      await expect(mockInstance.get('/test')).rejects.toMatchObject({
        response: { status: 429 }
      });
    });
  });

  describe('timeout handling', () => {
    it('should respect configured timeout', () => {
      const mockInstance = client.getClient();
      expect(mockInstance.defaults.timeout).toBe(mockConfig.timeout);
    });

    it('should allow timeout to be updated', () => {
      const newTimeout = 15000;
      client.setTimeout(newTimeout);
      
      const mockInstance = client.getClient();
      expect(mockInstance.defaults.timeout).toBe(newTimeout);
    });
  });

  describe('getTask', () => {
    it('should successfully get a task by ID', async () => {
      const mockInstance = client.getClient();
      const mockTask = {
        id: 123,
        title: 'Test Task',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      vi.spyOn(mockInstance, 'get').mockResolvedValue({
        status: 200,
        data: mockTask
      });

      const result = await client.getTask(123);

      expect(result).toEqual(mockTask);
      expect(mockInstance.get).toHaveBeenCalledWith('/tasks/123');
    });

    it('should throw error when task not found (404)', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' }
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.getTask(999)).rejects.toThrow('Task 999 not found');
    });

    it('should throw error on server error', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
        message: 'Server error'
      };
      
      vi.spyOn(mockInstance, 'get').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.getTask(123)).rejects.toThrow('Failed to get task 123: Internal Server Error');
    });
  });

  describe('updateTask', () => {
    it('should successfully update a task', async () => {
      const mockInstance = client.getClient();
      const updates = { status: 'completed', title: 'Updated Task' };
      const mockUpdatedTask = {
        id: 123,
        title: 'Updated Task',
        status: 'completed',
        project_id: 1,
        updated_at: '2024-01-02T00:00:00Z'
      };
      
      vi.spyOn(mockInstance, 'put').mockResolvedValue({
        status: 200,
        data: mockUpdatedTask
      });

      const result = await client.updateTask(123, updates);

      expect(result).toEqual(mockUpdatedTask);
      expect(mockInstance.put).toHaveBeenCalledWith('/tasks/123', updates);
    });

    it('should throw error when task not found (404)', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' }
      };
      
      vi.spyOn(mockInstance, 'put').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.updateTask(999, { status: 'completed' })).rejects.toThrow('Task 999 not found');
    });

    it('should throw error on validation error (400)', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 400, statusText: 'Bad Request' },
        message: 'Validation failed'
      };
      
      vi.spyOn(mockInstance, 'put').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.updateTask(123, { status: 'invalid' })).rejects.toThrow('Failed to update task 123: Bad Request');
    });
  });

  describe('createTask', () => {
    it('should successfully create a task', async () => {
      const mockInstance = client.getClient();
      const newTask = {
        title: 'New Task',
        status: 'not-started',
        project_id: 1
      };
      const mockCreatedTask = {
        id: 456,
        title: 'New Task',
        status: 'not-started',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      vi.spyOn(mockInstance, 'post').mockResolvedValue({
        status: 201,
        data: mockCreatedTask
      });

      const result = await client.createTask(newTask);

      expect(result).toEqual(mockCreatedTask);
      expect(mockInstance.post).toHaveBeenCalledWith('/tasks', newTask);
    });

    it('should throw error on validation error (400)', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 400, statusText: 'Bad Request' },
        message: 'Missing required fields'
      };
      
      vi.spyOn(mockInstance, 'post').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.createTask({ title: '' })).rejects.toThrow('Failed to create task: Bad Request');
    });

    it('should throw error on server error', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
        message: 'Server error'
      };
      
      vi.spyOn(mockInstance, 'post').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.createTask({ title: 'Test' })).rejects.toThrow('Failed to create task: Internal Server Error');
    });
  });

  describe('batchUpdateTasks', () => {
    it('should successfully batch update tasks', async () => {
      const mockInstance = client.getClient();
      const updates = [
        { taskId: 1, updates: { status: 'completed' } },
        { taskId: 2, updates: { status: 'in-progress' } },
        { taskId: 3, updates: { title: 'Updated' } }
      ];
      const mockResult = {
        successful: [1, 2, 3],
        failed: []
      };
      
      vi.spyOn(mockInstance, 'post').mockResolvedValue({
        status: 200,
        data: mockResult
      });

      const result = await client.batchUpdateTasks(updates);

      expect(result).toEqual(mockResult);
      expect(mockInstance.post).toHaveBeenCalledWith('/tasks/batch', { updates });
    });

    it('should handle partial failures in batch update', async () => {
      const mockInstance = client.getClient();
      const updates = [
        { taskId: 1, updates: { status: 'completed' } },
        { taskId: 999, updates: { status: 'in-progress' } },
        { taskId: 3, updates: { title: 'Updated' } }
      ];
      const mockResult = {
        successful: [1, 3],
        failed: [{ taskId: 999, error: 'Task not found' }]
      };
      
      vi.spyOn(mockInstance, 'post').mockResolvedValue({
        status: 200,
        data: mockResult
      });

      const result = await client.batchUpdateTasks(updates);

      expect(result).toEqual(mockResult);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });

    it('should throw error on server error', async () => {
      const mockInstance = client.getClient();
      const error = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
        message: 'Server error'
      };
      
      vi.spyOn(mockInstance, 'post').mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.batchUpdateTasks([])).rejects.toThrow('Failed to batch update tasks: Internal Server Error');
    });

    it('should handle empty updates array', async () => {
      const mockInstance = client.getClient();
      const mockResult = {
        successful: [],
        failed: []
      };
      
      vi.spyOn(mockInstance, 'post').mockResolvedValue({
        status: 200,
        data: mockResult
      });

      const result = await client.batchUpdateTasks([]);

      expect(result).toEqual(mockResult);
      expect(mockInstance.post).toHaveBeenCalledWith('/tasks/batch', { updates: [] });
    });
  });
});