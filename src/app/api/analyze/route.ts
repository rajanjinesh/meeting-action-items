import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/analyzeTranscript';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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

    // If no action items exist, return "No action items found."
    if (!actionItems || actionItems.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'NO_ACTION_ITEMS',
        message: 'No action items found.'
      });
    }

    // Action items exist: return extracted action items directly for Review & Edit
    return NextResponse.json({
      success: true,
      status: 'ACTION_ITEMS_EXTRACTED',
      actionItems
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
