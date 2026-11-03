//! Claim-link escrow helper for the STRK20 privacy pool.
//!
//! A payer privately withdraws tokens to this helper and parks each amount
//! under `poseidon(CLAIM_TAG, secret)`, one secret per claim link. Whoever
//! holds a secret (the recipient, or the payer reclaiming) later claims it
//! into an open note in the pool, so neither the payer nor the claimer is
//! linked to the parked amount on-chain.
//!
//! The pool calls `privacy_invoke` with the invoke action's calldata:
//! `[operation, token, entries_len, (commitment_hash, amount)*, secret, note_id]`.
//! Deposit (operation 0) parks every entry of `token` at once, because the
//! pool allows one external invoke per transaction; Claim (operation 1) uses
//! only `secret` and `note_id`.

use core::poseidon::poseidon_hash_span;
use starknet::ContractAddress;

pub const CLAIM_TAG: felt252 = 'BROTHER_CLAIM:V1';

#[derive(Copy, Drop, Serde, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Copy, Drop, Serde, PartialEq, Debug, starknet::Store)]
pub struct CommitmentEntry {
    pub token: ContractAddress,
    pub amount: u128,
    pub claimed: bool,
}

#[derive(Copy, Drop, Serde, PartialEq, Debug)]
pub struct ParkEntry {
    pub commitment_hash: felt252,
    pub amount: u128,
}

#[derive(Copy, Drop, Serde, PartialEq, Debug)]
pub enum EscrowOperation {
    Deposit,
    Claim,
}

pub fn commitment_for(secret: felt252) -> felt252 {
    poseidon_hash_span(array![CLAIM_TAG, secret].span())
}

#[starknet::interface]
pub trait IClaimEscrow<TContractState> {
    fn privacy_invoke(
        ref self: TContractState,
        operation: EscrowOperation,
        token: ContractAddress,
        entries: Span<ParkEntry>,
        secret: felt252,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;
    fn get_commitment(self: @TContractState, commitment_hash: felt252) -> CommitmentEntry;
    fn reserved(self: @TContractState, token: ContractAddress) -> u128;
    fn privacy_contract(self: @TContractState) -> ContractAddress;
}

#[starknet::interface]
pub trait IERC20Minimal<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::contract]
pub mod ClaimEscrow {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{
        CommitmentEntry, EscrowOperation, IERC20MinimalDispatcher, IERC20MinimalDispatcherTrait,
        OpenNoteDeposit, ParkEntry, commitment_for,
    };

    #[storage]
    struct Storage {
        privacy_contract: ContractAddress,
        commitments: Map<felt252, CommitmentEntry>,
        // Parked, unclaimed amount per token. Deposits must be backed by
        // tokens actually received on top of this.
        reserved: Map<ContractAddress, u128>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Parked: Parked,
        Claimed: Claimed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Parked {
        #[key]
        pub commitment_hash: felt252,
        pub token: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claimed {
        #[key]
        pub commitment_hash: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, privacy_contract: ContractAddress) {
        assert(privacy_contract.into() != 0, 'ZERO_PRIVACY_CONTRACT');
        self.privacy_contract.write(privacy_contract);
    }

    #[abi(embed_v0)]
    impl ClaimEscrowImpl of super::IClaimEscrow<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            operation: EscrowOperation,
            token: ContractAddress,
            entries: Span<ParkEntry>,
            secret: felt252,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            assert(get_caller_address() == self.privacy_contract.read(), 'CALLER_NOT_PRIVACY');
            match operation {
                EscrowOperation::Deposit => {
                    self.park(token, entries);
                    array![].span()
                },
                EscrowOperation::Claim => array![self.claim(secret, note_id)].span(),
            }
        }

        fn get_commitment(self: @ContractState, commitment_hash: felt252) -> CommitmentEntry {
            self.commitments.read(commitment_hash)
        }

        fn reserved(self: @ContractState, token: ContractAddress) -> u128 {
            self.reserved.read(token)
        }

        fn privacy_contract(self: @ContractState) -> ContractAddress {
            self.privacy_contract.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn park(ref self: ContractState, token: ContractAddress, entries: Span<ParkEntry>) {
            assert(token.into() != 0, 'ZERO_TOKEN');
            assert(entries.len() != 0, 'NO_ENTRIES');
            let mut total: u128 = 0;
            for entry in entries {
                let ParkEntry { commitment_hash, amount } = *entry;
                assert(commitment_hash != 0, 'ZERO_COMMITMENT_HASH');
                assert(amount != 0, 'ZERO_AMOUNT');
                assert(
                    self.commitments.read(commitment_hash).token.into() == 0, 'COMMITMENT_EXISTS',
                );
                self
                    .commitments
                    .write(commitment_hash, CommitmentEntry { token, amount, claimed: false });
                self.emit(Parked { commitment_hash, token, amount });
                total += amount;
            }

            // The pool withdrew the tokens here earlier in this transaction;
            // refuse to record more than was actually received.
            let reserved = self.reserved.read(token) + total;
            let balance = IERC20MinimalDispatcher { contract_address: token }
                .balance_of(get_contract_address());
            assert(balance >= reserved.into(), 'DEPOSIT_NOT_RECEIVED');
            self.reserved.write(token, reserved);
        }

        fn claim(ref self: ContractState, secret: felt252, note_id: felt252) -> OpenNoteDeposit {
            assert(note_id != 0, 'ZERO_NOTE_ID');
            let commitment_hash = commitment_for(secret);
            let entry = self.commitments.read(commitment_hash);
            assert(entry.token.into() != 0, 'COMMITMENT_NOT_FOUND');
            assert(!entry.claimed, 'ALREADY_CLAIMED');

            self.commitments.write(commitment_hash, CommitmentEntry { claimed: true, ..entry });
            self.reserved.write(entry.token, self.reserved.read(entry.token) - entry.amount);
            // The pool pulls the tokens into the claimer's open note.
            IERC20MinimalDispatcher { contract_address: entry.token }
                .approve(self.privacy_contract.read(), entry.amount.into());
            self.emit(Claimed { commitment_hash });
            OpenNoteDeposit { note_id, token: entry.token, amount: entry.amount }
        }
    }
}
