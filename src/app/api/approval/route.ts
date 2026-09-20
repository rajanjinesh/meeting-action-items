import { NextRequest, NextResponse } from 'next/server';
import { insertApprovedActionItems } from '@/lib/supabase';
import { ActionItem } from '@/lib/analyzeTranscript';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://appandarajan.app.n8n.cloud/webhook/be70e169-8f8c-4fd0-b83c-609a7c189a4a';

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

    // 1. Insert approved action items into Supabase action_items table FIRST
    const savedRecords = await insertApprovedActionItems(actionItems);

    // 2. Only AFTER Supabase save succeeds, trigger the n8n Production Webhook via HTTP POST
    for (const record of savedRecords) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: record.action,
            owner: record.owner,
            dueDate: record.due_date
          })
        });
      } catch (webhookErr) {
        console.error('Failed to trigger n8n webhook for action item:', webhookErr);
      }
    }

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

