import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const tags = searchParams.get('tags')?.split(',') || undefined;

    const items = await kvStorage.searchItems(query, tags);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}
