import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/analyzeTranscript';
import { createPendingApproval } from '@/lib/pendingStore';
import { sendApprovalEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = (formData.get('email') as string || '').trim();
    const file = formData.get('file') as File | null;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Please upload a TXT transcript file.' },
        { status: 400 }
      );
    }

    // Validate TXT file format
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      return NextResponse.json(
        { success: false, error: 'Only TXT transcript files are supported.' },
        { status: 400 }
      );
    }

    const transcriptText = await file.text();

    if (!transcriptText || !transcriptText.trim()) {
      return NextResponse.json({
        success: true,
        status: 'NO_ACTION_ITEMS',
        message: 'No action items found.'
      });
    }

    // Run AI extraction
    let actionItems;
    try {
      actionItems = await analyzeTranscript(transcriptText);
    } catch (analysisError: any) {
      console.error('Transcript analysis error:', analysisError);
      return NextResponse.json({
        success: false,
        status: 'AI_FAILURE',
        error: "We couldn't analyze the transcript. Please try again."
      }, { status: 500 });
    }

    // Rule 6: If no action items exist, return "No action items found."
    if (!actionItems || actionItems.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'NO_ACTION_ITEMS',
        message: 'No action items found.'
      });
    }

    // Action items exist: generate approval token and send email
    const token = createPendingApproval(email, actionItems);
    
    // Determine base URL from incoming request
    const origin = req.nextUrl.origin || 'http://localhost:3000';
    
    const emailResult = await sendApprovalEmail({
      to: email,
      actionItems,
      token,
      baseUrl: origin
    });

    if (!emailResult.success) {
      console.warn('Email sending failed, but approval token generated:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      status: 'SENT_FOR_APPROVAL',
      message: 'Sent for approval',
      token, // Also return token for local dev / testing convenience
      count: actionItems.length
    });
  } catch (err: any) {
    console.error('Unhandled error in /api/analyze:', err);
    return NextResponse.json(
      {
        success: false,
        status: 'AI_FAILURE',
        error: "We couldn't analyze the transcript. Please try again."
      },
      { status: 500 }
    );
  }
}
