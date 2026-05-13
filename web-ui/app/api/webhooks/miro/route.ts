import { NextRequest, NextResponse } from 'next/server';
import { processFeedbackItem } from '@/lib/feedback-to-jira';
import { FeedbackItem } from '@/lib/miro-client';

/**
 * Miro Webhook Handler
 * 
 * Receives events from Miro when items are created/updated on a board
 * and automatically creates Jira tickets from feedback
 */

interface MiroWebhookPayload {
  type: string;
  event: string;
  item?: {
    id: string;
    type: string;
    data?: {
      content?: string;
    };
    style?: {
      fillColor?: string;
    };
    createdBy?: {
      name?: string;
    };
    createdAt?: string;
  };
  board?: {
    id: string;
    name: string;
  };
}

// Feedback types we want to process
const FEEDBACK_TYPES = ['sticky_note', 'text', 'shape', 'card'];

export async function POST(request: NextRequest) {
  try {
    const payload: MiroWebhookPayload = await request.json();
    
    console.log(`📨 Miro webhook received: ${payload.type} - ${payload.event}`);
    console.log(`   Board: ${payload.board?.name || 'unknown'}`);
    console.log(`   Item type: ${payload.item?.type || 'none'}`);

    // Only process item_create events for feedback types
    if (payload.event !== 'item_create' && payload.event !== 'item_update') {
      return NextResponse.json({
        success: true,
        message: `Event ${payload.event} ignored`,
      });
    }

    const item = payload.item;
    if (!item || !FEEDBACK_TYPES.includes(item.type)) {
      return NextResponse.json({
        success: true,
        message: `Item type ${item?.type || 'unknown'} not processed`,
      });
    }

    // Check if item has content
    const content = item.data?.content;
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Item has no content, skipping',
      });
    }

    // Strip HTML from content
    const cleanContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanContent.length < 10) {
      return NextResponse.json({
        success: true,
        message: 'Content too short, skipping',
      });
    }

    // Transform to feedback item
    const feedbackItem: FeedbackItem = {
      id: item.id,
      content: cleanContent,
      type: item.type as FeedbackItem['type'],
      color: item.style?.fillColor,
      author: item.createdBy?.name,
      createdAt: item.createdAt,
    };

    console.log(`🎯 Processing feedback: "${cleanContent.substring(0, 50)}..."`);

    // Process and create Jira ticket
    const result = await processFeedbackItem(feedbackItem);

    if (result.success) {
      console.log(`✅ Created Jira ticket: ${result.jiraKey}`);
      return NextResponse.json({
        success: true,
        message: `Created Jira ticket ${result.jiraKey}`,
        jiraKey: result.jiraKey,
        summary: result.ticket?.summary,
      });
    } else {
      console.error(`❌ Failed to create ticket: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Miro webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process Miro webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET(request: NextRequest) {
  // Miro sends a challenge parameter for webhook verification
  const challenge = request.nextUrl.searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Miro webhook endpoint is active',
    supportedEvents: ['item_create', 'item_update'],
    processedTypes: FEEDBACK_TYPES,
  });
}

