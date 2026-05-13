/**
 * Feedback to Jira Transformer
 * 
 * Uses AI to transform Miro feedback into structured Jira tickets
 */

import OpenAI from 'openai';
import { FeedbackItem } from './miro-client';

interface JiraTicketData {
  summary: string;
  description: string;
  issueType: 'Story' | 'Bug' | 'Task' | 'Improvement';
  labels: string[];
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  acceptanceCriteria?: string[];
}

interface TransformResult {
  success: boolean;
  ticket?: JiraTicketData;
  jiraKey?: string;
  error?: string;
  originalFeedback: FeedbackItem;
}

function getConfig() {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    JIRA_BASE_URL: process.env.JIRA_BASE_URL || 'https://agorozia1.atlassian.net',
    JIRA_EMAIL: process.env.JIRA_EMAIL || '',
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN || '',
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || 'KAN',
  };
}

/**
 * Use AI to transform feedback text into structured Jira ticket data
 */
export async function transformFeedbackToTicket(
  feedback: FeedbackItem
): Promise<JiraTicketData> {
  const config = getConfig();
  
  if (!config.OPENAI_API_KEY) {
    // Fallback: create basic ticket without AI
    return {
      summary: feedback.content.substring(0, 100),
      description: `User Feedback from Miro:\n\n${feedback.content}\n\n---\nSource: ${feedback.type}\nAuthor: ${feedback.author || 'Unknown'}`,
      issueType: 'Task',
      labels: ['user-feedback', 'miro'],
      priority: 'Medium',
    };
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a product manager assistant that transforms user feedback into well-structured Jira tickets.

Analyze the feedback and return a JSON object with:
- summary: A clear, concise title (max 80 chars)
- description: Detailed description in Jira format with user story format "As a user, I want... so that..."
- issueType: One of "Story", "Bug", "Task", "Improvement" based on the feedback nature
- labels: Array of relevant labels (always include "user-feedback", "miro")
- priority: One of "Highest", "High", "Medium", "Low", "Lowest"
- acceptanceCriteria: Array of acceptance criteria if applicable

Return ONLY valid JSON, no markdown or explanation.`
      },
      {
        role: 'user',
        content: `Transform this feedback into a Jira ticket:

Feedback: "${feedback.content}"
Type: ${feedback.type}
Color: ${feedback.color || 'none'}
Author: ${feedback.author || 'Unknown'}`
      }
    ],
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  try {
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    return {
      summary: parsed.summary || feedback.content.substring(0, 100),
      description: parsed.description || feedback.content,
      issueType: parsed.issueType || 'Task',
      labels: parsed.labels || ['user-feedback', 'miro'],
      priority: parsed.priority || 'Medium',
      acceptanceCriteria: parsed.acceptanceCriteria,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      summary: feedback.content.substring(0, 100),
      description: feedback.content,
      issueType: 'Task',
      labels: ['user-feedback', 'miro'],
      priority: 'Medium',
    };
  }
}

/**
 * Create a Jira ticket from ticket data
 */
export async function createJiraTicket(ticketData: JiraTicketData): Promise<string> {
  const config = getConfig();
  
  if (!config.JIRA_API_TOKEN || !config.JIRA_EMAIL) {
    throw new Error('Jira credentials not configured');
  }

  const auth = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');

  // Build description with acceptance criteria
  let description = ticketData.description;
  if (ticketData.acceptanceCriteria && ticketData.acceptanceCriteria.length > 0) {
    description += '\n\n*Acceptance Criteria:*\n';
    ticketData.acceptanceCriteria.forEach(ac => {
      description += `* ${ac}\n`;
    });
  }

  // Map issue type to Jira issue type ID (these may vary by project)
  const issueTypeMap: Record<string, string> = {
    'Story': 'Story',
    'Bug': 'Bug',
    'Task': 'Task',
    'Improvement': 'Improvement',
  };

  const body = {
    fields: {
      project: {
        key: config.JIRA_PROJECT_KEY,
      },
      summary: ticketData.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: {
        name: issueTypeMap[ticketData.issueType] || 'Task',
      },
      labels: ticketData.labels,
      priority: {
        name: ticketData.priority,
      },
    },
  };

  const response = await fetch(`${config.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Jira ticket: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.key;
}

/**
 * Transform and create Jira ticket from a single feedback item
 */
export async function processFeedbackItem(feedback: FeedbackItem): Promise<TransformResult> {
  try {
    const ticketData = await transformFeedbackToTicket(feedback);
    const jiraKey = await createJiraTicket(ticketData);
    
    return {
      success: true,
      ticket: ticketData,
      jiraKey,
      originalFeedback: feedback,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalFeedback: feedback,
    };
  }
}

/**
 * Process multiple feedback items into Jira tickets
 */
export async function processFeedbackBatch(
  feedbackItems: FeedbackItem[],
  options?: {
    skipDuplicates?: boolean;
    maxItems?: number;
  }
): Promise<TransformResult[]> {
  const items = options?.maxItems 
    ? feedbackItems.slice(0, options.maxItems) 
    : feedbackItems;

  const results: TransformResult[] = [];

  for (const feedback of items) {
    console.log(`Processing feedback: "${feedback.content.substring(0, 50)}..."`);
    const result = await processFeedbackItem(feedback);
    results.push(result);
    
    // Small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

