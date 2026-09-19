require('dotenv').config({ path: '.env.local' });
const { initDataset } = require('braintrust');

async function setupDataset() {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.error('BRAINTRUST_API_KEY missing');
    process.exit(1);
  }

  console.log('Populating Braintrust Dataset "Meeting Action Items Eval"...');

  const dataset = initDataset('Meeting Action Items', {
    dataset: 'Meeting Action Items Eval',
    apiKey
  });

  const testCases = [
    {
      id: 'tc-1-happy-path',
      input: "Rajan, please send the revised project proposal to the client by Friday.",
      expected: [
        {
          action: "Send the revised project proposal to the client",
          owner: "Rajan",
          dueDate: "Friday"
        }
      ],
      metadata: { name: 'Happy Path', id: 'TC01' }
    },
    {
      id: 'tc-2-missing-owner',
      input: "We need to update the pricing page before the next sales meeting.",
      expected: [
        {
          action: "Update the pricing page",
          owner: "unspecified",
          dueDate: "before the next sales meeting"
        }
      ],
      metadata: { name: 'Missing Owner', id: 'TC02' }
    },
    {
      id: 'tc-3-multiple-actions',
      input: "Rajan, please finish the dashboard. Priya, please review the API contract.",
      expected: [
        {
          action: "Finish the dashboard",
          owner: "Rajan",
          dueDate: "unspecified"
        },
        {
          action: "Review the API contract",
          owner: "Priya",
          dueDate: "unspecified"
        }
      ],
      metadata: { name: 'Multiple Actions', id: 'TC03' }
    },
    {
      id: 'tc-4-no-action',
      input: "We discussed the dashboard and some possible improvements, but we don't have any specific next step yet.",
      expected: [],
      metadata: { name: 'No Action', id: 'TC04' }
    }
  ];

  for (const tc of testCases) {
    dataset.insert({
      id: tc.id,
      input: tc.input,
      expected: tc.expected,
      metadata: tc.metadata
    });
  }

  await dataset.flush();
  console.log('✅ Successfully inserted 4 dataset test cases into Braintrust Dataset!');
}

setupDataset();
