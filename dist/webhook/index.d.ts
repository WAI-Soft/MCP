import { Express } from 'express';
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
export declare class WebhookServer {
    private app;
    private server;
    private config;
    private webhookHandler;
    constructor(config: WebhookServerConfig);
    /**
     * Set up Express middleware
     */
    private setupMiddleware;
    /**
     * Set up Express routes
     */
    private setupRoutes;
    /**
     * Register a webhook handler function
     * @param handler Function to call when a webhook is received
     */
    onWebhook(handler: WebhookHandler): void;
    /**
     * Start the webhook server
     * @returns Promise that resolves when the server is listening
     */
    start(): Promise<void>;
    /**
     * Stop the webhook server gracefully
     * @returns Promise that resolves when the server is closed
     */
    stop(): Promise<void>;
    /**
     * Get the Express app instance (useful for testing)
     */
    getApp(): Express;
    /**
     * Check if the server is running
     */
    isRunning(): boolean;
}
//# sourceMappingURL=index.d.ts.map