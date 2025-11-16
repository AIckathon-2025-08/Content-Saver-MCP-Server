import { NextRequest, NextResponse } from 'next/server';
import { getRecentItems } from '@/lib/mcp-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const items = await getRecentItems(days, limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching recent items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent items' },
      { status: 500 }
    );
  }
}

