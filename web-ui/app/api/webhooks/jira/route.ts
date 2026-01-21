import { NextRequest, NextResponse } from 'next/server';
import { executeAutomationPipeline, completeTicketAfterImplementation } from '@/lib/automation-pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 HONEST JIRA WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════
//
// POST /api/webhooks/jira - Called when ticket moves to "In Progress"
//   → Logs work item, returns guidance
//   → Does NOT auto-implement or auto-complete
//
// POST /api/webhooks/jira/complete - Called AFTER actual implementation
//   → Transitions to "Done"
//   → Creates Confluence release note
//
// ═══════════════════════════════════════════════════════════════════════════

interface JiraWebhookPayload {
  webhookEvent?: string;
  issue?: {
    key: string;
    fields: {
      summary: string;
      status: { name: string };
      issuetype: { name: string };
      assignee?: { displayName: string };
    };
  };
  user?: { displayName: string };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string;
      toString: string;
    }>;
  };
  // Direct format from Jira Automation
  key?: string;
  fields?: {
    summary: string;
    status: { name: string };
  };
}

/**
 * POST - Triggered when ticket moves to "In Progress"
 * Does NOT auto-complete - only logs and returns guidance
 */
export async function POST(request: NextRequest) {
  try {
    const payload: JiraWebhookPayload = await request.json();
    
    console.log('\n📨 Received Jira webhook');
    
    // Extract ticket key
    const ticketKey = payload.issue?.key || payload.key || null;
    
    if (!ticketKey) {
      return NextResponse.json({ 
        success: false,
        message: 'No ticket key found in payload' 
      });
    }

    // Check if this is a status change (if changelog present)
    const hasChangelog = (payload.changelog?.items?.length ?? 0) > 0;
    if (hasChangelog) {
      const statusChange = payload.changelog?.items?.find(
        item => item.field === 'status' && item.toString === 'In Progress'
      );
      if (!statusChange) {
        return NextResponse.json({ 
          success: true,
          message: 'Not an In Progress transition, ignoring' 
        });
      }
    }

    // Execute the HONEST pipeline (no auto-complete)
    console.log(`\n🎯 Processing: ${ticketKey}`);
    const result = await executeAutomationPipeline(ticketKey);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      ticketKey: result.ticketKey,
      summary: result.summary,
      acceptanceCriteria: result.acceptanceCriteria,
      suggestedBranch: result.suggestedBranch,
      nextSteps: result.nextSteps,
      note: '⚠️ This ticket is NOT marked as Done. Implementation required before completion.',
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook status and documentation
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Honest Jira Automation Pipeline',
    version: '3.0',
    endpoints: {
      'POST /api/webhooks/jira': 'Triggered when ticket moves to In Progress. Returns guidance, does NOT auto-complete.',
      'POST /api/webhooks/jira/complete': 'Call AFTER implementation to transition to Done and create Confluence note.',
    },
    note: 'Tickets are only marked Done after verified implementation.',
  });
}
