import { GoogleGenAI, Type } from '@google/genai';

export interface ActionItem {
  action: string;
  owner: string;
  dueDate: string;
}

/**
 * Framework-independent core application logic function.
 * Analyzes a raw meeting transcript using Gemini API and extracts structured ActionItem[].
 *
 * Rules:
 * - Action is required for every item.
 * - If owner is not identifiable: owner = "unspecified"
 * - If due date is not mentioned: dueDate = "unspecified"
 * - Do not invent information.
 * - If no meaningful action items exist: return []
 */
export async function analyzeTranscript(transcriptText: string): Promise<ActionItem[]> {
  if (!transcriptText || !transcriptText.trim()) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert AI meeting assistant.
Analyze the following meeting transcript and extract all clear, actionable meeting action items.

STRICT EXTRACTION RULES:
1. "action": Required concise description of the task to be done. NEVER set "action" to "unspecified".
2. "owner": The name of the specific person assigned to complete the action. If no person is explicitly assigned or identifiable, set "owner" to "unspecified".
3. "dueDate": The deadline or date by which the action should be completed. If no deadline or due date is mentioned, set "dueDate" to "unspecified".
4. Do NOT invent, assume, or fabricate any actions, owners, or due dates that are not explicitly present in the transcript.
5. If the transcript contains no clear or meaningful action items, return an empty array [].

TRANSCRIPT TO ANALYZE:
"""
${transcriptText}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Extracted list of meeting action items',
          items: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description: 'The specific required action item text.'
              },
              owner: {
                type: Type.STRING,
                description: 'Person responsible for the action item, or "unspecified" if unknown.'
              },
              dueDate: {
                type: Type.STRING,
                description: 'Deadline or due date for the action item, or "unspecified" if unmentioned.'
              }
            },
            required: ['action', 'owner', 'dueDate']
          }
        }
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      return [];
    }

    const items = JSON.parse(responseText) as ActionItem[];
    if (!Array.isArray(items)) {
      return [];
    }

    // Filter and sanitize items according to rules
    const sanitizedItems: ActionItem[] = [];
    for (const item of items) {
      if (!item || typeof item.action !== 'string') continue;
      
      const cleanAction = item.action.trim();
      // Rule: Do NOT create an item with action = "unspecified" or empty
      if (!cleanAction || cleanAction.toLowerCase() === 'unspecified') {
        continue;
      }

      const cleanOwner = (typeof item.owner === 'string' && item.owner.trim())
        ? item.owner.trim()
        : 'unspecified';

      const cleanDueDate = (typeof item.dueDate === 'string' && item.dueDate.trim())
        ? item.dueDate.trim()
        : 'unspecified';

      sanitizedItems.push({
        action: cleanAction,
        owner: cleanOwner,
        dueDate: cleanDueDate
      });
    }

    return sanitizedItems;
  } catch (err) {
    console.error('Error in analyzeTranscript Gemini call:', err);
    throw new Error("We couldn't analyze the transcript. Please try again.");
  }
}
