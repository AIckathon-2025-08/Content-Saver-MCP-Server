'use client';

import { ContentItem } from '@/types';

interface ItemDetailProps {
  item: ContentItem;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function ItemDetail({ item, onClose, onDelete }: ItemDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="hidden lg:flex flex-col w-96 bg-white border-l border-gray-200 h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={item.type === 'note' ? 'Note' : 'Link'}>
            {item.type === 'note' ? '📝' : '🔗'}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            {item.type === 'note' ? 'Note' : 'Link'} Details
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors focus-ring"
          aria-label="Close details"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Title
          </label>
          <h3 className="text-xl font-semibold text-gray-900">
            {item.title || '(Untitled)'}
          </h3>
        </div>

        {/* URL */}
        {item.type === 'link' && item.url && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              URL
            </label>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-500 hover:text-primary-600 break-all focus-ring inline-flex items-center gap-1"
              aria-label={`Open ${item.url} in new tab`}
            >
              {item.url}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Body/Content */}
        {item.body && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {item.type === 'note' ? 'Content' : 'Description'}
            </label>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                {item.body}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-primary-100 text-primary-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Created
            </label>
            <p className="text-sm text-gray-700">
              {formatDate(item.createdAt)}
            </p>
          </div>
          {item.updatedAt && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Updated
              </label>
              <p className="text-sm text-gray-700">
                {formatDate(item.updatedAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => onDelete(item.id)}
          className="w-full px-4 py-2.5 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors focus-ring"
          aria-label={`Delete ${item.title || 'item'}`}
        >
          Delete Item
        </button>
      </div>
    </div>
  );
}
