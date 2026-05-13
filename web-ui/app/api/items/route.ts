import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';
import { SaveNoteInput, SaveLinkInput } from '@/types';

export async function GET() {
  try {
    const items = await kvStorage.getAllItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'note') {
      if (!data.body || String(data.body).trim() === '') {
        return NextResponse.json(
          {
            error: 'Missing required field "body": the note body text cannot be empty.',
            example: { type: 'note', body: 'My note content here', title: 'Optional title' },
          },
          { status: 400 }
        );
      }
      const result = await kvStorage.saveNote(data as SaveNoteInput);
      return NextResponse.json(result);
    } else if (type === 'link') {
      if (!data.url || String(data.url).trim() === '') {
        return NextResponse.json(
          {
            error: 'Missing required field "url": provide a URL starting with http://, https://, or ftp://.',
            example: { type: 'link', url: 'https://example.com', title: 'Optional title' },
          },
          { status: 400 }
        );
      }
      try {
        new URL(data.url);
      } catch {
        return NextResponse.json(
          {
            error: `Invalid URL format: "${data.url}". URLs must start with a valid protocol — use http://, https://, or ftp://.`,
            example: 'https://example.com',
          },
          { status: 400 }
        );
      }
      const result = await kvStorage.saveLink(data as SaveLinkInput);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          error: `Invalid type: "${type}". Must be "note" or "link".`,
          allowed: ['note', 'link'],
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error saving item:', error);
    const msg = error instanceof Error ? error.message : 'Failed to save item';
    const status = msg.startsWith('Duplicate URL') ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

