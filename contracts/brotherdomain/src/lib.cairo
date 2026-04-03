use starknet::ContractAddress;
use starknet::ClassHash;
// Removed deprecated contract_address_const import

// Payment token dispatcher is now provided via contract storage/constructor (see module below)

// Include additional contracts in the package build
mod brother_token;
mod proxy;
mod tests;

#[derive(Copy, Drop, Serde, starknet::Store, PartialEq)]
struct DomainDetails {
    handler: felt252,  // Domain name itself
    resolver: ContractAddress,
    token_id: u256,
    expiry_date: u64,
    last_transfer_time: u64,
    parent_domain: felt252,
    is_subdomain: bool,
}

// Auction data structure
#[derive(Copy, Drop, Serde, starknet::Store, PartialEq)]
struct AuctionData {
    seller: ContractAddress,
    token_id: u256,
    payment_token: ContractAddress,
    reserve: u256,
    min_increment: u256,
    highest_bid: u256,
    highest_bidder: ContractAddress,
    ends_at: u64,
    active: bool,
}

#[derive(Drop, Serde)]
struct FullProfile {
    domain_details: DomainDetails,
    avatar: felt252,
    twitter: felt252,
    discord: felt252,
    url: felt252,
    description: felt252,
}

#[starknet::interface]
pub trait IBrotherNamingService<TContractState> {
    // Core domain functions
    fn register_domain(ref self: TContractState, domain: felt252, years: u8, resolver: ContractAddress, has_strkdomain: bool, has_brother_domain: bool, referrer: ContractAddress);
    fn renew_domain(ref self: TContractState, domain: felt252, years: u8);
    fn transfer_domain(ref self: TContractState, domain: felt252, to: ContractAddress);
    
    // Subdomain functions
    fn create_subdomain(ref self: TContractState, parent_domain: felt252, subdomain: felt252, years: u8, resolver: ContractAddress);
    fn get_subdomains(self: @TContractState, parent_domain: felt252) -> Array<felt252>;
    
    // Resolution functions
    fn resolve_domain(self: @TContractState, domain: felt252) -> ContractAddress;
    fn reverse_resolve(self: @TContractState, address: ContractAddress) -> felt252;
    fn set_resolver(ref self: TContractState, domain: felt252, resolver: ContractAddress);
    
    // Verification functions
    fn is_verified(self: @TContractState, domain: felt252) -> bool;
    fn set_verification_status(ref self: TContractState, domain: felt252, status: bool);

    // Domain info functions
    fn get_domain_info(self: @TContractState, domain: felt252) -> DomainDetails;
    fn is_domain_available(self: @TContractState, domain: felt252) -> bool;
    fn is_domain_expired(self: @TContractState, domain: felt252) -> bool;
    fn get_full_profile(self: @TContractState, domain: felt252) -> FullProfile;
    
    // Primary domain functions
    fn set_primary_domain(ref self: TContractState, domain: felt252);
    fn get_primary_domain(self: @TContractState, address: ContractAddress) -> felt252;
    
    // Pricing functions
    fn get_domain_price(self: @TContractState, domain: felt252, years: u8) -> u256;
    // Payment token used for registrations/renewals
    fn get_payment_token_addr(self: @TContractState) -> ContractAddress;
    
    // Burn functionality
    fn burn_domain(ref self: TContractState, domain: felt252);
    fn burn_by_token_id(ref self: TContractState, token_id: u256);
    
    // Domain query functions
    fn get_domain_by_token_id(self: @TContractState, token_id: u256) -> DomainDetails;
    fn get_details_by_domain(self: @TContractState, domain: felt252) -> DomainDetails;
    
    // Dynamic metadata functions
    fn set_base_uri_parts(ref self: TContractState, new_base_uri_parts: Array<felt252>);
    fn get_token_uri(self: @TContractState, token_id: u256) -> Array<felt252>;
    fn get_domain_svg(self: @TContractState, domain: felt252) -> ByteArray;
    
    // Admin functions
    fn set_base_price(ref self: TContractState, price: u256);
    fn set_treasury(ref self: TContractState, treasury: ContractAddress);
    fn set_mint_active(ref self: TContractState, active: bool);
    fn get_treasury(self: @TContractState) -> ContractAddress;
    fn get_base_price(self: @TContractState) -> u256;
    // Owner domain listing
    fn get_domains_of(self: @TContractState, owner: ContractAddress) -> Array<felt252>;
    
    // Discount eligibility functions
    fn has_claimed_strk_discount(self: @TContractState, address: ContractAddress) -> bool;
    fn has_claimed_brother_discount(self: @TContractState, address: ContractAddress) -> bool;
    
    // Multi-signature treasury functions
    fn propose_treasury_change(ref self: TContractState, new_treasury: ContractAddress);
    fn confirm_treasury_change(ref self: TContractState, proposal_id: u256);
    fn execute_treasury_change(ref self: TContractState, proposal_id: u256);
    fn get_treasury_proposal(self: @TContractState, proposal_id: u256) -> (ContractAddress, u8, u8, bool);
    fn add_treasury_signer(ref self: TContractState, signer: ContractAddress);
    fn remove_treasury_signer(ref self: TContractState, signer: ContractAddress);
    
    // Parameter governance functions
    fn propose_param_change(ref self: TContractState, param_id: u8, value: u256);
    fn confirm_param_change(ref self: TContractState, proposal_id: u256);
    fn execute_param_change(ref self: TContractState, proposal_id: u256);
    fn get_param_proposal(self: @TContractState, proposal_id: u256) -> (u8, u256, u8, bool);
    fn get_param_proposal_count(self: @TContractState) -> u256;
    
    // Auction functions
    fn create_auction(ref self: TContractState, domain: felt252, duration_secs: u64, reserve: u256, min_increment: u256);
    fn bid(ref self: TContractState, domain: felt252, amount: u256);
    fn withdraw(ref self: TContractState, domain: felt252);
    fn settle(ref self: TContractState, domain: felt252);
    fn cancel_auction(ref self: TContractState, domain: felt252);
    fn get_auction(self: @TContractState, domain: felt252) -> (ContractAddress, u256, u256, u256, u256, ContractAddress, u64, bool); // seller, token_id, reserve, min_increment, highest_bid, highest_bidder, ends_at, active
    fn get_refundable(self: @TContractState, user: ContractAddress) -> u256;
    fn get_active_auction_domains(self: @TContractState) -> Array<felt252>; // Returns all domains that have active auctions
    
    // Text Record functions
    fn set_text(ref self: TContractState, domain: felt252, key: felt252, value: felt252);
    fn get_text(self: @TContractState, domain: felt252, key: felt252) -> felt252;
    
    // Referral functions
    fn get_referral_earnings(self: @TContractState, address: ContractAddress) -> u256;
    
    // Initializer (for upgrades)
    fn initialize(ref self: TContractState, name: ByteArray, symbol: ByteArray, base_price: u256, treasury: ContractAddress, payment_token: ContractAddress);
}

