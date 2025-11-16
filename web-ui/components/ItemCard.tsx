'use client';

import { useState } from 'react';
import { ContentItem } from '@/types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ItemCardProps {
  item: ContentItem;
  onClick: () => void;
  isSelected: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export default function ItemCard({ item, onClick, isSelected, onDelete, isDeleting = false }: ItemCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(item.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        className={`relative w-full text-left p-4 border-b border-gray-100 transition-colors ${
          isSelected
            ? 'bg-primary-50 border-l-4 border-l-primary-500'
            : 'bg-white hover:bg-gray-50'
        } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={onClick}
          className="w-full text-left focus-ring"
          aria-label={`View ${item.title || 'untitled'} ${item.type}`}
          aria-pressed={isSelected}
          disabled={isDeleting}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-2xl" role="img" aria-label={item.type === 'note' ? 'Note' : 'Link'}>
                {item.type === 'note' ? '📝' : '🔗'}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                {item.title || '(Untitled)'}
              </h3>

              {/* Body Preview */}
              {item.body && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.body}
                </p>
              )}

              {/* URL */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-primary-500 hover:text-primary-600 truncate block mb-2"
                  aria-label={`Open ${item.url}`}
                >
                  {item.url}
                </a>
              )}

              {/* Tags and Date */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Delete Button - Shows on hover or when selected */}
        {onDelete && (isHovered || isSelected) && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors focus-ring"
            aria-label={`Delete ${item.title || 'item'}`}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && onDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          itemTitle={item.title || ''}
          itemType={item.type}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
