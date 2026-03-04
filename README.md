# Cirvoy-Kiro MCP Integration

🔗 Seamless task synchronization between Kiro IDE and Cirvoy project management.

## 🚀 Quick Start

### Step 1: Get Your API Token

1. Go to **[Cirvoy Settings → API Tokens](https://cirvoy.com/settings/api-tokens)**
2. Click "Generate Token"
3. Give it a name (e.g., "My Laptop - Kiro IDE")
4. **Copy the token** (you won't see it again!)

### Step 2: Setup in Kiro IDE

In your project folder, create `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "npx",
      "args": ["-y", "github:WAI-Soft/MCP"],
      "env": {
        "CIRVOY_BASE_URL": "https://cirvoy.com/api/kiro",
        "CIRVOY_API_TOKEN": "paste-your-token-here",
        "CIRVOY_PROJECT_ID": "57"
      }
    }
  }
}
```

**Important:** Replace:
- `paste-your-token-here` with your actual token
- `57` with your Cirvoy project ID (find it in the project URL: `cirvoy.com/admin/projects/57`)

### Step 3: Restart Kiro IDE

Close and reopen Kiro IDE. The MCP server will start automatically!

## 🎯 Multiple Projects?

Each Kiro workspace can connect to a different Cirvoy project!

**Project A** (Website Redesign - ID: 57):
```
/path/to/website-redesign/.kiro/settings/mcp.json
```
```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "env": {
        "CIRVOY_PROJECT_ID": "57"
      }
    }
  }
}
```

**Project B** (Mobile App - ID: 42):
```
/path/to/mobile-app/.kiro/settings/mcp.json
```
```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "env": {
        "CIRVOY_PROJECT_ID": "42"
      }
    }
  }
}
```

See [WORKSPACE_SETUP.md](WORKSPACE_SETUP.md) for details.

## 🛠️ Available Tools

Once connected, you can use these MCP tools in Kiro:

- `get_task` - Get task details
- `update_task` - Update task status/priority
- `create_task` - Create new task
- `list_tasks` - List all project tasks
- `batch_update_tasks` - Update multiple tasks

## 📚 Documentation

- [Workspace Setup Guide](WORKSPACE_SETUP.md) - Multiple projects
- [Arabic Setup Guide](docs/KIRO_SETUP.md) - دليل الإعداد بالعربي
- [Configuration Guide](docs/CONFIG_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## ❓ FAQ

**Q: Where do I find my project ID?**  
A: In the Cirvoy URL: `https://cirvoy.com/admin/projects/57` → ID is `57`

**Q: Can I use the same token for multiple projects?**  
A: Yes! One token works for all your projects.

**Q: How do I revoke a token?**  
A: Go to Cirvoy Settings → API Tokens → Click "Revoke"

## 🔧 Requirements

- Node.js 18+
- Kiro IDE
- Cirvoy account

## 📝 License

MIT

---

Made with ❤️ by WAI-Soft Team
