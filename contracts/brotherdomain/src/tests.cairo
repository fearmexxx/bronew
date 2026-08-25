#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use snforge_std::{
        declare, start_cheat_caller_address, stop_cheat_caller_address,
        start_cheat_block_timestamp, stop_cheat_block_timestamp,
        ContractClassTrait, DeclareResultTrait,
    };

    use super::super::identity_contract::{
        IIdentityContractDispatcher, IIdentityContractDispatcherTrait, WalletInfo, AgentInfo
    };
    use super::super::mock_erc20::{IMockERC20Dispatcher, IMockERC20DispatcherTrait};
    use super::super::{
        IBrotherNamingServiceDispatcher, IBrotherNamingServiceDispatcherTrait,
    };

    fn setup_owner() -> ContractAddress {
        0x123456789.try_into().unwrap()
    }

    fn setup_user() -> ContractAddress {
        0x987654321.try_into().unwrap()
    }

    fn deploy_escrow_fixture() -> (
        IIdentityContractDispatcher,
        IMockERC20Dispatcher,
        ContractAddress,
    ) {
        let owner = setup_owner();
        let user = setup_user();

        let token_class = declare("MockERC20").unwrap().contract_class();
        let token_calldata = array![user.into(), 1_000_000, 0];
        let (token_address, _) = token_class.deploy(@token_calldata).unwrap();

        let identity_class = declare("IdentityContract").unwrap().contract_class();
        let identity_calldata = array![owner.into(), token_address.into()];
        let (identity_address, _) = identity_class.deploy(@identity_calldata).unwrap();

        (
            IIdentityContractDispatcher { contract_address: identity_address },
            IMockERC20Dispatcher { contract_address: token_address },
            user,
        )
    }

    fn deploy_bns_fixture() -> (
        IBrotherNamingServiceDispatcher,
        IMockERC20Dispatcher,
        ContractAddress,
        ContractAddress,
    ) {
        let owner = setup_owner();
        let user = setup_user();
        let token_class = declare("MockERC20").unwrap().contract_class();
        let token_calldata = array![user.into(), 10_000_000_000_000_000_000_000, 0];
        let (token_address, _) = token_class.deploy(@token_calldata).unwrap();

        let bns_class = declare("BrotherNamingService").unwrap().contract_class();
        let bns_calldata = array![owner.into(), token_address.into(), owner.into()];
        let (bns_address, _) = bns_class.deploy(@bns_calldata).unwrap();
        (
            IBrotherNamingServiceDispatcher { contract_address: bns_address },
            IMockERC20Dispatcher { contract_address: token_address },
            owner,
            user,
        )
    }

    #[test]
    fn test_identity_initialization() {
        let owner = setup_owner();
        // State initialization test
        let zero: ContractAddress = 0.try_into().unwrap();
        assert!(owner != zero);
    }

    #[test]
    fn test_wallet_info_struct() {
        let addr = setup_user();
        let wallet = WalletInfo {
            address: addr,
            role: 'main',
            permissions: 'all',
            daily_limit: 1000,
            status: 1,
            created_at: 100000,
        };

        assert_eq!(wallet.address, addr);
        assert_eq!(wallet.role, 'main');
        assert_eq!(wallet.daily_limit, 1000);
        assert_eq!(wallet.status, 1);
    }

    #[test]
    fn test_agent_info_struct() {
        let addr = setup_user();
        let agent = AgentInfo {
            agent_domain: 'assistant.real',
            agent_address: addr,
            permissions: 'trade',
            capabilities: 'swap',
            status: 1,
        };

        assert_eq!(agent.agent_domain, 'assistant.real');
        assert_eq!(agent.agent_address, addr);
        assert_eq!(agent.status, 1);
    }

    #[test]
    fn test_deposit_pulls_tokens_and_credits_exact_amount() {
        let (identity, token, user) = deploy_escrow_fixture();
        let amount = 25_000_u256;

        start_cheat_caller_address(token.contract_address, user);
        assert!(token.approve(identity.contract_address, amount));
        stop_cheat_caller_address(token.contract_address);

        start_cheat_caller_address(identity.contract_address, user);
        identity.deposit(amount);
        stop_cheat_caller_address(identity.contract_address);

        assert_eq!(identity.get_shielded_balance(user), amount);
        assert_eq!(token.balance_of(identity.contract_address), amount);
        assert_eq!(token.balance_of(user), 1_000_000_u256 - amount);
    }

    #[should_panic(expected: 'Insufficient allowance')]
    #[test]
    fn test_deposit_without_allowance_reverts() {
        let (identity, _token, user) = deploy_escrow_fixture();
        start_cheat_caller_address(identity.contract_address, user);
        identity.deposit(25_000_u256);
    }

    #[test]
    fn test_withdraw_returns_tokens_and_decrements_balance() {
        let (identity, token, user) = deploy_escrow_fixture();
        let amount = 25_000_u256;
        let withdrawal = 10_000_u256;

        start_cheat_caller_address(token.contract_address, user);
        assert!(token.approve(identity.contract_address, amount));
        stop_cheat_caller_address(token.contract_address);

        start_cheat_caller_address(identity.contract_address, user);
        identity.deposit(amount);
        identity.withdraw(withdrawal);
        stop_cheat_caller_address(identity.contract_address);

        assert_eq!(identity.get_shielded_balance(user), amount - withdrawal);
        assert_eq!(token.balance_of(identity.contract_address), amount - withdrawal);
        assert_eq!(token.balance_of(user), 1_000_000_u256 - amount + withdrawal);
    }

    #[test]
    fn test_registration_collects_payment_and_resolves_owner() {
        let (bns, token, owner, user) = deploy_bns_fixture();
        let domain = 'secure825';
        let price = bns.get_domain_price(domain, 1);

        start_cheat_caller_address(token.contract_address, user);
        assert!(token.approve(bns.contract_address, price));
        stop_cheat_caller_address(token.contract_address);

        start_cheat_caller_address(bns.contract_address, user);
        bns.register_domain(domain, 1, user, false, false, 0.try_into().unwrap());
        stop_cheat_caller_address(bns.contract_address);

        assert_eq!(bns.resolve_domain(domain), user);
        assert_eq!(bns.get_domain_info(domain).resolver, user);
        assert_eq!(token.balance_of(owner), price);
    }

    #[should_panic(expected: "Already initialized")]
    #[test]
    fn test_initialize_cannot_run_twice() {
        let (bns, token, owner, _user) = deploy_bns_fixture();
        start_cheat_caller_address(bns.contract_address, owner);
        bns.initialize(
            "Brother Real",
            "REAL",
            1_000_000_000_000_000_000,
            owner,
            token.contract_address,
        );
    }

    #[test]
    fn test_auction_settlement_updates_resolution_and_owner_index() {
        let (bns, token, _owner, seller) = deploy_bns_fixture();
        let bidder: ContractAddress = 0xabcdef.try_into().unwrap();
        let domain = 'auction825';
        let price = bns.get_domain_price(domain, 1);
        let reserve = 1_000_000_000_000_000_000_u256;

        start_cheat_caller_address(token.contract_address, seller);
        assert!(token.approve(bns.contract_address, price));
        stop_cheat_caller_address(token.contract_address);

        start_cheat_caller_address(bns.contract_address, seller);
        bns.register_domain(domain, 1, seller, false, false, 0.try_into().unwrap());
        start_cheat_block_timestamp(bns.contract_address, 1_000);
        bns.create_auction(domain, 100, reserve, 100_000_000_000_000_000);
        stop_cheat_caller_address(bns.contract_address);

        token.mint(bidder, reserve);
        start_cheat_caller_address(token.contract_address, bidder);
        assert!(token.approve(bns.contract_address, reserve));
        stop_cheat_caller_address(token.contract_address);

        start_cheat_caller_address(bns.contract_address, bidder);
        bns.bid(domain, reserve);
        stop_cheat_caller_address(bns.contract_address);

        start_cheat_block_timestamp(bns.contract_address, 1_101);
        bns.settle(domain);
        stop_cheat_block_timestamp(bns.contract_address);

        assert_eq!(bns.resolve_domain(domain), bidder);
        assert_eq!(bns.get_domain_info(domain).resolver, bidder);
        let bidder_domains = bns.get_domains_of(bidder);
        assert_eq!(bidder_domains.len(), 1);
        assert_eq!(*bidder_domains.at(0), domain);
    }
}
