import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);

    const items = await kvStorage.getRecentItems(days);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching recent items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent items' },
      { status: 500 }
    );
  }
}
