#!/usr/bin/env node

/**
 * Helper script to get the absolute path to the MCP server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');
const absolutePath = join(process.cwd(), 'dist', 'index.js');

console.log('\n📁 Content Saver MCP Server Path:\n');
console.log('Absolute path:', absolutePath);
console.log('\n✅ Use this path in your MCP configuration:\n');

const config = {
  mcpServers: {
    "content-saver": {
      command: "node",
      args: [absolutePath]
    }
  }
};

console.log(JSON.stringify(config, null, 2));

if (!existsSync(absolutePath)) {
  console.log('\n⚠️  Warning: Server file not found!');
  console.log('   Run: npm run build');
} else {
  console.log('\n✅ Server file exists and is ready to use!');
}

console.log('\n📝 Configuration file locations:');
console.log('   • Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json');
console.log('   • Cursor: .cursor/mcp.json');
console.log('\n');

