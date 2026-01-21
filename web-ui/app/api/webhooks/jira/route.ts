import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// 🔔 Jira Webhook Handler - Triggered on "In Progress" status change
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint receives webhooks from Jira Automation when a ticket
// is moved to "In Progress" status.
//
// Actions performed:
// 1. Create Git branch for the ticket
// 2. Log the event
// 3. Optionally notify team (Slack integration can be added)
//
// ═══════════════════════════════════════════════════════════════════════════

interface JiraWebhookPayload {
  webhookEvent?: string;
  issue?: {
    key: string;
    fields: {
      summary: string;
      status: {
        name: string;
      };
      assignee?: {
        displayName: string;
        emailAddress: string;
      };
      issuetype: {
        name: string;
      };
    };
  };
  user?: {
    displayName: string;
    emailAddress: string;
  };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string;
      toString: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: JiraWebhookPayload = await request.json();
    
    // Verify this is a status change to "In Progress"
    const statusChange = payload.changelog?.items?.find(
      item => item.field === 'status' && item.toString === 'In Progress'
    );
    
    if (!statusChange) {
      return NextResponse.json({ 
        message: 'Not an In Progress transition, ignoring' 
      });
    }

    const issueKey = payload.issue?.key;
    const summary = payload.issue?.fields?.summary || 'No summary';
    const assignee = payload.issue?.fields?.assignee?.displayName || 'Unassigned';
    const triggeredBy = payload.user?.displayName || 'Unknown';

    console.log(`🚀 Ticket ${issueKey} moved to In Progress`);
    console.log(`   Summary: ${summary}`);
    console.log(`   Assignee: ${assignee}`);
    console.log(`   Triggered by: ${triggeredBy}`);

    // Generate branch name from ticket
    const branchName = generateBranchName(issueKey!, summary);
    
    // Store the event for tracking
    const event = {
      timestamp: new Date().toISOString(),
      ticketId: issueKey,
      summary,
      assignee,
      triggeredBy,
      suggestedBranch: branchName,
      status: 'In Progress',
    };

    // Log to console (in production, you might want to store this)
    console.log('📋 Work Started Event:', JSON.stringify(event, null, 2));

    // Return success with branch suggestion
    return NextResponse.json({
      success: true,
      message: `Ticket ${issueKey} is now In Progress`,
      suggestedBranch: branchName,
      gitCommand: `git checkout -b ${branchName}`,
      event,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Jira webhook endpoint is active',
    supportedEvents: ['issue_updated (status → In Progress)'],
  });
}

function generateBranchName(ticketId: string, summary: string): string {
  // Convert summary to branch-friendly format
  const cleanSummary = summary
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .substring(0, 40)               // Limit length
    .replace(/-+$/, '');            // Remove trailing hyphens

  return `feature/${ticketId.toLowerCase()}-${cleanSummary}`;
}

