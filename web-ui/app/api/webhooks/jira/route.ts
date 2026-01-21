import { NextRequest, NextResponse } from 'next/server';
import { executeAutomationPipeline } from '@/lib/automation-pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 FULL AI AUTOMATION WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════
//
// When a ticket moves to "In Progress":
// 1. AI reads the ticket requirements
// 2. AI generates and applies code changes
// 3. Code is committed and pushed to GitHub
// 4. Vercel auto-deploys
// 5. Ticket is marked "Done"
// 6. Confluence release note is created
//
// This is FULL END-TO-END automation!
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
  key?: string;
  fields?: {
    summary: string;
    status: { name: string };
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: JiraWebhookPayload = await request.json();
    
    console.log('\n🤖 FULL AI AUTOMATION TRIGGERED');
    
    const ticketKey = payload.issue?.key || payload.key || null;
    
    if (!ticketKey) {
      return NextResponse.json({ 
        success: false,
        message: 'No ticket key found' 
      });
    }

    // Check for In Progress transition
    const hasChangelog = (payload.changelog?.items?.length ?? 0) > 0;
    if (hasChangelog) {
      const statusChange = payload.changelog?.items?.find(
        item => item.field === 'status' && item.toString === 'In Progress'
      );
      if (!statusChange) {
        return NextResponse.json({ 
          success: true,
          message: 'Not an In Progress transition' 
        });
      }
    }

    // Execute FULL automation
    console.log(`\n🚀 Starting full automation for: ${ticketKey}`);
    const result = await executeAutomationPipeline(ticketKey);

    return NextResponse.json({
      success: result.success,
      ticketKey: result.ticketKey,
      message: result.success 
        ? `✅ FULL AUTOMATION COMPLETE: ${ticketKey} implemented, deployed, and marked Done!`
        : `⚠️ Automation failed: ${result.error}`,
      steps: result.steps,
      summary: result.summary,
      filesChanged: result.filesChanged,
      commitUrl: result.commitUrl,
      deploymentUrl: result.deploymentUrl,
      confluenceUrl: result.confluenceUrl,
      error: result.error,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Automation failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    name: 'Full AI Automation Pipeline',
    version: '4.0',
    description: 'When ticket moves to In Progress: AI implements code → commits → deploys → marks Done → creates Confluence',
    capabilities: [
      '🧠 AI Code Generation',
      '📤 Auto Git Commit & Push',
      '🚀 Auto Vercel Deployment',
      '✅ Auto Jira → Done',
      '📄 Auto Confluence Release Notes',
    ],
  });
}
