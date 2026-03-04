# Cirvoy-Kiro MCP Integration

🔗 MCP Server for seamless task synchronization between Kiro IDE and Cirvoy project management system.

## 🚀 Quick Start for Team Members

### Installation

Add this to your Kiro IDE configuration file (`.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "npx",
      "args": ["-y", "github:WAI-Soft/MCP"],
      "env": {
        "CIRVOY_BASE_URL": "https://cirvoy.com/api/kiro",
        "CIRVOY_API_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Get Your API Token

1. Go to [Cirvoy Settings](https://cirvoy.com/settings/api)
2. Generate a new API token
3. Copy the token and paste it in the config above

### Restart Kiro IDE

After adding the configuration, restart Kiro IDE to load the MCP server.

## ✨ Features

- ✅ Bidirectional task synchronization
- ✅ Real-time updates via webhooks
- ✅ Offline queue for network resilience
- ✅ Conflict detection and resolution
- ✅ Secure API communication

## 🛠️ Available MCP Tools

- `sync_task` - Sync a single task
- `sync_all_tasks` - Sync all tasks in a project
- `get_sync_status` - Get current sync status
- `resolve_conflict` - Resolve sync conflicts

## 📚 Documentation

- [Arabic Setup Guide](docs/KIRO_SETUP.md) - دليل الإعداد بالعربي
- [Configuration Guide](docs/CONFIG_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🔧 Requirements

- Node.js 18+
- Kiro IDE
- Cirvoy account with API access

## 📝 License

MIT

---

Made with ❤️ by WAI-Soft Team
