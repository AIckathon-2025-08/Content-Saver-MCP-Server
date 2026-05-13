import { NextRequest, NextResponse } from 'next/server';
import { ContentItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIKey, isValidOpenAIKeyFormat } from '@/lib/config';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  let message = '';
  let items: ContentItem[] = [];

  try {
    body = await request.json();
    message = body.message || '';
    items = body.items || [];

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientId = getClientIdentifier(request);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Security: Use validated API key from secure config
    // Client-provided API keys are no longer accepted
    const apiKey = getOpenAIKey();
    const hasValidKey = isValidOpenAIKeyFormat(apiKey);
    
    // Logging (reduced for production security)
    if (process.env.NODE_ENV === 'development') {
      console.log('Chat API called:', {
        messageLength: message.length,
        itemsCount: items.length,
        hasApiKey: hasValidKey,
      });
    }
    
    if (!hasValidKey) {
      // Fallback: Simple rule-based responses
      return NextResponse.json({
        response: generateFallbackResponse(message, items),
      });
    }
    
    console.log('Using OpenAI API with', items.length, 'items');

    // Check if user wants to save something (check first before general chat)
    const saveIntent = detectSaveIntent(message);
    console.log('Save intent detected:', saveIntent);
    if (saveIntent) {
      return await handleSaveIntent(saveIntent, message, items, apiKey);
    }
    
    // Also check if message is just a URL (even without keywords)
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urlMatch = message.match(urlRegex);
    if (urlMatch && message.trim().length < 200) {
      // If message is mostly just a URL, offer to save it
      const urlOnly = message.trim().replace(urlMatch[0], '').trim().length < 10;
      if (urlOnly) {
        return await handleSaveIntent({ type: 'link', url: urlMatch[0] }, message, items, apiKey);
      }
    }

    // Use OpenAI API for analysis and conversation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using GPT-4o for better intelligence (change to 'gpt-4o-mini' for lower cost)
        messages: [
          {
            role: 'system',
            content: `You are an intelligent Content Saver assistant that helps users with their saved content and can also answer general questions. The user has ${items.length} saved items (notes and links).

**PRIMARY TASK: Answer questions about saved content**

When the user asks questions about their saved content:
- **ALWAYS** reference the specific saved items provided below
- Search through the items to find relevant information
- Provide specific examples from their saved content
- Cite which items contain the information you're referencing
- If asking about topics/tags, list the actual items that match
- If asking about a specific topic (e.g., "Georgia"), find and list all items related to that topic

**SECONDARY TASK: Answer general questions**

You can also answer general questions on any topic:
- Provide helpful, accurate information
- Use your knowledge to answer questions
- Be conversational and friendly
- If a question relates to saved content, prioritize referencing saved items

**Your capabilities:**
1. **Answer questions about saved content** - This is your PRIMARY function. Always analyze the saved items and provide specific answers when relevant.
2. **Answer general questions** - You can help with any question, from explanations to advice to general knowledge.
3. **Save new content** - When user mentions URLs or wants to save something, save it automatically
4. **Smart tagging** - Generate relevant tags when saving
5. **Provide insights** - Identify patterns, topics, and connections in saved content

**IMPORTANT:**
- When asked about saved content, ALWAYS search through the items list below
- Provide specific examples and references to actual saved items
- If no items match the query, say so clearly
- Be specific and cite item titles/URLs when relevant
- Quote relevant parts of the content when answering
- If you find multiple relevant items, list them all with details
- For general questions, provide helpful answers using your knowledge

**Example responses:**
- "Do I have anything about Georgia?" → "Yes! I found 2 items about Georgia: 1. '(Untitled)' - https://georgia.travel/destinations-in-georgia with tags: georgia, destinations-in-georgia, and 2. 'Georgia' - Georgia related staff note saved today."
- "What topics do I have?" → Analyze all items, count topics, list most common tags and themes with examples
- "What is machine learning?" → Provide a helpful explanation about machine learning
- "How do I save a link?" → Explain how to save links, and offer to save one if they provide a URL

Be helpful, thorough, and always prioritize saved content when relevant.

**IMPORTANT: After your response, suggest 2-3 relevant follow-up questions the user might want to ask next. Format them as a JSON array at the end of your response, like this:**

[FOLLOW_UP_QUESTIONS]
["Question 1?", "Question 2?", "Question 3?"]
[/FOLLOW_UP_QUESTIONS]

Make the follow-up questions:
- Relevant to the current conversation
- Natural and conversational
- Helpful for continuing the discussion
- Short (one sentence each)`,
          },
          {
            role: 'user',
            content: `Here are ALL the user's saved items (if any):\n\n${formatItemsForContext(items)}\n\n\nUser's question: "${message}"\n\nIMPORTANT: 
- If the question is about saved content, analyze the items above and provide specific answers with citations.
- If the question is general (not about saved content), answer it using your knowledge.
- If the question could relate to saved content, check the items first, then provide a general answer if nothing matches.
- Be helpful and conversational.
- At the end, suggest 2-3 relevant follow-up questions in the format specified.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,  // Increased for more detailed responses
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Extract follow-up questions from the response
    const followUpMatch = assistantMessage.match(/\[FOLLOW_UP_QUESTIONS\]([\s\S]*?)\[\/FOLLOW_UP_QUESTIONS\]/);
    let followUpQuestions: string[] = [];
    let cleanMessage = assistantMessage;

    if (followUpMatch) {
      try {
        // Remove the follow-up questions section from the message
        cleanMessage = assistantMessage.replace(/\[FOLLOW_UP_QUESTIONS\][\s\S]*?\[\/FOLLOW_UP_QUESTIONS\]/, '').trim();
        
        // Parse the JSON array
        const questionsJson = followUpMatch[1].trim();
        followUpQuestions = JSON.parse(questionsJson);
        
        // Ensure it's an array and filter out empty strings
        if (Array.isArray(followUpQuestions)) {
          followUpQuestions = followUpQuestions.filter(q => typeof q === 'string' && q.trim().length > 0);
        } else {
          followUpQuestions = [];
        }
      } catch (e) {
        console.error('Failed to parse follow-up questions:', e);
        followUpQuestions = [];
      }
    }

    return NextResponse.json({
      response: cleanMessage,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    console.error('Error details:', {
      message: error.message,
      itemsCount: items.length,
      hasApiKey: isValidOpenAIKeyFormat(process.env.OPENAI_API_KEY || ''),
    });
    
    // Fallback response - use already parsed values
    return NextResponse.json({
      response: generateFallbackResponse(message, items),
    });
  }
}

/**
 * Build and return a ContentItem — no server-side persistence.
 * The client stores it in localStorage via the itemSaved event.
 */
async function handleSaveIntent(
  intent: { type: 'link' | 'note'; url?: string; content?: string },
  message: string,
  items: ContentItem[],
  apiKey: string
): Promise<NextResponse> {
  try {
    // ── LINK ────────────────────────────────────────────────────────────────
    if (intent.type === 'link' && intent.url) {
      let title: string | undefined;
      let description: string | undefined;
      let tags: string[] = [];

      // AI enrichment (best-effort)
      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'Return ONLY valid JSON with keys: title (string, 2-8 words), description (string, 1-2 sentences), tags (array of 3-5 lowercase strings).',
              },
              { role: 'user', content: `Analyze this URL: ${intent.url}` },
            ],
            max_tokens: 200,
            temperature: 0.3,
          }),
        });

        if (aiRes.ok) {
          const parsed = JSON.parse((await aiRes.json()).choices[0]?.message?.content || '{}');
          title = parsed.title || undefined;
          description = parsed.description || undefined;
          tags = Array.isArray(parsed.tags)
            ? parsed.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
            : [];
        }
      } catch { /* enrichment is best-effort */ }

      // Fallback tags from URL structure
      if (tags.length === 0) {
        try {
          const u = new URL(intent.url);
          const domain = u.hostname.replace('www.', '').split('.')[0];
          if (domain.length > 2) tags.push(domain);
          u.pathname.split('/').filter(p => p.length > 3).slice(0, 2).forEach(p =>
            tags.push(p.replace(/[-_]/g, '-').toLowerCase())
          );
        } catch { /* ignore */ }
      }

      const savedItem: ContentItem = {
        id: uuidv4(),
        type: 'link',
        url: intent.url,
        title,
        body: description,
        tags,
        createdAt: new Date().toISOString(),
      };

      const tagsDisplay = tags.length > 0 ? tags.join(', ') : 'none';
      return NextResponse.json({
        response: `✅ **Saved!**\n\n**${title || '(Untitled)'}**\n${intent.url}\n\n**Description:** ${description || '—'}\n\n**Tags:** ${tagsDisplay}`,
        savedItem,
      });
    }

    // ── NOTE ─────────────────────────────────────────────────────────────────
    if (intent.type === 'note' && intent.content) {
      let tags: string[] = [];
      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Return JSON: {"tags": ["tag1", "tag2", "tag3"]}' },
              { role: 'user', content: `Generate 3-5 tags for: ${intent.content}` },
            ],
            max_tokens: 80,
            temperature: 0.3,
          }),
        });
        if (aiRes.ok) {
          const parsed = JSON.parse((await aiRes.json()).choices[0]?.message?.content || '{}');
          tags = Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean) : [];
        }
      } catch { /* best-effort */ }

      const savedItem: ContentItem = {
        id: uuidv4(),
        type: 'note',
        body: intent.content,
        tags,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        response: `✅ **Note saved!**\n\n${intent.content}\n\n**Tags:** ${tags.join(', ') || 'none'}`,
        savedItem,
      });
    }

    return NextResponse.json({ response: 'Please provide a URL or note content to save.' });
  } catch (error: any) {
    console.error('Error handling save intent:', error);
    return NextResponse.json(
      { response: 'I had trouble saving that. Please try the + Note or + Link buttons instead.' },
      { status: 500 }
    );
  }
}

function detectSaveIntent(message: string): { type: 'link' | 'note'; url?: string; content?: string } | null {
  const lowerMessage = message.toLowerCase();
  
  // Check for URL - be more aggressive in detection
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urlMatch = message.match(urlRegex);
  
  if (urlMatch) {
    // If message is mostly just a URL, save it automatically
    const urlOnly = message.trim() === urlMatch[0].trim();
    // Or if it contains save/read/add/remember keywords
    const hasSaveKeyword = lowerMessage.includes('save') || lowerMessage.includes('read') || 
                          lowerMessage.includes('add') || lowerMessage.includes('remember') ||
                          lowerMessage.includes('store') || lowerMessage.includes('bookmark');
    
    if (urlOnly || hasSaveKeyword) {
      return { type: 'link', url: urlMatch[0] };
    }
  }
  
  // Check for note intent
  if ((lowerMessage.includes('save') || lowerMessage.includes('remember') || lowerMessage.includes('note')) 
      && !urlMatch && message.length > 20) {
    // Extract content after save/remember keywords
    const contentMatch = message.match(/(?:save|remember|note)[:\s]+(.+)/i);
    if (contentMatch) {
      return { type: 'note', content: contentMatch[1].trim() };
    }
  }
  
  return null;
}

function formatItemsForContext(items: ContentItem[]): string {
  if (items.length === 0) {
    return 'No items saved yet.';
  }

  return items.slice(0, 30).map((item, idx) => {
    const type = item.type === 'note' ? '📝 Note' : '🔗 Link';
    const title = item.title || '(Untitled)';
    const content = item.body ? `\n  Content: ${item.body.substring(0, 300)}${item.body.length > 300 ? '...' : ''}` : '';
    const url = item.url ? `\n  URL: ${item.url}` : '';
    const tags = item.tags.length > 0 ? `\n  Tags: ${item.tags.join(', ')}` : '';
    const date = item.createdAt ? `\n  Saved: ${new Date(item.createdAt).toLocaleDateString()}` : '';
    return `${idx + 1}. ${type}: ${title}${content}${url}${tags}${date}`;
  }).join('\n\n');
}

function generateFallbackResponse(message: string, items: ContentItem[]): string {
  const lowerMessage = message.toLowerCase();
  const itemCount = items.length;
  const noteCount = items.filter(i => i.type === 'note').length;
  const linkCount = items.filter(i => i.type === 'link').length;

  // Simple pattern matching for common questions
  if (lowerMessage.includes('how many') || lowerMessage.includes('count')) {
    return `You have ${itemCount} saved items: ${noteCount} notes and ${linkCount} links.`;
  }

  if (lowerMessage.includes('topic') || lowerMessage.includes('theme') || lowerMessage.includes('what')) {
    const allTags = items.flatMap(i => i.tags);
    const uniqueTags = [...new Set(allTags)];
    if (uniqueTags.length > 0) {
      return `Based on your saved content, your main topics/tags are: ${uniqueTags.slice(0, 10).join(', ')}.`;
    }
    return `You have ${itemCount} items saved. To get better insights, try adding tags to your items or configure an OpenAI API key for advanced analysis.`;
  }

  if (lowerMessage.includes('recent') || lowerMessage.includes('latest')) {
    const recent = items.slice(0, 5);
    if (recent.length === 0) {
      return 'You have no saved items yet.';
    }
    return `Your most recent items:\n${recent.map((item, idx) => 
      `${idx + 1}. ${item.type === 'note' ? '📝' : '🔗'} ${item.title || '(Untitled)'}`
    ).join('\n')}`;
  }

  if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
    return `You have ${itemCount} saved items (${noteCount} notes, ${linkCount} links). To get detailed summaries, please configure an OpenAI API key in your environment variables (OPENAI_API_KEY).`;
  }

  // Default response
  return `I can help you analyze your ${itemCount} saved items! Try asking:
- "How many items do I have?"
- "What topics are in my saved content?"
- "Show me recent items"
- "Summarize my notes"

For advanced AI analysis, configure OPENAI_API_KEY in your environment variables.`;
}
