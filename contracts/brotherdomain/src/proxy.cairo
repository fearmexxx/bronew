use starknet::ContractAddress;
use starknet::syscalls::replace_class_syscall;
use starknet::ClassHash;

#[starknet::interface]
pub trait IUpgradeableContract<TContractState> {
    fn upgrade_to(ref self: TContractState, new_class_hash: ClassHash);
    fn get_admin(self: @TContractState) -> ContractAddress;
    fn change_admin(ref self: TContractState, new_admin: ContractAddress);
}

#[starknet::contract]
pub mod UpgradeableContract {
    use super::{ClassHash, replace_class_syscall};
    use starknet::{
        ContractAddress, get_caller_address
    };
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        ClassUpgraded: ClassUpgraded,
        AdminChanged: AdminChanged,
    }

    #[derive(Drop, starknet::Event)]
    struct ClassUpgraded {
        #[key]
        class_hash: ClassHash,
        #[key]
        admin: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminChanged {
        #[key]
        previous_admin: ContractAddress,
        #[key]
        new_admin: ContractAddress,
        time: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.ownable.initializer(admin);
    }

    #[abi(embed_v0)]
    impl UpgradeableContractImpl of super::IUpgradeableContract<ContractState> {
        fn upgrade_to(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            
            // Use native Cairo v2 replace_class syscall
            replace_class_syscall(new_class_hash).unwrap();
            
            self.emit(ClassUpgraded {
                class_hash: new_class_hash,
                admin: get_caller_address(),
                time: starknet::get_block_timestamp(),
            });
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.ownable.owner()
        }

        fn change_admin(ref self: ContractState, new_admin: ContractAddress) {
            self.ownable.assert_only_owner();
            
            let previous_admin = self.ownable.owner();
            self.ownable.transfer_ownership(new_admin);
            
            self.emit(AdminChanged {
                previous_admin: previous_admin,
                new_admin: new_admin,
                time: starknet::get_block_timestamp(),
            });
        }
    }

    // This contract uses native Cairo v2 upgradability via replace_class syscall
    // The contract can be upgraded while preserving its state and address
}
