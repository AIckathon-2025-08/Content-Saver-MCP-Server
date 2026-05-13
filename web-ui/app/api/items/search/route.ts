import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;

    if (dateFrom !== undefined) {
      const d = new Date(dateFrom);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          {
            error: `Invalid date for "dateFrom": "${dateFrom}". Use ISO 8601 format: YYYY-MM-DD (e.g. 2024-01-15).`,
          },
          { status: 400 }
        );
      }
    }

    if (dateTo !== undefined) {
      const d = new Date(dateTo);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          {
            error: `Invalid date for "dateTo": "${dateTo}". Use ISO 8601 format: YYYY-MM-DD (e.g. 2024-01-15).`,
          },
          { status: 400 }
        );
      }
    }

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
