# Cirvoy-Kiro MCP Integration

MCP Server for bidirectional task synchronization between Kiro IDE and Cirvoy project management system.

## Features

- Bidirectional task status synchronization
- Real-time webhook notifications from Cirvoy
- Offline queue for network resilience
- Conflict detection and resolution
- Secure API communication with encryption
- MCP v1.0 protocol compliance

## Installation

```bash
npm install
```

## Configuration

The server reads configuration from a JSON file located at `~/.kiro/cirvoy-mcp/config.json` by default. You can specify a custom path when loading the configuration.

### Setup

1. Create the configuration directory:

```bash
mkdir -p ~/.kiro/cirvoy-mcp
```

2. Copy the example configuration:

```bash
cp config/example.config.json ~/.kiro/cirvoy-mcp/config.json
```

3. Edit the configuration file with your settings:

```bash
nano ~/.kiro/cirvoy-mcp/config.json
```

### Configuration File Format

The configuration file must include the following sections:

```json
{
  "cirvoy": {
    "baseURL": "https://cirvoy.example.com/api",
    "apiToken": "your-api-token-here",
    "webhookSecret": "your-webhook-secret-here",
    "timeout": 30000
  },
  "server": {
    "webhookPort": 3000,
    "syncInterval": 5,
    "maxRetries": 3,
    "retryBackoffMs": 1000
  },
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite",
    "encryptionKey": "your-32-character-encryption-key-here"
  },
  "logging": {
    "level": "info",
    "filePath": "~/.kiro/cirvoy-mcp/logs/server.log"
  },
  "performance": {
    "maxMemoryMB": 100,
    "batchSize": 10,
    "maxConcurrentSyncs": 5
  }
}
```

### Required Fields

The following fields are required and must be present in the configuration file:

- `cirvoy.baseURL` - Base URL for the Cirvoy API
- `cirvoy.apiToken` - API authentication token
- `cirvoy.webhookSecret` - Secret key for webhook signature verification
- `cirvoy.timeout` - Request timeout in milliseconds (1000-60000)
- `storage.dbPath` - Path to SQLite database file
- `storage.encryptionKey` - Encryption key (minimum 32 characters)

### Environment Variable Overrides

All configuration values can be overridden using environment variables. This is useful for deployment scenarios where you want to keep sensitive values out of configuration files.

| Configuration Field | Environment Variable |
|---------------------|---------------------|
| `cirvoy.baseURL` | `CIRVOY_BASE_URL` |
| `cirvoy.apiToken` | `CIRVOY_API_TOKEN` |
| `cirvoy.webhookSecret` | `CIRVOY_WEBHOOK_SECRET` |
| `cirvoy.timeout` | `CIRVOY_TIMEOUT` |
| `server.webhookPort` | `SERVER_WEBHOOK_PORT` |
| `server.syncInterval` | `SERVER_SYNC_INTERVAL` |
| `server.maxRetries` | `SERVER_MAX_RETRIES` |
| `server.retryBackoffMs` | `SERVER_RETRY_BACKOFF_MS` |
| `storage.dbPath` | `STORAGE_DB_PATH` |
| `storage.encryptionKey` | `STORAGE_ENCRYPTION_KEY` |
| `logging.level` | `LOGGING_LEVEL` |
| `logging.filePath` | `LOGGING_FILE_PATH` |
| `performance.maxMemoryMB` | `PERFORMANCE_MAX_MEMORY_MB` |
| `performance.batchSize` | `PERFORMANCE_BATCH_SIZE` |
| `performance.maxConcurrentSyncs` | `PERFORMANCE_MAX_CONCURRENT_SYNCS` |

Example using environment variables:

```bash
export CIRVOY_API_TOKEN="my-secret-token"
export CIRVOY_WEBHOOK_SECRET="my-webhook-secret"
export LOGGING_LEVEL="debug"
npm start
```

### Configuration Validation

The configuration loader validates all fields on startup and provides helpful error messages if required fields are missing or invalid:

- Missing required fields will be listed explicitly
- Invalid values (e.g., timeout too low, port out of range) will be reported
- Encryption keys shorter than 32 characters will be rejected
- Invalid log levels will be rejected

### Path Expansion

Paths in the configuration file support tilde (`~`) expansion for the user's home directory:

```json
{
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite"
  },
  "logging": {
    "filePath": "~/logs/cirvoy-mcp.log"
  }
}
```

