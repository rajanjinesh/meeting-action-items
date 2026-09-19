import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Eval } from 'braintrust';
import { analyzeTranscript, ActionItem } from './src/lib/analyzeTranscript';

/**
 * Custom LLM / Output Scorer: Action Item Quality
 * Evaluates extracted ActionItem[] output against expected ActionItem[]
 * Binary scoring: PASS = 1, FAIL = 0
 */
export const actionItemQualityScorer = ({
  output,
  expected
}: {
  output: ActionItem[];
  expected: ActionItem[];
}) => {
  const name = 'Action Item Quality';

  // Rule: Empty transcript expected []
  if ((!expected || expected.length === 0) && (!output || output.length === 0)) {
    return { name, score: 1 };
  }

  if (!expected || !output || expected.length !== output.length) {
    return { name, score: 0 };
  }

  // Compare each expected item against actual output
  for (let i = 0; i < expected.length; i++) {
    const expItem = expected[i];
    const actItem = output[i];

    if (!actItem) return { name, score: 0 };

    // 1. Action check (case insensitive substring / intent match)
    const expAct = expItem.action.toLowerCase().trim();
    const actAct = actItem.action.toLowerCase().trim();
    if (!actAct.includes(expAct) && !expAct.includes(actAct)) {
      return { name, score: 0 };
    }

    // 2. Owner check
    const expOwner = expItem.owner.toLowerCase().trim();
    const actOwner = actItem.owner.toLowerCase().trim();
    if (expOwner !== actOwner) {
      return { name, score: 0 };
    }

    // 3. Due Date check
    const expDue = expItem.dueDate.toLowerCase().trim();
    const actDue = actItem.dueDate.toLowerCase().trim();
    if (expDue !== actDue && !actDue.includes(expDue) && !expDue.includes(actDue)) {
      return { name, score: 0 };
    }
  }

  return { name, score: 1 };
};

Eval('Meeting Action Items', {
  data: () => [
    {
      input: "Rajan, please send the revised project proposal to the client by Friday.",
      expected: [
        {
          action: "Send the revised project proposal to the client",
          owner: "Rajan",
          dueDate: "Friday"
        }
      ],
      metadata: { name: "Happy Path", id: "TC01" }
    },
    {
      input: "We need to update the pricing page before the next sales meeting.",
      expected: [
        {
          action: "Update the pricing page",
          owner: "unspecified",
          dueDate: "before the next sales meeting"
        }
      ],
      metadata: { name: "Missing Owner", id: "TC02" }
    },
    {
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
      metadata: { name: "Multiple Actions", id: "TC03" }
    },
    {
      input: "We discussed the dashboard and some possible improvements, but we don't have any specific next step yet.",
      expected: [],
      metadata: { name: "No Action", id: "TC04" }
    }
  ],
  task: async (input: string) => {
    return await analyzeTranscript(input);
  },
  scores: [actionItemQualityScorer]
});
