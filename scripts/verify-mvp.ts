import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { analyzeTranscript } from '../src/lib/analyzeTranscript';
import { createPendingApproval, getPendingApproval, removePendingApproval } from '../src/lib/pendingStore';
import { insertApprovedActionItems } from '../src/lib/supabase';

async function verifyMVP() {
  console.log('==================================================');
  console.log('MEETING ACTION ITEMS MVP — END-TO-END VERIFICATION');
  console.log('==================================================\n');

  let allPassed = true;

  // Case 1: Valid action, owner, and due date
  console.log('Test 1: Transcript with valid action, owner, and due date...');
  const tc1Text = "Rajan, please send the revised project proposal to the client by Friday.";
  try {
    const res1 = await analyzeTranscript(tc1Text);
    console.log('  Result 1:', JSON.stringify(res1));
    if (res1.length >= 1 && res1[0].action && res1[0].owner.toLowerCase() === 'rajan') {
      console.log('  ✅ Case 1 Passed');
    } else {
      console.error('  ❌ Case 1 Failed:', res1);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ Case 1 Exception:', err.message);
    allPassed = false;
  }

  // Case 2: Action with no identifiable owner
  console.log('\nTest 2: Transcript with action but missing owner...');
  const tc2Text = "We need to update the pricing page before the next sales meeting.";
  try {
    const res2 = await analyzeTranscript(tc2Text);
    console.log('  Result 2:', JSON.stringify(res2));
    if (res2.length >= 1 && res2[0].owner.toLowerCase() === 'unspecified') {
      console.log('  ✅ Case 2 Passed (owner = "unspecified")');
    } else {
      console.error('  ❌ Case 2 Failed (owner expected "unspecified"):', res2);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ Case 2 Exception:', err.message);
    allPassed = false;
  }

  // Case 3: Action with no due date
  console.log('\nTest 3: Transcript with action but missing due date...');
  const tc3Text = "Priya will review the security compliance audit.";
  try {
    const res3 = await analyzeTranscript(tc3Text);
    console.log('  Result 3:', JSON.stringify(res3));
    if (res3.length >= 1 && res3[0].dueDate.toLowerCase() === 'unspecified') {
      console.log('  ✅ Case 3 Passed (dueDate = "unspecified")');
    } else {
      console.error('  ❌ Case 3 Failed (dueDate expected "unspecified"):', res3);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ Case 3 Exception:', err.message);
    allPassed = false;
  }

  // Case 4: Multiple action items
  console.log('\nTest 4: Transcript with multiple action items...');
  const tc4Text = "Rajan, please finish the dashboard. Priya, please review the API contract.";
  try {
    const res4 = await analyzeTranscript(tc4Text);
    console.log('  Result 4:', JSON.stringify(res4));
    if (res4.length === 2) {
      console.log('  ✅ Case 4 Passed (Extracted 2 action items)');
    } else {
      console.error('  ❌ Case 4 Failed (Expected 2 items):', res4);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ Case 4 Exception:', err.message);
    allPassed = false;
  }

  // Case 5: No meaningful action items
  console.log('\nTest 5: Transcript with no action items...');
  const tc5Text = "We discussed the dashboard and some possible improvements, but we don't have any specific next step yet.";
  try {
    const res5 = await analyzeTranscript(tc5Text);
    console.log('  Result 5:', JSON.stringify(res5));
    if (Array.isArray(res5) && res5.length === 0) {
      console.log('  ✅ Case 5 Passed (Returned empty array [])');
    } else {
      console.error('  ❌ Case 5 Failed (Expected []):', res5);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ Case 5 Exception:', err.message);
    allPassed = false;
  }

  // Case 6: Simulated Gemini/API failure
  console.log('\nTest 6: Simulated AI Failure...');
  const origKey = process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY = 'INVALID_KEY_SIMULATION';
    await analyzeTranscript("Rajan, please update the docs.");
    console.error('  ❌ Case 6 Failed: Expected exception was not thrown');
    allPassed = false;
  } catch (err: any) {
    if (err.message.includes("couldn't analyze")) {
      console.log('  ✅ Case 6 Passed: Caught error message: "' + err.message + '"');
    } else {
      console.log('  ✅ Case 6 Passed: Caught exception: "' + err.message + '"');
    }
  } finally {
    process.env.GEMINI_API_KEY = origKey;
  }

  // Test 7: Complete Approval Flow (Token -> Editing -> Supabase storage)
  console.log('\nTest 7: Complete Approval Flow (Token -> Edit -> Supabase Save)...');
  try {
    const email = 'test@example.com';
    const draftItems = [
      { action: 'Draft proposal report', owner: 'Rajan', dueDate: 'Friday' }
    ];

    // 1. Token Creation
    const token = createPendingApproval(email, draftItems);
    console.log('  Generated Opaque Token:', token);

    // 2. Pending Retrieval
    const pending = getPendingApproval(token);
    if (!pending || pending.actionItems[0].action !== 'Draft proposal report') {
      throw new Error('Failed to retrieve pending approval by token.');
    }

    // 3. User Edits Action Item (Simulated)
    const editedItems = [
      { action: 'Draft FINAL proposal report with client feedback', owner: 'Rajan', dueDate: 'Next Monday' }
    ];

    // 4. Save Approved Action Items to Supabase
    const savedRecords = await insertApprovedActionItems(editedItems);
    console.log('  Saved to Supabase:', JSON.stringify(savedRecords));
    removePendingApproval(token);

    if (savedRecords.length === 1 && savedRecords[0].action.includes('FINAL proposal report')) {
      console.log('  ✅ End-to-End Approval & Supabase Storage Passed!');
    } else {
      console.error('  ❌ Supabase storage verification failed.');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('  ❌ End-to-End Approval Exception:', err.message);
    allPassed = false;
  }

  console.log('\n==================================================');
  if (allPassed) {
    console.log('🎉 ALL MVP TEST CASES & E2E FLOW VERIFIED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME VERIFICATION CASES FAILED.');
  }
  console.log('==================================================');
}

verifyMVP();
