import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ContentItem, SaveResult } from './types.js';

const STORAGE_DIR = join(process.cwd(), '.content-saver');
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
    }
  }

  /**
   * Save items to disk (atomic write)
   */
  private async persist(): Promise<void> {
    try {
      // Write to temp file first, then rename (atomic operation)
      const tempFile = `${STORAGE_FILE}.tmp`;
      await writeFile(tempFile, JSON.stringify(this.items, null, 2), 'utf-8');
      await writeFile(STORAGE_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to persist storage: ${error}`);
    }
  }

  /**
   * Generate a unique ID for a new item
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Normalize URL for deduplication
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash, convert to lowercase, remove fragment
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace(/\/$/, '')}${urlObj.search}`.toLowerCase();
    } catch {
      // If URL parsing fails, return as-is (will be caught by validation)
      return url.toLowerCase().trim();
    }
  }

  /**
   * Check if a URL already exists
   */
  findDuplicateUrl(url: string): ContentItem | null {
    const normalized = this.normalizeUrl(url);
    return this.items.find(item => 
      item.type === 'link' && 
      item.url && 
      this.normalizeUrl(item.url) === normalized
    ) || null;
  }

  /**
   * Save a new item
   */
  async saveItem(item: Omit<ContentItem, 'id' | 'createdAt'>): Promise<SaveResult> {
    // Check for duplicate URL if it's a link
    if (item.type === 'link' && item.url) {
      const duplicate = this.findDuplicateUrl(item.url);
      if (duplicate) {
        // Optional merging: merge tags, update title/body if empty
        const mergedTags = [...new Set([...duplicate.tags, ...(item.tags || [])])];
        const updatedItem: ContentItem = {
          ...duplicate,
          tags: mergedTags,
          title: duplicate.title || item.title,
          body: duplicate.body || item.body,
          updatedAt: new Date().toISOString()
        };
        
        // Update in array
        const index = this.items.findIndex(i => i.id === duplicate.id);
        if (index !== -1) {
          this.items[index] = updatedItem;
          await this.persist();
        }
        
        return {
          item: updatedItem,
          isDuplicate: true
        };
      }
    }

    // Create new item
    const newItem: ContentItem = {
      ...item,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.items.push(newItem);
    await this.persist();

    return {
      item: newItem,
      isDuplicate: false
    };
  }

  /**
   * Get all items
   */
  getAllItems(): ContentItem[] {
    return [...this.items];
  }

  /**
   * Search items with filters
   */
  searchItems(filters: {
    query?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): ContentItem[] {
    let results = [...this.items];

    // Filter by query (search in title, body, url)
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      results = results.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(queryLower);
        const bodyMatch = item.body?.toLowerCase().includes(queryLower);
        const urlMatch = item.url?.toLowerCase().includes(queryLower);
        return titleMatch || bodyMatch || urlMatch;
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const tagSet = new Set(filters.tags.map(t => t.toLowerCase()));
      results = results.filter(item => 
        item.tags.some(tag => tagSet.has(tag.toLowerCase()))
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      results = results.filter(item => new Date(item.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      // Set to end of day
      toDate.setHours(23, 59, 59, 999);
      results = results.filter(item => new Date(item.createdAt) <= toDate);
    }

    // Sort newest to oldest
    results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return results;
  }

  /**
   * Get recent items
   */
  getRecentItems(days: number = 7, limit?: number): ContentItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let results = this.items.filter(item => 
      new Date(item.createdAt) >= cutoffDate
    );

    // Sort newest to oldest
    results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit if specified
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Delete an item by ID
   */
  async deleteItem(id: string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    this.items.splice(index, 1);
    await this.persist();
    return true;
  }

  /**
   * Get item by ID
   */
  getItemById(id: string): ContentItem | null {
    return this.items.find(item => item.id === id) || null;
  }
}

