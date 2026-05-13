#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Storage } from './storage.js';
import { SaveNoteInput, SaveLinkInput, SearchFilters, UpdateItemInput } from './types.js';

/**
 * Content Saver MCP Server
 * Provides tools for saving notes, links, searching, and managing content
 */
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
              title: {
                type: 'string',
                description: 'Optional title for the note',
              },
              body: {
                type: 'string',
                description: 'Required body text of the note',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of tags (provided by AI client)',
              },
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
              url: {
                type: 'string',
                description: 'Required URL to save',
              },
              title: {
                type: 'string',
                description: 'Optional title for the link',
              },
              comment: {
                type: 'string',
                description: 'Optional comment/body text about the link',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of tags (provided by AI client)',
              },
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
              query: {
                type: 'string',
                description: 'Free-text search query (searches title, body, URL)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags (items must have at least one matching tag)',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter items created from this date (ISO 8601 format)',
              },
              dateTo: {
                type: 'string',
                description: 'Filter items created until this date (ISO 8601 format)',
              },
            },
          },
        },
        {
          name: 'list_recent',
          description: 'List recently saved items. Returns items from the last N days, ordered newest to oldest.',
          inputSchema: {
            type: 'object',
            properties: {
              days: {
                type: 'number',
                description: 'Number of days to look back (default: 7)',
                default: 7,
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
              },
            },
          },
        },
        {
          name: 'delete_item',
          description: 'Delete a saved item by its ID. Returns success confirmation or error if ID not found.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The unique ID of the item to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'update_item',
          description: 'Update an existing item (note or link) by its ID. Supports partial updates - only provided fields will be changed.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The unique ID of the item to update',
              },
              title: {
                type: 'string',
                description: 'New title for the item (optional)',
              },
              body: {
                type: 'string',
                description: 'New body text/comment for the item (optional)',
              },
              url: {
                type: 'string',
                description: 'New URL for links only (optional, ignored for notes)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'New tags array - replaces existing tags if provided (optional)',
              },
            },
            required: ['id'],
          },
        },
      ] as Tool[],
    }));

    // Handle tool calls
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
            return await this.handleListRecent(args as { days?: number; limit?: number });

          case 'delete_item':
            return await this.handleDeleteItem((args || {}) as unknown as { id: string });

          case 'update_item':
            return await this.handleUpdateItem((args || {}) as unknown as UpdateItemInput);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleSaveNote(args: SaveNoteInput) {
    if (!args.body || args.body.trim() === '') {
      throw new Error(
        'Missing required field "body": the note body text cannot be empty. ' +
        'Example: { "body": "My note content here", "title": "Optional title" }'
      );
    }

    const result = await this.storage.saveItem({
      type: 'note',
      title: args.title?.trim(),
      body: args.body.trim(),
      tags: args.tags || [],
    });

    if (result.isDuplicate) {
      return {
        content: [
          {
            type: 'text',
            text: this.formatDuplicateMessage(result.item),
          },
          {
            type: 'text',
            text: `__MCP_DATA__:${JSON.stringify({ item: result.item, isDuplicate: true })}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatSaveConfirmation(result.item),
        },
        {
          type: 'text',
          text: `__MCP_DATA__:${JSON.stringify({ item: result.item, isDuplicate: false })}`,
        },
      ],
    };
  }

  private async handleSaveLink(args: SaveLinkInput) {
    if (!args.url || args.url.trim() === '') {
      throw new Error(
        'Missing required field "url": provide a URL starting with http://, https://, or ftp://. ' +
        'Example: { "url": "https://example.com" }'
      );
    }

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error(
        `Invalid URL format: "${args.url}". ` +
        'URLs must start with a valid protocol — use http://, https://, or ftp://. ' +
        'Example: https://example.com'
      );
    }

    const result = await this.storage.saveItem({
      type: 'link',
      url: args.url.trim(),
      title: args.title?.trim(),
      body: args.comment?.trim(),
      tags: args.tags || [],
    });

    if (result.isDuplicate) {
      return {
        content: [
          {
            type: 'text',
            text: this.formatDuplicateMessage(result.item),
          },
          {
            type: 'text',
            text: `__MCP_DATA__:${JSON.stringify({ item: result.item, isDuplicate: true })}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatSaveConfirmation(result.item),
        },
        {
          type: 'text',
          text: `__MCP_DATA__:${JSON.stringify({ item: result.item, isDuplicate: false })}`,
        },
      ],
    };
  }

  private async handleSearch(args: SearchFilters) {
    if (args.dateFrom !== undefined) {
      const d = new Date(args.dateFrom);
      if (isNaN(d.getTime())) {
        throw new Error(
          `Invalid date for "dateFrom": "${args.dateFrom}". ` +
          'Use ISO 8601 format: YYYY-MM-DD (e.g. 2024-01-15) or a full timestamp like 2024-01-15T00:00:00Z'
        );
      }
    }

    if (args.dateTo !== undefined) {
      const d = new Date(args.dateTo);
      if (isNaN(d.getTime())) {
        throw new Error(
          `Invalid date for "dateTo": "${args.dateTo}". ` +
          'Use ISO 8601 format: YYYY-MM-DD (e.g. 2024-01-15) or a full timestamp like 2024-01-15T23:59:59Z'
        );
      }
    }

    const results = this.storage.searchItems({
      query: args.query,
      tags: args.tags,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No items found matching your search criteria.',
          },
          {
            type: 'text',
            text: `__MCP_DATA__:${JSON.stringify({ items: [] })}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatSearchResults(results),
        },
        {
          type: 'text',
          text: `__MCP_DATA__:${JSON.stringify({ items: results })}`,
        },
      ],
    };
  }

  private async handleListRecent(args: { days?: number; limit?: number }) {
    const days = args.days ?? 7;
    const results = this.storage.getRecentItems(days, args.limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No items found from the last ${days} day(s).`,
          },
          {
            type: 'text',
            text: `__MCP_DATA__:${JSON.stringify({ items: [] })}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatSearchResults(results),
        },
        {
          type: 'text',
          text: `__MCP_DATA__:${JSON.stringify({ items: results })}`,
        },
      ],
    };
  }

  private async handleDeleteItem(args: { id: string }) {
    const success = await this.storage.deleteItem(args.id);

    if (!success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Item with ID "${args.id}" not found.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Item deleted successfully\nID: ${args.id}`,
        },
      ],
    };
  }

  private async handleUpdateItem(args: UpdateItemInput) {
    if (!args.id || args.id.trim() === '') {
      throw new Error(
        'Missing required field "id": provide the unique ID of the item to update. ' +
        'Use the list_recent or search tools to find item IDs.'
      );
    }

    // Validate URL format if provided
    if (args.url !== undefined && args.url.trim() !== '') {
      try {
        new URL(args.url);
      } catch {
        throw new Error(
          `Invalid URL format: "${args.url}". ` +
          'URLs must start with a valid protocol — use http://, https://, or ftp://. ' +
          'Example: https://example.com'
        );
      }
    }

    const result = await this.storage.updateItem(args.id, {
      title: args.title,
      body: args.body,
      url: args.url,
      tags: args.tags,
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Item with ID "${args.id}" not found.`,
          },
        ],
        isError: true,
      };
    }

    const { item, updated } = result;
    const emoji = item.type === 'note' ? '📝' : '🔗';

    if (!updated) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ No changes made to ${item.type}\nID: ${item.id}`,
          },
          {
            type: 'text',
            text: `__MCP_DATA__:${JSON.stringify({ item, updated: false })}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${emoji} ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} updated successfully\nID: ${item.id}${item.title ? `\nTitle: "${item.title}"` : ''}\nTags: ${item.tags.length > 0 ? item.tags.join(', ') : 'none'}`,
        },
        {
          type: 'text',
          text: `__MCP_DATA__:${JSON.stringify({ item, updated: true })}`,
        },
      ],
    };
  }

  private formatSaveConfirmation(item: { type: string; title?: string; tags: string[]; createdAt: string }): string {
    const date = new Date(item.createdAt);
    const dateStr = this.formatDate(date);
    const tagsStr = item.tags.length > 0 ? item.tags.join(', ') : 'none';
    const typeEmoji = item.type === 'note' ? '📝' : '🔗';
    const typeLabel = item.type === 'note' ? 'note' : 'link';

    return `✔ Saved to Content Saver
Type: ${typeLabel}
${item.title ? `Title: "${item.title}"\n` : ''}Tags: ${tagsStr}
Saved: ${dateStr}`;
  }

  private formatDuplicateMessage(item: { title?: string; tags: string[] }): string {
    const tagsStr = item.tags.length > 0 ? item.tags.join(' · ') : 'none';
    return `ℹ️ This link is already saved
${item.title ? `Title: ${item.title}\n` : ''}Tags: ${tagsStr}`;
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

  async run(): Promise<void> {
    await this.storage.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Content Saver MCP Server running on stdio');
  }
}

// Start the server
const server = new ContentSaverServer();
server.run().catch(console.error);

