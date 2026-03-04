# Cirvoy-Kiro MCP Server

MCP Server for bidirectional task synchronization between Kiro IDE and Cirvoy project management system.

## Installation

### Using with Kiro IDE (Recommended)

Add to your Kiro IDE MCP configuration (`~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "npx",
      "args": ["-y", "cirvoy-kiro-mcp"],
      "env": {
        "CIRVOY_BASE_URL": "https://your-cirvoy-instance.com/api",
        "CIRVOY_API_TOKEN": "your-api-token",
        "CIRVOY_WEBHOOK_SECRET": "your-webhook-secret"
      }
    }
  }
}
```

### Global Installation

```bash
npm install -g cirvoy-kiro-mcp
```

Then use in Kiro:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "cirvoy-kiro-mcp"
    }
  }
}
```

## Configuration

The server can be configured using environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `CIRVOY_BASE_URL` | Base URL for Cirvoy API | Yes |
| `CIRVOY_API_TOKEN` | API authentication token | Yes |
| `CIRVOY_WEBHOOK_SECRET` | Webhook signature secret | Yes |
| `CIRVOY_TIMEOUT` | Request timeout (ms) | No (default: 30000) |
| `SERVER_WEBHOOK_PORT` | Webhook server port | No (default: 3000) |
| `LOGGING_LEVEL` | Log level (debug/info/warn/error) | No (default: info) |

## Available Tools

### sync_task
Synchronize a single task between Kiro and Cirvoy.

**Parameters:**
- `taskId` (string): The ID of the task to synchronize
- `direction` (string): Direction of synchronization (`kiro-to-cirvoy` or `cirvoy-to-kiro`)

### sync_all_tasks
Synchronize all tasks in a project.

**Parameters:**
- `projectId` (string): The ID of the project to synchronize

### get_sync_status
Get the current synchronization status.

**Returns:** JSON object with status, lastSync, queueSize, and errorCount.

### resolve_conflict
Resolve a synchronization conflict.

**Parameters:**
- `conflictId` (string): The ID of the conflict to resolve
- `resolution` (string): Resolution strategy (`kiro-wins`, `cirvoy-wins`, or `manual`)

## Requirements

- Node.js 18 or higher
- Kiro IDE
- Cirvoy project management system access

## Documentation

For detailed documentation in Arabic, see the [full documentation](https://github.com/your-org/cirvoy-kiro-mcp).

## License

MIT
