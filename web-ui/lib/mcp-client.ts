/**
 * MCP Client - Connects to MCP server via stdio protocol
 * Uses the actual MCP protocol for write operations (save, delete)
 * Uses direct storage for read operations (search, list) for better performance
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { ContentItem, SaveNoteInput, SaveLinkInput, SearchFilters, SaveResult } from '../types';

let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;

/**
 * Get or create MCP client connection
 * Falls back to direct storage if MCP server is not available (e.g., on Vercel)
 */
let mcpClientError: Error | null = null;

async function getMCPClient(): Promise<Client | null> {
  // If we've already failed to connect, don't try again
  if (mcpClientError) {
    return null;
  }

  if (mcpClient && mcpTransport) {
    return mcpClient;
  }

  try {
    // Get the path to the compiled MCP server
    const serverPath = join(process.cwd(), '..', 'dist', 'index.js');
    
    // Check if MCP server file exists (won't exist on Vercel)
    if (!existsSync(serverPath)) {
      console.log('⚠️ MCP server not found, using direct storage (Vercel mode)');
      mcpClientError = new Error('MCP server not available');
      return null;
    }
    
    // Create stdio transport - this will spawn the MCP server process
    mcpTransport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: process.env as Record<string, string>,
    });

    // Create client
    mcpClient = new Client(
      {
        name: 'content-saver-web-ui',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect to the server
    await mcpClient.connect(mcpTransport);

    console.log('✅ Connected to MCP server via stdio protocol');
    return mcpClient;
  } catch (error) {
    console.log('⚠️ MCP connection failed, using direct storage:', error instanceof Error ? error.message : String(error));
    mcpClientError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
}

/**
 * Call an MCP tool
 * Falls back to direct storage if MCP is not available
 */
async function callMCPTool(name: string, args: any): Promise<any> {
  const client = await getMCPClient();
  
  // If MCP is not available, return null to trigger fallback
  if (!client) {
    return null;
  }
  
  try {
    const result = await client.callTool({
      name,
      arguments: args,
    });

    if (result.isError) {
      const errorText = (result.content as any)?.[0]?.text || 'Unknown error';
      throw new Error(errorText);
    }

    return result;
  } catch (error) {
    // If MCP call fails, return null to trigger fallback
    console.error('MCP tool call failed, using fallback:', error);
    return null;
  }
}

/**
 * Get direct storage access for read operations
 * Uses local storage implementation (works on Vercel)
 */
async function getDirectStorage(): Promise<any> {
  try {
    // Use local storage implementation (always available)
    // Dynamic import to ensure it's only loaded server-side
    const { Storage } = await import('./storage');
    const storage = new Storage();
    await storage.initialize();
    return storage;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw new Error('Storage initialization failed');
  }
}

/**
 * Save a note using MCP protocol (falls back to direct storage)
 */
export async function saveNote(input: SaveNoteInput): Promise<SaveResult> {
  try {
    const result = await callMCPTool('save_note', {
      title: input.title,
      body: input.body,
      tags: input.tags || [],
    });

    // Fallback to direct storage if MCP is not available
    if (!result) {
      const storage = await getDirectStorage();
      return await storage.saveItem({
        type: 'note',
        title: input.title?.trim(),
        body: input.body.trim(),
        tags: input.tags || [],
      });
    }

    const text = (result.content as any)?.[0]?.text || '';
    const isDuplicate = text.includes('already saved');

    // Extract the saved item from the response
    // The MCP server includes structured data as JSON in a content item
    let savedItem: ContentItem | null = null;
    
    // Look for __MCP_DATA__ marker in content
    const dataContent = (result.content as any)?.find((c: any) => 
      c.text && c.text.startsWith('__MCP_DATA__:')
    );
    
    if (dataContent) {
      try {
        const jsonStr = dataContent.text.replace('__MCP_DATA__:', '');
        const data = JSON.parse(jsonStr);
        savedItem = data.item;
      } catch (e) {
        console.error('Failed to parse MCP data:', e);
      }
    }
    
    // Fallback: search for the item we just saved
    if (!savedItem) {
      const storage = await getDirectStorage();
      const searchResults = storage.searchItems({ query: input.body.substring(0, 50) });
      savedItem = searchResults.find((item: ContentItem) => 
        item.type === 'note' && item.body === input.body.trim()
      ) || null;
    }

    if (!savedItem) {
      // Create a temporary item structure
      savedItem = {
        id: '',
        type: 'note',
        title: input.title,
        body: input.body,
        tags: input.tags || [],
        createdAt: new Date().toISOString(),
      };
    }

    return {
      item: savedItem,
      isDuplicate,
    };
  } catch (error) {
    console.error('MCP save_note error:', error);
    throw error;
  }
}

/**
 * Save a link using MCP protocol (falls back to direct storage)
 */
export async function saveLink(input: SaveLinkInput): Promise<SaveResult> {
  try {
    const result = await callMCPTool('save_link', {
      url: input.url,
      title: input.title,
      comment: input.comment,
      tags: input.tags || [],
    });

    // Fallback to direct storage if MCP is not available
    if (!result) {
      const storage = await getDirectStorage();
      return await storage.saveItem({
        type: 'link',
        url: input.url.trim(),
        title: input.title?.trim(),
        body: input.comment?.trim(),
        tags: input.tags || [],
      });
    }

    const text = (result.content as any)?.[0]?.text || '';
    const isDuplicate = text.includes('already saved');

    // Extract the saved item from the response
    // The MCP server includes structured data as JSON in a content item
    let savedItem: ContentItem | null = null;
    
    // Look for __MCP_DATA__ marker in content
    const dataContent = (result.content as any)?.find((c: any) => 
      c.text && c.text.startsWith('__MCP_DATA__:')
    );
    
    if (dataContent) {
      try {
        const jsonStr = dataContent.text.replace('__MCP_DATA__:', '');
        const data = JSON.parse(jsonStr);
        savedItem = data.item;
      } catch (e) {
        console.error('Failed to parse MCP data:', e);
      }
    }
    
    // Fallback: search for the item we just saved
    if (!savedItem) {
      const storage = await getDirectStorage();
      const searchResults = storage.searchItems({ query: input.url });
      savedItem = searchResults.find((item: ContentItem) => 
        item.type === 'link' && item.url === input.url.trim()
      ) || null;
    }

    if (!savedItem) {
      // Create a temporary item structure
      savedItem = {
        id: '',
        type: 'link',
        url: input.url,
        title: input.title,
        body: input.comment,
        tags: input.tags || [],
        createdAt: new Date().toISOString(),
      };
    }

    return {
      item: savedItem,
      isDuplicate,
    };
  } catch (error) {
    console.error('MCP save_link error:', error);
    throw error;
  }
}

/**
 * Search items - uses direct storage for better performance
 * (MCP protocol is optimized for AI clients, not programmatic access)
 */
export async function searchItems(filters: SearchFilters): Promise<ContentItem[]> {
  const storage = await getDirectStorage();
  return storage.searchItems({
    query: filters.query,
    tags: filters.tags,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
}

/**
 * Get recent items - uses direct storage
 */
export async function getRecentItems(days: number = 7, limit?: number): Promise<ContentItem[]> {
  const storage = await getDirectStorage();
  return storage.getRecentItems(days, limit);
}

/**
 * Delete item using MCP protocol (falls back to direct storage)
 */
export async function deleteItem(id: string): Promise<boolean> {
  try {
    const result = await callMCPTool('delete_item', { id });
    
    // Fallback to direct storage if MCP is not available
    if (!result) {
      const storage = await getDirectStorage();
      return await storage.deleteItem(id);
    }
    
    const text = (result.content as any)?.[0]?.text || '';
    return text.includes('deleted successfully');
  } catch (error) {
    console.error('MCP delete_item error:', error);
    // If error message indicates not found, return false
    const errorText = error instanceof Error ? error.message : String(error);
    if (errorText.includes('not found')) {
      return false;
    }
    // Try fallback to direct storage
    try {
      const storage = await getDirectStorage();
      return await storage.deleteItem(id);
    } catch (fallbackError) {
      throw error; // Throw original error if fallback also fails
    }
  }
}

/**
 * Get all items - uses direct storage
 */
export async function getAllItems(): Promise<ContentItem[]> {
  const storage = await getDirectStorage();
  return storage.getAllItems();
}

/**
 * Get item by ID - uses direct storage
 */
export async function getItemById(id: string): Promise<ContentItem | null> {
  const storage = await getDirectStorage();
  return storage.getItemById(id);
}
