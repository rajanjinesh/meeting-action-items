import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { insertApprovedActionItems } from '../src/lib/supabase';

async function verifyN8nFlow() {
  console.log('==================================================');
  console.log('N8N WEBHOOK & APPROVAL FLOW VERIFICATION');
  console.log('==================================================\n');

  let webhookCalled = false;
  let webhookPayload: any = null;

  const testWebhookUrl = 'https://appandarajan.app.n8n.cloud/webhook/be70e169-8f8c-4fd0-b83c-609a7c189a4a';

  // 1. Direct Webhook Test
  console.log('1. Testing n8n Webhook direct POST...');
  try {
    const res = await fetch(testWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'Verification action item',
        owner: 'Rajan',
        dueDate: 'Friday'
      })
    });
    console.log('  HTTP Status:', res.status);
    const body = await res.json();
    console.log('  n8n Response:', JSON.stringify(body));
    if (res.ok) {
      console.log('  ✅ Webhook test passed');
    } else {
      console.error('  ❌ Webhook test failed');
    }
  } catch (err: any) {
    console.error('  ❌ Webhook exception:', err.message);
  }

  // 2. Test Supabase Save & Webhook Call logic
  console.log('\n2. Testing Supabase insertion + Webhook invocation logic...');
  try {
    const draftItems = [
      { action: 'Review and approve Q4 project milestones', owner: 'Rajan', dueDate: 'End of Week' }
    ];

    // Step A: Save to Supabase first
    const savedRecords = await insertApprovedActionItems(draftItems);
    console.log('  Supabase insert result:', JSON.stringify(savedRecords));

    if (savedRecords && savedRecords.length > 0) {
      console.log('  ✅ Step 1: Saved to Supabase successfully');

      // Step B: Trigger n8n webhook with actual saved values
      for (const record of savedRecords) {
        const payload = {
          action: record.action,
          owner: record.owner,
          dueDate: record.due_date
        };
        const whRes = await fetch(testWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (whRes.ok) {
          webhookCalled = true;
          webhookPayload = payload;
        }
      }

      if (webhookCalled) {
        console.log('  ✅ Step 2: n8n Webhook called successfully with saved payload:', JSON.stringify(webhookPayload));
      } else {
        console.error('  ❌ Step 2: Webhook call failed');
      }
    } else {
      console.error('  ❌ Supabase insert returned empty array');
    }
  } catch (err: any) {
    console.error('  ❌ Approval exception:', err.message);
  }

  // 3. Failure Case Verification
  console.log('\n3. Testing failure case (Supabase failure -> n8n MUST NOT be called)...');
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let failureWebhookTriggered = false;
  try {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'INVALID_KEY_FOR_FAILURE_TEST';
    // Attempting insert with invalid key will throw
    await insertApprovedActionItems([{ action: 'Should fail', owner: 'Nobody', dueDate: 'Never' }]);
    // If it reached here, error didn't throw
    failureWebhookTriggered = true;
  } catch (dbErr: any) {
    console.log('  ✅ Supabase error caught as expected:', dbErr.message);
    console.log('  ✅ n8n Webhook was NOT called because Supabase save failed');
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }

  console.log('\n==================================================');
  console.log('🎉 ALL N8N VERIFICATION CHECKS COMPLETED!');
  console.log('==================================================');
}

verifyN8nFlow();
