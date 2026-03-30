#[starknet::contract]
mod BrotherToken {
    use core::traits::Into;
    use core::integer::u256;
    use starknet::ContractAddress;

    // OpenZeppelin components
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};

    // Component declarations
    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Storage
    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    // Mixins / internal impls
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    // Expose standard ERC20 external interface (transfer, approve, transferFrom, etc.)
    #[abi(embed_v0)]
    impl ERC20ExternalImpl = ERC20Component::ERC20Impl<ContractState>;

    // Empty hooks impl
    impl ERC20HooksImpl = ERC20HooksEmptyImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    // Constructor
    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        name: ByteArray,
        symbol: ByteArray,
        initial_supply: u256,
        recipient: ContractAddress,
    ) {
        self.erc20.initializer(name, symbol);
        self.ownable.initializer(owner);

        if initial_supply != 0_u256 {
            self.erc20.mint(recipient, initial_supply);
        }
    }

    #[starknet::interface]
    trait BrotherTokenAdminTrait<TState> {
        fn admin_mint(ref self: TState, to: ContractAddress, amount: u256);
    }

    // Allow owner to mint additional tokens if needed
    #[abi(embed_v0)]
    impl BrotherTokenAdmin of BrotherTokenAdminTrait<ContractState> {
        fn admin_mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.ownable.assert_only_owner();
            self.erc20.mint(to, amount);
        }
    }
}

