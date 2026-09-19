require('dotenv').config({ path: '.env.local' });

async function fetchExperiment() {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  const expId = 'rajanjinesh@gmail.com-1789837322';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  console.log('Fetching recorded Braintrust Experiment details...\n');

  // 1. Fetch Project
  const projRes = await fetch('https://api.braintrust.dev/v1/project?project_name=Meeting%20Action%20Items', { headers });
  const projData = await projRes.json();
  const project = projData.objects?.[0];

  // 2. Fetch Experiments
  const expRes = await fetch(`https://api.braintrust.dev/v1/experiment?project_id=${project.id}`, { headers });
  const expData = await expRes.json();
  console.log('Recorded Experiments in Braintrust:');
  expData.objects?.forEach(e => {
    console.log(`- Name: "${e.name}" | ID: ${e.id} | Created: ${e.created}`);
  });

  const latestExp = expData.objects?.[0];
  if (latestExp) {
    // 3. Fetch Experiment Events/Records
    const fetchRes = await fetch(`https://api.braintrust.dev/v1/experiment/${latestExp.id}/fetch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit: 50 })
    });
    const fetchEvents = await fetchRes.json();
    console.log(`\nDetailed Results for Experiment "${latestExp.name}":`);
    console.log(`Total Events / Test Cases: ${fetchEvents.events?.length || 0}\n`);

    fetchEvents.events?.forEach((evt, idx) => {
      console.log(`Test Case ${idx + 1} (${evt.metadata?.id || evt.metadata?.name || 'Item'}):`);
      console.log(`  Input: ${JSON.stringify(evt.input)}`);
      console.log(`  Expected: ${JSON.stringify(evt.expected)}`);
      console.log(`  Actual AI Output: ${JSON.stringify(evt.output)}`);
      console.log(`  Scores: ${JSON.stringify(evt.scores)}`);
      console.log(`  Status: ${evt.scores?.['Action Item Quality'] === 1 ? 'PASS (1.0)' : 'FAIL (0.0)'}\n`);
    });
  }
}

fetchExperiment();
