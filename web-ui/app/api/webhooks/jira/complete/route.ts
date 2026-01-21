import { NextRequest, NextResponse } from 'next/server';
import { completeTicketAfterImplementation } from '@/lib/automation-pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// ✅ TICKET COMPLETION ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════
//
// Call this AFTER a feature is actually implemented and deployed.
// This will:
// 1. Verify implementation details are provided
// 2. Transition Jira ticket to "Done"
// 3. Create Confluence release note with actual files changed
//
// Usage:
// POST /api/webhooks/jira/complete
// Body: {
//   "ticketKey": "KAN-7",
//   "filesChanged": ["components/PinButton.tsx", "types.ts"],
//   "commitUrl": "https://github.com/...",
//   "implementationSummary": "Added pin/favorite functionality..."
// }
//
// ═══════════════════════════════════════════════════════════════════════════

interface CompletionRequest {
  ticketKey: string;
  filesChanged: string[];
  commitUrl?: string;
  implementationSummary?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CompletionRequest = await request.json();
    
    // Validate required fields
    if (!body.ticketKey) {
      return NextResponse.json(
        { success: false, error: 'ticketKey is required' },
        { status: 400 }
      );
    }

    if (!body.filesChanged || body.filesChanged.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'filesChanged array is required. List the files that were modified to implement this feature.',
          example: {
            ticketKey: 'KAN-7',
            filesChanged: ['components/PinButton.tsx', 'types.ts', 'lib/storage.ts'],
            commitUrl: 'https://github.com/org/repo/commit/abc123',
            implementationSummary: 'Added pin/favorite functionality with...',
          }
        },
        { status: 400 }
      );
    }

    console.log(`\n✅ Completing ticket: ${body.ticketKey}`);
    console.log(`   Files changed: ${body.filesChanged.join(', ')}`);

    // Execute completion
    const result = await completeTicketAfterImplementation(body.ticketKey, {
      filesChanged: body.filesChanged,
      commitUrl: body.commitUrl,
      implementationSummary: body.implementationSummary,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ Ticket ${body.ticketKey} completed successfully!`,
        ticketKey: result.ticketKey,
        steps: result.steps,
        deploymentUrl: result.deploymentUrl,
        confluenceUrl: result.confluenceUrl,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `⚠️ Completion partially failed for ${body.ticketKey}`,
        ticketKey: result.ticketKey,
        steps: result.steps,
        error: result.error,
      });
    }

  } catch (error) {
    console.error('Completion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete ticket' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if ticket param provided for quick status check
  const { searchParams } = new URL(request.url);
  const ticketKey = searchParams.get('ticket');

  if (ticketKey) {
    return NextResponse.json({
      message: `To complete ticket ${ticketKey}, send a POST request with implementation details`,
      example: {
        method: 'POST',
        url: '/api/webhooks/jira/complete',
        body: {
          ticketKey,
          filesChanged: ['component1.tsx', 'component2.tsx'],
          commitUrl: 'https://github.com/...',
          implementationSummary: 'Description of what was implemented',
        },
      },
    });
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: 'Ticket Completion API',
    description: 'Call this AFTER implementing a feature to mark it as Done and create release notes',
    usage: {
      method: 'POST',
      body: {
        ticketKey: '(required) Jira ticket key, e.g., KAN-7',
        filesChanged: '(required) Array of files that were changed',
        commitUrl: '(optional) GitHub commit URL',
        implementationSummary: '(optional) Description of implementation',
      },
    },
  });
}

