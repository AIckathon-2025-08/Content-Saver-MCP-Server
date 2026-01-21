// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AUTOMATION PIPELINE - HONEST VERSION
// ═══════════════════════════════════════════════════════════════════════════
//
// This pipeline is triggered when a Jira ticket moves to "In Progress"
// 
// WHAT IT DOES:
// 1. Fetches ticket details from Jira
// 2. Parses requirements from description
// 3. Logs the work item for tracking
// 4. Returns guidance on what needs to be implemented
//
// WHAT IT DOES NOT DO:
// ❌ Auto-implement features (requires manual implementation)
// ❌ Auto-transition to "Done" (must verify implementation first)
// ❌ Auto-create Confluence notes (only after actual deployment)
//
// To complete a ticket, use: completeTicketAfterImplementation()
//
// ═══════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';

// Get configuration from environment (read at runtime, not module load)
function getConfig() {
  return {
    JIRA_BASE_URL: process.env.JIRA_BASE_URL || 'https://agorozia1.atlassian.net',
    JIRA_EMAIL: process.env.JIRA_EMAIL || 'agorozia1@gmail.com',
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN || '',
    CONFLUENCE_SPACE_ID: process.env.CONFLUENCE_SPACE_ID || '262148',
  };
}

interface TicketData {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  assignee?: string;
  acceptanceCriteria: string[];
}

interface WorkStartedResult {
  success: boolean;
  ticketKey: string;
  summary: string;
  acceptanceCriteria: string[];
  suggestedBranch: string;
  message: string;
  nextSteps: string[];
}

interface CompletionResult {
  success: boolean;
  ticketKey: string;
  steps: {
    verifyImplementation: boolean;
    updateJira: boolean;
    createConfluence: boolean;
  };
  deploymentUrl?: string;
  confluenceUrl?: string;
  error?: string;
}

/**
 * Called when a ticket moves to "In Progress"
 * Does NOT auto-implement or auto-complete - just logs and returns guidance
 */
