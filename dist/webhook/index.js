import express from 'express';
import { createServer } from 'http';
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
    constructor(config) {
        this.server = null;
        this.webhookHandler = null;
        this.config = config;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    /**
     * Set up Express middleware
     */
    setupMiddleware() {
        // JSON body parser
        this.app.use(express.json());
        // Request logging middleware
        this.app.use((req, _res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
            next();
        });
    }
    /**
     * Set up Express routes
     */
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (_req, res) => {
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        // Webhook endpoint
        this.app.post('/webhook', async (req, res) => {
            try {
                const webhook = req.body;
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
            }
            catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // 404 handler
        this.app.use((req, res) => {
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
    onWebhook(handler) {
        this.webhookHandler = handler;
    }
    /**
     * Start the webhook server
     * @returns Promise that resolves when the server is listening
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = createServer(this.app);
                this.server.listen(this.config.port, () => {
                    console.log(`Webhook server listening on port ${this.config.port}`);
                    resolve();
                });
                this.server.on('error', (error) => {
                    console.error('Server error:', error);
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the webhook server gracefully
     * @returns Promise that resolves when the server is closed
     */
    async stop() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close((error) => {
                if (error) {
                    console.error('Error stopping server:', error);
                    reject(error);
                }
                else {
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
    getApp() {
        return this.app;
    }
    /**
     * Check if the server is running
     */
    isRunning() {
        return this.server !== null && this.server.listening;
    }
}
//# sourceMappingURL=index.js.map