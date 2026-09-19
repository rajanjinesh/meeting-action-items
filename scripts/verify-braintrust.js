require('dotenv').config({ path: '.env.local' });
const { initLogger } = require('braintrust');

async function testBraintrust() {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.error('BRAINTRUST_API_KEY missing in .env.local');
    process.exit(1);
  }

  console.log('Testing Braintrust API authentication & project access...');
  const projectName = 'Meeting Action Items';
  const datasetName = 'Meeting Action Items Eval';

  try {
    // 1. Verify REST API connection & fetch project info
    const res = await fetch(`https://api.braintrust.dev/v1/project?project_name=${encodeURIComponent(projectName)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Braintrust API auth/project fetch failed:', res.status, errText);
      process.exit(1);
    }

    const data = await res.json();
    console.log('Braintrust API authentication VERIFIED!');
    console.log('Projects retrieved:', data.objects?.length || 0);

    const project = data.objects?.find(p => p.name === projectName);
    if (project) {
      console.log(`Found Braintrust Project: "${project.name}" (ID: ${project.id})`);
      
      // Fetch datasets for project
      const dsRes = await fetch(`https://api.braintrust.dev/v1/dataset?project_id=${project.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (dsRes.ok) {
        const dsData = await dsRes.json();
        const ds = dsData.objects?.find(d => d.name === datasetName);
        if (ds) {
          console.log(`Found Braintrust Dataset: "${ds.name}" (ID: ${ds.id})`);
        } else {
          console.log('Datasets in project:', dsData.objects?.map(d => d.name));
        }
      }
    } else {
      console.log('All available Braintrust projects:', data.objects?.map(p => p.name));
    }
  } catch (err) {
    console.error('Braintrust error:', err.message);
    process.exit(1);
  }
}

testBraintrust();
