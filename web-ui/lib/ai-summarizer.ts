/**
 * KAN-10: AI-generated summaries for saved links
 * 
 * Uses OpenAI GPT-4o-mini for cost-effective summarization
 */

import OpenAI from 'openai';

/**
 * Generate a 2-3 sentence summary of a webpage
 */
export async function generateSummary(
  url: string,
  title?: string,
  pageContent?: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('OpenAI API key not configured, skipping summary generation');
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Build context for summarization
    let context = `URL: ${url}`;
    if (title) {
      context += `\nTitle: ${title}`;
    }
    if (pageContent) {
      // Limit content to avoid token limits
      const truncatedContent = pageContent.substring(0, 3000);
      context += `\nPage Content: ${truncatedContent}`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates brief summaries of webpages.
Generate a 2-3 sentence summary that captures the main topic and key points.
Be concise and informative. If you can't determine the content, provide a brief description based on the URL and title.`
        },
        {
          role: 'user',
          content: `Please summarize this webpage:\n\n${context}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    const summary = response.choices[0]?.message?.content?.trim();
    
    if (summary) {
      console.log(`✅ Generated summary for ${url}`);
      return summary;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating summary:', error);
    return null;
  }
}

/**
 * Fetch page content for summarization
 */
export async function fetchPageContent(url: string): Promise<{ title?: string; content?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentSaver/1.0)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return {};
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract text content (simplified - remove scripts, styles, and HTML tags)
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length
    content = content.substring(0, 5000);

    return { title, content };
  } catch (error) {
    console.error('Error fetching page content:', error);
    return {};
  }
}

/**
 * Generate summary for a URL (fetches content and summarizes)
 * Returns both the summary and the fetched title
 */
export async function summarizeUrl(
  url: string, 
  existingTitle?: string
): Promise<{ summary: string | null; title: string | null }> {
  const { title: fetchedTitle, content } = await fetchPageContent(url);
  const titleToUse = existingTitle || fetchedTitle;
  const summary = await generateSummary(url, titleToUse, content);
  return { 
    summary, 
    title: fetchedTitle || null  // Return fetched title so caller can use it
  };
}

