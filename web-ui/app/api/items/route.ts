import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/items
 * Stateless: enriches the item (fetches title/tags via AI for links) and returns it.
 * The client stores everything in localStorage — no server-side persistence.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'note') {
      if (!data.body || String(data.body).trim() === '') {
        return NextResponse.json(
          { error: 'Missing required field "body".', example: { type: 'note', body: 'My note content' } },
          { status: 400 }
        );
      }
      const item = {
        id: uuidv4(),
        type: 'note' as const,
        title: data.title?.trim() || undefined,
        body: String(data.body).trim(),
        tags: (data.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ item, isDuplicate: false });
    }

    if (type === 'link') {
      if (!data.url || String(data.url).trim() === '') {
        return NextResponse.json(
          { error: 'Missing required field "url".', example: { type: 'link', url: 'https://example.com' } },
          { status: 400 }
        );
      }
      try { new URL(data.url); } catch {
        return NextResponse.json(
          { error: `Invalid URL: "${data.url}". Use http:// or https://.` },
          { status: 400 }
        );
      }

      // Try AI enrichment (title + tags) — fire and forget if it fails
      let title: string | undefined = data.title?.trim() || undefined;
      let tags: string[] = (data.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      let summary: string | undefined;

      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: 'Return JSON with keys: title (string, 2-8 words), summary (string, 1-2 sentences), tags (array of 3-5 lowercase strings).' },
                { role: 'user', content: `Analyze this URL: ${data.url}` },
              ],
              max_tokens: 200,
              temperature: 0.3,
            }),
          });
          if (aiRes.ok) {
            const parsed = JSON.parse((await aiRes.json()).choices[0]?.message?.content || '{}');
            if (!title && parsed.title) title = parsed.title;
            if (parsed.summary) summary = parsed.summary;
            if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
              tags = [...new Set([...tags, ...parsed.tags.map((t: string) => String(t).toLowerCase().trim())])];
            }
          }
        }
      } catch { /* enrichment is best-effort */ }

      const item = {
        id: uuidv4(),
        type: 'link' as const,
        url: String(data.url).trim(),
        title,
        body: data.comment?.trim() || undefined,
        summary,
        tags,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ item, isDuplicate: false });
    }

    return NextResponse.json(
      { error: `Invalid type: "${type}". Must be "note" or "link".` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in /api/items POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

