require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY missing in .env.local');
    process.exit(1);
  }

  console.log('Testing Resend API authentication...');
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.apiKeys.list();
    if (error) {
      if (error.name === 'restricted_api_key' || error.message?.includes('restricted to only send emails')) {
        console.log('Resend API Connectivity VERIFIED! (API key authenticated - Restricted to Sending Emails)');
        return;
      }
      console.error('Resend API authentication failed:', error);
      process.exit(1);
    } else {
      console.log('Resend API Connectivity VERIFIED! API keys count:', data?.data?.length ?? 0);
    }
  } catch (err) {
    console.error('Resend error:', err.message);
    process.exit(1);
  }
}

testResend();
