'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ItemList from '@/components/ItemList';
import ItemDetail from '@/components/ItemDetail';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';
import MiroSyncModal from '@/components/MiroSyncModal';
import { ContentItem } from '@/types';
import * as local from '@/lib/local-items';

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
  const [showMiroSync, setShowMiroSync] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Persist items to localStorage whenever they change
  const saveItems = useCallback((updated: ContentItem[]) => {
    setItems(updated);
    local.persistItems(updated);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = local.loadItems();
    setItems(stored);
    setLoading(false);
  }, []);

  // Re-filter whenever items, search, or filter changes
  useEffect(() => {
    let filtered = [...items];

    if (activeFilter === 'notes') {
      filtered = filtered.filter(i => i.type === 'note');
    } else if (activeFilter === 'links') {
      filtered = filtered.filter(i => i.type === 'link');
    } else if (activeFilter === 'recent') {
      filtered = local.filterByDate(filtered, 30);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.body?.toLowerCase().includes(q) ||
        i.url?.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Pinned items first
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    setFilteredItems(filtered);
  }, [items, searchQuery, activeFilter]);

  // Chat saves: item comes back from the /api/chat response
  useEffect(() => {
    const handleItemSaved = (event: any) => {
      const savedItem: ContentItem = event.detail;
      if (!savedItem?.id) return;
      setItems(prev => {
        // avoid duplicates
        if (prev.some(i => i.id === savedItem.id)) return prev;
        const updated = [savedItem, ...prev];
        local.persistItems(updated);
        return updated;
      });
    };
    window.addEventListener('itemSaved', handleItemSaved);
    return () => window.removeEventListener('itemSaved', handleItemSaved);
  }, []);

  const handleSearch = (query: string) => setSearchQuery(query);

  const handleFilterChange = (filter: 'all' | 'notes' | 'links' | 'recent') => {
    setActiveFilter(filter);
  };

  const handleAddItem = async (type: 'note' | 'link', data: any) => {
    try {
      setError(null);
      // For links, ask the server to fetch title/tags via AI, then store client-side
      if (type === 'link') {
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, ...data }),
        });
        const result = await response.json();
        if (result.isDuplicate) {
          setError('This link is already saved!');
          setTimeout(() => setError(null), 5000);
          return;
        }
        if (result.item) {
          saveItems([result.item, ...items]);
          setShowAddModal(false);
          return;
        }
      }
      // For notes (or link fallback), create locally
      const result = type === 'note'
        ? local.saveNote(items, data)
        : local.saveLink(items, data);

      if (result.isDuplicate) {
        setError('This link is already saved!');
        setTimeout(() => setError(null), 5000);
      } else {
        saveItems([result.item, ...items]);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteItem = (id: string) => {
    setDeletingItemId(id);
    if (selectedItem?.id === id) setSelectedItem(null);
    saveItems(local.deleteItem(items, id));
    setDeletingItemId(null);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    if (selectedItem && selectedIds.has(selectedItem.id)) setSelectedItem(null);
    saveItems(items.filter(i => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setIsBulkDeleting(false);
  };

  const handleBulkAddTag = (tag: string) => {
    if (selectedIds.size === 0) return;
    const updated = items.map(i =>
      selectedIds.has(i.id) && !i.tags.includes(tag)
        ? { ...i, tags: [...i.tags, tag.trim().toLowerCase()] }
        : i
    );
    saveItems(updated);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handlePinItem = (id: string, isPinned: boolean) => {
    const { items: updated } = local.updateItem(items, id, { isPinned });
    saveItems(updated);
    if (selectedItem?.id === id) {
      setSelectedItem(updated.find(i => i.id === id) ?? null);
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
    const { items: updated } = local.updateItem(items, id, updates);
    saveItems(updated);
    if (selectedItem?.id === id) {
      setSelectedItem(updated.find(i => i.id === id) ?? null);
    }
    setShowEditModal(false);
    setEditingItem(null);
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
          onOpenMiroSync={() => setShowMiroSync(true)}
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
            onPin={handlePinItem}
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
              onItemSaved={() => {}}
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

      <MiroSyncModal
        isOpen={showMiroSync}
        onClose={() => setShowMiroSync(false)}
      />
    </div>
  );
}
