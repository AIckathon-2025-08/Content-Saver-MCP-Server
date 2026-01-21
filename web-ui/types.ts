/**
 * Shared types for Web UI (matches MCP server types)
 * 
 * KAN-3: Added metadata fields for auto-fetched webpage data
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
  // KAN-3: Auto-fetched webpage metadata
  favicon?: string;
  ogImage?: string;
  siteName?: string;
}

export interface SaveNoteInput {
  title?: string;
  body: string;
  tags?: string[];
}

export interface SaveLinkInput {
  url: string;
  title?: string;
  comment?: string;
  tags?: string[];
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SaveResult {
  item: ContentItem;
  isDuplicate: boolean;
}

export interface UpdateItemInput {
  id: string;
  title?: string;
  body?: string;
  url?: string;
  tags?: string[];
}

export interface UpdateResult {
  item: ContentItem;
  updated: boolean;
}

