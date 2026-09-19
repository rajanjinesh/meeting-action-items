import { Resend } from 'resend';
import { ActionItem } from './analyzeTranscript';

export interface SendApprovalEmailParams {
  to: string;
  actionItems: ActionItem[];
  token: string;
  baseUrl: string;
}

/**
 * Sends a review & approval email to the user using Resend.
 */
export async function sendApprovalEmail({
  to,
  actionItems,
  token,
  baseUrl
}: SendApprovalEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY environment variable is missing.' };
  }

  const reviewUrl = `${baseUrl}/review?token=${token}`;
  const resend = new Resend(apiKey);

  const actionItemsHtml = actionItems
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; font-weight: bold;">${idx + 1}. ${escapeHtml(item.action)}</td>
        <td style="padding: 10px;">${escapeHtml(item.owner)}</td>
        <td style="padding: 10px;">${escapeHtml(item.dueDate)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting Action Items Approval</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; color: #111827;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Meeting Action Items Generated</h2>
          <p>We analyzed your meeting transcript and extracted <strong>${actionItems.length}</strong> action item(s) requiring your review and approval.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Action</th>
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Owner</th>
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${actionItemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${reviewUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Review & Approve</a>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
            If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${reviewUrl}" style="color: #2563eb;">${reviewUrl}</a>
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: 'Meeting Action Items <onboarding@resend.dev>',
      to: [to],
      subject: 'Review & Approve Meeting Action Items',
      html
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in sendApprovalEmail:', err);
    return { success: false, error: err.message || 'Failed to send approval email.' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
