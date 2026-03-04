/**
 * Example: Using the Webhook Server
 * 
 * This example demonstrates how to set up and use the webhook server
 * to receive real-time notifications from Cirvoy.
 */

import { WebhookServer, CirvoyWebhook } from '../src/webhook/index.js';

async function main() {
  // Create webhook server with configuration
  const server = new WebhookServer({
    port: 3000, // Default port
    webhookSecret: 'your-webhook-secret-here'
  });

  // Register a webhook handler
  server.onWebhook(async (webhook: CirvoyWebhook) => {
    console.log('Received webhook:', {
      event: webhook.event,
      taskId: webhook.task.id,
      taskTitle: webhook.task.title,
      taskStatus: webhook.task.status,
      timestamp: webhook.timestamp
    });

    // Handle different event types
    switch (webhook.event) {
      case 'task.created':
        console.log('New task created:', webhook.task.title);
        // Add logic to create task in Kiro
        break;

      case 'task.updated':
        console.log('Task updated:', webhook.task.title);
        // Add logic to update task in Kiro
        break;

      case 'task.deleted':
        console.log('Task deleted:', webhook.task.id);
        // Add logic to delete task in Kiro
        break;
    }
  });

  // Start the server
  try {
    await server.start();
    console.log('Webhook server is running!');
    console.log('Listening for webhooks at: http://localhost:3000/webhook');
    console.log('Health check available at: http://localhost:3000/health');

    // Keep the server running
    // In a real application, you'd handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down webhook server...');
      await server.stop();
      console.log('Server stopped');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start webhook server:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
