// ═══════════════════════════════════════════════════════════════════════════
// 🤖 FULL AI-DRIVEN AUTOMATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════
//
// When a Jira ticket moves to "In Progress":
// 1. Fetch ticket details from Jira
// 2. Parse requirements from description
// 3. 🆕 AI generates and applies code changes
// 4. 🆕 Commits and pushes to GitHub
// 5. 🆕 Waits for Vercel deployment
// 6. Transitions Jira ticket to "Done"
// 7. Creates Confluence release note
//
// This is FULL automation - code is written automatically!
//
// ═══════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { implementFeature, waitForDeployment } from './ai-implementer';

// Get configuration from environment
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

interface PipelineResult {
  success: boolean;
  ticketKey: string;
  steps: {
    fetchTicket: boolean;
    parseRequirements: boolean;
    implementFeature: boolean;
    commitCode: boolean;
    deploy: boolean;
    updateJira: boolean;
    createConfluence: boolean;
  };
  summary?: string;
  acceptanceCriteria?: string[];
  filesChanged?: string[];
  commitUrl?: string;
  deploymentUrl?: string;
  confluenceUrl?: string;
  error?: string;
}

/**
 * Execute the FULL automation pipeline with AI implementation
 */
export async function executeAutomationPipeline(ticketKey: string): Promise<PipelineResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 FULL AI AUTOMATION: ${ticketKey}`);
  console.log(`${'='.repeat(60)}\n`);

  const result: PipelineResult = {
    success: false,
    ticketKey,
    steps: {
      fetchTicket: false,
      parseRequirements: false,
      implementFeature: false,
      commitCode: false,
      deploy: false,
      updateJira: false,
      createConfluence: false,
    },
  };

  try {
    // Step 1: Fetch ticket details from Jira
    console.log('📋 Step 1: Fetching ticket details...');
    const ticket = await fetchJiraTicket(ticketKey);
    result.steps.fetchTicket = true;
    result.summary = ticket.summary;
    console.log(`   ✅ ${ticket.summary}`);

    // Step 2: Parse requirements
    console.log('\n📝 Step 2: Parsing requirements...');
    const requirements = parseRequirements(ticket.description);
    ticket.acceptanceCriteria = requirements;
    result.steps.parseRequirements = true;
    result.acceptanceCriteria = requirements;
    console.log(`   ✅ Found ${requirements.length} requirements`);

    // Step 3: AI Implementation
    console.log('\n💻 Step 3: AI generating code...');
    const implementation = await implementFeature({
      ticketKey: ticket.key,
      summary: ticket.summary,
      description: ticket.description,
      acceptanceCriteria: ticket.acceptanceCriteria,
      issueType: ticket.issueType,
    });

    if (!implementation.success) {
      throw new Error(`AI implementation failed: ${implementation.error}`);
    }

    result.steps.implementFeature = true;
    result.steps.commitCode = true;
    result.filesChanged = implementation.filesChanged;
    result.commitUrl = implementation.commitUrl;
    console.log(`   ✅ ${implementation.filesChanged.length} files changed`);
    console.log(`   📤 Commit: ${implementation.commitUrl}`);

    // Step 4: Wait for deployment
    console.log('\n🚀 Step 4: Waiting for Vercel deployment...');
    await waitForDeployment(implementation.commitSha || '', 45000);
    result.steps.deploy = true;
    result.deploymentUrl = 'https://web-ui-sable-pi.vercel.app';
    console.log(`   ✅ Deployed: ${result.deploymentUrl}`);

    // Step 5: Transition Jira to Done
    console.log('\n✅ Step 5: Updating Jira to Done...');
    await transitionJiraTicket(ticketKey, 'Done');
    result.steps.updateJira = true;
    console.log(`   ✅ Ticket marked as Done`);

    // Step 6: Create Confluence release note
    console.log('\n📄 Step 6: Creating Confluence release note...');
    const implementationSummary = await generateSummary(ticket, implementation.filesChanged);
    const confluenceResult = await createConfluenceReleaseNote(
      ticket,
      implementationSummary,
      { filesChanged: implementation.filesChanged, commitUrl: implementation.commitUrl }
    );
    result.steps.createConfluence = true;
    result.confluenceUrl = confluenceResult.url;
    console.log(`   ✅ ${confluenceResult.url}`);

    result.success = true;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 FULL AUTOMATION COMPLETE: ${ticketKey}`);
    console.log(`   Files: ${implementation.filesChanged.join(', ')}`);
    console.log(`   Commit: ${implementation.commitUrl}`);
    console.log(`   Confluence: ${confluenceResult.url}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Pipeline failed: ${result.error}`);
  }

  return result;
}

