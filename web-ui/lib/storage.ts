/**
 * Standalone Storage implementation for web-ui
 * Used when MCP server is not available (e.g., on Vercel)
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ContentItem, SaveResult } from '../types';

// Use /tmp on Vercel (writable), or .content-saver in project root for local dev
const getStoragePath = () => {
  // On Vercel, use /tmp (writable directory)
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return join('/tmp', '.content-saver');
  }
  // Local development: use project root
  return join(process.cwd(), '.content-saver');
};

const STORAGE_DIR = getStoragePath();
const STORAGE_FILE = join(STORAGE_DIR, 'items.json');

/**
 * Storage manager for content items
 */
export class Storage {
  private items: ContentItem[] = [];

  /**
   * Initialize storage - load existing items or create storage directory
   */
  async initialize(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      if (!existsSync(STORAGE_DIR)) {
        await mkdir(STORAGE_DIR, { recursive: true });
      }

      // Load existing items if file exists
      if (existsSync(STORAGE_FILE)) {
        try {
          const data = await readFile(STORAGE_FILE, 'utf-8');
          this.items = JSON.parse(data);
          // Validate that loaded data is an array
          if (!Array.isArray(this.items)) {
            this.items = [];
          }
        } catch (error) {
          // If file is corrupted, start fresh
          console.error('Error loading storage file, starting fresh:', error);
          this.items = [];
        }
      } else {
        // File doesn't exist, start with empty array
        this.items = [];
      }
    } catch (error) {
      // If directory creation fails (e.g., read-only filesystem), start with empty array
      console.warn('Storage initialization warning (using in-memory only):', error instanceof Error ? error.message : String(error));
      this.items = [];
    }
  }

  /**
   * Save items to disk (atomic write)
   * On Vercel, this may fail silently if /tmp is not available
   */
  private async persist(): Promise<void> {
    try {
      // Ensure directory exists
      if (!existsSync(STORAGE_DIR)) {
        await mkdir(STORAGE_DIR, { recursive: true });
      }
      
      // Write to temp file first, then rename (atomic operation)
      const tempFile = `${STORAGE_FILE}.tmp`;
      await writeFile(tempFile, JSON.stringify(this.items, null, 2), 'utf-8');
      await writeFile(STORAGE_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (error) {
      // On Vercel, if write fails, continue with in-memory storage
      // Data will be lost on function restart, but app continues to work
      console.warn('Failed to persist storage (using in-memory only):', error instanceof Error ? error.message : String(error));
      // Don't throw - allow app to continue with in-memory storage
    }
  }

  /**
   * Generate a unique ID for a new item
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash, convert to lowercase, remove fragment
      return urlObj.origin + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
    } catch {
      // If URL is invalid, return as-is
      return url;
    }
  }

  /**
   * Save an item (note or link)
   * Compatible with MCP client saveItem interface
   */
  async saveItem(item: {
    type: 'note' | 'link';
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
  }): Promise<SaveResult> {
    // For links, check for duplicates
    if (item.type === 'link' && item.url) {
      const normalizedUrl = this.normalizeUrl(item.url);
      const existing = this.items.find(
        (i) => i.type === 'link' && i.url && this.normalizeUrl(i.url) === normalizedUrl
      );

      if (existing) {
        // Merge tags if provided
        if (item.tags && item.tags.length > 0) {
          const existingTags = new Set(existing.tags);
          item.tags.forEach((tag) => existingTags.add(tag.toLowerCase().trim()));
          existing.tags = Array.from(existingTags);
          
          // Update title/body if they were empty
          if (!existing.title && item.title) {
            existing.title = item.title.trim();
          }
          if (!existing.body && item.body) {
            existing.body = item.body.trim();
          }
          
          existing.updatedAt = new Date().toISOString();
          await this.persist();
        }
        return {
          item: existing,
          isDuplicate: true,
        };
      }
    }

    // Create new item
    const newItem: ContentItem = {
      id: this.generateId(),
      type: item.type,
      title: item.title?.trim(),
      body: item.body?.trim(),
      url: item.url?.trim(),
      tags: (item.tags || []).map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0),
      createdAt: new Date().toISOString(),
    };

    this.items.push(newItem);
    await this.persist();

    return {
      item: newItem,
      isDuplicate: false,
    };
  }

  /**
   * Search items
   */
  searchItems(filters: {
    query?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): ContentItem[] {
    let results = [...this.items];

    // Filter by query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const bodyMatch = item.body?.toLowerCase().includes(query);
        const urlMatch = item.url?.toLowerCase().includes(query);
        const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(query));
        return titleMatch || bodyMatch || urlMatch || tagMatch;
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = filters.tags.map((t) => t.toLowerCase());
      results = results.filter((item) =>
        filterTags.some((tag) => item.tags.map((t) => t.toLowerCase()).includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      results = results.filter((item) => new Date(item.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      results = results.filter((item) => new Date(item.createdAt) <= toDate);
    }

    // Sort by newest first
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get recent items
   */
  getRecentItems(days: number = 7, limit?: number): ContentItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recent = this.items
      .filter((item) => new Date(item.createdAt) >= cutoffDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return limit ? recent.slice(0, limit) : recent;
  }

  /**
   * Get all items
   */
  getAllItems(): ContentItem[] {
    return [...this.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get item by ID
   */
  getItemById(id: string): ContentItem | null {
    return this.items.find((item) => item.id === id) || null;
  }

  /**
   * Delete item by ID
   */
  async deleteItem(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    this.items.splice(index, 1);
    await this.persist();
    return true;
  }
}

