// RIALO STATE MODEL
//
// On Rialo this account data lives in Solana-VM accounts controlled by the
// bounty escrow program. The same fields are mirrored in SQLite during local
// simulation so the API can be replaced by contract account reads later.

use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum BountyStatus {
    Open,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone)]
pub struct BountyAccount {
    pub creator: Pubkey,
    pub assignee: Option<Pubkey>,
    pub repo_owner: String,
    pub repo_name: String,
    pub issue_number: u64,
    pub linked_pr_number: Option<u64>,
    pub amount_lamports: u64,
    pub status: BountyStatus,
    pub created_at: i64,
    pub completed_at: Option<i64>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone)]
pub struct CreateBountyArgs {
    pub repo_owner: String,
    pub repo_name: String,
    pub issue_number: u64,
    pub amount_lamports: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone)]
pub struct ClaimBountyArgs {
    pub linked_pr_number: u64,
}
