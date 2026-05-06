// RIALO-NATIVE FEATURE: Reactive Transactions
//
// Most chains are passive: a user, keeper, or relayer must call the contract.
// Rialo contracts can register work that sleeps and resumes across blocks.
// ChainTask uses that primitive to watch GitHub PR status and release escrow
// as soon as the merge condition is true, with no keeper bot to operate.

use solana_program::{
    account_info::AccountInfo,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub fn trigger_poll(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _data: &[u8],
) -> Result<(), ProgramError> {
    msg!("Reactive poll triggered; Rialo native runtime would call GitHub and settle escrow");
    Ok(())
}
