/**
 * Example: Loading Configuration
 * 
 * This example demonstrates how to load and use the configuration loader.
 */

import { loadConfig, ConfigurationError } from '../src/config/index.js';

async function main() {
  try {
    // Load configuration from default location (~/.kiro/cirvoy-mcp/config.json)
    // or from a custom path
    const configPath = process.argv[2]; // Optional: pass config path as argument
    
    console.log('Loading configuration...');
    const config = loadConfig(configPath);
    
    console.log('Configuration loaded successfully!');
    console.log('\nCirvoy Settings:');
    console.log(`  Base URL: ${config.cirvoy.baseURL}`);
    console.log(`  Timeout: ${config.cirvoy.timeout}ms`);
    
    console.log('\nServer Settings:');
    console.log(`  Webhook Port: ${config.server.webhookPort}`);
    console.log(`  Sync Interval: ${config.server.syncInterval}s`);
    console.log(`  Max Retries: ${config.server.maxRetries}`);
    
    console.log('\nStorage Settings:');
    console.log(`  Database Path: ${config.storage.dbPath}`);
    
    console.log('\nLogging Settings:');
    console.log(`  Level: ${config.logging.level}`);
    if (config.logging.filePath) {
      console.log(`  File Path: ${config.logging.filePath}`);
    }
    
    console.log('\nPerformance Settings:');
    console.log(`  Max Memory: ${config.performance.maxMemoryMB}MB`);
    console.log(`  Batch Size: ${config.performance.batchSize}`);
    console.log(`  Max Concurrent Syncs: ${config.performance.maxConcurrentSyncs}`);
    
    console.log('\n✓ Configuration is valid and ready to use!');
    
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('\n❌ Configuration Error:');
      console.error(error.message);
      console.error('\nPlease check your configuration file and try again.');
      process.exit(1);
    }
    throw error;
  }
}

main().catch(console.error);
