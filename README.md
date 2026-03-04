# Cirvoy-Kiro MCP Integration

🔗 Seamless task synchronization between Kiro IDE and Cirvoy project management.

## 🚀 Quick Start for Employees

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
      "args": ["-y", "@cirvoy/kiro-mcp"],
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

Each Kiro workspace can connect to a different Cirvoy project! Just use a different `CIRVOY_PROJECT_ID` in each workspace's `.kiro/settings/mcp.json`.

## 🛠️ Available Tools

Once connected, you can use these MCP tools in Kiro:

- `get_task` - Get task details
- `update_task` - Update task status/priority
- `create_task` - Create new task
- `list_tasks` - List all project tasks
- `batch_update_tasks` - Update multiple tasks

## 📝 License

MIT

---

Made with ❤️ by WAI-Soft Team
