// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI CODE IMPLEMENTER
// ═══════════════════════════════════════════════════════════════════════════
//
// Automatically implements features based on Jira ticket requirements:
// 1. Analyzes the codebase structure
// 2. Understands ticket requirements
// 3. Generates code changes
// 4. Commits and pushes to GitHub
// 5. Waits for Vercel deployment
//
// ═══════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

// Project root path
const PROJECT_ROOT = process.cwd().includes('web-ui') 
  ? process.cwd() 
  : join(process.cwd(), 'web-ui');

/**
 * Main function to implement a feature based on ticket requirements
 */
export async function implementFeature(ticket: TicketRequirements): Promise<ImplementationResult> {
  console.log(`\n🤖 AI IMPLEMENTER: Starting ${ticket.ticketKey}`);
  
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return {
      success: false,
      filesChanged: [],
      error: 'OPENAI_API_KEY not configured',
    };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Analyze the codebase
    console.log('   📁 Analyzing codebase...');
    const codebaseContext = await analyzeCodebase();

    // Step 2: Generate implementation plan
    console.log('   🧠 Generating implementation plan...');
    const implementationPlan = await generateImplementationPlan(
      openai,
      ticket,
      codebaseContext
    );

    // Step 3: Generate code changes
    console.log('   💻 Generating code...');
    const codeChanges = await generateCodeChanges(
      openai,
      ticket,
      implementationPlan,
      codebaseContext
    );

    if (codeChanges.length === 0) {
      return {
        success: false,
        filesChanged: [],
        error: 'No code changes generated',
      };
    }

    // Step 4: Apply code changes
    console.log('   ✏️ Applying changes...');
    const appliedFiles = applyCodeChanges(codeChanges);

    // Step 5: Commit and push
    console.log('   📤 Committing and pushing...');
    const gitResult = commitAndPush(ticket.ticketKey, ticket.summary, appliedFiles);

    console.log(`   ✅ Implementation complete: ${appliedFiles.length} files changed`);

    return {
      success: true,
      filesChanged: appliedFiles,
      commitSha: gitResult.sha,
      commitUrl: gitResult.url,
    };

  } catch (error) {
    console.error('   ❌ Implementation failed:', error);
    return {
      success: false,
      filesChanged: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze the codebase to understand its structure
 */
async function analyzeCodebase(): Promise<string> {
  const context: string[] = [];

  // Read key files to understand the codebase
  const keyFiles = [
    'types.ts',
    'components/ItemCard.tsx',
    'components/ItemList.tsx',
    'app/page.tsx',
    'lib/storage.ts',
  ];

  for (const file of keyFiles) {
    const filePath = join(PROJECT_ROOT, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      // Get first 100 lines to understand structure
      const preview = content.split('\n').slice(0, 100).join('\n');
      context.push(`=== ${file} ===\n${preview}\n`);
    }
  }

  return context.join('\n\n');
}

/**
 * Generate an implementation plan using AI
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
        content: `You are a senior software engineer implementing features for a Next.js/React application called "Content Saver".

The app saves notes and links with the following structure:
- types.ts: Contains ContentItem interface
- components/: React components (ItemCard, ItemList, etc.)
- app/page.tsx: Main page component
- lib/storage.ts: Storage logic

Create a detailed implementation plan that lists:
1. Which files need to be modified
2. What changes need to be made in each file
3. The order of changes

Be specific and practical. Only suggest changes that are necessary for the feature.`,
      },
      {
        role: 'user',
        content: `Implement this feature:

Ticket: ${ticket.ticketKey}
Summary: ${ticket.summary}
Description:
${ticket.description}

Acceptance Criteria:
${ticket.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

Current Codebase (key files):
${codebaseContext}

Provide a step-by-step implementation plan.`,
      },
    ],
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Generate actual code changes using AI
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
        content: `You are a code generator. Based on the implementation plan, generate the actual code changes.

Return a JSON array of changes with this structure:
[
  {
    "filePath": "relative/path/to/file.tsx",
    "action": "modify" or "create",
    "content": "FULL file content after changes",
    "description": "What was changed"
  }
]

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanation
- For "modify" actions, include the COMPLETE file content
- Use TypeScript/React best practices
- Keep existing functionality intact when modifying`,
      },
      {
        role: 'user',
        content: `Generate code changes for:

Ticket: ${ticket.ticketKey} - ${ticket.summary}

Implementation Plan:
${plan}

Current Codebase:
${codebaseContext}

Return only the JSON array of changes.`,
      },
    ],
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  try {
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return parsed.changes || parsed || [];
  } catch (error) {
    console.error('Failed to parse code changes:', error);
    return [];
  }
}

/**
 * Apply code changes to the filesystem
 */
function applyCodeChanges(changes: CodeChange[]): string[] {
  const appliedFiles: string[] = [];

  for (const change of changes) {
    try {
      const filePath = join(PROJECT_ROOT, change.filePath);
      writeFileSync(filePath, change.content, 'utf-8');
      appliedFiles.push(change.filePath);
      console.log(`      ✅ ${change.action}: ${change.filePath}`);
    } catch (error) {
      console.error(`      ❌ Failed to apply ${change.filePath}:`, error);
    }
  }

  return appliedFiles;
}

/**
 * Commit and push changes to GitHub
 */
function commitAndPush(
  ticketKey: string,
  summary: string,
  files: string[]
): { sha: string; url: string } {
  try {
    // Stage files
    for (const file of files) {
      execSync(`git add "${file}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    }

    // Commit
    const commitMessage = `feat(${ticketKey}): ${summary}\n\nAI-implemented feature based on Jira ticket requirements.\n\nFiles changed:\n${files.map(f => `- ${f}`).join('\n')}`;
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });

    // Get commit SHA
    const sha = execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();

    // Push
    execSync('git push', { cwd: PROJECT_ROOT, stdio: 'pipe' });

    // Get remote URL for commit link
    const remoteUrl = execSync('git remote get-url origin', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    const repoUrl = remoteUrl.replace('.git', '').replace('git@github.com:', 'https://github.com/');
    const commitUrl = `${repoUrl}/commit/${sha}`;

    return { sha, url: commitUrl };
  } catch (error) {
    console.error('Git operation failed:', error);
    return { sha: '', url: '' };
  }
}

/**
 * Wait for Vercel deployment to complete
 */
export async function waitForDeployment(commitSha: string, timeoutMs: number = 60000): Promise<boolean> {
  console.log('   ⏳ Waiting for Vercel deployment...');
  
  // Simple wait - Vercel typically deploys in 30-60 seconds
  const waitTime = Math.min(timeoutMs, 45000);
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  console.log('   ✅ Deployment wait complete');
  return true;
}
