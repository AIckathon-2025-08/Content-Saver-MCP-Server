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
      const result = await kvStorage.saveNote(data as SaveNoteInput);
      return NextResponse.json(result);
    } else if (type === 'link') {
      const result = await kvStorage.saveLink(data as SaveLinkInput);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "note" or "link"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error saving item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save item' },
      { status: 500 }
    );
  }
}

