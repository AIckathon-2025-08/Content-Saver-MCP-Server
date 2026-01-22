'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ItemList from '@/components/ItemList';
import ItemDetail from '@/components/ItemDetail';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';
import { ContentItem } from '@/types';

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'links' | 'recent'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'note' | 'link'>('note');
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pin items filter
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, activeFilter, showPinnedOnly]);

  // Listen for item saved events from chat
  useEffect(() => {
    const handleItemSaved = () => {
      loadItems();
    };
    window.addEventListener('itemSaved', handleItemSaved);
    return () => window.removeEventListener('itemSaved', handleItemSaved);
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (activeFilter === 'recent') {
        response = await fetch('/api/items/recent?days=30');
      } else {
        response = await fetch('/api/items');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load items');
      }
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    if (showPinnedOnly) {
      filtered = filtered.filter(item => item.isPinned);
    }

    // Prioritize pinned items by sorting
    filtered.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    // existing filters...
    setFilteredItems(filtered);
  };

  return (
    // UI components rendering
    <>
    {/* Other components and modals */}
    </>
  );
}
