'use client';

import { useState } from 'react';

interface MiroBoard {
  id: string;
  name: string;
  description?: string;
}

interface SyncResult {
  jiraKey: string;
  summary: string;
  issueType: string;
  originalContent: string;
}

interface MiroSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiroSyncModal({ isOpen, onClose }: MiroSyncModalProps) {
  const [boards, setBoards] = useState<MiroBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [manualBoardId, setManualBoardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);

  const fetchBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/miro/boards');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch boards');
      }
      
      setBoards(data.boards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const previewFeedback = async () => {
    const boardId = selectedBoardId || manualBoardId;
    if (!boardId) {
      setError('Please select or enter a board ID');
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);
    
    try {
      const response = await fetch(`/api/miro/sync?boardId=${boardId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback');
      }
      
      setPreview(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview feedback');
    } finally {
      setLoading(false);
    }
  };

  const syncToJira = async () => {
    const boardId = selectedBoardId || manualBoardId;
    if (!boardId) {
      setError('Please select or enter a board ID');
      return;
    }

    setSyncing(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await fetch('/api/miro/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, maxItems: 20 }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }
      
      setResults(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync to Jira');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <h2 className="text-xl font-bold text-white">Miro → Jira Sync</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-yellow-100 text-sm mt-1">
            Transform user feedback from Miro boards into Jira tickets
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Board Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={fetchBoards}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load My Boards'}
              </button>
              <span className="text-gray-500">or</span>
              <input
                type="text"
                value={manualBoardId}
                onChange={(e) => setManualBoardId(e.target.value)}
                placeholder="Enter Board ID"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Board List */}
            {boards.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                {boards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedBoardId === board.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{board.name}</div>
                    {board.description && (
                      <div className="text-sm text-gray-500 truncate">{board.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <div className="font-medium">Error</div>
                <div className="text-sm">{error}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={previewFeedback}
                disabled={loading || (!selectedBoardId && !manualBoardId)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
              >
                👀 Preview Feedback
              </button>
              <button
                onClick={syncToJira}
                disabled={syncing || (!selectedBoardId && !manualBoardId)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {syncing ? '⏳ Creating Tickets...' : '🚀 Sync to Jira'}
              </button>
            </div>

            {/* Preview */}
            {preview && (
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-medium">
                  📋 Found {preview.length} feedback items
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {preview.map((item, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          item.type === 'sticky_note' ? 'bg-yellow-100 text-yellow-800' :
                          item.type === 'text' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm text-gray-700">{item.content}</span>
                      </div>
                      {item.author && (
                        <div className="text-xs text-gray-500 mt-1">By: {item.author}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="border border-green-200 rounded-lg bg-green-50">
                <div className="px-4 py-2 bg-green-100 border-b border-green-200 font-medium text-green-800">
                  ✅ Created {results.length} Jira tickets
                </div>
                <div className="divide-y divide-green-200 max-h-60 overflow-y-auto">
                  {results.map((ticket, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://agorozia1.atlassian.net/browse/${ticket.jiraKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {ticket.jiraKey}
                        </a>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          {ticket.issueType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{ticket.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            💡 Tip: Add sticky notes in Miro with user feedback, then sync here to create Jira tickets automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

