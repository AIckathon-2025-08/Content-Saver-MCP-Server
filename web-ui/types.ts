/**
 * Shared types for Web UI (matches MCP server types)
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

