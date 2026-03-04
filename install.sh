#!/bin/bash

echo "🚀 Installing Cirvoy-Kiro MCP Integration..."

# Get installation directory
INSTALL_DIR="${HOME}/.kiro/mcp-servers/cirvoy-kiro-mcp"

# Create directory
mkdir -p "$INSTALL_DIR"

# Download from server (or GitHub)
echo "📦 Downloading MCP server..."
curl -L https://cirvoy.com/downloads/kiro-mcp-integration.tar.gz -o /tmp/cirvoy-mcp.tar.gz

# Extract
echo "📂 Extracting files..."
tar -xzf /tmp/cirvoy-mcp.tar.gz -C "$INSTALL_DIR"

# Install dependencies
echo "📚 Installing dependencies..."
cd "$INSTALL_DIR" && npm install --production

# Create config template
echo "⚙️  Creating configuration..."
mkdir -p "${HOME}/.kiro/settings"

cat > "${HOME}/.kiro/settings/mcp.json" << 'JSONEOF'
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": ["${HOME}/.kiro/mcp-servers/cirvoy-kiro-mcp/dist/index.js"],
      "env": {
        "CIRVOY_BASE_URL": "https://cirvoy.com/api/kiro",
        "CIRVOY_API_TOKEN": "YOUR_TOKEN_HERE",
        "LOGGING_LEVEL": "info"
      }
    }
  }
}
JSONEOF

echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your API token from https://cirvoy.com/settings/api"
echo "2. Edit ~/.kiro/settings/mcp.json and replace YOUR_TOKEN_HERE"
echo "3. Restart Kiro IDE"
