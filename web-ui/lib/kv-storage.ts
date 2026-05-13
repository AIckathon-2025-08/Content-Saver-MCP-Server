/**
 * Redis Storage Adapter
 *
 * Provides persistent storage using Redis (via REDIS_URL)
 * Falls back to file-based storage if Redis is not configured
 */

import Redis from 'ioredis';
import { ContentItem, SaveResult, UpdateResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { summarizeUrl } from './ai-summarizer';
import { Storage } from './storage';

const ITEMS_KEY = 'content-saver:items';

// Singleton Redis client
let redisClient: Redis | null = null;

// Fallback storage instance
let fallbackStorage: Storage | null = null;

async function getFallbackStorage(): Promise<Storage> {
  if (!fallbackStorage) {
    fallbackStorage = new Storage();
    await fallbackStorage.initialize();
  }
  return fallbackStorage;
}

/**
 * Get Redis client - lazy initialization
 */
function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('REDIS_URL not configured');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

/**
 * Get all items from Redis storage (or fallback to file storage)
 */
export async function getAllItems(): Promise<ContentItem[]> {
  const client = getRedisClient();
  if (!client) {
    console.log('Redis not configured, using file-based storage');
    const storage = await getFallbackStorage();
    return storage.getAllItems();
  }

  try {
    const data = await client.get(ITEMS_KEY);
    if (!data) return [];
    return JSON.parse(data) as ContentItem[];
  } catch (error) {
    console.error('Error fetching items from Redis:', error);
    return [];
  }
}

/**
 * Save all items to Redis storage
 * Note: File-based storage is handled directly in saveNote/saveLink
 */
async function saveAllItems(items: ContentItem[]): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    console.log('Redis not configured - using file-based storage');
    return; // File storage handled in individual save functions
  }

  try {
    await client.set(ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving items to Redis:', error);
    throw error;
  }
}

/**
 * Get a single item by ID
 */
export async function getItemById(id: string): Promise<ContentItem | null> {
  const items = await getAllItems();
  return items.find(item => item.id === id) || null;
}

/**
 * Save a new note
 */
export async function saveNote(input: {
  title?: string;
  body: string;
  tags?: string[];
}): Promise<SaveResult> {
  const client = getRedisClient();

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for note save');
    const storage = await getFallbackStorage();
    return await storage.saveItem({
      type: 'note',
      title: input.title?.trim(),
      body: input.body.trim(),
      tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
    });
  }

  // Redis storage
  const items = await getAllItems();

  const newItem: ContentItem = {
    id: uuidv4(),
    type: 'note',
    title: input.title?.trim() || undefined,
    body: input.body.trim(),
    tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
    createdAt: new Date().toISOString(),
  };

  items.unshift(newItem);
  await saveAllItems(items);

  return { item: newItem, isDuplicate: false };
}

/**
 * Save a new link (with duplicate detection)
 */
export async function saveLink(input: {
  url: string;
  title?: string;
  comment?: string;
  tags?: string[];
}): Promise<SaveResult> {
  const client = getRedisClient();

  // KAN-10: Generate AI summary and fetch title for the link
  let summary: string | undefined;
  let fetchedTitle: string | undefined;
  try {
    const result = await summarizeUrl(input.url, input.title);
    if (result.summary) {
      summary = result.summary;
    }
    if (result.title) {
      fetchedTitle = result.title;
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    // Continue without summary - don't fail the save
  }

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for link save');
    const storage = await getFallbackStorage();
    const result = await storage.saveItem({
      type: 'link',
      url: input.url.trim(),
      title: input.title?.trim() || fetchedTitle,
      body: input.comment?.trim(),
      tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
      skipMetadataFetch: true, // We already fetched with AI
    });

    // Add summary if generated
    if (summary && result.item) {
      result.item.summary = summary;
      await storage.updateItem(result.item.id, { summary });
    }

    return result;
  }

  // Redis storage
  const items = await getAllItems();

  // Normalize URL for comparison
  const normalizeUrl = (url: string): string => {
    try {
      const u = new URL(url.toLowerCase().trim());
      return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  };

  const normalizedUrl = normalizeUrl(input.url);
  const existingItem = items.find(
    item => item.type === 'link' && item.url && normalizeUrl(item.url) === normalizedUrl
  );

  if (existingItem) {
    return { item: existingItem, isDuplicate: true };
  }

  const newItem: ContentItem = {
    id: uuidv4(),
    type: 'link',
    url: input.url.trim(),
    title: input.title?.trim() || fetchedTitle || undefined,
    body: input.comment?.trim() || undefined,
    tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
    createdAt: new Date().toISOString(),
    summary,
  };

  items.unshift(newItem);
  await saveAllItems(items);

  return { item: newItem, isDuplicate: false };
}

/**
 * Update an existing item
 */
export async function updateItem(
  id: string,
  updates: {
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
    isPinned?: boolean;
    summary?: string; // KAN-10
  }
): Promise<UpdateResult | null> {
  const client = getRedisClient();

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for update');
    const storage = await getFallbackStorage();
    return await storage.updateItem(id, updates);
  }

  // Redis storage
  const items = await getAllItems();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return null;
  }

  const existingItem = items[index];
  let hasChanges = false;

  const updatedItem: ContentItem = { ...existingItem };

  if (updates.title !== undefined && updates.title !== existingItem.title) {
    updatedItem.title = updates.title.trim() || undefined;
    hasChanges = true;
  }

  if (updates.body !== undefined && updates.body !== existingItem.body) {
    updatedItem.body = updates.body.trim() || undefined;
    hasChanges = true;
  }

  if (updates.url !== undefined && existingItem.type === 'link' && updates.url !== existingItem.url) {
    updatedItem.url = updates.url.trim();
    hasChanges = true;
  }

  if (updates.tags !== undefined) {
    const newTags = updates.tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    if (JSON.stringify(newTags.sort()) !== JSON.stringify([...existingItem.tags].sort())) {
      updatedItem.tags = newTags;
      hasChanges = true;
    }
  }

  if (updates.isPinned !== undefined && updates.isPinned !== existingItem.isPinned) {
    updatedItem.isPinned = updates.isPinned;
    hasChanges = true;
  }

  // KAN-10: Update summary if provided
  if (updates.summary !== undefined && updates.summary !== existingItem.summary) {
    updatedItem.summary = updates.summary;
    hasChanges = true;
  }

  if (hasChanges) {
    updatedItem.updatedAt = new Date().toISOString();
    items[index] = updatedItem;
    await saveAllItems(items);
  }

  return { item: updatedItem, updated: hasChanges };
}

