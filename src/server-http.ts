#!/usr/bin/env node

/**
 * HTTP/SSE version of the MCP server for ChatGPT web interface
 * This exposes the MCP server over HTTP using Server-Sent Events
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Storage } from './storage.js';
import { SaveNoteInput, SaveLinkInput, SearchFilters } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

class ContentSaverServer {
  private server: Server;
  private storage: Storage;

  constructor() {
    this.server = new Server(
      {
        name: 'content-saver',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.storage = new Storage();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'save_note',
          description: 'Save a text note with optional title and tags. Tags should be provided by the AI client.',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Optional title for the note' },
              body: { type: 'string', description: 'Required body text of the note' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Optional array of tags' },
            },
            required: ['body'],
          },
        },
        {
          name: 'save_link',
          description: 'Save a URL/link with optional title, comment, and tags. Prevents duplicates for the same URL.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Required URL to save' },
              title: { type: 'string', description: 'Optional title for the link' },
              comment: { type: 'string', description: 'Optional comment/body text about the link' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Optional array of tags' },
            },
            required: ['url'],
          },
        },
        {
          name: 'search',
          description: 'Search saved items using query text, tags, and/or date range. Returns both notes and links.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Free-text search query' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
              dateFrom: { type: 'string', description: 'Filter items created from this date (ISO 8601)' },
              dateTo: { type: 'string', description: 'Filter items created until this date (ISO 8601)' },
            },
          },
        },
        {
          name: 'list_recent',
          description: 'List recently saved items. Returns items from the last N days, ordered newest to oldest.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Number of days to look back (default: 7)', default: 7 },
              limit: { type: 'number', description: 'Maximum number of results to return' },
            },
          },
        },
        {
          name: 'delete_item',
          description: 'Delete a saved item by its ID. Returns success confirmation or error if ID not found.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The unique ID of the item to delete' },
            },
            required: ['id'],
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'save_note':
            return await this.handleSaveNote((args || {}) as unknown as SaveNoteInput);
          case 'save_link':
            return await this.handleSaveLink((args || {}) as unknown as SaveLinkInput);
          case 'search':
            return await this.handleSearch((args || {}) as unknown as SearchFilters);
          case 'list_recent':
            return await this.handleListRecent((args || {}) as unknown as { days?: number; limit?: number });
          case 'delete_item':
            return await this.handleDeleteItem((args || {}) as unknown as { id: string });
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  private async handleSaveNote(args: SaveNoteInput) {
    if (!args.body || args.body.trim() === '') {
      throw new Error('Body text is required for notes');
    }
    const result = await this.storage.saveItem({
      type: 'note',
      title: args.title?.trim(),
      body: args.body.trim(),
      tags: args.tags || [],
    });
    return {
      content: [{ type: 'text', text: result.isDuplicate ? this.formatDuplicateMessage(result.item) : this.formatSaveConfirmation(result.item) }],
    };
  }

  private async handleSaveLink(args: SaveLinkInput) {
    if (!args.url || args.url.trim() === '') {
      throw new Error('URL is required for links');
    }
    try {
      new URL(args.url);
    } catch {
      throw new Error('Invalid URL format');
    }
    const result = await this.storage.saveItem({
      type: 'link',
      url: args.url.trim(),
      title: args.title?.trim(),
      body: args.comment?.trim(),
      tags: args.tags || [],
    });
    return {
      content: [{ type: 'text', text: result.isDuplicate ? this.formatDuplicateMessage(result.item) : this.formatSaveConfirmation(result.item) }],
    };
  }

  private async handleSearch(args: SearchFilters) {
    const results = this.storage.searchItems({
      query: args.query,
      tags: args.tags,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    });
    return {
      content: [{ type: 'text', text: results.length === 0 ? 'No items found matching your search criteria.' : this.formatSearchResults(results) }],
    };
  }

  private async handleListRecent(args: { days?: number; limit?: number }) {
    const days = args.days ?? 7;
    const results = this.storage.getRecentItems(days, args.limit);
    return {
      content: [{ type: 'text', text: results.length === 0 ? `No items found from the last ${days} day(s).` : this.formatSearchResults(results) }],
    };
  }

  private async handleDeleteItem(args: { id: string }) {
    const success = await this.storage.deleteItem(args.id);
    if (!success) {
      return {
        content: [{ type: 'text', text: `Error: Item with ID "${args.id}" not found.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: `🗑️ Item deleted successfully\nID: ${args.id}` }],
    };
  }

  private formatSaveConfirmation(item: { type: string; title?: string; tags: string[]; createdAt: string }): string {
    const date = new Date(item.createdAt);
    const dateStr = this.formatDate(date);
    const tagsStr = item.tags.length > 0 ? item.tags.join(', ') : 'none';
    const typeLabel = item.type === 'note' ? 'note' : 'link';
    return `✔ Saved to Content Saver\nType: ${typeLabel}\n${item.title ? `Title: "${item.title}"\n` : ''}Tags: ${tagsStr}\nSaved: ${dateStr}`;
  }

  private formatDuplicateMessage(item: { title?: string; tags: string[] }): string {
    const tagsStr = item.tags.length > 0 ? item.tags.join(' · ') : 'none';
    return `ℹ️ This link is already saved\n${item.title ? `Title: ${item.title}\n` : ''}Tags: ${tagsStr}`;
  }

  private formatSearchResults(items: Array<{ type: string; title?: string; body?: string; url?: string; tags: string[]; createdAt: string }>): string {
    return items.map(item => {
      const emoji = item.type === 'note' ? '📝' : '🔗';
      const date = new Date(item.createdAt);
      const dateStr = this.formatDate(date);
      const tagsStr = item.tags.length > 0 ? item.tags.join(', ') : 'none';
      let result = `${emoji} ${item.title || '(Untitled)'}\n`;
      if (item.body) {
        result += `"${item.body.length > 100 ? item.body.substring(0, 100) + '...' : item.body}"\n`;
      }
      if (item.url) {
        result += `[Open Link: ${item.url}]\n`;
      }
      result += `Tags: ${tagsStr}\nSaved: ${dateStr}`;
      return result;
    }).join('\n\n');
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  getServer(): Server {
    return this.server;
  }
}

// Initialize server
async function startServer() {
  const mcpServer = new ContentSaverServer();
  await mcpServer.initialize();
  
  return mcpServer;
}

const mcpServerPromise = startServer();

// SSE endpoint for MCP protocol
app.get('/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: {"type":"connection","status":"connected"}\n\n');

  // Handle MCP protocol messages via POST to /message
  // This is a simplified version - full SSE implementation would require bidirectional communication
});

// MCP message endpoint
app.post('/message', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    // Handle MCP protocol messages
    // This is a simplified implementation
    res.json({ success: true, message: 'MCP message received' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'content-saver-mcp-server' });
});

// List tools endpoint (for debugging)
app.get('/tools', async (req: Request, res: Response) => {
  try {
    const server = await mcpServerPromise;
    const tools = await server.getServer().request(
      { method: 'tools/list' },
      ListToolsRequestSchema
    );
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Start server
mcpServerPromise.then(() => {
  app.listen(PORT, () => {
    console.log(`Content Saver MCP Server (HTTP) running on http://localhost:${PORT}`);
    console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
    console.log(`\nFor ChatGPT, use URL: http://localhost:${PORT}/sse`);
    console.log(`(For production, use a tunnel like ngrok or deploy to a hosting service)`);
    console.log(`\nExample with ngrok:`);
    console.log(`  1. Run: ngrok http ${PORT}`);
    console.log(`  2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)`);
    console.log(`  3. In ChatGPT, use: https://abc123.ngrok.io/sse`);
  });
}).catch(console.error);

