import { ContentItem, SaveResult, UpdateResult } from './types.js';
/**
 * Storage manager for content items
 */
export declare class Storage {
    private items;
    /**
     * Initialize storage - load existing items or create storage directory
     */
    initialize(): Promise<void>;
    /**
     * Save items to disk (atomic write)
     */
    private persist;
    /**
     * Generate a unique ID for a new item
     */
    private generateId;
    /**
     * Normalize URL for deduplication
     */
    normalizeUrl(url: string): string;
    /**
     * Check if a URL already exists
     */
    findDuplicateUrl(url: string): ContentItem | null;
    /**
     * Save a new item
     */
    saveItem(item: Omit<ContentItem, 'id' | 'createdAt'>): Promise<SaveResult>;
    /**
     * Get all items
     */
    getAllItems(): ContentItem[];
    /**
     * Search items with filters
     */
    searchItems(filters: {
        query?: string;
        tags?: string[];
        dateFrom?: string;
        dateTo?: string;
    }): ContentItem[];
    /**
     * Get recent items
     */
    getRecentItems(days?: number, limit?: number): ContentItem[];
    /**
     * Delete an item by ID
     */
    deleteItem(id: string): Promise<boolean>;
    /**
     * Get item by ID
     */
    getItemById(id: string): ContentItem | null;
    /**
     * Update an existing item by ID
     * Supports partial updates - only provided fields are updated
     */
    updateItem(id: string, updates: {
        title?: string;
        body?: string;
        url?: string;
        tags?: string[];
    }): Promise<UpdateResult | null>;
}
//# sourceMappingURL=storage.d.ts.map