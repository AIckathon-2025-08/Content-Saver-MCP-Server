'use client';

import { ContentItem, SaveResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'content-saver:items';

export function loadItems(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContentItem[]) : [];
  } catch {
    return [];
  }
}

export function persistItems(items: ContentItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(items: ContentItem[], item: ContentItem): ContentItem[] {
  return [item, ...items];
}

export function saveNote(items: ContentItem[], input: {
  title?: string;
  body: string;
  tags?: string[];
}): SaveResult {
  const item: ContentItem = {
    id: uuidv4(),
    type: 'note',
    title: input.title?.trim() || undefined,
    body: input.body.trim(),
    tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  return { item, isDuplicate: false };
}

export function saveLink(items: ContentItem[], input: {
  url: string;
  title?: string;
  body?: string;
  tags?: string[];
  summary?: string;
}): SaveResult {
  const normalizeUrl = (url: string) => {
    try {
      const u = new URL(url.toLowerCase().trim());
      return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  };

  const existing = items.find(
    i => i.type === 'link' && i.url && normalizeUrl(i.url) === normalizeUrl(input.url)
  );
  if (existing) return { item: existing, isDuplicate: true };

  const item: ContentItem = {
    id: uuidv4(),
    type: 'link',
    url: input.url.trim(),
    title: input.title?.trim() || undefined,
    body: input.body?.trim() || undefined,
    summary: input.summary,
    tags: (input.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  return { item, isDuplicate: false };
}

export function updateItem(items: ContentItem[], id: string, updates: {
  title?: string;
  body?: string;
  url?: string;
  tags?: string[];
  isPinned?: boolean;
  summary?: string;
}): { items: ContentItem[]; updated: boolean } {
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return { items, updated: false };

  const existing = items[index];
  const updated: ContentItem = {
    ...existing,
    ...(updates.title !== undefined ? { title: updates.title.trim() || undefined } : {}),
    ...(updates.body !== undefined ? { body: updates.body.trim() || undefined } : {}),
    ...(updates.url !== undefined ? { url: updates.url.trim() } : {}),
    ...(updates.tags !== undefined ? { tags: updates.tags.map(t => t.trim().toLowerCase()).filter(Boolean) } : {}),
    ...(updates.isPinned !== undefined ? { isPinned: updates.isPinned } : {}),
    ...(updates.summary !== undefined ? { summary: updates.summary } : {}),
    updatedAt: new Date().toISOString(),
  };

  const newItems = [...items];
  newItems[index] = updated;
  return { items: newItems, updated: true };
}

export function deleteItem(items: ContentItem[], id: string): ContentItem[] {
  return items.filter(i => i.id !== id);
}

export function filterByDate(items: ContentItem[], days: number): ContentItem[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return items.filter(i => i.createdAt && new Date(i.createdAt) >= cutoff);
}
