import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

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

    const storage = getStorage();
    
    switch (action) {
      case 'delete': {
        // Bulk delete items
        const results = await Promise.all(
          ids.map(async (id: string) => {
            try {
              const success = await storage.deleteItem(id);
              return { id, success };
            } catch (error) {
              return { id, success: false, error: String(error) };
            }
          })
        );
        
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        return NextResponse.json({
          success: true,
          message: `Deleted ${successCount} items${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
          results,
          deletedCount: successCount,
          failedCount,
        });
      }

      case 'addTag': {
        if (!tag || typeof tag !== 'string') {
          return NextResponse.json(
            { error: 'No tag provided for addTag action' },
            { status: 400 }
          );
        }

        const normalizedTag = tag.toLowerCase().trim();
        
        // Add tag to each item
        const results = await Promise.all(
          ids.map(async (id: string) => {
            try {
              const item = await storage.getItem(id);
              if (!item) {
                return { id, success: false, error: 'Item not found' };
              }
              
              // Add tag if not already present
              const existingTags = new Set(item.tags.map(t => t.toLowerCase()));
              if (!existingTags.has(normalizedTag)) {
                const updatedItem = await storage.updateItem(id, {
                  tags: [...item.tags, normalizedTag],
                });
                return { id, success: true, item: updatedItem };
              }
              
              return { id, success: true, item, alreadyHasTag: true };
            } catch (error) {
              return { id, success: false, error: String(error) };
            }
          })
        );
        
        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
          success: true,
          message: `Added tag "${normalizedTag}" to ${successCount} items`,
          results,
          updatedCount: successCount,
        });
      }

      case 'removeTag': {
        if (!tag || typeof tag !== 'string') {
          return NextResponse.json(
            { error: 'No tag provided for removeTag action' },
            { status: 400 }
          );
        }

        const normalizedTag = tag.toLowerCase().trim();
        
        // Remove tag from each item
        const results = await Promise.all(
          ids.map(async (id: string) => {
            try {
              const item = await storage.getItem(id);
              if (!item) {
                return { id, success: false, error: 'Item not found' };
              }
              
              const updatedTags = item.tags.filter(t => t.toLowerCase() !== normalizedTag);
              if (updatedTags.length !== item.tags.length) {
                const updatedItem = await storage.updateItem(id, {
                  tags: updatedTags,
                });
                return { id, success: true, item: updatedItem };
              }
              
              return { id, success: true, item, tagNotFound: true };
            } catch (error) {
              return { id, success: false, error: String(error) };
            }
          })
        );
        
        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
          success: true,
          message: `Removed tag "${normalizedTag}" from ${successCount} items`,
          results,
          updatedCount: successCount,
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

