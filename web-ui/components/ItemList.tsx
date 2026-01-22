'use client';

import { ContentItem } from '@/types';
import ItemCard from './ItemCard';
import BulkActionsBar from './BulkActionsBar';

interface ItemListProps {
  items: ContentItem[];
  loading: boolean;
  onItemClick: (item: ContentItem) => void;
  selectedItemId?: string;
  onAddNote?: () => void;
  onAddLink?: () => void;
  onDelete?: (id: string) => void;
  deletingItemId?: string | null;
  // Bulk selection props
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelectionMode: () => void;
  onSelectionChange: (ids: Set<string>) => void;
  onBulkDelete: () => void;
  onBulkAddTag: (tag: string) => void;
  isBulkDeleting?: boolean;
}

export default function ItemList({ 
  items, 
  loading, 
  onItemClick, 
  selectedItemId, 
  onAddNote, 
  onAddLink, 
  onDelete, 
  deletingItemId,
  selectionMode,
  selectedIds,
  onToggleSelectionMode,
  onSelectionChange,
  onBulkDelete,
  onBulkAddTag,
  isBulkDeleting = false,
}: ItemListProps) {
  
  const handleCheckChange = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange(newSelection);
    
    // Auto-enter selection mode when first item is selected
    if (newSelection.size > 0 && !selectionMode) {
      onToggleSelectionMode();
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(items.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleCancelSelection = () => {
    onSelectionChange(new Set());
    onToggleSelectionMode();
  };

  // Adjust item sorting and filtering before rendering
  const visibleItems = items.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  // Loading State with Skeletons
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded mt-1"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render filtered and sorted items
  return (
    <div className="flex-1 overflow-y-auto">
      {visibleItems.map(item => (
        <ItemCard key={item.id} item={item} onClick={() => onItemClick(item)} isSelected={item.id === selectedItemId} onDelete={onDelete} isDeleting={deletingItemId === item.id} selectionMode={selectionMode} isChecked={selectedIds.has(item.id)} onCheckChange={handleCheckChange} />
      ))}
      {selectionMode && <BulkActionsBar selectedCount={selectedIds.size} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onCancelSelection={handleCancelSelection} onBulkDelete={onBulkDelete} onBulkAddTag={onBulkAddTag} isBulkDeleting={isBulkDeleting} />}
    </div>
  );
}
