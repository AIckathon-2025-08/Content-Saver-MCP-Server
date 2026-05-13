import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await kvStorage.getItemById(params.id);
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, body: itemBody, url, tags, isPinned } = body;

    if (url !== undefined && url.trim() !== '') {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          {
            error: `Invalid URL format: "${url}". URLs must start with a valid protocol — use http://, https://, or ftp://.`,
            example: 'https://example.com',
          },
          { status: 400 }
        );
      }
    }

    const result = await kvStorage.updateItem(params.id, {
      title,
      body: itemBody,
      url,
      tags,
      isPinned,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update item';

    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
