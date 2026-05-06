export type BountyStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  wallet_address: string;
  balance_lamports: number;
  created_at: number;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  repo_owner: string;
  repo_name: string;
  issue_number: number;
  amount_lamports: number;
  currency: string;
  status: BountyStatus;
  creator_id: string;
  assignee_id: string | null;
  linked_pr_number: number | null;
  contract_address: string | null;
  tx_hash: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface ApiErrorBody {
  error: string;
  rialo_context: string;
}