/**
 * Generate implementation summary using AI
 */
async function generateSummary(ticket: TicketData, filesChanged: string[]): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return `Implemented ${ticket.summary}. Files changed: ${filesChanged.join(', ')}`;
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Create a concise 2-3 sentence summary of the implementation for release notes.',
        },
        {
          role: 'user',
          content: `Feature: ${ticket.summary}\nDescription: ${ticket.description}\nFiles: ${filesChanged.join(', ')}`,
        },
      ],
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content || ticket.summary;
  } catch {
    return `Implemented ${ticket.summary}. Files changed: ${filesChanged.join(', ')}`;
  }
}

/**
 * Fetch ticket details from Jira
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
    throw new Error(`Failed to fetch ticket: ${response.status}`);
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

function parseAtlassianDoc(content: any[]): string {
  let text = '';
  for (const block of content) {
    if (block.content) {
      for (const item of block.content) {
        if (item.text) text += item.text + '\n';
      }
    }
    text += '\n';
  }
  return text.trim();
}

function parseRequirements(description: string): string[] {
  const requirements: string[] = [];
  for (const line of description.split('\n')) {
    if (line.includes('- [ ]') || line.startsWith('- ') || line.startsWith('* ') ||
        line.includes('**I want**') || line.includes('**So that**')) {
      requirements.push(line.replace(/^[-*]\s*(\[ \])?\s*/, '').trim());
    }
  }
  return requirements.filter(r => r.length > 0);
}

async function transitionJiraTicket(ticketKey: string, targetStatus: string): Promise<void> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');

  const transitionsResponse = await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}/transitions`,
    { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
  );

  const transitionsData = await transitionsResponse.json();
  const transition = transitionsData.transitions.find(
    (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase()
  );

  if (!transition) throw new Error(`Transition to "${targetStatus}" not available`);

  await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}/transitions`,
    {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transition: { id: transition.id } }),
    }
  );
}

async function createConfluenceReleaseNote(
  ticket: TicketData,
  summary: string,
  impl: { filesChanged: string[]; commitUrl?: string }
): Promise<{ id: string; url: string }> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');
  const date = new Date().toISOString().split('T')[0];

  const filesHtml = impl.filesChanged.map(f => `<li><code>${f}</code></li>`).join('');
  const body = `<h2>Feature: ${ticket.summary}</h2>
<p><strong>Ticket:</strong> <a href="${config.JIRA_BASE_URL}/browse/${ticket.key}">${ticket.key}</a></p>
<p><strong>Deployed:</strong> ${date}</p>
<p><strong>Type:</strong> ${ticket.issueType}</p>
<p><strong>Implementation:</strong> AI-Generated</p>
<hr/>
<h3>Summary</h3>
<p>${summary}</p>
<h3>Files Changed</h3>
<ul>${filesHtml}</ul>
${impl.commitUrl ? `<p><strong>Commit:</strong> <a href="${impl.commitUrl}">${impl.commitUrl}</a></p>` : ''}
<h3>Production</h3>
<p><a href="https://web-ui-sable-pi.vercel.app">https://web-ui-sable-pi.vercel.app</a></p>`;

  const response = await fetch(
    `${config.JIRA_BASE_URL}/wiki/api/v2/blogposts`,
    {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: config.CONFLUENCE_SPACE_ID,
        status: 'current',
        title: `${ticket.key}: ${ticket.summary} - AI Implemented ${date}`,
        body: { representation: 'storage', value: body },
      }),
    }
  );

  if (!response.ok) throw new Error(`Confluence failed: ${response.status}`);

  const data = await response.json();
  return {
    id: data.id,
    url: `${config.JIRA_BASE_URL}/wiki${data._links?.webui || `/pages/${data.id}`}`,
  };
}

// Export for manual completion (backwards compatibility)
export async function completeTicketAfterImplementation(
  ticketKey: string,
  details: { filesChanged: string[]; commitUrl?: string; implementationSummary?: string }
): Promise<any> {
  const ticket = await fetchJiraTicket(ticketKey);
  await transitionJiraTicket(ticketKey, 'Done');
  const summary = details.implementationSummary || `Implemented ${ticket.summary}`;
  const result = await createConfluenceReleaseNote(ticket, summary, details);
  return { success: true, confluenceUrl: result.url };
}
