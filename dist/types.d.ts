/**
 * Unified item structure for both notes and links
 */
export interface ContentItem {
    id: string;
    type: 'note' | 'link';
    title?: string;
    body?: string;
    url?: string;
    tags: string[];
    createdAt: string;
    updatedAt?: string;
}
/**
 * Input for saving a note
 */
export interface SaveNoteInput {
    title?: string;
    body: string;
    tags?: string[];
}
/**
 * Input for saving a link
 */
export interface SaveLinkInput {
    url: string;
    title?: string;
    comment?: string;
    tags?: string[];
}
/**
 * Search filters
 */
export interface SearchFilters {
    query?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
}
/**
 * Result for save operations (includes deduplication info)
 */
export interface SaveResult {
    item: ContentItem;
    isDuplicate: boolean;
}
/**
 * Input for updating an existing item (partial updates supported)
 */
export interface UpdateItemInput {
    id: string;
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
}
/**
 * Result for update operations
 */
export interface UpdateResult {
    item: ContentItem;
    updated: boolean;
}
//# sourceMappingURL=types.d.ts.map