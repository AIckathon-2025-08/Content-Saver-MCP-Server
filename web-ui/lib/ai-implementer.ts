// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI CODE IMPLEMENTER (Vercel-Compatible)
// ═══════════════════════════════════════════════════════════════════════════
//
// Automatically implements features based on Jira ticket requirements:
// 1. Analyzes the codebase structure
// 2. Understands ticket requirements
// 3. Generates code changes using GPT-4o
// 4. Commits via GitHub API (works on Vercel)
// 5. Vercel auto-deploys on push
//
// ═══════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';

interface TicketRequirements {
  ticketKey: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  issueType: string;
}

interface ImplementationResult {
  success: boolean;
  filesChanged: string[];
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}

interface CodeChange {
  filePath: string;
  action: 'create' | 'modify';
  content: string;
  description: string;
}

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = 'AIckathon-2025-08';
const GITHUB_REPO = 'Content-Saver-MCP-Server';
const GITHUB_BRANCH = 'main';

/**
 * Main function to implement a feature
 */
export async function implementFeature(ticket: TicketRequirements): Promise<ImplementationResult> {
  console.log(`\n🤖 AI IMPLEMENTER: ${ticket.ticketKey}`);
  
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { success: false, filesChanged: [], error: 'OPENAI_API_KEY not configured' };
  }

  if (!GITHUB_TOKEN) {
    return { success: false, filesChanged: [], error: 'GITHUB_TOKEN not configured' };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Get codebase context from GitHub
    console.log('   📁 Fetching codebase from GitHub...');
    const codebaseContext = await fetchCodebaseFromGitHub();

    // Step 2: Generate implementation plan
    console.log('   🧠 Generating implementation plan...');
    const plan = await generateImplementationPlan(openai, ticket, codebaseContext);

    // Step 3: Generate code changes
    console.log('   💻 Generating code changes...');
    const codeChanges = await generateCodeChanges(openai, ticket, plan, codebaseContext);

    if (!codeChanges || codeChanges.length === 0) {
      return { success: false, filesChanged: [], error: 'No code changes generated' };
    }

    console.log(`   📝 Generated ${codeChanges.length} file changes`);

    // Step 4: Commit to GitHub via API
    console.log('   📤 Committing to GitHub...');
    const commitResult = await commitToGitHub(
      ticket.ticketKey,
      ticket.summary,
      codeChanges
    );

    if (!commitResult.success) {
      return { success: false, filesChanged: [], error: commitResult.error };
    }

    const filesChanged = codeChanges.map(c => c.filePath);
    console.log(`   ✅ Committed: ${commitResult.commitUrl}`);

    return {
      success: true,
      filesChanged,
      commitSha: commitResult.sha,
      commitUrl: commitResult.commitUrl,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('   ❌ Implementation failed:', errorMsg);
    return { success: false, filesChanged: [], error: errorMsg };
  }
}

/**
 * Fetch key files from GitHub to understand codebase
 */
async function fetchCodebaseFromGitHub(): Promise<string> {
  const keyFiles = [
    'web-ui/types.ts',
    'web-ui/components/ItemCard.tsx',
    'web-ui/components/ItemList.tsx',
    'web-ui/app/page.tsx',
  ];

  const context: string[] = [];

  for (const filePath of keyFiles) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.raw',
          },
        }
      );

      if (response.ok) {
        const content = await response.text();
        // Get first 80 lines
        const preview = content.split('\n').slice(0, 80).join('\n');
        context.push(`=== ${filePath} ===\n${preview}`);
      }
    } catch (e) {
      console.log(`   Could not fetch ${filePath}`);
    }
  }

  return context.join('\n\n');
}

/**
 * Generate implementation plan
 */