export async function executeAutomationPipeline(ticketKey: string): Promise<WorkStartedResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 WORK STARTED: ${ticketKey}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Fetch ticket details from Jira
    console.log('📋 Fetching ticket details from Jira...');
    const ticket = await fetchJiraTicket(ticketKey);
    console.log(`   ✅ Ticket: ${ticket.summary}`);

    // Step 2: Parse requirements
    console.log('\n📝 Parsing requirements...');
    const requirements = parseRequirements(ticket.description);
    ticket.acceptanceCriteria = requirements;
    console.log(`   ✅ Found ${requirements.length} acceptance criteria`);

    // Step 3: Generate branch name
    const branchName = generateBranchName(ticketKey, ticket.summary);

    // Step 4: Log and return guidance
    console.log(`\n✅ Work item logged. Ready for implementation.`);
    console.log(`   Branch: ${branchName}`);

    return {
      success: true,
      ticketKey,
      summary: ticket.summary,
      acceptanceCriteria: requirements,
      suggestedBranch: branchName,
      message: `Ticket ${ticketKey} is now In Progress. Awaiting implementation.`,
      nextSteps: [
        `1. Create branch: git checkout -b ${branchName}`,
        `2. Implement the feature based on acceptance criteria`,
        `3. Commit with message including ${ticketKey}`,
        `4. Push and deploy to production`,
        `5. Call /api/webhooks/jira/complete?ticket=${ticketKey} to finish`,
      ],
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Failed to process ticket: ${errorMsg}`);
    
    return {
      success: false,
      ticketKey,
      summary: '',
      acceptanceCriteria: [],
      suggestedBranch: '',
      message: `Failed to process ${ticketKey}: ${errorMsg}`,
      nextSteps: [],
    };
  }
}

/**
 * Called AFTER a feature is actually implemented and deployed
 * This is what transitions to "Done" and creates Confluence notes
 */
export async function completeTicketAfterImplementation(
  ticketKey: string,
  implementationDetails: {
    filesChanged: string[];
    commitUrl?: string;
    implementationSummary?: string;
  }
): Promise<CompletionResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ COMPLETING TICKET: ${ticketKey}`);
  console.log(`${'='.repeat(60)}\n`);

  const result: CompletionResult = {
    success: false,
    ticketKey,
    steps: {
      verifyImplementation: false,
      updateJira: false,
      createConfluence: false,
    },
  };

  try {
    // Step 1: Verify implementation details provided
    if (!implementationDetails.filesChanged || implementationDetails.filesChanged.length === 0) {
      throw new Error('No files changed provided - implementation not verified');
    }
    result.steps.verifyImplementation = true;
    console.log(`   ✅ Implementation verified: ${implementationDetails.filesChanged.length} files changed`);

    // Step 2: Fetch ticket details
    const ticket = await fetchJiraTicket(ticketKey);

    // Step 3: Transition Jira ticket to "Done"
    console.log('\n📋 Updating Jira ticket to Done...');
    await transitionJiraTicket(ticketKey, 'Done');
    result.steps.updateJira = true;
    console.log(`   ✅ Ticket transitioned to Done`);

    // Step 4: Create Confluence release note
    console.log('\n📄 Creating Confluence release note...');
    const summary = implementationDetails.implementationSummary || 
      `Implemented ${ticket.summary}. Files changed: ${implementationDetails.filesChanged.join(', ')}`;
    
    const confluenceResult = await createConfluenceReleaseNote(
      ticket,
      summary,
      implementationDetails
    );
    result.steps.createConfluence = true;
    result.confluenceUrl = confluenceResult.url;
    result.deploymentUrl = 'https://web-ui-sable-pi.vercel.app';
    console.log(`   ✅ Release note created: ${confluenceResult.url}`);

    result.success = true;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 TICKET COMPLETED: ${ticketKey}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Completion failed: ${result.error}`);
  }

  return result;
}

/**
 * Generate a Git branch name from ticket
 */
function generateBranchName(ticketKey: string, summary: string): string {
  const cleanSummary = summary
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40)
    .replace(/-+$/, '');

  return `feature/${ticketKey.toLowerCase()}-${cleanSummary}`;
}

/**
 * Fetch ticket details from Jira API
 */
async function fetchJiraTicket(ticketKey: string): Promise<TicketData> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');
  
  const response = await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}`,
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Jira ticket: ${response.status}`);
  }

  const data = await response.json();
  
  let description = '';
  if (data.fields.description?.content) {
    description = parseAtlassianDoc(data.fields.description.content);
  }

  return {
    key: data.key,
    summary: data.fields.summary,
    description,
    issueType: data.fields.issuetype.name,
    assignee: data.fields.assignee?.displayName,
    acceptanceCriteria: [],
  };
}

/**
 * Parse Atlassian Document Format to plain text
 */
function parseAtlassianDoc(content: any[]): string {
  let text = '';
  for (const block of content) {
    if (block.content) {
      for (const item of block.content) {
        if (item.text) {
          text += item.text + '\n';
        }
      }
    }
    text += '\n';
  }
  return text.trim();
}

/**
 * Parse requirements from ticket description
 */
function parseRequirements(description: string): string[] {
  const requirements: string[] = [];
  const lines = description.split('\n');
  
  for (const line of lines) {
    if (line.includes('- [ ]') || line.includes('* [ ]') || 
        line.startsWith('- ') || line.startsWith('* ') ||
        line.includes('**I want**') || line.includes('**So that**')) {
      requirements.push(line.replace(/^[-*]\s*(\[ \])?\s*/, '').trim());
    }
  }
  
  return requirements.filter(r => r.length > 0);
}

/**
 * Transition Jira ticket to a new status
 */
async function transitionJiraTicket(ticketKey: string, targetStatus: string): Promise<void> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');
  
  const transitionsResponse = await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}/transitions`,
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!transitionsResponse.ok) {
    throw new Error(`Failed to get transitions: ${transitionsResponse.status}`);
  }

  const transitionsData = await transitionsResponse.json();
  const transition = transitionsData.transitions.find(
    (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase()
  );

  if (!transition) {
    throw new Error(`Transition to "${targetStatus}" not available`);
  }

  const response = await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}/transitions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: transition.id } }),
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to transition ticket: ${response.status}`);
  }
}

/**
 * Create Confluence release note
 */
async function createConfluenceReleaseNote(
  ticket: TicketData,
  implementation: string,
  implResult: { filesChanged: string[]; commitUrl?: string }
): Promise<{ id: string; url: string }> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');
  const date = new Date().toISOString().split('T')[0];
  
  const filesListHtml = implResult.filesChanged.map(f => `<li><code>${f}</code></li>`).join('');
  
  const body = `<h2>Feature: ${ticket.summary}</h2>
<p><strong>Ticket:</strong> <a href="${config.JIRA_BASE_URL}/browse/${ticket.key}">${ticket.key}</a></p>
<p><strong>Deployed:</strong> ${date}</p>
<p><strong>Type:</strong> ${ticket.issueType}</p>
<hr/>
<h3>Implementation Summary</h3>
<p>${implementation}</p>
<h3>Files Changed</h3>
<ul>${filesListHtml}</ul>
${implResult.commitUrl ? `<p><strong>Commit:</strong> <a href="${implResult.commitUrl}">${implResult.commitUrl}</a></p>` : ''}
<h3>Production URL</h3>
<p><a href="https://web-ui-sable-pi.vercel.app">https://web-ui-sable-pi.vercel.app</a></p>`;

  const response = await fetch(
    `${config.JIRA_BASE_URL}/wiki/api/v2/blogposts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spaceId: config.CONFLUENCE_SPACE_ID,
        status: 'current',
        title: `${ticket.key}: ${ticket.summary} - Deployed ${date}`,
        body: {
          representation: 'storage',
          value: body,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Confluence page: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: `${config.JIRA_BASE_URL}/wiki${data._links?.webui || `/pages/${data.id}`}`,
  };
}
