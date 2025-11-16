# Setting Up Content Saver with AI Clients

To use Content Saver with AI assistants (ChatGPT, Claude, Cursor), you need to configure the MCP server.

## Option 1: Claude Desktop (Recommended - Best MCP Support)

### Step 1: Install Claude Desktop
Download from: https://claude.ai/download

### Step 2: Get Your Server Path
Run this command in your terminal:
```bash
node get-server-path.js
```

This will show you the exact path to use.

### Step 3: Configure Claude Desktop

1. **Find the config file:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Open or create the config file** and add:

```json
{
  "mcpServers": {
    "content-saver": {
      "command": "node",
      "args": ["/Users/annagorozia/Documents/GitHub/Content-Saver-MCP-Server/dist/index.js"]
    }
  }
}
```

**Important:** Replace the path with your actual path from `get-server-path.js`

3. **Restart Claude Desktop**

4. **Test it:**
   - Open Claude Desktop
   - Start a new conversation
   - Try: "Save a note: Testing Claude integration"
   - Or: "Save this link: https://example.com"

---

## Option 2: Cursor IDE

### Step 1: Get Your Server Path
```bash
node get-server-path.js
```

### Step 2: Configure Cursor

1. **Create or edit:** `.cursor/mcp.json` in your project root

2. **Add this configuration:**

```json
{
  "mcpServers": {
    "content-saver": {
      "command": "node",
      "args": ["/Users/annagorozia/Documents/GitHub/Content-Saver-MCP-Server/dist/index.js"]
    }
  }
}
```

**Important:** Replace the path with your actual path

3. **Restart Cursor**

4. **Use it:**
   - Open Cursor's chat/Composer
   - Ask: "Save a note about TypeScript"
   - Or: "Save this link: https://typescriptlang.org"

---

## Option 3: ChatGPT (Web Interface)

ChatGPT's web interface requires an HTTP endpoint. You have two options:

### Option A: Use Claude Desktop or Cursor
These have native MCP support and are easier to set up.

### Option B: Set up HTTP Bridge (Advanced)
If you need ChatGPT specifically, you'll need to:
1. Create an HTTP wrapper around the MCP server
2. Deploy it to a server
3. Configure ChatGPT to use the HTTP endpoint

This is more complex and requires hosting infrastructure.

---

## Testing Your Setup

Once configured, test with these commands:

### Save a Note
```
Save a note: "This is a test note from Claude"
```

### Save a Link
```
Save this link: https://example.com with title "Example Site"
```

### Search
```
Search for items tagged with "test"
```

### List Recent
```
Show me recent items from the last 7 days
```

### Delete
```
Delete the item with ID abc123
```

---

## Troubleshooting

### "Server not found"
- Verify the path: `node get-server-path.js`
- Check file exists: `ls -la dist/index.js`
- Ensure server is built: `npm run build`

### "Permission denied"
- Make sure Node.js is accessible: `which node`
- Try full path to node: `/usr/local/bin/node` or `/usr/bin/node`

### "Connection refused"
- Ensure the MCP server file exists
- Check that Node.js version is 18+
- Verify the path in config is correct

### "Tools not available"
- Restart your AI client completely
- Check configuration JSON syntax
- Verify MCP is enabled in client settings

---

## What You Can Do

Once set up, you can:

✅ **Save notes** - "Save a note: [your text]"
✅ **Save links** - "Save this link: [URL]"
✅ **Search** - "Search for items about [topic]"
✅ **Filter** - "Show me all notes" or "Show links tagged with [tag]"
✅ **Delete** - "Delete item [ID]"
✅ **List recent** - "Show recent items"

All saved items will be stored in `.content-saver/items.json` and will be visible in both:
- Your AI client (via MCP)
- The Web UI (http://localhost:3000)

---

## Need Help?

- Check server path: `node get-server-path.js`
- Test MCP server: The server runs on stdio and waits for MCP protocol messages
- View saved items: `cat .content-saver/items.json`
- Check Web UI: http://localhost:3000

