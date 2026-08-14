use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store, PartialEq)]
pub struct WalletInfo {
    pub address: ContractAddress,
    pub role: felt252,
    pub permissions: felt252,
    pub daily_limit: u256,
    pub status: u8,
    pub created_at: u64,
}

#[derive(Copy, Drop, Serde, starknet::Store, PartialEq)]
pub struct AgentInfo {
    pub agent_domain: felt252,
    pub agent_address: ContractAddress,
    pub permissions: felt252,
    pub capabilities: felt252,
    pub status: u8,
}

#[derive(Drop, Serde)]
pub struct IdentityDetails {
    pub primary_domain: felt252,
    pub is_privacy_enabled: bool,
    pub shielded_balance: u256,
}

#[starknet::interface]
pub trait IIdentityContract<TContractState> {
    // Wallet management
    fn add_wallet(ref self: TContractState, wallet: ContractAddress, role: felt252, permissions: felt252, daily_limit: u256);
    fn remove_wallet(ref self: TContractState, wallet: ContractAddress);
    fn update_wallet_role(ref self: TContractState, wallet: ContractAddress, role: felt252);

    // Privacy & Shielded Pool (with real token movement)
    fn enable_privacy(ref self: TContractState, enabled: bool);
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(ref self: TContractState, amount: u256);
    fn private_send(ref self: TContractState, recipient: ContractAddress, amount: u256);

    // Legacy compatibility — kept for frontend migration period, will be removed
    fn update_shielded_balance(ref self: TContractState, amount: u256);

    // Agent delegation
    fn register_agent(ref self: TContractState, agent_domain: felt252, agent_address: ContractAddress, permissions: felt252, capabilities: felt252);

    // Guardian recovery
    fn add_guardian(ref self: TContractState, guardian: ContractAddress);

    // Domain / Identity
    fn get_primary_domain(self: @TContractState) -> felt252;
    fn set_primary_domain(ref self: TContractState, domain: felt252);
    fn get_identity_details(self: @TContractState) -> IdentityDetails;
    fn get_identity_details_of(self: @TContractState, user: ContractAddress) -> IdentityDetails;
    fn get_shielded_balance(self: @TContractState, user: ContractAddress) -> u256;

    // Wallet queries
    fn get_wallet(self: @TContractState, wallet: ContractAddress) -> WalletInfo;
    fn get_wallets_count(self: @TContractState) -> u256;
    fn get_wallet_by_index(self: @TContractState, index: u256) -> WalletInfo;

    // Admin
    fn get_strk_token(self: @TContractState) -> ContractAddress;
}

