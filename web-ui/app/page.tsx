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

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, activeFilter]);

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

    // Filter by type
    if (activeFilter === 'notes') {
      filtered = filtered.filter(item => item.type === 'note');
    } else if (activeFilter === 'links') {
      filtered = filtered.filter(item => item.type === 'link');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const bodyMatch = item.body?.toLowerCase().includes(query);
        const urlMatch = item.url?.toLowerCase().includes(query);
        const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(query));
        return titleMatch || bodyMatch || urlMatch || tagMatch;
      });
    }

    setFilteredItems(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filter: 'all' | 'notes' | 'links' | 'recent') => {
    setActiveFilter(filter);
    if (filter === 'recent') {
      loadItems();
    } else {
      fetch('/api/items')
        .then(res => res.json())
        .then(data => setItems(data.items || []))
        .catch(console.error);
    }
  };

  const handleAddItem = async (type: 'note' | 'link', data: any) => {
    try {
      setError(null);
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data }),
      });
      const result = await response.json();
      
      if (result.isDuplicate) {
        setError('This link is already saved!');
        setTimeout(() => setError(null), 5000);
      } else {
        await loadItems();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      setError(null);
      setDeletingItemId(id);

      // Optimistic update: remove item from UI immediately
      const itemToDelete = items.find(item => item.id === id);
      setItems(prev => prev.filter(item => item.id !== id));
      setFilteredItems(prev => prev.filter(item => item.id !== id));

      // Close detail panel if this item was selected
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }

      const response = await fetch(`/api/items/delete?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        if (itemToDelete) {
          setItems(prev => [...prev, itemToDelete].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete item');
      }

      // Success - reload to ensure consistency
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete item. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingItemId(null);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      setError(null);
      setIsBulkDeleting(true);

      const idsToDelete = Array.from(selectedIds);

      // Optimistic update
      setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setFilteredItems(prev => prev.filter(item => !selectedIds.has(item.id)));

      // Close detail panel if selected item was deleted
      if (selectedItem && selectedIds.has(selectedItem.id)) {
        setSelectedItem(null);
      }

      const response = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids: idsToDelete,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete items');
      }

      const result = await response.json();
      
      // Clear selection and exit selection mode
      setSelectedIds(new Set());
      setSelectionMode(false);

      // Reload to ensure consistency
      await loadItems();

      // Show success message
      if (result.deletedCount > 0) {
        setError(null);
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      setError('Failed to delete items. Please try again.');
      await loadItems(); // Reload to restore state
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddTag = async (tag: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      setError(null);

      const response = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addTag',
          ids: Array.from(selectedIds),
          tag,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add tag');
      }

      // Reload to get updated items
      await loadItems();

      // Clear selection
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error adding tag:', error);
      setError('Failed to add tag. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleOpenAddModal = (type: 'note' | 'link') => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleEditItem = async (id: string, updates: {
    title?: string;
    body?: string;
    url?: string;
    tags?: string[];
  }) => {
    try {
      setError(null);
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update item');
      }

      const result = await response.json();

      // Update the item in local state
      setItems(prev => prev.map(item =>
        item.id === id ? result.item : item
      ));

      // Update selectedItem if it was the edited item
      if (selectedItem?.id === id) {
        setSelectedItem(result.item);
      }

      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        items={items}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onAddNote={() => handleOpenAddModal('note')}
          onAddLink={() => handleOpenAddModal('link')}
          onOpenChat={() => setShowChat(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Error Toast */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-danger-500 text-white rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-top">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-white hover:text-gray-200 focus-ring rounded"
              aria-label="Dismiss error"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <ItemList
            items={filteredItems}
            loading={loading}
            onItemClick={setSelectedItem}
            selectedItemId={selectedItem?.id}
            onAddNote={() => handleOpenAddModal('note')}
            onAddLink={() => handleOpenAddModal('link')}
            onDelete={handleDeleteItem}
            deletingItemId={deletingItemId}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
            onSelectionChange={setSelectedIds}
            onBulkDelete={handleBulkDelete}
            onBulkAddTag={handleBulkAddTag}
            isBulkDeleting={isBulkDeleting}
          />
          
          {selectedItem && !showChat && !selectionMode && (
            <ItemDetail
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onDelete={handleDeleteItem}
              onEdit={handleOpenEditModal}
            />
          )}
          
          {showChat && (
            <ChatPanel
              items={items}
              onClose={() => {
                setShowChat(false);
                setSelectedItem(null);
              }}
              onItemSaved={loadItems}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          type={addModalType}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddItem}
        />
      )}

      {showEditModal && editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={handleEditItem}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
