import { ContentItem } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Store conversation history in memory (resets on page reload)
// For persistent storage, use localStorage or database
const conversationHistory = new Map<string, Message[]>();

export function addMessageToHistory(sessionId: string, message: Message) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  const history = conversationHistory.get(sessionId)!;
  history.push(message);
  
  // Keep only last 10 messages to avoid token limits
  if (history.length > 10) {
    history.shift();
  }
}

export function getConversationHistory(sessionId: string): Message[] {
  return conversationHistory.get(sessionId) || [];
}

export function clearConversationHistory(sessionId: string) {
  conversationHistory.delete(sessionId);
}

// Helper to format items with more detail for better AI understanding
export function formatItemsDetailed(items: ContentItem[]): string {
  if (items.length === 0) {
    return 'No items saved yet.';
  }

  return items.slice(0, 50).map((item, idx) => {
    const type = item.type === 'note' ? '📝 Note' : '🔗 Link';
    const title = item.title || '(Untitled)';
    const content = item.body || '';
    const url = item.url || '';
    const tags = item.tags.length > 0 ? item.tags.join(', ') : 'none';
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'unknown';
    
    return `
Item #${idx + 1}: ${type}
Title: ${title}
${content ? `Content: ${content}` : ''}
${url ? `URL: ${url}` : ''}
Tags: ${tags}
Saved: ${date}
---`;
  }).join('\n');
}

// Helper to find relevant items based on query
export function findRelevantItems(items: ContentItem[], query: string): ContentItem[] {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  return items
    .map(item => {
      let relevanceScore = 0;
      const searchText = [
        item.title || '',
        item.body || '',
        item.url || '',
        ...item.tags
      ].join(' ').toLowerCase();
      
      // Calculate relevance
      queryWords.forEach(word => {
        if (searchText.includes(word)) {
          relevanceScore++;
        }
      });
      
      // Boost if in title or tags
      if ((item.title || '').toLowerCase().includes(lowerQuery)) {
        relevanceScore += 3;
      }
      if (item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        relevanceScore += 2;
      }
      
      return { item, relevanceScore };
    })
    .filter(({ relevanceScore }) => relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(({ item }) => item);
}

