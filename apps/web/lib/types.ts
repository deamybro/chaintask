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

export interface PollLog {
  id: number;
  bounty_id: string;
  checked_at: number;
  github_status: string;
  action_taken: string;
  tx_hash: string | null;
}

export interface Transaction {
  id: string;
  bounty_id: string;
  from_address: string;
  to_address: string;
  amount_lamports: number;
  type: string;
  tx_hash: string;
  created_at: number;
}
