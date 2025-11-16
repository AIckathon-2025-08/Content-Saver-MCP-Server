'use client';

import { useState } from 'react';
import { ContentItem } from '@/types';

interface SidebarProps {
  activeFilter: 'all' | 'notes' | 'links' | 'recent';
  onFilterChange: (filter: 'all' | 'notes' | 'links' | 'recent') => void;
  items: ContentItem[];
}

export default function Sidebar({ activeFilter, onFilterChange, items }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Get most used tags
  const tagCounts: Record<string, number> = {};
  items.forEach(item => {
    item.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);

  const noteCount = items.filter(i => i.type === 'note').length;
  const linkCount = items.filter(i => i.type === 'link').length;

  const navItems = [
    { id: 'all' as const, label: 'All Items', count: items.length, icon: '📚' },
    { id: 'recent' as const, label: 'Recent', count: null, icon: '🕐', subtitle: '30 days' },
    { id: 'notes' as const, label: 'Notes', count: noteCount, icon: '📝' },
    { id: 'links' as const, label: 'Links', count: linkCount, icon: '🔗' },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-20 p-2 bg-white border border-gray-300 rounded-lg shadow-sm focus-ring"
        aria-label="Toggle sidebar"
        aria-expanded={isMobileOpen}
      >
        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-10
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
        aria-label="Navigation sidebar"
      >
        <div className="p-4">
          {/* Stats Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Overview
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">{items.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Notes</span>
                <span className="font-semibold text-gray-900">{noteCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Links</span>
                <span className="font-semibold text-gray-900">{linkCount}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onFilterChange(item.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors focus-ring
                  ${
                    activeFilter === item.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
                aria-current={activeFilter === item.id ? 'page' : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span
                      className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${
                          activeFilter === item.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5 ml-6">{item.subtitle}</p>
                )}
              </button>
            ))}
          </nav>

          {/* Popular Tags */}
          {topTags.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {topTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      // TODO: Implement tag filtering
                      setIsMobileOpen(false);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors focus-ring"
                    aria-label={`Filter by ${tag} tag`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[-1]"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </aside>
    </>
  );
}
