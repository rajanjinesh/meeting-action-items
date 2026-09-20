import { NextRequest, NextResponse } from 'next/server';
import { insertApprovedActionItems } from '@/lib/supabase';
import { ActionItem } from '@/lib/analyzeTranscript';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionItems } = body as { actionItems: ActionItem[] };

    if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one action item must be provided for approval.' },
        { status: 400 }
      );
    }

    // Insert approved action items into Supabase action_items table
    const savedRecords = await insertApprovedActionItems(actionItems);

    return NextResponse.json({
      success: true,
      message: 'Approved and saved',
      savedCount: savedRecords.length,
      savedRecords
    });
  } catch (err: any) {
    console.error('Error saving approved action items:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save approved action items.' },
      { status: 500 }
    );
  }
}
