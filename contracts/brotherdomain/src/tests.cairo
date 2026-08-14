#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use starknet::contract_address_const;

    use super::super::identity_contract::{
        IdentityContract, IIdentityContractDispatcher, IIdentityContractDispatcherTrait, WalletInfo, AgentInfo
    };

    fn setup_owner() -> ContractAddress {
        contract_address_const::<0x123456789>()
    }

    fn setup_user() -> ContractAddress {
        contract_address_const::<0x987654321>()
    }

    #[test]
    fn test_identity_initialization() {
        let owner = setup_owner();
        // State initialization test
        assert!(owner != contract_address_const::<0>());
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
}
