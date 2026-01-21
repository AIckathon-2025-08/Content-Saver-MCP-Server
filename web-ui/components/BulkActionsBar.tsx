'use client';

import { useState } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkAddTag: (tag: string) => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkAddTag,
  onCancel,
  isDeleting = false,
}: BulkActionsBarProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim()) {
      onBulkAddTag(newTag.trim().toLowerCase());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onBulkDelete();
    setShowDeleteConfirm(false);
  };

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <>
      <div className="sticky top-0 z-10 bg-primary-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="p-1 hover:bg-primary-700 rounded transition-colors"
                aria-label="Exit selection mode"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="font-medium">
                {selectedCount} of {totalCount} selected
              </span>
            </div>

            {/* Select All / Deselect All */}
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-sm px-3 py-1 bg-primary-700 hover:bg-primary-800 rounded transition-colors"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add Tag Button */}
            {!showTagInput ? (
              <button
                onClick={() => setShowTagInput(true)}
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Add Tag
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Enter tag..."
                  className="px-3 py-1.5 text-sm text-gray-900 bg-white rounded border-0 focus:ring-2 focus:ring-white w-32"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-2 py-1.5 bg-white text-primary-600 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowTagInput(false);
                    setNewTag('');
                  }}
                  className="p-1.5 hover:bg-primary-700 rounded"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Delete Button */}
            <button
              onClick={handleDeleteClick}
              disabled={selectedCount === 0 || isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-500 hover:bg-danger-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
            >
              {isDeleting ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-danger-100 rounded-full">
                <svg className="h-6 w-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete {selectedCount} items?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-danger-500 hover:bg-danger-600 rounded-lg transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