async function generateImplementationPlan(
  openai: OpenAI,
  ticket: TicketRequirements,
  codebaseContext: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are implementing features for a Next.js/React app called "Content Saver".
        
The app structure:
- web-ui/types.ts: ContentItem interface and types
- web-ui/components/ItemCard.tsx: Individual item display
- web-ui/components/ItemList.tsx: List of items with selection
- web-ui/app/page.tsx: Main page with state management

Create a specific implementation plan listing which files to modify and what changes.`,
      },
      {
        role: 'user',
        content: `Feature: ${ticket.ticketKey} - ${ticket.summary}

Description:
${ticket.description}

Acceptance Criteria:
${ticket.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

Current Code:
${codebaseContext}

Create an implementation plan.`,
      },
    ],
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Generate code changes
 */
async function generateCodeChanges(
  openai: OpenAI,
  ticket: TicketRequirements,
  plan: string,
  codebaseContext: string
): Promise<CodeChange[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Generate code changes as a JSON object with a "changes" array.

Each change must have:
- filePath: path like "web-ui/types.ts"
- action: "modify" or "create"
- content: COMPLETE file content
- description: what changed

Return ONLY valid JSON like: {"changes": [...]}`,
      },
      {
        role: 'user',
        content: `Generate code for: ${ticket.ticketKey} - ${ticket.summary}

Plan:
${plan}

Current files:
${codebaseContext}

Return JSON with "changes" array.`,
      },
    ],
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  try {
    const content = response.choices[0]?.message?.content || '{"changes":[]}';
    console.log('   Raw AI response length:', content.length);
    
    const parsed = JSON.parse(content);
    
    // Handle different response formats
    let changes: CodeChange[] = [];
    if (Array.isArray(parsed)) {
      changes = parsed;
    } else if (parsed.changes && Array.isArray(parsed.changes)) {
      changes = parsed.changes;
    } else if (parsed.files && Array.isArray(parsed.files)) {
      changes = parsed.files;
    }

    // Validate changes
    changes = changes.filter(c => c && c.filePath && c.content);
    
    return changes;
  } catch (error) {
    console.error('   Failed to parse AI response:', error);
    return [];
  }
}

/**
 * Commit changes to GitHub via API
 */
async function commitToGitHub(
  ticketKey: string,
  summary: string,
  changes: CodeChange[]
): Promise<{ success: boolean; sha?: string; commitUrl?: string; error?: string }> {
  try {
    // Get current commit SHA
    const refResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!refResponse.ok) {
      return { success: false, error: 'Failed to get branch ref' };
    }
    
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // Get base tree
    const baseCommitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${baseSha}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    const baseCommit = await baseCommitResponse.json();
    const baseTreeSha = baseCommit.tree.sha;

    // Create blobs for each file
    const treeItems = [];
    for (const change of changes) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: change.content,
            encoding: 'utf-8',
          }),
        }
      );
      
      if (!blobResponse.ok) {
        console.error(`Failed to create blob for ${change.filePath}`);
        continue;
      }
      
      const blob = await blobResponse.json();
      treeItems.push({
        path: change.filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    if (treeItems.length === 0) {
      return { success: false, error: 'No files to commit' };
    }

    // Create new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    );
    
    const tree = await treeResponse.json();

    // Create commit
    const commitMessage = `feat(${ticketKey}): ${summary}\n\n🤖 AI-implemented feature\n\nFiles:\n${changes.map(c => `- ${c.filePath}`).join('\n')}`;
    
    const commitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: tree.sha,
          parents: [baseSha],
        }),
      }
    );
    
    const commit = await commitResponse.json();

    // Update branch reference
    await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: commit.sha,
        }),
      }
    );

    return {
      success: true,
      sha: commit.sha,
      commitUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${commit.sha}`,
    };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Git commit failed' };
  }
}

/**
 * Wait for deployment
 */
export async function waitForDeployment(commitSha: string, timeoutMs: number = 60000): Promise<boolean> {
  console.log('   ⏳ Waiting for Vercel deployment...');
  await new Promise(resolve => setTimeout(resolve, Math.min(timeoutMs, 45000)));
  console.log('   ✅ Deployment wait complete');
  return true;
}
