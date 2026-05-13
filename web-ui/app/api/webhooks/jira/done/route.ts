import { NextRequest, NextResponse } from 'next/server';
import { generateAndCreateReleaseNote } from '@/lib/release-note-generator';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 JIRA "DONE" WEBHOOK — AUTO RELEASE NOTE
// ═══════════════════════════════════════════════════════════════════════════
//
// Register this endpoint as a Jira webhook scoped to:
//   Event:  jira:issue_updated
//   Filter: issueType != "Task" AND status = "Done"   (or leave filter empty)
//
// When fired, this handler:
//   1. Confirms the transition target is "Done"
//   2. Calls the release note generator
//   3. Creates a new Jira issue labelled "release-note" linked to the source
//
// Webhook URL (register in Jira → Project settings → Webhooks):
//   https://<your-vercel-domain>/api/webhooks/jira/done
//
// ═══════════════════════════════════════════════════════════════════════════

interface JiraDoneWebhookPayload {
  webhookEvent?: string;
  issue_event_type_name?: string;
  issue?: {
    key: string;
    fields: {
      summary: string;
      status: { name: string };
      issuetype: { name: string };
    };
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
    const payload: JiraDoneWebhookPayload = await request.json();

    const ticketKey = payload.issue?.key;
    if (!ticketKey) {
      return NextResponse.json({ success: false, message: 'No ticket key in payload' });
    }

    // Only act on status transitions that land on "Done"
    const statusChange = payload.changelog?.items?.find(
      (item) => item.field === 'status'
    );

    const isDoneTransition =
      statusChange?.toString?.toLowerCase() === 'done' ||
      payload.issue?.fields?.status?.name?.toLowerCase() === 'done';

    if (!isDoneTransition) {
      return NextResponse.json({
        success: true,
        message: `Ignored: status did not transition to Done (got "${statusChange?.toString ?? 'unknown'}")`,
      });
    }

    // Skip if this ticket IS already a release note to avoid infinite loops
    const issueType = payload.issue?.fields?.issuetype?.name?.toLowerCase() ?? '';
    const summary = payload.issue?.fields?.summary?.toLowerCase() ?? '';
    if (summary.startsWith('release note:') || issueType === 'release') {
      return NextResponse.json({
        success: true,
        message: 'Skipped: ticket is itself a release note',
      });
    }

    console.log(`\n📋 Auto-creating release note for ${ticketKey}...`);
    const result = await generateAndCreateReleaseNote(ticketKey);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ Release note created: ${result.releaseNoteKey}`,
        sourceTicket: result.sourceTicket,
        releaseNoteKey: result.releaseNoteKey,
        releaseNoteUrl: result.releaseNoteUrl,
        title: result.title,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: `⚠️ Release note generation failed for ${ticketKey}`,
        error: result.error,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Done webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    name: 'Jira Done → Release Note Webhook',
    version: '1.0',
    description:
      'Fires when a Jira issue transitions to Done and auto-creates a release note issue.',
    setup: {
      step1: 'Go to Jira → Project Settings → Automation (or Webhooks)',
      step2: 'Create a webhook for event: jira:issue_updated',
      step3: 'Set the URL to: https://<your-domain>/api/webhooks/jira/done',
      step4: 'Optional JQL filter: status = Done AND labels != release-note',
    },
  });
}
