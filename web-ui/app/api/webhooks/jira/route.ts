import { NextRequest, NextResponse } from 'next/server';
import { executeAutomationPipeline } from '@/lib/automation-pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI-DRIVEN JIRA WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════
//
// When a ticket moves to "In Progress", this webhook:
// 1. Triggers the full automation pipeline
// 2. Implements the feature using AI
// 3. Deploys to production
// 4. Moves ticket to "Done"
// 5. Creates Confluence release note
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
  // Direct format from Jira Automation "Send web request"
  key?: string;
  fields?: {
    summary: string;
    status: { name: string };
    issuetype?: { name: string };
    assignee?: { displayName: string };
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: JiraWebhookPayload = await request.json();
    
    console.log('\n📨 Received Jira webhook');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Extract ticket key from various payload formats
    const ticketKey = payload.issue?.key || payload.key || null;
    
    if (!ticketKey) {
      console.log('⚠️ No ticket key found in payload');
      return NextResponse.json({ 
        success: false,
        message: 'No ticket key found in payload' 
      });
    }

    // Check if we have a changelog (full webhook format)
    const hasChangelog = (payload.changelog?.items?.length ?? 0) > 0;
    
    if (hasChangelog) {
      // Verify this is a status change to "In Progress"
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

    // Get summary for logging
    const summary = payload.issue?.fields?.summary || payload.fields?.summary || 'Unknown';
    console.log(`\n🎯 Processing: ${ticketKey} - ${summary}`);

    // Execute the full automation pipeline
    console.log('\n🤖 Starting AI-driven automation pipeline...');
    const result = await executeAutomationPipeline(ticketKey);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ Full automation completed for ${ticketKey}`,
        ticketKey: result.ticketKey,
        steps: result.steps,
        implementationSummary: result.implementationSummary,
        deploymentUrl: result.deploymentUrl,
        confluenceUrl: result.confluenceUrl,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `⚠️ Pipeline partially completed for ${ticketKey}`,
        ticketKey: result.ticketKey,
        steps: result.steps,
        error: result.error,
      });
    }

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

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'AI-Driven Jira Automation Pipeline',
    version: '2.0',
    capabilities: [
      'Automatic ticket processing on "In Progress"',
      'AI-powered implementation analysis',
      'Automatic Jira transition to "Done"',
      'Automatic Confluence release note creation',
    ],
  });
}
