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
  // Bulk selection props
  selectionMode?: boolean;
  isChecked?: boolean;
  onCheckChange?: (id: string, checked: boolean) => void;
}

export default function ItemCard({ 
  item, 
  onClick, 
  isSelected, 
  onDelete, 
  isDeleting = false,
  selectionMode = false,
  isChecked = false,
  onCheckChange,
}: ItemCardProps) {
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCheckChange) {
      onCheckChange(item.id, !isChecked);
    }
  };

  const handleCardClick = () => {
    if (selectionMode && onCheckChange) {
      onCheckChange(item.id, !isChecked);
    } else {
      onClick();
    }
  };

  const handleLongPress = () => {
    if (!selectionMode && onCheckChange) {
      onCheckChange(item.id, true);
    }
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedItem = {...item, isPinned: !item.isPinned};
    // Call to server to update the item or update state
  };

  return (
    <div onClick={handleCardClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <button onClick={handlePinToggle}>
        {item.isPinned ? '🔒 Unpin' : '📌 Pin'}
      </button>
      {isHovered && <button onClick={handleDeleteClick}>Delete</button>}
      <DeleteConfirmModal show={showDeleteConfirm} onCancel={() => setShowDeleteConfirm(false)} onConfirm={handleConfirmDelete} />
      <div>{item.title || item.body}</div>
    </div>
  );
}
