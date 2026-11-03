use starknet::syscalls::deploy_syscall;
use starknet::testing::set_contract_address;
use starknet::{ContractAddress, SyscallResultTrait};
use crate::claim_escrow::{
    ClaimEscrow, CommitmentEntry, EscrowOperation, IClaimEscrowDispatcher,
    IClaimEscrowDispatcherTrait, OpenNoteDeposit, ParkEntry, commitment_for,
};

#[starknet::interface]
trait IMockToken<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
}

#[starknet::contract]
mod MockToken {
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[abi(embed_v0)]
    impl MockTokenImpl of super::IMockToken<ContractState> {
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.balances.write(to, self.balances.read(to) + amount);
        }
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }
        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            self.allowances.write((get_caller_address(), spender), amount);
            true
        }
        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.allowances.read((owner, spender))
        }
    }
}

fn pool() -> ContractAddress {
    'POOL'.try_into().unwrap()
}

fn setup() -> (IClaimEscrowDispatcher, IMockTokenDispatcher) {
    let (escrow, _) = deploy_syscall(
        ClaimEscrow::TEST_CLASS_HASH.try_into().unwrap(), 0, array![pool().into()].span(), false,
    )
        .unwrap_syscall();
    let (token, _) = deploy_syscall(
        MockToken::TEST_CLASS_HASH.try_into().unwrap(), 1, array![].span(), false,
    )
        .unwrap_syscall();
    set_contract_address(pool());
    (
        IClaimEscrowDispatcher { contract_address: escrow },
        IMockTokenDispatcher { contract_address: token },
    )
}

fn zero() -> ContractAddress {
    0.try_into().unwrap()
}

fn entry(secret: felt252, amount: u128) -> Span<ParkEntry> {
    array![ParkEntry { commitment_hash: commitment_for(secret), amount }].span()
}

fn park(
    escrow: IClaimEscrowDispatcher, token: IMockTokenDispatcher, secret: felt252, amount: u128,
) {
    token.mint(escrow.contract_address, amount.into());
    escrow
        .privacy_invoke(
            EscrowOperation::Deposit, token.contract_address, entry(secret, amount), 0, 0,
        );
}

#[test]
fn commitment_matches_the_client_hash() {
    // Same vector as client1 claimLinks.test.ts:
    // computePoseidonHashOnElements([encodeShortString("BROTHER_CLAIM:V1"), 0x1234]).
    assert_eq!(
        commitment_for(0x1234), 0x5791f393f4ea2f6e646ed5acb82fb96fe78ec1cc4a3ce412e50701d38047bd8,
    );
}

#[test]
fn deposit_parks_funds_and_returns_no_notes() {
    let (escrow, token) = setup();
    token.mint(escrow.contract_address, 25);
    let notes = escrow
        .privacy_invoke(EscrowOperation::Deposit, token.contract_address, entry(7, 25), 0, 0);
    assert_eq!(notes.len(), 0);
    assert_eq!(
        escrow.get_commitment(commitment_for(7)),
        CommitmentEntry { token: token.contract_address, amount: 25, claimed: false },
    );
    assert_eq!(escrow.reserved(token.contract_address), 25);
}

#[test]
fn claim_credits_the_open_note_and_approves_the_pool() {
    let (escrow, token) = setup();
    park(escrow, token, 7, 25);
    let notes = escrow.privacy_invoke(EscrowOperation::Claim, zero(), array![].span(), 7, 'NOTE');
    assert_eq!(
        notes,
        array![OpenNoteDeposit { note_id: 'NOTE', token: token.contract_address, amount: 25 }]
            .span(),
    );
    assert_eq!(token.allowance(escrow.contract_address, pool()), 25);
    assert!(escrow.get_commitment(commitment_for(7)).claimed);
    assert_eq!(escrow.reserved(token.contract_address), 0);
}

#[test]
#[should_panic(expected: ('ALREADY_CLAIMED', 'ENTRYPOINT_FAILED'))]
fn claim_twice_fails() {
    let (escrow, token) = setup();
    park(escrow, token, 7, 25);
    escrow.privacy_invoke(EscrowOperation::Claim, zero(), array![].span(), 7, 'NOTE');
    escrow.privacy_invoke(EscrowOperation::Claim, zero(), array![].span(), 7, 'NOTE2');
}

#[test]
#[should_panic(expected: ('COMMITMENT_NOT_FOUND', 'ENTRYPOINT_FAILED'))]
fn claim_with_wrong_secret_fails() {
    let (escrow, token) = setup();
    park(escrow, token, 7, 25);
    escrow.privacy_invoke(EscrowOperation::Claim, zero(), array![].span(), 8, 'NOTE');
}

#[test]
#[should_panic(expected: ('DEPOSIT_NOT_RECEIVED', 'ENTRYPOINT_FAILED'))]
fn deposit_without_tokens_fails() {
    let (escrow, token) = setup();
    escrow.privacy_invoke(EscrowOperation::Deposit, token.contract_address, entry(7, 25), 0, 0);
}

#[test]
#[should_panic(expected: ('DEPOSIT_NOT_RECEIVED', 'ENTRYPOINT_FAILED'))]
fn parked_tokens_cannot_back_a_second_deposit() {
    let (escrow, token) = setup();
    park(escrow, token, 7, 25);
    escrow.privacy_invoke(EscrowOperation::Deposit, token.contract_address, entry(8, 25), 0, 0);
}

#[test]
#[should_panic(expected: ('COMMITMENT_EXISTS', 'ENTRYPOINT_FAILED'))]
fn duplicate_commitment_fails() {
    let (escrow, token) = setup();
    park(escrow, token, 7, 25);
    park(escrow, token, 7, 25);
}

#[test]
#[should_panic(expected: ('CALLER_NOT_PRIVACY', 'ENTRYPOINT_FAILED'))]
fn only_the_pool_can_call() {
    let (escrow, token) = setup();
    token.mint(escrow.contract_address, 25);
    set_contract_address('STRANGER'.try_into().unwrap());
    escrow.privacy_invoke(EscrowOperation::Deposit, token.contract_address, entry(7, 25), 0, 0);
}

#[test]
fn one_deposit_parks_many_claim_links() {
    let (escrow, token) = setup();
    token.mint(escrow.contract_address, 30);
    let entries = array![
        ParkEntry { commitment_hash: commitment_for(1), amount: 10 },
        ParkEntry { commitment_hash: commitment_for(2), amount: 20 },
    ];
    escrow.privacy_invoke(EscrowOperation::Deposit, token.contract_address, entries.span(), 0, 0);
    assert_eq!(escrow.reserved(token.contract_address), 30);
    let notes = escrow.privacy_invoke(EscrowOperation::Claim, zero(), array![].span(), 2, 'NOTE');
    assert_eq!(
        *notes.at(0),
        OpenNoteDeposit { note_id: 'NOTE', token: token.contract_address, amount: 20 },
    );
    assert_eq!(escrow.reserved(token.contract_address), 10);
}

#[test]
#[should_panic(expected: ('DEPOSIT_NOT_RECEIVED', 'ENTRYPOINT_FAILED'))]
fn many_links_need_the_full_total() {
    let (escrow, token) = setup();
    token.mint(escrow.contract_address, 29);
    let entries = array![
        ParkEntry { commitment_hash: commitment_for(1), amount: 10 },
        ParkEntry { commitment_hash: commitment_for(2), amount: 20 },
    ];
    escrow.privacy_invoke(EscrowOperation::Deposit, token.contract_address, entries.span(), 0, 0);
}