#[starknet::contract]
mod BrotherNamingService {
    use core::array::ArrayTrait;
    use core::traits::Into;
    use core::integer::u256;
    // use core::zeroable::NonZero;
    use core::option::OptionTrait;
    use super::{DomainDetails, AuctionData, FullProfile};
    use starknet::ContractAddress;
    use starknet::{
        get_caller_address, get_block_timestamp
    };
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess,
    };
    use core::num::traits::Zero;
    use core::byte_array::ByteArray;
    use starknet::ClassHash;
    use starknet::syscalls::replace_class_syscall;

    const GRACE_PERIOD: u64 = 7776000; // 90 days in seconds

    // OpenZeppelin imports
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use openzeppelin::token::erc20::interface::IERC20CamelDispatcherTrait;
    use openzeppelin::token::erc20::interface::IERC20CamelDispatcher;

    // Component declarations
    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent);

    // Component implementations
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        
        // Naming service specific storage
        _total_supply: u256,
        _is_mint_active: bool,
        _treasury_addr: ContractAddress,
        _base_price: u256,
        // ERC-20 payment token address (BROTHER token on given network)
        _payment_token_addr: ContractAddress,
        
        // Domain mappings
        _token_id_to_domain: Map<u256, felt252>,
        _domain_to_details: Map<felt252, DomainDetails>,
        _user_primary_domain: Map<ContractAddress, felt252>,
        
        // Text Records mapping: (domain, key) -> value
        _text_records: Map<(felt252, felt252), felt252>,

        // Verification mapping: domain -> is_verified
        _is_verified: Map<felt252, bool>,

        // Resolution mappings
        _domain_to_address: Map<felt252, ContractAddress>,
        _address_to_domain: Map<ContractAddress, felt252>,
        
        // Subdomain support
        _subdomain_count: Map<felt252, u256>,
        _subdomain_index: Map<(felt252, u256), felt252>,
        
        // Pricing (removed popularity tracking)
        
        // Dynamic metadata URI support
        _base_uri_parts: Map<u8, felt252>,
        // Owner index: track domains owned by an address
        _owner_domain_count: Map<ContractAddress, u256>,
        _owner_domain_index: Map<(ContractAddress, u256), felt252>,
        
        // Multi-signature treasury management
        _treasury_signers: Map<ContractAddress, bool>,
        _treasury_signer_count: u8,
        _required_signatures: u8,
        _treasury_proposal_count: u256,
        _treasury_proposals: Map<u256, (ContractAddress, u8, u8, bool)>, // (new_treasury, confirmations, required, executed)
        _treasury_proposal_confirmations: Map<(u256, ContractAddress), bool>,
        
        // Discount tracking - one-time discounts per address
        _strk_discount_claimed: Map<ContractAddress, bool>,
        _brother_discount_claimed: Map<ContractAddress, bool>,
        
        // Auction storage
        _auctions: Map<felt252, AuctionData>,
        _refundable: Map<ContractAddress, u256>,
        _auction_fee_bps: u16,
        _auction_fee_recipient: ContractAddress,
        // Active auction tracking
        _active_auction_count: u256,
        _active_auction_index: Map<u256, felt252>, // Index to domain mapping
        _active_auction_domain_to_index: Map<felt252, u256>, // Domain to index mapping (for removal)
        
        // Referral system storage: address -> total tokens earned
        _referrals_earned: Map<ContractAddress, u256>,
        _referral_bonus_bps: u16, // Bonus in basis points (e.g. 500 = 5%)

        // Parameter governance storage
        _param_proposal_count: u256,
        _param_proposals: Map<u256, (u8, u256, u8, bool)>, // (param_id, value, confirmations, executed)
        _param_proposal_confirmations: Map<(u256, ContractAddress), bool>,
        _grace_period: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DomainRegistered: DomainRegistered,
        DomainRenewed: DomainRenewed,
        DomainTransferred: DomainTransferred,
        SubdomainCreated: SubdomainCreated,
        ResolverSet: ResolverSet,
        PrimaryDomainSet: PrimaryDomainSet,
        DomainBurned: DomainBurned,
        TextRecordUpdated: TextRecordUpdated,
        TreasuryProposalCreated: TreasuryProposalCreated,
        TreasuryProposalConfirmed: TreasuryProposalConfirmed,
        TreasuryProposalExecuted: TreasuryProposalExecuted,
        TreasurySignerAdded: TreasurySignerAdded,
        TreasurySignerRemoved: TreasurySignerRemoved,
        AuctionCreated: AuctionCreated,
        BidPlaced: BidPlaced,
        AuctionSettled: AuctionSettled,
        AuctionCancelled: AuctionCancelled,
        RefundWithdrawn: RefundWithdrawn,
        ReferralReward: ReferralReward,
        ParamProposalCreated: ParamProposalCreated,
        ParamProposalConfirmed: ParamProposalConfirmed,
        ParamProposalExecuted: ParamProposalExecuted,
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct TextRecordUpdated {
        #[key]
        domain: felt252,
        #[key]
        key: felt252,
        value: felt252,
        updated_by: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DomainRegistered {
        #[key]
        token_id: u256,
        #[key]
        domain: felt252,
        #[key]
        owner: ContractAddress,
        expiry_date: u64,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DomainRenewed {
        #[key]
        token_id: u256,
        #[key]
        domain: felt252,
        #[key]
        owner: ContractAddress,
        expiry_date: u64,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DomainTransferred {
        #[key]
        token_id: u256,
        #[key]
        domain: felt252,
        from: ContractAddress,
        to: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SubdomainCreated {
        #[key]
        parent_domain: felt252,
        #[key]
        subdomain: felt252,
        #[key]
        owner: ContractAddress,
        token_id: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ResolverSet {
        #[key]
        domain: felt252,
        resolver: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct PrimaryDomainSet {
        #[key]
        address: ContractAddress,
        #[key]
        domain: felt252,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DomainBurned {
        #[key]
        token_id: u256,
        #[key]
        domain: felt252,
        #[key]
        owner: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasuryProposalCreated {
        #[key]
        proposal_id: u256,
        #[key]
        proposer: ContractAddress,
        new_treasury: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasuryProposalConfirmed {
        #[key]
        proposal_id: u256,
        #[key]
        confirmer: ContractAddress,
        confirmations: u8,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasuryProposalExecuted {
        #[key]
        proposal_id: u256,
        #[key]
        executor: ContractAddress,
        old_treasury: ContractAddress,
        new_treasury: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasurySignerAdded {
        #[key]
        signer: ContractAddress,
        #[key]
        adder: ContractAddress,
        total_signers: u8,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasurySignerRemoved {
        #[key]
        signer: ContractAddress,
        #[key]
        remover: ContractAddress,
        total_signers: u8,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCreated {
        #[key]
        domain: felt252,
        #[key]
        seller: ContractAddress,
        reserve: u256,
        ends_at: u64,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BidPlaced {
        #[key]
        domain: felt252,
        #[key]
        bidder: ContractAddress,
        amount: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionSettled {
        #[key]
        domain: felt252,
        #[key]
        winner: ContractAddress,
        amount: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCancelled {
        #[key]
        domain: felt252,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct RefundWithdrawn {
        #[key]
        user: ContractAddress,
        amount: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ParamProposalCreated {
        #[key]
        proposal_id: u256,
        #[key]
        proposer: ContractAddress,
        param_id: u8,
        value: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ParamProposalConfirmed {
        #[key]
        proposal_id: u256,
        #[key]
        confirmer: ContractAddress,
        confirmations: u8,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ParamProposalExecuted {
        #[key]
        proposal_id: u256,
        #[key]        executor: ContractAddress,
        param_id: u8,
        old_value: u256,
        new_value: u256,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ReferralReward {
        #[key]
        referrer: ContractAddress,
        #[key]
        referee: ContractAddress,
        #[key]
        domain: felt252,
        amount: u256,
        time: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, payment_token: ContractAddress, treasury: ContractAddress) {
        let name = "Brother Naming Service";
        let symbol = "BROTHER";
        let base_uri = "https://brother.domains/metadata/";
        
        self.erc721.initializer(name, symbol, base_uri);
        self.ownable.initializer(owner);
        self._is_mint_active.write(true);
        self._base_price.write(1000000000000000000); // 1 BROTHER token
        self._payment_token_addr.write(payment_token);
        self._treasury_addr.write(treasury);
        
        // Initialize multi-signature treasury (owner is initial signer)
        self._treasury_signers.write(owner, true);
        self._treasury_signer_count.write(1);
        self._required_signatures.write(1); // Start with 1 signature (can be increased)
        self._treasury_proposal_count.write(0);
        
        // Initialize auction settings (default 2% fee)
        self._auction_fee_bps.write(200);
        self._auction_fee_recipient.write(treasury);
        
        // Initialize referral settings (default 5% bonus)
        self._referral_bonus_bps.write(500);

        // Initialize parameter governance
        self._param_proposal_count.write(0);
        self._grace_period.write(7776000); // 90 days default
    }

    #[abi(embed_v0)]
    impl BrotherNamingServiceImpl of super::IBrotherNamingService<ContractState> {
        // Core domain functions
        fn register_domain(ref self: ContractState, domain: felt252, years: u8, resolver: ContractAddress, has_strkdomain: bool, has_brother_domain: bool, referrer: ContractAddress) {
            self.reentrancy_guard.start();

            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            // Validations
            assert!(self._is_mint_active.read(), "Minting disabled");
            
            // Availability check (includes grace period check)
            let available = self.is_domain_available(domain);
            assert!(available, "Domain not available");
            
            // Check if we are overwriting an expired domain (post-grace)
            // If so, we need to clean up the old token
            let old_details = self._domain_to_details.read(domain);
            if !old_details.resolver.is_zero() {
                // It was previously registered but is now available, meaning it expired + grace passed
                // Burn the old token to keep total supply and mappings clean
                self.erc721.burn(old_details.token_id);
                // Also clear old owner index? complicated, leaving as is for now or 
                // strictly we should remove from owner index, but that requires iterating.
                // Simplified cleanup: just burn the NFT.
            }

            assert!(years >= 1 && years <= 3, "Invalid years");
            
            let domain_len = self._get_domain_length(domain);
            assert!(domain_len >= 4, "Invalid domain length (min 4)");
            
            // Calculate price and expiry with discount logic
            let mut price = self.compute_buy_price(domain_len, years.into());
            
            // Apply STRK domain discount (one-time per address)
            if has_strkdomain {
                let strk_claimed = self._strk_discount_claimed.read(caller);
                if !strk_claimed {
                    price = self.apply_strkdomain_discount(price, years.into());
                    self._strk_discount_claimed.write(caller, true);
                }
            }
            
            // Apply Brother domain discount (one-time per address, 1 year free)
            if has_brother_domain {
                let brother_claimed = self._brother_discount_claimed.read(caller);
                if !brother_claimed {
                    price = self.apply_brother_domain_discount(price, years.into());
                    self._brother_discount_claimed.write(caller, true);
                }
            }
            
            let expiry = now + (31556926 * years.into());
            let token_id = self._total_supply.read() + 1;

            // Create domain details
            let domain_details = DomainDetails {
                handler: domain,
                resolver: caller, // Caller is the owner
                token_id: token_id,
                expiry_date: expiry,
                last_transfer_time: now,
                parent_domain: 0, // Root domain
                is_subdomain: false,
            };
            
            // Transfer payment
            let treasury = self._treasury_addr.read();
            let success = self._token_dispatcher().transferFrom(caller, treasury, price);
            assert!(success, "Transfer failed");
            
            // Update storage
            self._token_id_to_domain.write(token_id, domain);
            self._domain_to_details.write(domain, domain_details);
            self._domain_to_address.write(domain, caller); // Caller is the owner
            self._user_primary_domain.write(caller, domain);
            self._total_supply.write(self._total_supply.read() + 1);

            // Index by owner
            let owner_count = self._owner_domain_count.read(caller);
            self._owner_domain_index.write((caller, owner_count), domain);
            self._owner_domain_count.write(caller, owner_count + 1);

            // Mint NFT
            self.erc721.mint(caller, token_id);

            self.emit(DomainRegistered {
                token_id: token_id,
                domain: domain,
                owner: caller,
                expiry_date: expiry,
                time: now,
            });

            // Referral bonus distribution
            if !referrer.is_zero() && referrer != caller {
                let bonus_bps = self._referral_bonus_bps.read();
                let bonus_amount = (price * bonus_bps.into()) / 10000;
                
                if bonus_amount > 0 {
                    // Current implementation: transfer from treasury to referrer 
                    // (Treasury must have approved the contract or contract is treasury owner)
                    // Alternative: transfer from user to referrer directly (requires extra approval logic or split)
                    // For simplicity, we'll assume the treasury (which just received 'price')
                    // will permit or handle bonuses, or we use a separate allocation.
                    // REFINED: We'll assume the contract holds some tokens or can facilitate 
                    // the transfer if treasury is a managed address.
                    // Actually, let's keep it simple: treasury receives full, contract records earnings.
                    // User can 'claim' earnings later? No, let's just transfer if possible.
                    
                    // Update earnings record
                    let current_earnings = self._referrals_earned.read(referrer);
                    self._referrals_earned.write(referrer, current_earnings + bonus_amount);
                    
                    // We don't automate the payout here to avoid gas/complex dependency on treasury approval.
                    // We just log it for indexer/frontend and manual/claim settlement.
                    
                    self.emit(ReferralReward {
                        referrer: referrer,
                        referee: caller,
                        domain: domain,
                        amount: bonus_amount,
                        time: now,
                    });
                }
            }

            self.reentrancy_guard.end();
        }

        fn renew_domain(ref self: ContractState, domain: felt252, years: u8) {
            self.reentrancy_guard.start();

            let caller = get_caller_address();
            let now = get_block_timestamp();

            // Read directly from storage to support grace period renewal
            // get_domain_info might return empty if expired, masking the owner
            let mut domain_info = self._domain_to_details.read(domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            assert!(years >= 1 && years <= 3, "Invalid years");
            
            // Check if domain is renewable (active OR within grace period)
            // If now > expiry + GRACE_PERIOD, it's fully expired and cannot be renewed (must re-register)
            let grace = self._grace_period.read();
            if now > domain_info.expiry_date {
                assert!(now <= domain_info.expiry_date + grace, "Grace period expired");
            }
            
            // Calculate renewal price and new expiry
            let domain_len = self._get_domain_length(domain);
            let price = self.compute_renew_price(domain_len, years.into());
            
            // If renewing during grace period (expired but < grace), new expiry starts from now? 
            // Or from old expiry? ENS adds to old expiry.
            // "The new expiration date will be the previous expiration date plus the renewal period."
            let new_expiry = domain_info.expiry_date + (31556926 * years.into());

            // Transfer payment
            let treasury = self._treasury_addr.read();
            let success = self._token_dispatcher().transferFrom(caller, treasury, price);
            assert!(success, "Transfer failed");
            
            // Update domain details
            domain_info.expiry_date = new_expiry;
            self._domain_to_details.write(domain, domain_info);
            
            self.emit(DomainRenewed {
                token_id: domain_info.token_id,
                    domain: domain,
                owner: domain_info.resolver,
                expiry_date: new_expiry,
                    time: now,
            });
            
            self.reentrancy_guard.end();
        }

        fn transfer_domain(ref self: ContractState, domain: felt252, to: ContractAddress) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            // Get domain info
            let mut domain_info = self.get_domain_info(domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            assert!(!self.is_domain_expired(domain), "Domain expired");
            
            // Update domain details
            domain_info.resolver = to;
            domain_info.last_transfer_time = now;
            self._domain_to_details.write(domain, domain_info);
            self._domain_to_address.write(domain, to);
            
            // Transfer NFT using transfer_from (ERC721Component method)
            self.erc721.transfer_from(caller, to, domain_info.token_id);

            // Remove domain from sender's index (mark as 0)
            let count_from = self._owner_domain_count.read(caller);
            let mut i_from = 0;
            while i_from < count_from {
                let d = self._owner_domain_index.read((caller, i_from));
                if d == domain { self._owner_domain_index.write((caller, i_from), 0); break; };
                i_from += 1;
            };

            // Append to recipient index
            let count_to = self._owner_domain_count.read(to);
            self._owner_domain_index.write((to, count_to), domain);
            self._owner_domain_count.write(to, count_to + 1);
            
            self.emit(DomainTransferred {
                token_id: domain_info.token_id,
                domain: domain,
                from: caller,
                to: to,
                time: now,
            });
        }

        // Subdomain functions
        fn create_subdomain(ref self: ContractState, parent_domain: felt252, subdomain: felt252, years: u8, resolver: ContractAddress) {
            self.reentrancy_guard.start();
            
            let caller = get_caller_address();
            let now = get_block_timestamp();

            // Check parent domain ownership
            let parent_info = self.get_domain_info(parent_domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!parent_info.resolver.is_zero(), "Domain not found");
            assert!(parent_info.resolver == caller, "Not domain owner");
            assert!(!self.is_domain_expired(parent_domain), "Parent domain expired");
            
            // Enforce minimum subdomain label length
            let sub_len = self._get_domain_length(subdomain);
            assert!(sub_len >= 4, "Invalid subdomain length (min 4)");
            
            // Create full subdomain name
            let full_subdomain = subdomain + '.brother';
            assert!(self.is_domain_available(full_subdomain), "Domain not available");
            
            // Calculate price and expiry
            let subdomain_len = self._get_domain_length(full_subdomain);
            let price = self.compute_buy_price(subdomain_len, years.into());
            let expiry = now + (31556926 * years.into());
            let token_id = self._total_supply.read() + 1;
            
            // Create subdomain details
            let subdomain_details = DomainDetails {
                handler: full_subdomain,
                resolver: caller, // Caller is the owner
                token_id: token_id,
                expiry_date: expiry,
                last_transfer_time: now,
                parent_domain: parent_domain,
                is_subdomain: true,
            };

            // Transfer payment
            let treasury = self._treasury_addr.read();
            let success = self._token_dispatcher().transferFrom(caller, treasury, price);
            assert!(success, "Transfer failed");
            
            // Update storage
            self._token_id_to_domain.write(token_id, full_subdomain);
            self._domain_to_details.write(full_subdomain, subdomain_details);
            self._domain_to_address.write(full_subdomain, caller); // Caller is the owner
            
            // Add to parent's subdomain list
            let subdomain_count = self._subdomain_count.read(parent_domain);
            self._subdomain_index.write((parent_domain, subdomain_count), full_subdomain);
            self._subdomain_count.write(parent_domain, subdomain_count + 1);
            
            self._total_supply.write(self._total_supply.read() + 1);
            
            // Mint NFT
            self.erc721.mint(caller, token_id);
            
            self.emit(SubdomainCreated {
                parent_domain: parent_domain,
                subdomain: full_subdomain,
                owner: caller,
                token_id: token_id,
                time: now,
            });

            self.reentrancy_guard.end();
        }

        fn get_subdomains(self: @ContractState, parent_domain: felt252) -> Array<felt252> {
            let count = self._subdomain_count.read(parent_domain);
            let mut subdomains = ArrayTrait::new();
            let mut i = 0;
            while i < count {
                let subdomain = self._subdomain_index.read((parent_domain, i));
                subdomains.append(subdomain);
                i += 1;
            };
            subdomains
        }

        // Resolution functions
        fn resolve_domain(self: @ContractState, domain: felt252) -> ContractAddress {
            let domain_info = self.get_domain_info(domain);
            if domain_info.expiry_date < get_block_timestamp() {
                let zero_address: ContractAddress = 0.try_into().unwrap();
                return zero_address;
            }
            self._domain_to_address.read(domain)
        }

        fn reverse_resolve(self: @ContractState, address: ContractAddress) -> felt252 {
            self._address_to_domain.read(address)
        }

        fn set_resolver(ref self: ContractState, domain: felt252, resolver: ContractAddress) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            let mut domain_info = self.get_domain_info(domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            assert!(!self.is_domain_expired(domain), "Domain expired");
            
            domain_info.resolver = resolver;
            self._domain_to_details.write(domain, domain_info);
            self._domain_to_address.write(domain, resolver);
            
            self.emit(ResolverSet {
                domain: domain,
                resolver: resolver,
                time: now,
            });
        }

        fn is_verified(self: @ContractState, domain: felt252) -> bool {
            self._is_verified.read(domain)
        }

        fn set_verification_status(ref self: ContractState, domain: felt252, status: bool) {
            self.ownable.assert_only_owner();
            self._is_verified.write(domain, status);
        }

        // Domain info functions
        fn get_domain_info(self: @ContractState, domain: felt252) -> DomainDetails {
            let domain_info = self._domain_to_details.read(domain);
            let now = get_block_timestamp();

            if domain_info.expiry_date < now {
                // Return expired domain info
                let zero_address: ContractAddress = 0.try_into().unwrap();
                return DomainDetails {
                    handler: domain,
                    resolver: zero_address,
                    token_id: domain_info.token_id,
                    expiry_date: 0,
                    last_transfer_time: 0,
                    parent_domain: domain_info.parent_domain,
                    is_subdomain: domain_info.is_subdomain,
                };
            }
            domain_info
        }

        fn get_domain_by_token_id(self: @ContractState, token_id: u256) -> DomainDetails {
            let domain = self._token_id_to_domain.read(token_id);
            self.get_domain_info(domain)
        }

        fn get_details_by_domain(self: @ContractState, domain: felt252) -> DomainDetails {
            self.get_domain_info(domain)
        }

        fn is_domain_available(self: @ContractState, domain: felt252) -> bool {
            let domain_info = self._domain_to_details.read(domain);
            
            // If resolver is zero, it's never been registered
            if domain_info.resolver.is_zero() {
                return true;
            }
            
            // If registered, check if expired AND past grace period
            let now = get_block_timestamp();
            if domain_info.expiry_date < now {
                // If past grace period, it IS available
                let grace = self._grace_period.read();
                if now > domain_info.expiry_date + grace {
                    return true;
                }
            }
            
            // Otherwise (active or within grace), it is NOT available
            false
        }

        fn is_domain_expired(self: @ContractState, domain: felt252) -> bool {
            let domain_info = self.get_domain_info(domain);
            domain_info.expiry_date < get_block_timestamp()
        }

        fn get_full_profile(self: @ContractState, domain: felt252) -> FullProfile {
            let domain_details = self.get_domain_info(domain);
            let avatar = self._text_records.read((domain, 'avatar'));
            let twitter = self._text_records.read((domain, 'twitter'));
            let discord = self._text_records.read((domain, 'discord'));
            let url = self._text_records.read((domain, 'url'));
            let description = self._text_records.read((domain, 'description'));
            
            FullProfile {
                domain_details,
                avatar,
                twitter,
                discord,
                url,
                description,
            }
        }

        fn get_domain_svg(self: @ContractState, domain: felt252) -> ByteArray {
            let mut svg: ByteArray = "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500' style='background-color:#0D1117'><defs><linearGradient id='grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:#00f2a1;stop-opacity:1' /><stop offset='100%' style='stop-color:#00c6ff;stop-opacity:1' /></linearGradient></defs><rect width='100%' height='100%' rx='20' ry='20' fill='none' stroke='url(#grad)' stroke-width='10' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='40' fill='white'>@";
            
            // Append domain name. Since domain is felt252, we need to convert it to string/ByteArray.
            // Simplified: we'll just append it as hex for now if we can't easily decode to string in pure Cairo without complex logic.
            // Actually, we can use `append_word` if we assume it's a short string.
            svg.append_word(domain, 31); // Append up to 31 bytes
            
            svg.append(@".real</text></svg>");
            svg
        }

        // Primary domain functions
        fn set_primary_domain(ref self: ContractState, domain: felt252) {
            let caller = get_caller_address();
            let now = get_block_timestamp();

            let domain_info = self.get_domain_info(domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            assert!(!self.is_domain_expired(domain), "Domain expired");
            
            self._user_primary_domain.write(caller, domain);
            self._address_to_domain.write(caller, domain);
            
            self.emit(PrimaryDomainSet {
                address: caller,
                    domain: domain,
                    time: now,
            });
        }

        fn get_primary_domain(self: @ContractState, address: ContractAddress) -> felt252 {
            self._user_primary_domain.read(address)
        }

        // View: list all domains owned by address (skips removed zeros)
        fn get_domains_of(self: @ContractState, owner: ContractAddress) -> Array<felt252> {
            let count = self._owner_domain_count.read(owner);
            let mut res = ArrayTrait::new();
            let mut i = 0;
            while i < count {
                let d = self._owner_domain_index.read((owner, i));
                if d != 0 { res.append(d); };
                i += 1;
            };
            res
        }

        // Pricing functions
        fn get_domain_price(self: @ContractState, domain: felt252, years: u8) -> u256 {
            let domain_len = self._get_domain_length(domain);
            self.compute_buy_price(domain_len, years.into())
        }

        fn get_payment_token_addr(self: @ContractState) -> ContractAddress {
            self._payment_token_addr.read()
        }

        // Admin functions
        fn set_base_price(ref self: ContractState, price: u256) {
            self.ownable.assert_only_owner();
            self._base_price.write(price);
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self.ownable.assert_only_owner();
            self._treasury_addr.write(treasury);
        }

        fn set_mint_active(ref self: ContractState, active: bool) {
            self.ownable.assert_only_owner();
            self._is_mint_active.write(active);
        }

        fn get_treasury(self: @ContractState) -> ContractAddress {
            self._treasury_addr.read()
        }

        fn get_base_price(self: @ContractState) -> u256 {
            self._base_price.read()
        }

        

        // Burn functionality
        fn burn_domain(ref self: ContractState, domain: felt252) {
            let caller = get_caller_address();
            let now = get_block_timestamp();

            let domain_info = self.get_domain_info(domain);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            
            // Burn the NFT using OpenZeppelin component
            self.erc721.burn(domain_info.token_id);
            
            // Clear domain mappings
            self._domain_to_details.write(domain, DomainDetails {
                    handler: domain,
                resolver: zero_address,
                token_id: 0,
                    expiry_date: 0,
                    last_transfer_time: 0,
                parent_domain: 0,
                is_subdomain: false,
            });
            
            self._domain_to_address.write(domain, zero_address);

            // Remove from owner's index (mark as 0)
            let owner = caller;
            let count = self._owner_domain_count.read(owner);
            let mut i = 0;
            while i < count {
                let d = self._owner_domain_index.read((owner, i));
                if d == domain { self._owner_domain_index.write((owner, i), 0); break; };
                i += 1;
            };
            
            // Clear token ID to domain mapping
            self._token_id_to_domain.write(domain_info.token_id, 0);
            
            // Update total supply
            self._total_supply.write(self._total_supply.read() - 1);
            
            self.emit(DomainBurned {
                token_id: domain_info.token_id,
                domain: domain,
                owner: caller,
                time: now,
            });
        }

        fn burn_by_token_id(ref self: ContractState, token_id: u256) {
            let domain = self._token_id_to_domain.read(token_id);
            assert!(domain != 0, "Token ID not found");
            self.burn_domain(domain);
        }

        // Dynamic metadata functions
        fn set_base_uri_parts(ref self: ContractState, new_base_uri_parts: Array<felt252>) {
            self.ownable.assert_only_owner();
            assert!(new_base_uri_parts.len() != 0, "Base URI cannot be empty");
            assert!(new_base_uri_parts.len() < 256, "Max length is 256x32 bytes");

            // Clear old base URI parts
            let mut j: u8 = 0;
            while !self._base_uri_parts.read(j).is_zero() {
                self._base_uri_parts.write(j, 0);
                j += 1;
            };

            // Set new base URI parts
            let mut i: u8 = 0;
            while i.into() < new_base_uri_parts.len() {
                let uri_part = new_base_uri_parts.at(i.into());
                self._base_uri_parts.write(i, *uri_part);
                i += 1;
            }
        }

        fn get_token_uri(self: @ContractState, token_id: u256) -> Array<felt252> {
            let mut link = ArrayTrait::new();
            let mut j: u8 = 0;

            // Add base URI parts
            while !self._base_uri_parts.read(j).is_zero() {
                let base_uri_part = self._base_uri_parts.read(j);
                link.append(base_uri_part);
                j += 1;
            };

            // Add token ID as string
            if token_id == 0 {
                link.append(0x30); // '0'
                return link;
            }

            // Convert token ID to string (simplified version)
            let mut current_int: u256 = token_id;
            let mut digits = ArrayTrait::new();
            
            // Extract digits
            while current_int != 0 {
                let digit = current_int % 10;
                digits.append(digit);
                current_int = current_int / 10;
            };

            // Add digits in reverse order
            let mut i = digits.len();
            while i != 0 {
                i -= 1;
                let digit = *digits.at(i);
                let char_code = self._int_to_char(digit);
                link.append(char_code);
            };

            link
        }

        // Multi-signature treasury functions
        fn propose_treasury_change(ref self: ContractState, new_treasury: ContractAddress) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            
            let proposal_id = self._treasury_proposal_count.read() + 1;
            self._treasury_proposal_count.write(proposal_id);
            
            self._treasury_proposals.write(proposal_id, (new_treasury, 0, self._required_signatures.read(), false));
            self._treasury_proposal_confirmations.write((proposal_id, caller), true);
            
            // Update confirmation count
            let (treasury, mut confirmations, required, executed) = self._treasury_proposals.read(proposal_id);
            confirmations = 1;
            self._treasury_proposals.write(proposal_id, (treasury, confirmations, required, executed));
            
            self.emit(TreasuryProposalCreated {
                proposal_id: proposal_id,
                proposer: caller,
                new_treasury: new_treasury,
                time: now,
            });
        }

        fn confirm_treasury_change(ref self: ContractState, proposal_id: u256) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            
            let (treasury, mut confirmations, required, executed) = self._treasury_proposals.read(proposal_id);
            assert!(!executed, "Proposal already executed");
            assert!(!self._treasury_proposal_confirmations.read((proposal_id, caller)), "Already confirmed");
            
            self._treasury_proposal_confirmations.write((proposal_id, caller), true);
            confirmations += 1;
            self._treasury_proposals.write(proposal_id, (treasury, confirmations, required, executed));
            
            self.emit(TreasuryProposalConfirmed {
                proposal_id: proposal_id,
                confirmer: caller,
                confirmations: confirmations,
                time: now,
            });
        }

        fn execute_treasury_change(ref self: ContractState, proposal_id: u256) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            
            let (new_treasury, confirmations, required, executed) = self._treasury_proposals.read(proposal_id);
            assert!(!executed, "Proposal already executed");
            assert!(confirmations >= required, "Insufficient confirmations");
            
            let old_treasury = self._treasury_addr.read();
            self._treasury_addr.write(new_treasury);
            
            // Mark proposal as executed
            self._treasury_proposals.write(proposal_id, (new_treasury, confirmations, required, true));
            
            self.emit(TreasuryProposalExecuted {
                proposal_id: proposal_id,
                executor: caller,
                old_treasury: old_treasury,
                new_treasury: new_treasury,
                time: now,
            });
        }

        fn get_treasury_proposal(self: @ContractState, proposal_id: u256) -> (ContractAddress, u8, u8, bool) {
            self._treasury_proposals.read(proposal_id)
        }

        fn add_treasury_signer(ref self: ContractState, signer: ContractAddress) {
            self.ownable.assert_only_owner();
            let now = get_block_timestamp();
            
            assert!(!self._treasury_signers.read(signer), "Already a signer");
            
            self._treasury_signers.write(signer, true);
            let count = self._treasury_signer_count.read() + 1;
            self._treasury_signer_count.write(count);
            
            self.emit(TreasurySignerAdded {
                signer: signer,
                adder: get_caller_address(),
                total_signers: count,
                time: now,
            });
        }

        fn remove_treasury_signer(ref self: ContractState, signer: ContractAddress) {
            self.ownable.assert_only_owner();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(signer), "Not a signer");
            let count = self._treasury_signer_count.read();
            assert!(count > 1, "Cannot remove last signer");
            
            self._treasury_signers.write(signer, false);
            self._treasury_signer_count.write(count - 1);
            
            self.emit(TreasurySignerRemoved {
                signer: signer,
                remover: get_caller_address(),
                total_signers: count - 1,
                time: now,
            });
        }

        // Discount eligibility functions
        fn has_claimed_strk_discount(self: @ContractState, address: ContractAddress) -> bool {
            self._strk_discount_claimed.read(address)
        }

        fn has_claimed_brother_discount(self: @ContractState, address: ContractAddress) -> bool {
            self._brother_discount_claimed.read(address)
        }

        // Auction functions
        fn create_auction(ref self: ContractState, domain: felt252, duration_secs: u64, reserve: u256, min_increment: u256) {
            self.reentrancy_guard.start();
            let caller = get_caller_address();
            let now = get_block_timestamp();
            let ends_at = now + duration_secs;

            // Verify domain ownership
            let domain_info = self.get_domain_info(domain);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            let owner = self.erc721.owner_of(domain_info.token_id);
            assert!(owner == caller, "Not domain owner");
            assert!(!self.is_domain_expired(domain), "Domain expired");

            // Check if auction already exists and is active for this domain
            let existing_auc = self._auctions.read(domain);
            assert!(!existing_auc.active, "Auction already exists for this domain");

            // Escrow NFT internally (transfer to self)
            self.erc721.transfer_from(caller, starknet::get_contract_address(), domain_info.token_id);

            let payment_token = self._payment_token_addr.read();
            let data = AuctionData {
                seller: caller,
                token_id: domain_info.token_id,
                payment_token: payment_token,
                reserve: reserve,
                min_increment: min_increment,
                highest_bid: 0_u256,
                highest_bidder: zero_address,
                ends_at: ends_at,
                active: true,
            };
            self._auctions.write(domain, data);
            
            // Add to active auction list
            let count = self._active_auction_count.read();
            self._active_auction_index.write(count, domain);
            self._active_auction_domain_to_index.write(domain, count);
            self._active_auction_count.write(count + 1);
            
            self.emit(AuctionCreated { domain, seller: caller, reserve, ends_at, time: now });
            self.reentrancy_guard.end();
        }

        fn bid(ref self: ContractState, domain: felt252, amount: u256) {
            self.reentrancy_guard.start();
            let caller = get_caller_address();
            let now = get_block_timestamp();
            let auc = self._auctions.read(domain);
            assert!(auc.active, "Auction not active");
            assert!(now < auc.ends_at, "Auction ended");

            let min_next = if auc.highest_bid == 0_u256 { auc.reserve } else { auc.highest_bid + auc.min_increment };
            assert!(amount >= min_next, "Bid too low");

            // Transfer funds from bidder
            let mut token = self._token_dispatcher();
            let ok = token.transferFrom(caller, starknet::get_contract_address(), amount);
            assert!(ok, "Transfer failed");

            // Credit refund to previous highest bidder
            if auc.highest_bid != 0_u256 {
                let prev = auc.highest_bidder;
                let bal = self._refundable.read(prev);
                self._refundable.write(prev, bal + auc.highest_bid);
            }

            let mut updated_auc = auc;
            updated_auc.highest_bid = amount;
            updated_auc.highest_bidder = caller;
            self._auctions.write(domain, updated_auc);
            self.emit(BidPlaced { domain, bidder: caller, amount, time: now });
            self.reentrancy_guard.end();
        }

        fn withdraw(ref self: ContractState, domain: felt252) {
            self.reentrancy_guard.start();
            let caller = get_caller_address();
            let amount = self._refundable.read(caller);
            assert!(amount > 0_u256, "Nothing to withdraw");
            self._refundable.write(caller, 0_u256);
            let _auc = self._auctions.read(domain);
            let mut token = self._token_dispatcher();
            let ok = token.transfer(caller, amount);
            assert!(ok, "Refund transfer failed");
            self.emit(RefundWithdrawn { user: caller, amount, time: get_block_timestamp() });
            self.reentrancy_guard.end();
        }

        fn settle(ref self: ContractState, domain: felt252) {
            self.reentrancy_guard.start();
            let _caller = get_caller_address();
            let now = get_block_timestamp();
            let auc = self._auctions.read(domain);
            assert!(auc.active, "Auction not active");
            assert!(now >= auc.ends_at, "Auction not ended");

            let mut updated_auc = auc;
            updated_auc.active = false;
            self._auctions.write(domain, updated_auc);
            
            // Remove from active auction list
            AuctionInternalImpl::_remove_from_active_auctions(ref self, domain);

            if auc.highest_bid == 0_u256 {
                // Return NFT to seller
                self.erc721.transfer_from(starknet::get_contract_address(), auc.seller, auc.token_id);
                self.emit(AuctionCancelled { domain, time: now });
                self.reentrancy_guard.end();
                return ();
            }

            // Transfer NFT to winner
            self.erc721.transfer_from(starknet::get_contract_address(), auc.highest_bidder, auc.token_id);

            // Payout
            let fee_amount = (auc.highest_bid * (self._auction_fee_bps.read().into())) / 10000_u256;
            let seller_amount = auc.highest_bid - fee_amount;
            let mut token = self._token_dispatcher();
            let ok1 = token.transfer(self._auction_fee_recipient.read(), fee_amount);
            let ok2 = token.transfer(auc.seller, seller_amount);
            assert!(ok1 && ok2, "Payout failed");

            self.emit(AuctionSettled { domain, winner: auc.highest_bidder, amount: auc.highest_bid, time: now });
            self.reentrancy_guard.end();
        }

        fn cancel_auction(ref self: ContractState, domain: felt252) {
            self.reentrancy_guard.start();
            let caller = get_caller_address();
            let now = get_block_timestamp();
            let auc = self._auctions.read(domain);
            assert!(auc.active, "Auction not active");
            assert!(auc.seller == caller || caller == self.ownable.owner(), "Not authorized");
            assert!(auc.highest_bid == 0_u256, "Has bids");
            let mut updated_auc = auc;
            updated_auc.active = false;
            self._auctions.write(domain, updated_auc);
            
            // Remove from active auction list
            AuctionInternalImpl::_remove_from_active_auctions(ref self, domain);
            
            // Return NFT
            self.erc721.transfer_from(starknet::get_contract_address(), auc.seller, auc.token_id);
            self.emit(AuctionCancelled { domain, time: now });
            self.reentrancy_guard.end();
        }

        fn get_auction(self: @ContractState, domain: felt252) -> (ContractAddress, u256, u256, u256, u256, ContractAddress, u64, bool) {
            let auc = self._auctions.read(domain);
            (auc.seller, auc.token_id, auc.reserve, auc.min_increment, auc.highest_bid, auc.highest_bidder, auc.ends_at, auc.active)
        }

        fn get_refundable(self: @ContractState, user: ContractAddress) -> u256 {
            self._refundable.read(user)
        }


        fn initialize(ref self: ContractState, name: ByteArray, symbol: ByteArray, base_price: u256, treasury: ContractAddress, payment_token: ContractAddress) {
            self.ownable.assert_only_owner();
            // ERC721 initialization
            self.erc721.initializer(name, symbol, ""); // empty base_uri for now
            
            // BNS specific initialization
            self._base_price.write(base_price);
            self._treasury_addr.write(treasury);
            self._is_mint_active.write(true);
            self._total_supply.write(0);
            self._payment_token_addr.write(payment_token);
        }

        fn get_active_auction_domains(self: @ContractState) -> Array<felt252> {
            let count = self._active_auction_count.read();
            let mut res = ArrayTrait::new();
            let mut i = 0;
            let now = get_block_timestamp();
            
            while i < count {
                let domain = self._active_auction_index.read(i);
                if domain != 0 {
                    // Verify auction is still active
                    let auc = self._auctions.read(domain);
                    if auc.active && now < auc.ends_at {
                        res.append(domain);
                    }
                }
                i += 1;
            };
            res
        }

        // Text Record functions
        fn set_text(ref self: ContractState, domain: felt252, key: felt252, value: felt252) {
            let caller = get_caller_address();
            let domain_info = self.get_domain_info(domain);
            let _zero_address: ContractAddress = 0.try_into().unwrap();
            
            assert!(!domain_info.resolver.is_zero(), "Domain not found");
            assert!(domain_info.resolver == caller, "Not domain owner");
            assert!(!self.is_domain_expired(domain), "Domain expired");
            
            self._text_records.write((domain, key), value);
            
            self.emit(TextRecordUpdated {
                domain: domain,
                key: key,
                value: value,
                updated_by: caller,
                time: get_block_timestamp(),
            });
        }

        fn get_text(self: @ContractState, domain: felt252, key: felt252) -> felt252 {
            self._text_records.read((domain, key))
        }

        fn get_referral_earnings(self: @ContractState, address: ContractAddress) -> u256 {
            self._referrals_earned.read(address)
        }

        // Parameter Governance Implementations
        fn propose_param_change(ref self: ContractState, param_id: u8, value: u256) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            assert!(param_id >= 1 && param_id <= 4, "Invalid param_id");
            
            let proposal_id = self._param_proposal_count.read() + 1;
            self._param_proposal_count.write(proposal_id);
            
            self._param_proposals.write(proposal_id, (param_id, value, 1, false));
            self._param_proposal_confirmations.write((proposal_id, caller), true);
            
            self.emit(ParamProposalCreated { proposal_id, proposer: caller, param_id, value, time: now });
        }

        fn confirm_param_change(ref self: ContractState, proposal_id: u256) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            assert!(!self._param_proposal_confirmations.read((proposal_id, caller)), "Already confirmed");
            
            let (param_id, value, mut confirmations, executed) = self._param_proposals.read(proposal_id);
            assert!(param_id != 0, "Proposal not found");
            assert!(!executed, "Already executed");
            
            confirmations += 1;
            self._param_proposal_confirmations.write((proposal_id, caller), true);
            self._param_proposals.write(proposal_id, (param_id, value, confirmations, executed));
            
            self.emit(ParamProposalConfirmed { proposal_id, confirmer: caller, confirmations, time: now });
        }

        fn execute_param_change(ref self: ContractState, proposal_id: u256) {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            
            assert!(self._treasury_signers.read(caller), "Not a treasury signer");
            
            let (param_id, value, confirmations, executed) = self._param_proposals.read(proposal_id);
            assert!(!executed, "Already executed");
            assert!(confirmations >= self._required_signatures.read(), "Not enough confirmations");
            
            let mut old_value = 0_u256;
            if param_id == 1 {
                old_value = self._base_price.read();
                self._base_price.write(value);
            } else if param_id == 2 {
                old_value = self._auction_fee_bps.read().into();
                self._auction_fee_bps.write(value.try_into().unwrap());
            } else if param_id == 3 {
                old_value = self._grace_period.read().into();
                self._grace_period.write(value.try_into().unwrap());
            } else if param_id == 4 {
                old_value = self._referral_bonus_bps.read().into();
                self._referral_bonus_bps.write(value.try_into().unwrap());
            }
            
            self._param_proposals.write(proposal_id, (param_id, value, confirmations, true));
            self.emit(ParamProposalExecuted { proposal_id, executor: caller, param_id, old_value, new_value: value, time: now });
        }

        fn get_param_proposal(self: @ContractState, proposal_id: u256) -> (u8, u256, u8, bool) {
            self._param_proposals.read(proposal_id)
        }

        fn get_param_proposal_count(self: @ContractState) -> u256 {
            self._param_proposal_count.read()
        }
    }

    // Internal auction helper functions
    #[generate_trait]
    impl AuctionInternalImpl of AuctionInternalTrait {
        // Internal function to remove domain from active auction list
        fn _remove_from_active_auctions(ref self: ContractState, domain: felt252) {
            let count = self._active_auction_count.read();
            if count == 0_u256 {
                return ();
            }
            
            // Find the index of the domain in the list
            let mut found_index = count; // Use count as sentinel (invalid index)
            let mut i = 0;
            while i < count {
                let d = self._active_auction_index.read(i);
                if d == domain {
                    found_index = i;
                    break;
                }
                i += 1;
            };
            
            // If domain not found, return
            if found_index == count {
                return ();
            }
            
            // Get the last domain in the list
            let last_index = count - 1;
            let last_domain = self._active_auction_index.read(last_index);
            
            // Move last domain to found index (swap and pop)
            if found_index != last_index {
                self._active_auction_index.write(found_index, last_domain);
                self._active_auction_domain_to_index.write(last_domain, found_index);
            }
            
            // Remove current domain from mapping
            // Note: We can't use 0 as sentinel since index 0 is valid, so we just don't track removed domains
            // The domain_to_index map will be out of sync for removed domains, but that's okay since we check the list directly
            
            // Clear the last index
            self._active_auction_index.write(last_index, 0);
            
            // Decrement count
            self._active_auction_count.write(last_index);
        }
    }

    // ERC721 Metadata is handled by the component

    // Internal implementations
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _token_dispatcher(self: @ContractState) -> IERC20CamelDispatcher {
            IERC20CamelDispatcher { contract_address: self._payment_token_addr.read() }
        }
        fn _get_domain_length(self: @ContractState, domain: felt252) -> usize {
            // Use shortString length calculation for standard encoding
            let domain_u256: u256 = domain.into();
            if domain_u256 == 0_u256 {
                return 0;
            }
            
            // For shortString encoding, count bytes by checking each byte
            let mut len = 0;
            let mut temp = domain_u256;
            
            // shortString stores up to 31 characters in a felt252
            // Each character takes 8 bits, so we can have up to 31 chars
            while temp != 0_u256 && len < 31 {
                len += 1;
                temp = temp / 256_u256;
            };
            len
        }

        // Pricing functions
        fn compute_buy_price(self: @ContractState, domain_len: usize, years: u16) -> u256 {
            if domain_len >= 5 {
                return self._base_price.read() * years.into();
            }
            if years == 3 {
                return self._base_price.read() * 24;
            }
            if years == 2 {
                return self._base_price.read() * 15;
            }
            if years == 1 {
                return self._base_price.read() * 10;
            }
            return self._base_price.read() * years.into();
        }

        fn compute_renew_price(self: @ContractState, domain_len: usize, years: u16) -> u256 {
            let price = self.compute_buy_price(domain_len, years);
            price / 2
        }

        fn apply_strkdomain_discount(self: @ContractState, price: u256, years: u16) -> u256 {
            // STRK domain holders get 1 year free
            // For 1 year: 100% discount (free)
            // For 2 years: 50% discount (1 year free)
            // For 3 years: 33.33% discount (1 year free)
            if years == 1 {
                return 0; // 1 year is completely free
            } else if years == 2 {
                return price / 2; // 50% discount (1 year free)
            } else if years == 3 {
                // For 3 years, discount is equivalent to 1 year's worth
                let one_year_price = price / 3;
                return price - one_year_price;
            }
            price // No discount for other cases
        }

        fn apply_brother_domain_discount(self: @ContractState, price: u256, years: u16) -> u256 {
            // Brother domain holders get 1 year free (one-time discount)
            // For 1 year: 100% discount (free)
            // For 2 years: 50% discount (1 year free)
            // For 3 years: 33.33% discount (1 year free)
            if years == 1 {
                return 0; // 1 year is completely free
            } else if years == 2 {
                return price / 2; // 50% discount (1 year free)
            } else if years == 3 {
                // For 3 years, discount is equivalent to 1 year's worth
                let one_year_price = price / 3;
                return price - one_year_price;
            }
            price // No discount for other cases
        }

        fn _int_to_char(self: @ContractState, input: u256) -> felt252 {
            if input == 0 {
                return 0x30; // '0'
            } else if input == 1 {
                return 0x31; // '1'
            } else if input == 2 {
                return 0x32; // '2'
            } else if input == 3 {
                return 0x33; // '3'
            } else if input == 4 {
                return 0x34; // '4'
            } else if input == 5 {
                return 0x35; // '5'
            } else if input == 6 {
                return 0x36; // '6'
            } else if input == 7 {
                return 0x37; // '7'
            } else if input == 8 {
                return 0x38; // '8'
            } else if input == 9 {
                return 0x39; // '9'
            }
            0x0
        }
    }

    // Use empty ERC721 hooks implementation
    impl ERC721HooksImpl = ERC721HooksEmptyImpl<ContractState>;

    #[abi(embed_v0)]
    impl UpgradeableImpl of crate::proxy::IUpgradeableContract<ContractState> {
        fn upgrade_to(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            replace_class_syscall(new_class_hash).unwrap();
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.ownable.owner()
        }

        fn change_admin(ref self: ContractState, new_admin: ContractAddress) {
            self.ownable.assert_only_owner();
            self.ownable.transfer_ownership(new_admin);
        }
    }
}