These will be automatically expanded to absolute paths when the configuration is loaded.

### Credential Encryption

The server supports AES-256-GCM encryption for sensitive credentials (API tokens and webhook secrets). This ensures that credentials stored in configuration files are not readable as plaintext.

#### Encrypting Credentials

You can store credentials in encrypted format in your configuration file:

```typescript
import { encrypt } from './src/config/index.js';

const encryptionKey = 'your-32-character-encryption-key!'; // Must be 32 characters
const apiToken = 'my-secret-api-token';
const encryptedToken = encrypt(apiToken, encryptionKey);

console.log(encryptedToken);
// Output: abc123def456:789ghi012jkl:345mno678pqr (example format)
```

Then use the encrypted value in your config file:

```json
{
  "cirvoy": {
    "apiToken": "abc123def456:789ghi012jkl:345mno678pqr",
    "webhookSecret": "def456ghi789:012jkl345mno:678pqr901stu"
  },
  "storage": {
    "encryptionKey": "your-32-character-encryption-key!"
  }
}
```

#### Automatic Decryption

When you load the configuration using `loadConfig()`, encrypted credentials are automatically decrypted:

```typescript
import { loadConfig } from './src/config/index.js';

const config = loadConfig();
// config.cirvoy.apiToken is now decrypted and ready to use
```

#### Saving Encrypted Configuration

Use `saveConfig()` to save configuration with automatic encryption:

```typescript
import { saveConfig } from './src/config/index.js';

const config = {
  cirvoy: {
    apiToken: 'plaintext-token', // Will be encrypted when saved
    webhookSecret: 'plaintext-secret'
  },
  storage: {
    encryptionKey: 'your-32-character-encryption-key!'
  }
  // ... other config
};

saveConfig(config, '~/.kiro/cirvoy-mcp/config.json');
```

#### Mixed Plaintext and Encrypted

The loader supports both plaintext and encrypted credentials in the same configuration file. This allows for gradual migration to encrypted storage:

```json
{
  "cirvoy": {
    "apiToken": "abc123def456:789ghi012jkl:345mno678pqr",
    "webhookSecret": "plaintext-secret"
  }
}
```

#### Security Best Practices

1. **Encryption Key Storage**: Store the encryption key securely, preferably as an environment variable:
   ```bash
   export STORAGE_ENCRYPTION_KEY="your-32-character-encryption-key!"
   ```

2. **Key Length**: The encryption key must be exactly 32 characters (256 bits) for AES-256-GCM.

3. **Key Rotation**: When rotating encryption keys:
   - Load config with old key
   - Update the encryption key in the config object
   - Save config with new key (credentials will be re-encrypted)

4. **File Permissions**: Ensure configuration files have appropriate permissions:
   ```bash
   chmod 600 ~/.kiro/cirvoy-mcp/config.json
   ```

See `examples/encrypt-credentials-example.ts` for a complete example of encrypting and decrypting credentials.

## Development

```bash
# Build the project
npm run build

# Run in development mode with watch
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

## Usage

```bash
npm start
```

## Documentation

### English Documentation
- [Main README](README.md) - This file
- [Configuration Examples](config/example.config.json)
- [Code Examples](examples/)

### Arabic Documentation (الوثائق العربية)

Comprehensive Arabic documentation is available for Arabic-speaking developers:

- **[دليل البدء السريع](docs/QUICK_START.md)** - Quick start guide (5 minutes)
- **[دليل الإعداد الشامل](docs/KIRO_SETUP.md)** - Complete setup guide for Kiro IDE
- **[دليل التكوين](docs/CONFIG_GUIDE.md)** - Detailed configuration reference
- **[دليل استكشاف الأخطاء](docs/TROUBLESHOOTING.md)** - Troubleshooting guide
- **[دليل أدوات MCP](docs/MCP_TOOLS_GUIDE.md)** - MCP tools usage guide
- **[فهرس الوثائق](docs/README.md)** - Documentation index

## Adding to Kiro IDE

To add this MCP server to Kiro IDE, edit your Kiro configuration file (`~/.kiro/config.json`):

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": [
        "/absolute/path/to/cirvoy-kiro-mcp-integration/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

For detailed setup instructions, see:
- English: Coming soon
- Arabic: [دليل الإعداد الشامل](docs/KIRO_SETUP.md)

## Requirements

- Node.js 18 or higher
- Kiro IDE
- Cirvoy project management system access

## License

MIT
