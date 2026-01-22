import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';
import { summarizeUrl } from '@/lib/ai-summarizer';

/**
 * KAN-10: Regenerate AI summary for a link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await kvStorage.getItemById(params.id);
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.type !== 'link' || !item.url) {
      return NextResponse.json(
        { error: 'Can only generate summaries for links' },
        { status: 400 }
      );
    }

    // Generate new summary
    const summary = await summarizeUrl(item.url, item.title);
    
    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    // Update the item with new summary
    const result = await kvStorage.updateItem(params.id, { summary });

    return NextResponse.json({
      success: true,
      summary,
      item: result?.item,
    });
  } catch (error) {
    console.error('Error regenerating summary:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate summary' },
      { status: 500 }
    );
  }
}

