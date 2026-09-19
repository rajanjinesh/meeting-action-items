import { randomUUID } from 'crypto';
import { ActionItem } from './analyzeTranscript';

export interface PendingApproval {
  token: string;
  email: string;
  actionItems: ActionItem[];
  createdAt: number;
}

// Attach store to globalThis to preserve pending approvals across Next.js dev hot-reloads
const globalForPendingStore = globalThis as unknown as {
  pendingApprovalsStore?: Map<string, PendingApproval>;
};

const pendingStore = globalForPendingStore.pendingApprovalsStore || new Map<string, PendingApproval>();
if (process.env.NODE_ENV !== 'production') {
  globalForPendingStore.pendingApprovalsStore = pendingStore;
}

/**
 * Creates an opaque approval token and saves pending action items for user approval.
 */
export function createPendingApproval(email: string, actionItems: ActionItem[]): string {
  const token = randomUUID();
  const pendingApproval: PendingApproval = {
    token,
    email,
    actionItems,
    createdAt: Date.now()
  };

  pendingStore.set(token, pendingApproval);
  return token;
}

/**
 * Retrieves pending approval data by opaque token.
 */
export function getPendingApproval(token: string): PendingApproval | undefined {
  if (!token) return undefined;
  return pendingStore.get(token);
}

/**
 * Deletes pending approval data after user review/approval.
 */
export function removePendingApproval(token: string): boolean {
  if (!token) return false;
  return pendingStore.delete(token);
}
