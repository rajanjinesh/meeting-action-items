require('dotenv').config({ path: '.env.local' });

async function inspectBraintrust() {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.error('BRAINTRUST_API_KEY missing');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // 1. Fetch Project
  const projRes = await fetch('https://api.braintrust.dev/v1/project?project_name=Meeting%20Action%20Items', { headers });
  const projData = await projRes.json();
  const project = projData.objects?.[0];
  console.log('Project:', project?.name, 'ID:', project?.id);

  if (!project) return;

  // 2. Fetch Datasets
  const dsRes = await fetch(`https://api.braintrust.dev/v1/dataset?project_id=${project.id}`, { headers });
  const dsData = await dsRes.json();
  console.log('Datasets:', dsData.objects?.map(d => ({ name: d.name, id: d.id })));
  const dataset = dsData.objects?.find(d => d.name === 'Meeting Action Items Eval');

  if (dataset) {
    // Fetch dataset rows (fetch data records)
    const recordsRes = await fetch(`https://api.braintrust.dev/v1/dataset/${dataset.id}/fetch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit: 50 })
    });
    const recordsData = await recordsRes.json();
    console.log('\nDataset Rows Count:', recordsData.events?.length || 0);
    recordsData.events?.forEach((r, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log('  Input:', JSON.stringify(r.input));
      console.log('  Expected:', JSON.stringify(r.expected));
      console.log('  Metadata:', JSON.stringify(r.metadata));
    });
  }

  // 3. Fetch Scorers / Functions in project
  const funcRes = await fetch(`https://api.braintrust.dev/v1/function?project_id=${project.id}`, { headers });
  if (funcRes.ok) {
    const funcData = await funcRes.json();
    console.log('\nFunctions/Scorers in Project:', funcData.objects?.map(f => ({ name: f.name, id: f.id, type: f.function_type })));
  }
}

inspectBraintrust();
