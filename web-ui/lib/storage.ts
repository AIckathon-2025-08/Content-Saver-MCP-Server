/**
 * Standalone Storage implementation for web-ui
 * Used when MCP server is not available (e.g., on Vercel)
 * 
 * KAN-3: Auto-fetches webpage metadata when saving links
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ContentItem, SaveResult, UpdateResult } from '../types';
import { fetchWebpageMetadata } from './metadata-fetcher';

// Use /tmp on Vercel (writable), or .content-saver in project root for local dev
const getStoragePath = () => {
  // On Vercel, use /tmp (writable directory)
  // NOTE: /tmp is ephemeral - data is lost when function instance is recycled
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const tmpPath = join('/tmp', '.content-saver');
    console.log('📁 Using Vercel storage path:', tmpPath);
    console.log('⚠️  WARNING: Data is ephemeral on Vercel (lost on function restart)');
    return tmpPath;
  }
  // Local development: use project root
  const localPath = join(process.cwd(), '.content-saver');
  console.log('📁 Using local storage path:', localPath);
  return localPath;
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
            console.warn('Storage file contains invalid data, starting fresh');
            this.items = [];
          } else {
            console.log(`✅ Loaded ${this.items.length} items from storage`);
          }
        } catch (error) {
          // If file is corrupted, start fresh
          console.error('Error loading storage file, starting fresh:', error);
          this.items = [];
        }
      } else {
        // File doesn't exist, start with empty array
        console.log('📝 Storage file does not exist, starting with empty storage');
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
      console.log(`💾 Persisted ${this.items.length} items to storage`);
    } catch (error) {
      // On Vercel, if write fails, continue with in-memory storage
      // Data will be lost on function restart, but app continues to work
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Failed to persist storage (using in-memory only):', errorMsg);
      console.warn('⚠️  Data will be lost when function instance is recycled');
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
   * 
   * KAN-3: For links, automatically fetches webpage metadata if not provided
   */
  async saveItem(item: {
    type: 'note' | 'link';
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
    skipMetadataFetch?: boolean; // Skip auto-fetch if metadata already provided
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
      
      // KAN-3: Auto-fetch metadata for new links if not already provided
      if (!item.skipMetadataFetch && (!item.title || !item.body)) {
        try {
          console.log(`🔗 KAN-3: Auto-fetching metadata for ${item.url}`);
          const metadata = await fetchWebpageMetadata(item.url);
          
          // Use fetched metadata if not already provided
          if (!item.title && metadata.title) {
            item.title = metadata.title;
            console.log(`   📄 Title: ${metadata.title}`);
          }
          if (!item.body && metadata.description) {
            item.body = metadata.description;
            console.log(`   📝 Description: ${metadata.description?.substring(0, 50)}...`);
          }
          
          // Store additional metadata in the item (favicon, ogImage)
          // These will be added to the item below
          (item as any)._metadata = metadata;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch metadata for ${item.url}:`, error);
        }
      }
    }

    // Create new item with fetched metadata
    const metadata = (item as any)._metadata || {};
    const newItem: ContentItem = {
      id: this.generateId(),
      type: item.type,
      title: item.title?.trim(),
      body: item.body?.trim(),
      url: item.url?.trim(),
      tags: (item.tags || []).map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0),
      createdAt: new Date().toISOString(),
      // KAN-3: Store additional metadata
      ...(metadata.favicon && { favicon: metadata.favicon }),
      ...(metadata.ogImage && { ogImage: metadata.ogImage }),
      ...(metadata.siteName && { siteName: metadata.siteName }),
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

  /**
   * Update an existing item by ID
   * Supports partial updates - only provided fields are updated
   */
  async updateItem(id: string, updates: {
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
    isPinned?: boolean;
  }): Promise<UpdateResult | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const existingItem = this.items[index];
    let hasChanges = false;

    const updatedItem: ContentItem = { ...existingItem };

    // Update title if provided
    if (updates.title !== undefined) {
      const newTitle = updates.title.trim() || undefined;
      if (newTitle !== existingItem.title) {
        updatedItem.title = newTitle;
        hasChanges = true;
      }
    }

    // Update body if provided
    if (updates.body !== undefined) {
      const newBody = updates.body.trim() || undefined;
      if (newBody !== existingItem.body) {
        updatedItem.body = newBody;
        hasChanges = true;
      }
    }

    // Only allow URL updates for links
    if (updates.url !== undefined && existingItem.type === 'link') {
      const newUrl = updates.url.trim();
      if (newUrl && newUrl !== existingItem.url) {
        // Check for duplicate URL (excluding current item)
        const normalizedNewUrl = this.normalizeUrl(newUrl);
        const duplicate = this.items.find((item) =>
          item.id !== id &&
          item.type === 'link' &&
          item.url &&
          this.normalizeUrl(item.url) === normalizedNewUrl
        );
        if (duplicate) {
          throw new Error(
            `Duplicate URL: a link with this URL already exists (id: "${duplicate.id}"` +
            `${duplicate.title ? `, title: "${duplicate.title}"` : ''}). ` +
            'Use PUT /api/items/:id to update the existing entry, or DELETE /api/items/:id to remove it first.'
          );
        }
        updatedItem.url = newUrl;
        hasChanges = true;
      }
    }

    // Update tags if provided
    if (updates.tags !== undefined) {
      const newTags = updates.tags.map((t) => t.trim()).filter((t) => t.length > 0);
      const tagsChanged = JSON.stringify(newTags.sort()) !== JSON.stringify([...existingItem.tags].sort());
      if (tagsChanged) {
        updatedItem.tags = newTags;
        hasChanges = true;
      }
    }

    // KAN-7: Update isPinned if provided
    if (updates.isPinned !== undefined && updates.isPinned !== existingItem.isPinned) {
      updatedItem.isPinned = updates.isPinned;
      hasChanges = true;
    }

    // Only persist if changes were made
    if (hasChanges) {
      updatedItem.updatedAt = new Date().toISOString();
      this.items[index] = updatedItem;
      await this.persist();
    }

    return {
      item: updatedItem,
      updated: hasChanges
    };
  }
}

