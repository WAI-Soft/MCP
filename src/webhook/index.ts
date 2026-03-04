import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';

/**
 * Configuration options for the webhook server
 */
export interface WebhookServerConfig {
  port: number;
  webhookSecret: string;
}

/**
 * Webhook payload structure from Cirvoy
 */
export interface CirvoyWebhook {
  event: 'task.created' | 'task.updated' | 'task.deleted';
  task: {
    id: number;
    title: string;
    status: string;
    project_id: number;
    description?: string;
    metadata?: Record<string, any>;
    updated_at: string;
  };
  timestamp: string;
  signature: string;
}

/**
 * Webhook handler function type
 */
export type WebhookHandler = (webhook: CirvoyWebhook) => Promise<void>;

/**
 * Express-based webhook server for receiving real-time notifications from Cirvoy
 * 
 * Features:
 * - Configurable port (default 3000)
 * - JSON body parsing
 * - Request logging middleware
 * - POST /webhook endpoint
 * - Graceful shutdown support
 */
export class WebhookServer {
  private app: Express;
  private server: Server | null = null;
  private config: WebhookServerConfig;
  private webhookHandler: WebhookHandler | null = null;

  constructor(config: WebhookServerConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // JSON body parser
    this.app.use(express.json());

    // Request logging middleware
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Webhook endpoint
    this.app.post('/webhook', async (req: Request, res: Response) => {
      try {
        const webhook = req.body as CirvoyWebhook;

        // Validate webhook structure
        if (!webhook.event || !webhook.task || !webhook.timestamp) {
          res.status(400).json({
            error: 'Invalid webhook payload',
            message: 'Missing required fields: event, task, or timestamp'
          });
          return;
        }

        // Call the registered webhook handler if available
        if (this.webhookHandler) {
          await this.webhookHandler(webhook);
        }

        // Return success response
        res.status(200).json({
          success: true,
          message: 'Webhook received',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
      });
    });
  }

  /**
   * Register a webhook handler function
   * @param handler Function to call when a webhook is received
   */
  public onWebhook(handler: WebhookHandler): void {
    this.webhookHandler = handler;
  }

  /**
   * Start the webhook server
   * @returns Promise that resolves when the server is listening
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);
        
        this.server.listen(this.config.port, () => {
          console.log(`Webhook server listening on port ${this.config.port}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the webhook server gracefully
   * @returns Promise that resolves when the server is closed
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          console.error('Error stopping server:', error);
          reject(error);
        } else {
          console.log('Webhook server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance (useful for testing)
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Check if the server is running
   */
  public isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }
}
