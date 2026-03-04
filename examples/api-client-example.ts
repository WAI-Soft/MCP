/**
 * Example: Using the API Client
 * 
 * This example demonstrates how to create and use the API client
 * to communicate with the Cirvoy REST API.
 */

import { APIClient } from '../src/api-client/index.js';

async function main() {
  // Create API client with configuration
  const client = new APIClient({
    baseURL: 'https://api.cirvoy.example.com',
    token: 'your-api-token-here',
    timeout: 5000,
    maxRetries: 3,
    retryBackoffMs: 1000
  });

  console.log('API Client created');
  console.log('Base URL:', client.getBaseURL());
  console.log('Timeout:', client.getTimeout(), 'ms');

  try {
    // Authenticate with the API
    console.log('\nAuthenticating...');
    const isAuthenticated = await client.authenticate('your-api-token-here');
    
    if (isAuthenticated) {
      console.log('✓ Authentication successful');
    }
  } catch (error) {
    console.error('✗ Authentication failed:', error instanceof Error ? error.message : error);
  }

  // Update token if needed
  console.log('\nUpdating token...');
  client.setToken('new-token-here');
  console.log('✓ Token updated');

  // Update base URL if needed
  console.log('\nUpdating base URL...');
  client.setBaseURL('https://new-api.cirvoy.example.com');
  console.log('✓ Base URL updated to:', client.getBaseURL());

  // Update timeout if needed
  console.log('\nUpdating timeout...');
  client.setTimeout(10000);
  console.log('✓ Timeout updated to:', client.getTimeout(), 'ms');

  // Get the underlying axios instance for custom requests
  console.log('\nMaking custom request...');
  const axiosClient = client.getClient();
  
  try {
    // Example: Get a task
    const response = await axiosClient.get('/tasks/123');
    console.log('✓ Task retrieved:', response.data);
  } catch (error) {
    console.error('✗ Request failed:', error instanceof Error ? error.message : error);
  }
}

// Run the example
main().catch(console.error);