/// ERC20 dispatcher interface for calling transfer on STRK token
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::contract]
pub mod IdentityContract {
    use super::{WalletInfo, AgentInfo, IdentityDetails};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess,
    };

    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,

        // STRK token address for escrow operations
        _strk_token_address: ContractAddress,

        // User specific identity mappings
        _user_primary_domain: Map<ContractAddress, felt252>,
        _user_is_privacy_enabled: Map<ContractAddress, bool>,
        _user_shielded_balance: Map<ContractAddress, u256>,

        // Multi-wallet mappings per identity: (user, index) -> WalletInfo
        _user_wallets: Map<(ContractAddress, u256), WalletInfo>,
        _user_wallet_address_to_index: Map<(ContractAddress, ContractAddress), u256>,
        _user_wallet_count: Map<ContractAddress, u256>,

        // Delegated agents per identity: (user, index) -> AgentInfo
        _user_agents: Map<(ContractAddress, u256), AgentInfo>,
        _user_agent_count: Map<ContractAddress, u256>,

        // Guardians per identity: (user, index) -> Guardian
        _user_guardians: Map<(ContractAddress, u256), ContractAddress>,
        _user_guardian_count: Map<ContractAddress, u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
        WalletAdded: WalletAdded,
        WalletRemoved: WalletRemoved,
        PrivacyEnabled: PrivacyEnabled,
        PrivacyDisabled: PrivacyDisabled,
        Deposited: Deposited,
        Withdrawn: Withdrawn,
        PrivateSent: PrivateSent,
        ShieldedBalanceUpdated: ShieldedBalanceUpdated,
        AgentRegistered: AgentRegistered,
        GuardianAdded: GuardianAdded,
    }

    #[derive(Drop, starknet::Event)]
    struct WalletAdded {
        user: ContractAddress,
        address: ContractAddress,
        role: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct WalletRemoved {
        user: ContractAddress,
        address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct PrivacyEnabled {
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct PrivacyDisabled {
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct Deposited {
        user: ContractAddress,
        amount: u256,
        new_balance: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdrawn {
        user: ContractAddress,
        amount: u256,
        new_balance: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct PrivateSent {
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    }

    // Legacy event kept for backwards compatibility
    #[derive(Drop, starknet::Event)]
    struct ShieldedBalanceUpdated {
        user: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentRegistered {
        user: ContractAddress,
        agent_domain: felt252,
        agent_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct GuardianAdded {
        user: ContractAddress,
        guardian: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, strk_token: ContractAddress) {
        self.ownable.initializer(owner);
        self._strk_token_address.write(strk_token);
    }

    #[abi(embed_v0)]
    impl IdentityContractImpl of super::IIdentityContract<ContractState> {
        fn add_wallet(ref self: ContractState, wallet: ContractAddress, role: felt252, permissions: felt252, daily_limit: u256) {
            let caller = get_caller_address();
            let count = self._user_wallet_count.read(caller);
            let new_wallet = WalletInfo {
                address: wallet,
                role: role,
                permissions: permissions,
                daily_limit: daily_limit,
                status: 1,
                created_at: get_block_timestamp(),
            };
            self._user_wallets.write((caller, count), new_wallet);
            self._user_wallet_address_to_index.write((caller, wallet), count);
            self._user_wallet_count.write(caller, count + 1);
            self.emit(WalletAdded { user: caller, address: wallet, role: role });
        }

        fn remove_wallet(ref self: ContractState, wallet: ContractAddress) {
            let caller = get_caller_address();
            let index = self._user_wallet_address_to_index.read((caller, wallet));
            let w = self._user_wallets.read((caller, index));
            assert(w.address == wallet, 'Wallet not found');

            let count = self._user_wallet_count.read(caller);
            assert(count > 0, 'No wallets to remove');
            let last_index = count - 1;

            if index != last_index {
                let last_wallet = self._user_wallets.read((caller, last_index));
                self._user_wallets.write((caller, index), last_wallet);
                self._user_wallet_address_to_index.write((caller, last_wallet.address), index);
            }

            // Clear the stale index mapping for the removed wallet (SC-5 fix)
            let zero_index: u256 = 0;
            self._user_wallet_address_to_index.write((caller, wallet), zero_index);

            let zero_address: ContractAddress = 0_felt252.try_into().unwrap();
            let empty_wallet = WalletInfo {
                address: zero_address,
                role: 0,
                permissions: 0,
                daily_limit: 0,
                status: 0,
                created_at: 0,
            };
            self._user_wallets.write((caller, last_index), empty_wallet);
            self._user_wallet_count.write(caller, last_index);
            self.emit(WalletRemoved { user: caller, address: wallet });
        }

        fn update_wallet_role(ref self: ContractState, wallet: ContractAddress, role: felt252) {
            let caller = get_caller_address();
            let index = self._user_wallet_address_to_index.read((caller, wallet));
            let mut w = self._user_wallets.read((caller, index));
            assert(w.address == wallet, 'Wallet not found');
            w.role = role;
            self._user_wallets.write((caller, index), w);
        }

        fn enable_privacy(ref self: ContractState, enabled: bool) {
            let caller = get_caller_address();
            self._user_is_privacy_enabled.write(caller, enabled);
            if enabled {
                self.emit(PrivacyEnabled { user: caller });
            } else {
                self.emit(PrivacyDisabled { user: caller });
            }
        }

        /// Deposit: Records deposit amount (frontend already transferred STRK via multicall).
        /// Adds to existing balance — no arbitrary setting.
        fn deposit(ref self: ContractState, amount: u256) {
            self.reentrancy_guard.start();
            assert(amount > 0, 'Deposit amount must be > 0');
            let caller = get_caller_address();
            let current = self._user_shielded_balance.read(caller);
            let new_balance = current + amount;
            self._user_shielded_balance.write(caller, new_balance);
            self.emit(Deposited { user: caller, amount, new_balance });
            self.reentrancy_guard.end();
        }

        /// Withdraw: Sends STRK tokens back to the caller and decrements shielded balance.
        fn withdraw(ref self: ContractState, amount: u256) {
            self.reentrancy_guard.start();
            assert(amount > 0, 'Withdraw amount must be > 0');
            let caller = get_caller_address();
            let current = self._user_shielded_balance.read(caller);
            assert(amount <= current, 'Insufficient shielded balance');

            let new_balance = current - amount;
            self._user_shielded_balance.write(caller, new_balance);

            // Actually transfer STRK tokens back to the caller
            let strk = IERC20Dispatcher { contract_address: self._strk_token_address.read() };
            let success = strk.transfer(caller, amount);
            assert(success, 'STRK transfer failed');

            self.emit(Withdrawn { user: caller, amount, new_balance });
            self.reentrancy_guard.end();
        }

        /// Private Send: Transfers STRK from the shielded pool directly to a recipient address.
        fn private_send(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.reentrancy_guard.start();
            assert(amount > 0, 'Send amount must be > 0');
            let caller = get_caller_address();
            let current = self._user_shielded_balance.read(caller);
            assert(amount <= current, 'Insufficient shielded balance');

            let new_balance = current - amount;
            self._user_shielded_balance.write(caller, new_balance);

            // Actually transfer STRK tokens to the recipient
            let strk = IERC20Dispatcher { contract_address: self._strk_token_address.read() };
            let success = strk.transfer(recipient, amount);
            assert(success, 'STRK transfer failed');

            self.emit(PrivateSent { sender: caller, recipient, amount });
            self.reentrancy_guard.end();
        }

        /// Legacy: Kept for frontend migration period. Will be removed in next version.
        fn update_shielded_balance(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            self._user_shielded_balance.write(caller, amount);
            self.emit(ShieldedBalanceUpdated { user: caller, amount });
        }

        fn register_agent(ref self: ContractState, agent_domain: felt252, agent_address: ContractAddress, permissions: felt252, capabilities: felt252) {
            let caller = get_caller_address();
            let count = self._user_agent_count.read(caller);
            let new_agent = AgentInfo {
                agent_domain,
                agent_address,
                permissions,
                capabilities,
                status: 1,
            };
            self._user_agents.write((caller, count), new_agent);
            self._user_agent_count.write(caller, count + 1);
            self.emit(AgentRegistered { user: caller, agent_domain, agent_address });
        }

        fn add_guardian(ref self: ContractState, guardian: ContractAddress) {
            let caller = get_caller_address();
            let count = self._user_guardian_count.read(caller);
            self._user_guardians.write((caller, count), guardian);
            self._user_guardian_count.write(caller, count + 1);
            self.emit(GuardianAdded { user: caller, guardian });
        }

        fn get_primary_domain(self: @ContractState) -> felt252 {
            let caller = get_caller_address();
            self._user_primary_domain.read(caller)
        }

        fn set_primary_domain(ref self: ContractState, domain: felt252) {
            let caller = get_caller_address();
            self._user_primary_domain.write(caller, domain);
        }

        fn get_identity_details(self: @ContractState) -> IdentityDetails {
            let caller = get_caller_address();
            IdentityDetails {
                primary_domain: self._user_primary_domain.read(caller),
                is_privacy_enabled: self._user_is_privacy_enabled.read(caller),
                shielded_balance: self._user_shielded_balance.read(caller),
            }
        }

        fn get_identity_details_of(self: @ContractState, user: ContractAddress) -> IdentityDetails {
            IdentityDetails {
                primary_domain: self._user_primary_domain.read(user),
                is_privacy_enabled: self._user_is_privacy_enabled.read(user),
                shielded_balance: self._user_shielded_balance.read(user),
            }
        }

        fn get_shielded_balance(self: @ContractState, user: ContractAddress) -> u256 {
            self._user_shielded_balance.read(user)
        }

        fn get_wallet(self: @ContractState, wallet: ContractAddress) -> WalletInfo {
            let caller = get_caller_address();
            let index = self._user_wallet_address_to_index.read((caller, wallet));
            let w = self._user_wallets.read((caller, index));
            assert(w.address == wallet, 'Wallet not found');
            w
        }

        fn get_wallets_count(self: @ContractState) -> u256 {
            let caller = get_caller_address();
            self._user_wallet_count.read(caller)
        }

        fn get_wallet_by_index(self: @ContractState, index: u256) -> WalletInfo {
            let caller = get_caller_address();
            let count = self._user_wallet_count.read(caller);
            assert(index < count, 'Index out of bounds');
            self._user_wallets.read((caller, index))
        }

        fn get_strk_token(self: @ContractState) -> ContractAddress {
            self._strk_token_address.read()
        }
    }
}
