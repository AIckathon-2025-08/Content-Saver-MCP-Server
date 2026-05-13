// ═══════════════════════════════════════════════════════════════════════════
// 📋 RELEASE NOTE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════
//
// Triggered when a Jira task is marked "Done".
// 1. Fetches the completed ticket details
// 2. Uses OpenAI to generate a professional release note
// 3. Creates a new Jira issue (type: Task, label: release-note) linked
//    back to the original ticket
//
// ═══════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';

function getConfig() {
  return {
    JIRA_BASE_URL: process.env.JIRA_BASE_URL || 'https://anuki.atlassian.net',
    JIRA_EMAIL: process.env.JIRA_EMAIL || '',
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN || '',
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || 'CSM',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  };
}

export interface ReleaseNoteResult {
  success: boolean;
  sourceTicket: string;
  releaseNoteKey?: string;
  releaseNoteUrl?: string;
  title?: string;
  error?: string;
}

interface JiraIssueDetails {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  assignee?: string;
  fixVersion?: string;
  labels: string[];
  resolution?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAndCreateReleaseNote(
  ticketKey: string
): Promise<ReleaseNoteResult> {
  console.log(`\n📋 RELEASE NOTE GENERATOR: ${ticketKey}`);

  try {
    const ticket = await fetchJiraIssue(ticketKey);
    console.log(`   ✅ Fetched: ${ticket.summary}`);

    const { title, body } = await buildReleaseNoteContent(ticket);
    console.log(`   ✅ Generated release note: ${title}`);

    const newKey = await createReleaseNoteIssue(ticket, title, body);
    console.log(`   ✅ Created Jira issue: ${newKey}`);

    const config = getConfig();
    return {
      success: true,
      sourceTicket: ticketKey,
      releaseNoteKey: newKey,
      releaseNoteUrl: `${config.JIRA_BASE_URL}/browse/${newKey}`,
      title,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Release note failed: ${msg}`);
    return { success: false, sourceTicket: ticketKey, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch ticket details
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJiraIssue(ticketKey: string): Promise<JiraIssueDetails> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');

  const res = await fetch(
    `${config.JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}?fields=summary,description,issuetype,assignee,fixVersions,labels,resolution`,
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch ${ticketKey}: HTTP ${res.status}`);
  }

  const data = await res.json();
  const f = data.fields;

  return {
    key: data.key,
    summary: f.summary,
    description: parseADF(f.description?.content ?? []),
    issueType: f.issuetype?.name ?? 'Task',
    assignee: f.assignee?.displayName,
    fixVersion: f.fixVersions?.[0]?.name,
    labels: f.labels ?? [],
    resolution: f.resolution?.name,
  };
}

function parseADF(content: any[]): string {
  let text = '';
  for (const block of content) {
    if (block.content) {
      for (const item of block.content) {
        if (item.text) text += item.text + ' ';
      }
    }
    text += '\n';
  }
  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-powered release note content generation
// ─────────────────────────────────────────────────────────────────────────────

async function buildReleaseNoteContent(
  ticket: JiraIssueDetails
): Promise<{ title: string; body: string }> {
  const config = getConfig();
  const date = new Date().toISOString().split('T')[0];

  if (!config.OPENAI_API_KEY) {
    return fallbackContent(ticket, date);
  }

  try {
    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

    const prompt = `You are a technical writer creating a release note for a completed feature.

Ticket: ${ticket.key}
Summary: ${ticket.summary}
Type: ${ticket.issueType}
Assignee: ${ticket.assignee ?? 'Unassigned'}
Description:
${ticket.description || '(no description)'}

Write a professional release note with:
1. A one-line headline (max 80 chars) — no ticket key prefix, just a user-facing title
2. A "What's new" section: 2-4 bullet points describing the feature from the user's perspective
3. An "Impact" section: one sentence on how this improves the product

Return JSON: { "title": "...", "whatsNew": ["...", "..."], "impact": "..." }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write concise, user-facing release notes. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    const title = `Release Note: ${parsed.title ?? ticket.summary}`;
    const bullets = (parsed.whatsNew as string[] ?? [])
      .map((b: string) => `* ${b}`)
      .join('\n');
    const impact = parsed.impact ?? '';

    const body = `*Released:* ${date}
*Source ticket:* [${ticket.key}|${config.JIRA_BASE_URL}/browse/${ticket.key}]
${ticket.assignee ? `*Author:* ${ticket.assignee}` : ''}

h3. What's new

${bullets}

h3. Impact

${impact}`;

    return { title, body };
  } catch {
    return fallbackContent(ticket, date);
  }
}

function fallbackContent(
  ticket: JiraIssueDetails,
  date: string
): { title: string; body: string } {
  const config = getConfig();
  return {
    title: `Release Note: ${ticket.summary}`,
    body: `*Released:* ${date}
*Source ticket:* [${ticket.key}|${config.JIRA_BASE_URL}/browse/${ticket.key}]
${ticket.assignee ? `*Author:* ${ticket.assignee}` : ''}

h3. What's new

* ${ticket.summary}
${ticket.description ? `* ${ticket.description.split('\n')[0]}` : ''}

h3. Impact

This feature has been completed and deployed to production.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create the release note as a Jira issue
// ─────────────────────────────────────────────────────────────────────────────

async function createReleaseNoteIssue(
  ticket: JiraIssueDetails,
  title: string,
  body: string
): Promise<string> {
  const config = getConfig();
  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');

  const adfBody = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: body }],
      },
    ],
  };

  const payload = {
    fields: {
      project: { key: config.JIRA_PROJECT_KEY },
      summary: title,
      description: adfBody,
      issuetype: { name: 'Task' },
      labels: ['release-note', ticket.key.toLowerCase()],
      ...(ticket.fixVersion
        ? { fixVersions: [{ name: ticket.fixVersion }] }
        : {}),
    },
  };

  const res = await fetch(`${config.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create release note issue: HTTP ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.key as string;
}
