// ChainTask Bounty Escrow Contract
// Built for Rialo, the real-world blockchain.
//
// This Solana-compatible contract demonstrates three Rialo primitives:
// 1. Native HTTPS calls in github_check.rs, replacing oracle dependency.
// 2. Reactive transactions in reactive.rs, replacing keeper bot dependency.
// 3. Real-world identity, where users arrive as protocol-derived addresses.

use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

pub mod escrow;
pub mod github_check;
pub mod reactive;
pub mod state;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = instruction_data
        .first()
        .ok_or(solana_program::program_error::ProgramError::InvalidInstructionData)?;

    match instruction {
        0 => escrow::create_bounty(program_id, accounts, &instruction_data[1..]),
        1 => escrow::claim_bounty(program_id, accounts, &instruction_data[1..]),
        2 => reactive::trigger_poll(program_id, accounts, &instruction_data[1..]),
        3 => escrow::release_funds(program_id, accounts, &instruction_data[1..]),
        4 => escrow::cancel_and_refund(program_id, accounts, &instruction_data[1..]),
        _ => {
            msg!("Unknown instruction");
            Err(solana_program::program_error::ProgramError::InvalidInstructionData)
        }
    }
}
