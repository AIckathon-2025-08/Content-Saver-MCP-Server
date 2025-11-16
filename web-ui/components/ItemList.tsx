'use client';

import { ContentItem } from '@/types';
import ItemCard from './ItemCard';

interface ItemListProps {
  items: ContentItem[];
  loading: boolean;
  onItemClick: (item: ContentItem) => void;
  selectedItemId?: string;
  onAddNote?: () => void;
  onAddLink?: () => void;
  onDelete?: (id: string) => void;
  deletingItemId?: string | null;
}

export default function ItemList({ items, loading, onItemClick, selectedItemId, onAddNote, onAddLink, onDelete, deletingItemId }: ItemListProps) {
  // Loading State with Skeletons
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded mt-1"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Start building your knowledge vault by saving notes and links. Your AI assistant can help you find them later.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors focus-ring inline-flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Note
              </button>
            )}
            {onAddLink && (
              <button
                onClick={onAddLink}
                className="px-4 py-2 bg-white text-primary-500 border border-primary-500 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors focus-ring inline-flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Add Link
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Item List
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
          isSelected={item.id === selectedItemId}
          onDelete={onDelete}
          isDeleting={deletingItemId === item.id}
        />
      ))}
    </div>
  );
}
