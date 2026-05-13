/**
 * Miro API Client
 * 
 * Fetches feedback items (sticky notes, text, shapes) from Miro boards
 */

const MIRO_API_BASE = 'https://api.miro.com/v2';

export interface MiroItem {
  id: string;
  type: string;
  data: {
    content?: string;
    shape?: string;
  };
  style?: {
    fillColor?: string;
  };
  createdAt?: string;
  createdBy?: {
    name?: string;
  };
  modifiedAt?: string;
}

export interface MiroBoard {
  id: string;
  name: string;
  description?: string;
}

export interface FeedbackItem {
  id: string;
  content: string;
  type: 'sticky_note' | 'text' | 'shape' | 'card';
  color?: string;
  author?: string;
  createdAt?: string;
}

function getMiroToken(): string {
  const token = process.env.MIRO_API_TOKEN;
  if (!token) {
    throw new Error('MIRO_API_TOKEN not configured');
  }
  return token;
}

/**
 * Get all boards accessible to the user
 */
export async function getMiroBoards(): Promise<MiroBoard[]> {
  const response = await fetch(`${MIRO_API_BASE}/boards`, {
    headers: {
      'Authorization': `Bearer ${getMiroToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Miro boards: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get all items from a specific Miro board
 */
export async function getBoardItems(boardId: string): Promise<MiroItem[]> {
  const allItems: MiroItem[] = [];
  let cursor: string | null = null;

  // Paginate through all items
  do {
    const url = new URL(`${MIRO_API_BASE}/boards/${boardId}/items`);
    url.searchParams.set('limit', '50');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${getMiroToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch board items: ${response.status} - ${error}`);
    }

    const data = await response.json();
    allItems.push(...(data.data || []));
    cursor = data.cursor || null;
  } while (cursor);

  return allItems;
}

/**
 * Extract feedback items from Miro board items
 * Filters for sticky notes, text, cards, and shapes with text content
 */
export function extractFeedbackItems(items: MiroItem[]): FeedbackItem[] {
  const feedbackTypes = ['sticky_note', 'text', 'shape', 'card'];
  
  return items
    .filter(item => feedbackTypes.includes(item.type) && item.data?.content)
    .map(item => ({
      id: item.id,
      content: stripHtml(item.data.content || ''),
      type: item.type as FeedbackItem['type'],
      color: item.style?.fillColor,
      author: item.createdBy?.name,
      createdAt: item.createdAt,
    }))
    .filter(item => item.content.trim().length > 0);
}

/**
 * Strip HTML tags from Miro content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get feedback from a Miro board
 */
export async function getFeedbackFromBoard(boardId: string): Promise<FeedbackItem[]> {
  const items = await getBoardItems(boardId);
  return extractFeedbackItems(items);
}

/**
 * Filter feedback by color (useful for categorizing feedback)
 * Common colors: yellow = ideas, red = issues/bugs, green = positive, blue = questions
 */
export function filterFeedbackByColor(
  feedback: FeedbackItem[],
  colors: string[]
): FeedbackItem[] {
  const normalizedColors = colors.map(c => c.toLowerCase());
  return feedback.filter(
    item => item.color && normalizedColors.includes(item.color.toLowerCase())
  );
}

