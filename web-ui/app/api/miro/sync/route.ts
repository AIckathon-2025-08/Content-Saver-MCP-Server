import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackFromBoard, filterFeedbackByColor } from '@/lib/miro-client';
import { processFeedbackBatch } from '@/lib/feedback-to-jira';

/**
 * POST /api/miro/sync - Sync feedback from a Miro board to Jira tickets
 * 
 * Body:
 * - boardId: string (required) - Miro board ID
 * - colors: string[] (optional) - Filter by sticky note colors
 * - maxItems: number (optional) - Limit number of tickets to create
 * - dryRun: boolean (optional) - Preview without creating tickets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, colors, maxItems, dryRun } = body;

    if (!boardId) {
      return NextResponse.json(
        { error: 'boardId is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Syncing feedback from Miro board: ${boardId}`);

    // Step 1: Get feedback from Miro board
    let feedback = await getFeedbackFromBoard(boardId);
    console.log(`📝 Found ${feedback.length} feedback items`);

    // Step 2: Filter by colors if specified
    if (colors && colors.length > 0) {
      feedback = filterFeedbackByColor(feedback, colors);
      console.log(`🎨 Filtered to ${feedback.length} items by color`);
    }

    if (feedback.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No feedback items found to sync',
        created: 0,
        failed: 0,
      });
    }

    // Step 3: Dry run - return what would be created
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        feedbackCount: feedback.length,
        preview: feedback.slice(0, maxItems || 10).map(f => ({
          content: f.content.substring(0, 100) + (f.content.length > 100 ? '...' : ''),
          type: f.type,
          color: f.color,
          author: f.author,
        })),
      });
    }

    // Step 4: Process feedback and create Jira tickets
    const results = await processFeedbackBatch(feedback, { maxItems });

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Created ${successful.length} tickets, ${failed.length} failed`);

    return NextResponse.json({
      success: true,
      message: `Created ${successful.length} Jira tickets from Miro feedback`,
      created: successful.length,
      failed: failed.length,
      tickets: successful.map(r => ({
        jiraKey: r.jiraKey,
        summary: r.ticket?.summary,
        issueType: r.ticket?.issueType,
        originalContent: r.originalFeedback.content.substring(0, 100),
      })),
      errors: failed.length > 0 ? failed.map(r => ({
        content: r.originalFeedback.content.substring(0, 100),
        error: r.error,
      })) : undefined,
    });

  } catch (error) {
    console.error('Miro sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Miro feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/miro/sync - Preview feedback from a Miro board
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json(
        { error: 'boardId query parameter is required' },
        { status: 400 }
      );
    }

    const feedback = await getFeedbackFromBoard(boardId);

    return NextResponse.json({
      success: true,
      boardId,
      feedbackCount: feedback.length,
      items: feedback.map(f => ({
        id: f.id,
        content: f.content,
        type: f.type,
        color: f.color,
        author: f.author,
        createdAt: f.createdAt,
      })),
    });

  } catch (error) {
    console.error('Error fetching Miro feedback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Miro feedback' },
      { status: 500 }
    );
  }
}

