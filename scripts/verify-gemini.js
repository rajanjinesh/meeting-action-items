require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing in .env.local');
    process.exit(1);
  }

  console.log('Testing Gemini API authentication...');
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Verify connectivity by listing models or retrieving model metadata
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Gemini API Connectivity VERIFIED! Available models count:', data.models?.length || 0);
    } else {
      const errText = await response.text();
      console.error('Gemini API authentication failed:', response.status, errText);
      process.exit(1);
    }
  } catch (err) {
    console.error('Gemini error:', err.message);
    process.exit(1);
  }
}

testGemini();
