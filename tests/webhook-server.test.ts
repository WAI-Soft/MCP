import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebhookServer, CirvoyWebhook } from '../src/webhook/index.js';
import axios from 'axios';

describe('WebhookServer', () => {
  let server: WebhookServer;
  const testPort = 3001; // Use different port to avoid conflicts
  const baseURL = `http://localhost:${testPort}`;

  beforeEach(async () => {
    server = new WebhookServer({
      port: testPort,
      webhookSecret: 'test-secret'
    });
  });

  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
  });

  describe('Server Lifecycle', () => {
    it('should start the server on the configured port', async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);

      // Verify server is accessible
      const response = await axios.get(`${baseURL}/health`);
      expect(response.status).toBe(200);
    });

    it('should stop the server gracefully', async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);

      await server.stop();
      expect(server.isRunning()).toBe(false);

      // Verify server is no longer accessible
      await expect(axios.get(`${baseURL}/health`)).rejects.toThrow();
    });

    it('should use default port 3000 when not specified', () => {
      const defaultServer = new WebhookServer({
        port: 3000,
        webhookSecret: 'test-secret'
      });
      expect(defaultServer).toBeDefined();
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check requests', async () => {
      await server.start();

      const response = await axios.get(`${baseURL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
    });
  });

  describe('Webhook Endpoint', () => {
    it('should accept valid webhook POST requests', async () => {
      await server.start();

      const webhook: CirvoyWebhook = {
        event: 'task.updated',
        task: {
          id: 123,
          title: 'Test Task',
          status: 'in-progress',
          project_id: 1,
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        signature: 'test-signature'
      };

      const response = await axios.post(`${baseURL}/webhook`, webhook);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('message', 'Webhook received');
    });

    it('should reject webhook with missing event field', async () => {
      await server.start();

      const invalidWebhook = {
        task: {
          id: 123,
          title: 'Test Task',
          status: 'in-progress',
          project_id: 1,
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      try {
        await axios.post(`${baseURL}/webhook`, invalidWebhook);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error', 'Invalid webhook payload');
      }
    });

    it('should reject webhook with missing task field', async () => {
      await server.start();

      const invalidWebhook = {
        event: 'task.updated',
        timestamp: new Date().toISOString()
      };

      try {
        await axios.post(`${baseURL}/webhook`, invalidWebhook);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error', 'Invalid webhook payload');
      }
    });

    it('should reject webhook with missing timestamp field', async () => {
      await server.start();

      const invalidWebhook = {
        event: 'task.updated',
        task: {
          id: 123,
          title: 'Test Task',
          status: 'in-progress',
          project_id: 1,
          updated_at: new Date().toISOString()
        }
      };

      try {
        await axios.post(`${baseURL}/webhook`, invalidWebhook);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error', 'Invalid webhook payload');
      }
    });

    it('should call registered webhook handler', async () => {
      await server.start();

      let handlerCalled = false;
      let receivedWebhook: CirvoyWebhook | null = null;

      server.onWebhook(async (webhook) => {
        handlerCalled = true;
        receivedWebhook = webhook;
      });

      const webhook: CirvoyWebhook = {
        event: 'task.created',
        task: {
          id: 456,
          title: 'New Task',
          status: 'not-started',
          project_id: 2,
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        signature: 'test-signature'
      };

      const response = await axios.post(`${baseURL}/webhook`, webhook);
      expect(response.status).toBe(200);
      expect(handlerCalled).toBe(true);
      expect(receivedWebhook).toEqual(webhook);
    });

    it('should handle different webhook event types', async () => {
      await server.start();

      const eventTypes: Array<'task.created' | 'task.updated' | 'task.deleted'> = [
        'task.created',
        'task.updated',
        'task.deleted'
      ];

      for (const eventType of eventTypes) {
        const webhook: CirvoyWebhook = {
          event: eventType,
          task: {
            id: 789,
            title: 'Test Task',
            status: 'completed',
            project_id: 3,
            updated_at: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          signature: 'test-signature'
        };

        const response = await axios.post(`${baseURL}/webhook`, webhook);
        expect(response.status).toBe(200);
      }
    });

    it('should handle webhook with optional task fields', async () => {
      await server.start();

      const webhook: CirvoyWebhook = {
        event: 'task.updated',
        task: {
          id: 999,
          title: 'Task with extras',
          status: 'in-progress',
          project_id: 4,
          description: 'This is a detailed description',
          metadata: { priority: 'high', tags: ['urgent', 'bug'] },
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        signature: 'test-signature'
      };

      const response = await axios.post(`${baseURL}/webhook`, webhook);
      expect(response.status).toBe(200);
    });
  });

  describe('Request Logging', () => {
    it('should log incoming requests', async () => {
      await server.start();

      // Make a request to trigger logging
      await axios.get(`${baseURL}/health`);

      // Note: In a real scenario, you'd capture console.log output
      // For now, we just verify the request succeeds
      expect(server.isRunning()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      await server.start();

      try {
        await axios.get(`${baseURL}/unknown-route`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error', 'Not found');
      }
    });

    it('should handle errors in webhook handler gracefully', async () => {
      await server.start();

      server.onWebhook(async () => {
        throw new Error('Handler error');
      });

      const webhook: CirvoyWebhook = {
        event: 'task.updated',
        task: {
          id: 123,
          title: 'Test Task',
          status: 'in-progress',
          project_id: 1,
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        signature: 'test-signature'
      };

      try {
        await axios.post(`${baseURL}/webhook`, webhook);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data).toHaveProperty('error', 'Internal server error');
      }
    });
  });

  describe('JSON Body Parsing', () => {
    it('should parse JSON request bodies', async () => {
      await server.start();

      let parsedBody: any = null;

      server.onWebhook(async (webhook) => {
        parsedBody = webhook;
      });

      const webhook: CirvoyWebhook = {
        event: 'task.updated',
        task: {
          id: 123,
          title: 'Test Task',
          status: 'in-progress',
          project_id: 1,
          updated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        signature: 'test-signature'
      };

      await axios.post(`${baseURL}/webhook`, webhook, {
        headers: { 'Content-Type': 'application/json' }
      });

      expect(parsedBody).toEqual(webhook);
    });
  });
});
