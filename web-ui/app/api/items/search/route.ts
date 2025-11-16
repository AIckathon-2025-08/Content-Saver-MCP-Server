import { NextRequest, NextResponse } from 'next/server';
import { searchItems } from '@/lib/mcp-client';
import { SearchFilters } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: SearchFilters = {
      query: searchParams.get('query') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const items = await searchItems(filters);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}

