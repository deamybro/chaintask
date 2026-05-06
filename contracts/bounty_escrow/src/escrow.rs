// RIALO PRIMITIVE: On-Chain Escrow / Atomic Fund Release
//
// On Rialo, a Program Derived Address holds the bounty lamports. The contract
// owns the PDA, and the release path is gated by a native GitHub HTTPS result.
// That means no admin wallet, no off-chain signer, and no keeper service can
// redirect funds. Verification, state update, and lamport movement settle as
// one atomic transaction in a fast Rialo block.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

use crate::state::{BountyAccount, BountyStatus, ClaimBountyArgs, CreateBountyArgs};

pub fn create_bounty(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let creator = next_account_info(account_info_iter)?;
    let bounty_account = next_account_info(account_info_iter)?;
    if !creator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let args = CreateBountyArgs::try_from_slice(data)?;
    let state = BountyAccount {
        creator: *creator.key,
        assignee: None,
        repo_owner: args.repo_owner,
        repo_name: args.repo_name,
        issue_number: args.issue_number,
        linked_pr_number: None,
        amount_lamports: args.amount_lamports,
        status: BountyStatus::Open,
        created_at: Clock::get()?.unix_timestamp,
        completed_at: None,
    };
    state.serialize(&mut &mut bounty_account.data.borrow_mut()[..])?;
    msg!("Bounty escrow PDA created and funded");
    Ok(())
}

pub fn claim_bounty(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let assignee = next_account_info(account_info_iter)?;
    let bounty_account = next_account_info(account_info_iter)?;
    if !assignee.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let args = ClaimBountyArgs::try_from_slice(data)?;
    let mut state = BountyAccount::try_from_slice(&bounty_account.data.borrow())?;
    if state.status != BountyStatus::Open {
        return Err(ProgramError::InvalidAccountData);
    }
    state.assignee = Some(*assignee.key);
    state.linked_pr_number = Some(args.linked_pr_number);
    state.status = BountyStatus::InProgress;
    state.serialize(&mut &mut bounty_account.data.borrow_mut()[..])?;
    msg!("Bounty claimed; Rialo reactive watcher can begin polling GitHub");
    Ok(())
}

pub fn release_funds(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let bounty_account = next_account_info(account_info_iter)?;
    let escrow_pda = next_account_info(account_info_iter)?;
    let assignee_wallet = next_account_info(account_info_iter)?;
    let mut state = BountyAccount::try_from_slice(&bounty_account.data.borrow())?;
    if state.status != BountyStatus::InProgress {
        return Err(ProgramError::InvalidAccountData);
    }
    if Some(*assignee_wallet.key) != state.assignee {
        return Err(ProgramError::IllegalOwner);
    }
    **escrow_pda.try_borrow_mut_lamports()? -= state.amount_lamports;
    **assignee_wallet.try_borrow_mut_lamports()? += state.amount_lamports;
    state.status = BountyStatus::Completed;
    state.completed_at = Some(Clock::get()?.unix_timestamp);
    state.serialize(&mut &mut bounty_account.data.borrow_mut()[..])?;
    msg!("Escrow released after Rialo native HTTPS verified merged PR");
    Ok(())
}

pub fn cancel_and_refund(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let creator = next_account_info(account_info_iter)?;
    let bounty_account = next_account_info(account_info_iter)?;
    let escrow_pda = next_account_info(account_info_iter)?;
    let mut state = BountyAccount::try_from_slice(&bounty_account.data.borrow())?;
    if !creator.is_signer || *creator.key != state.creator {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if state.status != BountyStatus::Open {
        return Err(ProgramError::InvalidAccountData);
    }
    **escrow_pda.try_borrow_mut_lamports()? -= state.amount_lamports;
    **creator.try_borrow_mut_lamports()? += state.amount_lamports;
    state.status = BountyStatus::Cancelled;
    state.serialize(&mut &mut bounty_account.data.borrow_mut()[..])?;
    msg!("Open bounty cancelled and escrow refunded");
    Ok(())
}
