import { NextRequest, NextResponse } from 'next/server';
import { getMiroBoards } from '@/lib/miro-client';

/**
 * GET /api/miro/boards - List all accessible Miro boards
 */
export async function GET(request: NextRequest) {
  try {
    const boards = await getMiroBoards();
    
    return NextResponse.json({
      success: true,
      boards: boards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.description,
      })),
    });
  } catch (error) {
    console.error('Error fetching Miro boards:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch Miro boards',
        hint: 'Make sure MIRO_API_TOKEN is configured in environment variables'
      },
      { status: 500 }
    );
  }
}

