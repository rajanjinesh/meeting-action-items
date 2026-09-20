import { createClient } from '@supabase/supabase-js';
import { ActionItem } from './analyzeTranscript';

export interface SavedActionItem {
  id: string;
  action: string;
  owner: string;
  due_date: string;
  created_at: string;
}

/**
 * Returns a server-side Supabase client instance.
 * Prioritizes SUPABASE_SERVICE_ROLE_KEY to execute server-side database insertions with elevated authorization.
 * Falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY if service key is unavailable.
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) {
    throw new Error('Supabase environment variables (URL / KEY) are missing.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Inserts approved action items into Supabase action_items table.
 */
export async function insertApprovedActionItems(actionItems: ActionItem[]): Promise<SavedActionItem[]> {
  if (!actionItems || actionItems.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();

  const rowsToInsert = actionItems.map(item => ({
    action: item.action,
    owner: item.owner || 'unspecified',
    due_date: item.dueDate || 'unspecified'
  }));

  const { data, error } = await supabase
    .from('action_items')
    .insert(rowsToInsert)
    .select();

  if (error) {
    console.error('Failed to insert approved action items into Supabase:', error);
    throw new Error(`Database insert failed: ${error.message}`);
  }

  return (data || []) as SavedActionItem[];
}
