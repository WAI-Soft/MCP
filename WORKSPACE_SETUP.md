# Workspace-Specific Setup

## Problem
When you have multiple Kiro workspaces, each needs to know which Cirvoy project it's working on.

## Solution: Workspace-Level Configuration

Each Kiro workspace should have its own `.kiro/settings/mcp.json` file:

### Workspace 1: Project "Website Redesign" (ID: 57)

```
/path/to/website-redesign/
├── .kiro/
│   └── settings/
│       └── mcp.json  ← Workspace-specific config
├── src/
└── ...
```

**`.kiro/settings/mcp.json`:**
```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "npx",
      "args": ["-y", "github:WAI-Soft/MCP"],
      "env": {
        "CIRVOY_BASE_URL": "https://cirvoy.com/api/kiro",
        "CIRVOY_API_TOKEN": "your-token-here",
        "CIRVOY_PROJECT_ID": "57"
      }
    }
  }
}
```

### Workspace 2: Project "Mobile App" (ID: 42)

```
/path/to/mobile-app/
├── .kiro/
│   └── settings/
│       └── mcp.json  ← Different project ID
├── src/
└── ...
```

**`.kiro/settings/mcp.json`:**
```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "npx",
      "args": ["-y", "github:WAI-Soft/MCP"],
      "env": {
        "CIRVOY_BASE_URL": "https://cirvoy.com/api/kiro",
        "CIRVOY_API_TOKEN": "your-token-here",
        "CIRVOY_PROJECT_ID": "42"
      }
    }
  }
}
```

## How Kiro Knows Which Project

1. **Each workspace has its own `.kiro/settings/mcp.json`**
2. **The `CIRVOY_PROJECT_ID` tells the MCP which project to sync**
3. **When you open a workspace, Kiro loads that workspace's config**
4. **The MCP server only syncs tasks for that specific project**

## Multi-Root Workspaces

If you have a multi-root workspace (multiple folders), each folder can have its own config:

```json
{
  "folders": [
    { "path": "/path/to/project-a" },
    { "path": "/path/to/project-b" }
  ]
}
```

Each folder's `.kiro/settings/mcp.json` will be loaded independently.

## Global vs Workspace Config

- **Global config** (`~/.kiro/settings/mcp.json`): Applies to all workspaces
- **Workspace config** (`.kiro/settings/mcp.json`): Overrides global for that workspace

**Best practice:** Use workspace-level configs for project-specific settings!
