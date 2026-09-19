import { NextRequest, NextResponse } from 'next/server';
import { getPendingApproval, removePendingApproval } from '@/lib/pendingStore';
import { insertApprovedActionItems } from '@/lib/supabase';
import { ActionItem } from '@/lib/analyzeTranscript';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Approval token is required.' },
      { status: 400 }
    );
  }

  const pending = getPendingApproval(token);
  if (!pending) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired approval token.' },
      { status: 444 }
    );
  }

  return NextResponse.json({
    success: true,
    pendingApproval: {
      email: pending.email,
      actionItems: pending.actionItems
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, actionItems } = body as { token: string; actionItems: ActionItem[] };

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Approval token is required.' },
        { status: 400 }
      );
    }

    const pending = getPendingApproval(token);
    if (!pending) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired approval token.' },
        { status: 404 }
      );
    }

    if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one action item must be provided for approval.' },
        { status: 400 }
      );
    }

    // Rule 11: Store approved action items in Supabase action_items table
    const savedRecords = await insertApprovedActionItems(actionItems);

    // Remove pending approval token after successful save
    removePendingApproval(token);

    return NextResponse.json({
      success: true,
      message: 'Action items approved and saved.',
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
