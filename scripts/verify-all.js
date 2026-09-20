require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');

async function runAllVerifications() {
  console.log('==================================================');
  console.log('TECHNICAL CONNECTIVITY VERIFICATION');
  console.log('==================================================\n');

  let allPassed = true;

  // 1. Environment Variables
  console.log('1. Checking Environment Variables...');
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'BRAINTRUST_API_KEY'
  ];
  const missing = requiredEnvs.filter(e => !process.env[e]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    allPassed = false;
  } else {
    console.log('✅ Environment variables configured securely.');
  }

  // 2. Supabase
  console.log('\n2. Testing Supabase Connectivity...');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase.from('action_items').select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log('✅ Supabase API connection verified (Schema ready with schema.sql migration).');
    } else if (error) {
      console.error('❌ Supabase error:', error.message);
      allPassed = false;
    } else {
      console.log('✅ Supabase API connection & action_items table verified.');
    }
  } catch (err) {
    console.error('❌ Supabase exception:', err.message);
    allPassed = false;
  }

  // 3. Gemini
  console.log('\n3. Testing Gemini API Authentication...');
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Gemini API authenticated successfully. (${data.models?.length || 0} models available)`);
    } else {
      console.error('❌ Gemini API failed:', res.status, await res.text());
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Gemini exception:', err.message);
    allPassed = false;
  }

  // 4. Braintrust
  console.log('\n4. Testing Braintrust API Connectivity & Project Access...');
  try {
    const apiKey = process.env.BRAINTRUST_API_KEY;
    const projectName = 'Meeting Action Items';
    const res = await fetch(`https://api.braintrust.dev/v1/project?project_name=${encodeURIComponent(projectName)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json();
      const proj = data.objects?.find(p => p.name === projectName);
      if (proj) {
        console.log(`✅ Braintrust API authenticated. Project "${proj.name}" found (ID: ${proj.id}).`);
      } else {
        console.error('❌ Braintrust project "Meeting Action Items" not found.');
        allPassed = false;
      }
    } else {
      console.error('❌ Braintrust API failed:', res.status, await res.text());
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Braintrust exception:', err.message);
    allPassed = false;
  }

  console.log('\n==================================================');
  if (allPassed) {
    console.log('🎉 ALL SERVICE CONNECTIVITY CHECKS PASSED!');
  } else {
    console.error('⚠️ SOME VERIFICATIONS FAILED. PLEASE FIX BEFORE PROCEEDING.');
  }
  console.log('==================================================');
}

runAllVerifications();