/**
 * Delete an item
 */
export async function deleteItem(id: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for delete');
    const storage = await getFallbackStorage();
    return await storage.deleteItem(id);
  }

  // Redis storage
  const items = await getAllItems();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return false;
  }

  items.splice(index, 1);
  await saveAllItems(items);

  return true;
}

/**
 * Search items by query
 */
export async function searchItems(query: string, tags?: string[]): Promise<ContentItem[]> {
  const items = await getAllItems();
  const lowerQuery = query.toLowerCase();

  return items.filter(item => {
    const matchesQuery = !query || 
      item.title?.toLowerCase().includes(lowerQuery) ||
      item.body?.toLowerCase().includes(lowerQuery) ||
      item.url?.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

    const matchesTags = !tags || tags.length === 0 ||
      tags.every(tag => item.tags.includes(tag.toLowerCase()));

    return matchesQuery && matchesTags;
  });
}

/**
 * Get recent items within the last N days
 */
export async function getRecentItems(days: number = 30): Promise<ContentItem[]> {
  const items = await getAllItems();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return items
    .filter(item => new Date(item.createdAt) >= cutoffDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Bulk delete items
 */
export async function bulkDeleteItems(ids: string[]): Promise<{ deletedCount: number }> {
  const client = getRedisClient();

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for bulk delete');
    let deletedCount = 0;
    const storage = await getFallbackStorage();
    for (const id of ids) {
      const success = await storage.deleteItem(id);
      if (success) deletedCount++;
    }
    return { deletedCount };
  }

  // Redis storage
  const items = await getAllItems();
  const idsSet = new Set(ids);
  const remaining = items.filter(item => !idsSet.has(item.id));
  const deletedCount = items.length - remaining.length;

  if (deletedCount > 0) {
    await saveAllItems(remaining);
  }

  return { deletedCount };
}

/**
 * Bulk add tag to items
 */
export async function bulkAddTag(ids: string[], tag: string): Promise<{ updatedCount: number }> {
  const client = getRedisClient();

  if (!client) {
    // Use file-based storage directly
    console.log('Using file-based storage for bulk tag');
    let updatedCount = 0;
    const storage = await getFallbackStorage();
    const normalizedTag = tag.trim().toLowerCase();

    for (const id of ids) {
      const item = storage.getItemById(id);
      if (item && !item.tags.includes(normalizedTag)) {
        const newTags = [...item.tags, normalizedTag];
        await storage.updateItem(id, { tags: newTags });
        updatedCount++;
      }
    }
    return { updatedCount };
  }

  // Redis storage
  const items = await getAllItems();
  const idsSet = new Set(ids);
  const normalizedTag = tag.trim().toLowerCase();
  let updatedCount = 0;

  for (const item of items) {
    if (idsSet.has(item.id) && !item.tags.includes(normalizedTag)) {
      item.tags.push(normalizedTag);
      item.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await saveAllItems(items);
  }

  return { updatedCount };
}
