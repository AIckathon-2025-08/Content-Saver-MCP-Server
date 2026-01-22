import { NextRequest, NextResponse } from 'next/server';
import * as kvStorage from '@/lib/kv-storage';

// POST /api/items/bulk - Bulk operations on items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, tag } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No item IDs provided' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'delete': {
        const result = await kvStorage.bulkDeleteItems(ids);
        return NextResponse.json({
          success: true,
          message: `Deleted ${result.deletedCount} items`,
          deletedCount: result.deletedCount,
        });
      }

      case 'addTag': {
        if (!tag || typeof tag !== 'string') {
          return NextResponse.json(
            { error: 'No tag provided for addTag action' },
            { status: 400 }
          );
        }

        const result = await kvStorage.bulkAddTag(ids, tag);
        return NextResponse.json({
          success: true,
          message: `Added tag "${tag}" to ${result.updatedCount} items`,
          updatedCount: result.updatedCount,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
