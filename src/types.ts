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
  createdAt: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp (optional, for dedupe updates)
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
  dateFrom?: string; // ISO 8601 date
  dateTo?: string; // ISO 8601 date
}

/**
 * Result for save operations (includes deduplication info)
 */
export interface SaveResult {
  item: ContentItem;
  isDuplicate: boolean;
}

