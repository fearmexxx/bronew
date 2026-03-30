use starknet::ContractAddress;
use starknet::contract_address_const;
use openzeppelin::token::erc20::interface::IERC20CamelDispatcher;


fn brother_contract() -> IERC20CamelDispatcher {
    IERC20CamelDispatcher {
        contract_address: contract_address_const::<
            0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee
        >(),
    }
}

#[starknet::contract]
mod BrotherIdentity {
    use core::array::ArrayTrait;
    use core::traits::Into;
    use integer::{u256_from_felt252, U64IntoFelt252};
    use super::{brother_contract};
    use starknet::ContractAddress;
    use starknet::{
        get_caller_address, get_block_timestamp, get_contract_address, contract_address_const
    };
    use starknet::class_hash::ClassHash;
    use core::bool;
    use core::Zeroable;
    use openzeppelin::account;
    use openzeppelin::access::ownable;

    use pyramidlp::introspection::dual_src5::DualCaseSRC5;
    use pyramidlp::introspection::dual_src5::DualCaseSRC5Trait;
    use pyramidlp::introspection::interface::ISRC5;
    use pyramidlp::introspection::interface::ISRC5Camel;
    use pyramidlp::introspection::src5;
    use pyramidlp::introspection::interface::{ISRC5Dispatcher, ISRC5DispatcherTrait};

    use openzeppelin::token::erc721::dual721_receiver::DualCaseERC721Receiver;
    use openzeppelin::token::erc721::dual721_receiver::DualCaseERC721ReceiverTrait;
    use openzeppelin::token::erc721::interface;
    use openzeppelin::token::erc20::interface::IERC20CamelDispatcherTrait;
    use openzeppelin::token::erc20::interface::IERC20CamelDispatcher;
    use pyramidlp::interface::IBrotherIdentity::{IERC721CamelOnly, DomainDetails};
    use integer::{u256_safe_divmod, u256_as_non_zero};
    use openzeppelin::{upgrades::{Upgradeable, interface::IUpgradeable},};

    #[storage]
    struct Storage {
        _name: felt252,
        _symbol: felt252,
        _owners: LegacyMap<u256, ContractAddress>,
        _balances: LegacyMap<ContractAddress, u256>,
        _token_approvals: LegacyMap<u256, ContractAddress>,
        _operator_approvals: LegacyMap<(ContractAddress, ContractAddress), bool>,
        _owner: ContractAddress,
        _base_uri_parts: LegacyMap<u8, felt252>,
        _total_supply: u256,
        _is_mint_active: bool,
        _treasury_addr: ContractAddress,
        _basePrice: u256,
        _token_id_to_domain: LegacyMap<u256, felt252>,
        _userPrimaryDomain: LegacyMap<ContractAddress, felt252>,
        _domain_to_details: LegacyMap<felt252, DomainDetails>,
        _reentrancy_guard_entered: bool,
        #[substorage(v0)]
        upgradeable: Upgradeable::Storage
    }

    impl UpgradeableInternalImpl = Upgradeable::InternalImpl<ContractState>;
    component!(path: Upgradeable, storage: upgradeable, event: UpgradeableEvent);


    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        NewDomainregistered: NewDomainregistered,
        DomainUpdated: DomainUpdated,
        DomainRenewed: DomainRenewed,
        Transfer: Transfer,
        Approval: Approval,
        ApprovalForAll: ApprovalForAll,
        OwnershipTransferred: OwnershipTransferred,
        #[flat]
        UpgradeableEvent: Upgradeable::Event
    }

    #[derive(Drop, starknet::Event)]
    struct NewDomainregistered {
        tokenId: u256,
        domain: felt252,
        registerer: ContractAddress,
        expiryDate: u64,
        time: u64,
    }


    #[derive(Drop, starknet::Event)]
    struct DomainUpdated {
        tokenId: u256,
        domain: felt252,
        old_address: ContractAddress,
        new_address: ContractAddress,
        time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DomainRenewed {
        tokenId: u256,
        domain: felt252,
        registerer: ContractAddress,
        expiryDate: u64,
        time: u64,
    }


    #[derive(Drop, starknet::Event)]
    struct OwnershipTransferred {
        previous_owner: ContractAddress,
        new_owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        approved: ContractAddress,
        token_id: u256
    }

    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool
    }

    mod Errors {
        const INVALID_TOKEN_ID: felt252 = 'ERC721: invalid token ID';
        const INVALID_ACCOUNT: felt252 = 'ERC721: invalid account';
        const UNAUTHORIZED: felt252 = 'ERC721: unauthorized caller';
        const APPROVAL_TO_OWNER: felt252 = 'ERC721: approval to owner';
        const SELF_APPROVAL: felt252 = 'ERC721: self approval';
        const INVALID_RECEIVER: felt252 = 'ERC721: invalid receiver';
        const ALREADY_MINTED: felt252 = 'ERC721: token already minted';
        const WRONG_SENDER: felt252 = 'ERC721: wrong sender';
        const SAFE_MINT_FAILED: felt252 = 'ERC721: safe mint failed';
        const SAFE_TRANSFER_FAILED: felt252 = 'ERC721: safe transfer failed';
        const REENTRANT_CALL: felt252 = 'ReentrancyGuard: reentrant call';
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.initializer('BrotherId', 'BID');
        self._owner.write(owner);
    }

    //
    // External
    //

    #[external(v0)]
    impl SRC5Impl of ISRC5Camel<ContractState> {
        fn supportsInterface(self: @ContractState, interfaceId: felt252) -> bool {
            let unsafe_state = src5::SRC5::unsafe_new_contract_state();
            src5::SRC5::SRC5Impl::supports_interface(@unsafe_state, interfaceId)
        }
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.assert_only_owner();
            self.upgradeable._upgrade(new_class_hash);
        }
    }

    #[starknet::interface]
    trait IERC721MetadataFeltArray<TState> {
        fn name(self: @TState) -> felt252;
        fn symbol(self: @TState) -> felt252;
        fn tokenUri(self: @TState, token_id: u256) -> Array<felt252>;
    }

    #[external(v0)]
    impl ERC721MetadataImpl of IERC721MetadataFeltArray<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self._name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self._symbol.read()
        }

        fn tokenUri(self: @ContractState, token_id: u256) -> Array<felt252> {
            assert(self._exists(token_id), Errors::INVALID_TOKEN_ID);
            self._token_uri(token_id)
        }
    }

    #[external(v0)]
    impl ERC721Impl of IERC721CamelOnly<ContractState> {
        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            assert(!account.is_zero(), Errors::INVALID_ACCOUNT);
            self._balances.read(account)
        }
        fn totalSupply(self: @ContractState) -> u256 {
            self._total_supply.read()
        }

        fn ownerOf(self: @ContractState, tokenId: u256) -> ContractAddress {
            self._owner_of(tokenId)
        }

        fn getApproved(self: @ContractState, tokenId: u256) -> ContractAddress {
            assert(self._exists(tokenId), Errors::INVALID_TOKEN_ID);
            self._token_approvals.read(tokenId)
        }

        fn isApprovedForAll(
            self: @ContractState, owner: ContractAddress, operator: ContractAddress
        ) -> bool {
            self._operator_approvals.read((owner, operator))
        }


        fn setApprovalForAll(ref self: ContractState, operator: ContractAddress, approved: bool) {
            self._set_approval_for_all(get_caller_address(), operator, approved)
        }

        fn transferFrom(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, tokenId: u256
        ) {
            assert(
                self._is_approved_or_owner(get_caller_address(), tokenId), Errors::UNAUTHORIZED,
            );
            self._transfer(from, to, tokenId);
        }

        fn safeTransferFrom(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            tokenId: u256,
            data: Span<felt252>,
        ) {
            assert(
                self._is_approved_or_owner(get_caller_address(), tokenId), Errors::UNAUTHORIZED,
            );
            self._safe_transfer(from, to, tokenId, data);
        }
    }

    #[external(v0)]
    fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
        let owner = self._owner_of(token_id);

        let caller = get_caller_address();
        assert(
            owner == caller || ERC721Impl::isApprovedForAll(@self, owner, caller),
            Errors::UNAUTHORIZED,
        );
        self._approve(to, token_id);
    }

    #[starknet::interface]
    trait NFT<TState> {
        fn get_treasury(self: @TState) -> ContractAddress;
        fn get_domain_by_tokenId(self: @TState, tokenId: u256) -> DomainDetails;
        fn get_details_by_domain(self: @TState, domain: felt252) -> DomainDetails;
        fn get_is_domain_available(self: @TState, domain: felt252) -> bool;
        fn register_domain(ref self: TState, domain: felt252, years: u8, resolver: ContractAddress);
        fn renew_domain(ref self: TState, domain: felt252, years: u8);
        fn set_basePrice(ref self: TState, price: u256);
        fn set_treasury(ref self: TState, treasury: ContractAddress);
        fn set_isMintActive(ref self: TState, status: bool);
        fn burn(ref self: TState, tokenId: u256);
        fn setPrimary(ref self: TState, domain: felt252);
        fn getPrimary(self: @TState, user: ContractAddress) -> felt252;
        fn set_base_uri_parts(ref self: TState, new_base_uri_parts: Array<felt252>);
    }


    #[starknet::interface]
    trait IPricing<TContractState> {
        fn compute_buy_price(self: @TContractState, domain_len: usize, years: u16) -> u256;

        fn compute_renew_price(self: @TContractState, domain_len: usize, years: u16) -> u256;
    }

    #[external(v0)]
    impl PricingImpl of IPricing<ContractState> {
        fn compute_buy_price(self: @ContractState, domain_len: usize, years: u16) -> u256 {
            if (domain_len >= 5) {
                return self._basePrice.read() * years.into();
            }
            if (years == 3) {
                return self._basePrice.read() * 24;
            }
            if (years == 2) {
                return self._basePrice.read() * 15;
            }
            if (years == 1) {
                return self._basePrice.read() * 10;
            }

            return self._basePrice.read() * years.into();
        }

        fn compute_renew_price(self: @ContractState, domain_len: usize, years: u16) -> u256 {
            let price = self.compute_buy_price(domain_len, years);
            price / 2
        }
    }


    #[external(v0)]
    impl NFTImpl of NFT<ContractState> {
        fn getPrimary(self: @ContractState, user: ContractAddress) -> felt252 {
            let caller = get_caller_address();
            self._userPrimaryDomain.read(user)
        }

        fn setPrimary(ref self: ContractState, domain: felt252) {
            let caller = get_caller_address();
            let domainInfo = self.get_details_by_domain(domain);
            assert(domainInfo.resolver == caller, 'owners must be same');
            self._userPrimaryDomain.write(caller, domain);
        }

        fn set_basePrice(ref self: ContractState, price: u256) {
            self.assert_only_owner();
            self._basePrice.write(price);
        }

        fn set_base_uri_parts(ref self: ContractState, new_base_uri_parts: Array<felt252>) {
            self.assert_only_owner();

            self._set_base_uri_parts(new_base_uri_parts);
        }

        fn burn(ref self: ContractState, tokenId: u256) {
            let owner = self._owner_of(tokenId);
            let caller = get_caller_address();
            assert(owner == caller, Errors::UNAUTHORIZED);

            self._burn(tokenId);
        }

        fn get_is_domain_available(self: @ContractState, domain: felt252) -> bool {
            let domainInfo = self.get_details_by_domain(domain);
            if (domainInfo.resolver.is_zero() == bool::True) {
                return bool::True;
            }
            return bool::False;
        }

        fn register_domain(
            ref self: ContractState, domain: felt252, years: u8, resolver: ContractAddress
        ) {
            self._start();
            let msg_sender = get_caller_address();
            let now = get_block_timestamp();
            let isMintActive = self._is_mint_active.read();
            assert(isMintActive == bool::True, 'minting disabled');
            let isDomainAvailable = self.get_is_domain_available(domain);
            assert(isDomainAvailable == bool::True, 'domain already registered');

            let oldDomainInfo = self._domain_to_details.read(domain);
            if (oldDomainInfo.token_id != u256 { low: 0, high: 0 }) {
                self._burn(oldDomainInfo.token_id);
            }

            assert(years >= 1, 'cant register less than 1 year');
            assert(years <= 3, 'cant register more than 3 year');

            let expiry = now + (31556926 * years.into());
            let tokenId = self._total_supply.read() + now.into();
            let newDomainDetails = DomainDetails {
                handler: domain,
                resolver: resolver,
                token_id: tokenId,
                expiry_date: expiry,
                last_transfer_time: now,
            };
            let domain_len = self.get_chars_len(domain.into());
            assert(domain_len > 3, 'must be at least 4 chars');

            let price = self.compute_buy_price(domain_len, years.into());
            let treasury = self._treasury_addr.read();

            self._userPrimaryDomain.write(resolver, domain);

            let success = brother_contract().transferFrom(get_caller_address(), treasury, price);
            assert(success == bool::True, 'transfer failed');

            self._token_id_to_domain.write(tokenId, domain);
            self._domain_to_details.write(domain, newDomainDetails);

            self._mint(resolver, tokenId);
            self
                .emit(
                    NewDomainregistered {
                        tokenId: tokenId,
                        domain: domain,
                        registerer: resolver,
                        expiryDate: expiry,
                        time: now
                    }
                );
            self._end();
        }

        fn renew_domain(ref self: ContractState, domain: felt252, years: u8) {
            self._start();

            let caller = get_caller_address();
            let domainInfo = self.get_details_by_domain(domain);
            let ownerOfDomain = self.ownerOf(domainInfo.token_id);
            let now = get_block_timestamp();
            assert(ownerOfDomain == caller, 'only owner can renew');
            assert(
                domainInfo.resolver == contract_address_const::<0>()
                    || domainInfo.resolver == caller,
                'can renew when not re-purchased'
            );

            assert(years >= 1, 'cant renew less than 1 year');

            let mut remainingUsage = 0;
            if (domainInfo.expiry_date > now) {
                remainingUsage = domainInfo.expiry_date - now;
            }
            let expiry = now + (31556926 * years.into()) + remainingUsage;

            let newDomainDetails = DomainDetails {
                handler: domainInfo.handler,
                resolver: domainInfo.resolver,
                token_id: domainInfo.token_id,
                expiry_date: expiry,
                last_transfer_time: domainInfo.last_transfer_time,
            };

            let domain_len = self.get_chars_len(domain.into());
            let price = self.compute_renew_price(domain_len, years.into());
            let treasury = self._treasury_addr.read();
            let success = brother_contract().transferFrom(get_caller_address(), treasury, price);
            assert(success == bool::True, 'transfer failed');

            self._domain_to_details.write(domain, newDomainDetails);

            self
                .emit(
                    DomainRenewed {
                        tokenId: domainInfo.token_id,
                        domain: domain,
                        registerer: caller,
                        expiryDate: expiry,
                        time: now
                    }
                );

            self._end();
        }

        fn get_treasury(self: @ContractState) -> ContractAddress {
            self._treasury_addr.read()
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self.assert_only_owner();
            self._treasury_addr.write(treasury);
        }

        fn set_isMintActive(ref self: ContractState, status: bool) {
            self.assert_only_owner();
            self._is_mint_active.write(status);
        }

        fn get_domain_by_tokenId(self: @ContractState, tokenId: u256) -> DomainDetails {
            let domain = self._token_id_to_domain.read(tokenId);
            self.get_details_by_domain(domain)
        }

        fn get_details_by_domain(self: @ContractState, domain: felt252) -> DomainDetails {
            let domainInfo = self._domain_to_details.read(domain);
            let now = get_block_timestamp();

            if (domainInfo.expiry_date < now) {
                //domain expired
                let expiredDomain = DomainDetails {
                    handler: domain,
                    resolver: contract_address_const::<0>(),
                    token_id: domainInfo.token_id,
                    expiry_date: 0,
                    last_transfer_time: 0,
                };
                return expiredDomain;
            }
            domainInfo
        }
    }

    //
    // Internal
    //

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn initializer(ref self: ContractState, name_: felt252, symbol_: felt252) {
            self._name.write(name_);
            self._symbol.write(symbol_);

            let mut unsafe_state = src5::SRC5::unsafe_new_contract_state();
            src5::SRC5::InternalImpl::register_interface(ref unsafe_state, interface::IERC721_ID);
            src5::SRC5::InternalImpl::register_interface(ref unsafe_state, 0x5b5e139f);
            src5::SRC5::InternalImpl::register_interface(
                ref unsafe_state, interface::IERC721_METADATA_ID
            );
        }

        fn _owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self._owners.read(token_id);
            match owner.is_zero() {
                bool::False(()) => owner,
                bool::True(()) => panic_with_felt252(Errors::INVALID_TOKEN_ID)
            }
        }

        fn _exists(self: @ContractState, token_id: u256) -> bool {
            !self._owners.read(token_id).is_zero()
        }

        fn _is_approved_or_owner(
            self: @ContractState, spender: ContractAddress, token_id: u256
        ) -> bool {
            let owner = self._owner_of(token_id);
            let is_approved_for_all = ERC721Impl::isApprovedForAll(self, owner, spender);
            owner == spender
                || is_approved_for_all
                || spender == ERC721Impl::getApproved(self, token_id)
        }

        fn _approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let owner = self._owner_of(token_id);
            assert(owner != to, Errors::APPROVAL_TO_OWNER);

            self._token_approvals.write(token_id, to);
            self.emit(Approval { owner, approved: to, token_id });
        }

        fn _set_approval_for_all(
            ref self: ContractState,
            owner: ContractAddress,
            operator: ContractAddress,
            approved: bool,
        ) {
            assert(owner != operator, Errors::SELF_APPROVAL);
            self._operator_approvals.write((owner, operator), approved);
            self.emit(ApprovalForAll { owner, operator, approved });
        }

        fn _mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            assert(!to.is_zero(), Errors::INVALID_RECEIVER);
            assert(!self._exists(token_id), Errors::ALREADY_MINTED);

            self._balances.write(to, self._balances.read(to) + 1);
            self._owners.write(token_id, to);
            self._total_supply.write(self._total_supply.read() + 1);

            self.emit(Transfer { from: Zeroable::zero(), to, token_id: token_id });
        }

        fn _transfer(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
        ) {
            assert(!to.is_zero(), Errors::INVALID_RECEIVER);
            let owner = self._owner_of(token_id);
            assert(from == owner, Errors::WRONG_SENDER);

            let old_domain_details: DomainDetails = self.get_domain_by_tokenId(token_id);
            let now = get_block_timestamp();

            assert(old_domain_details.expiry_date > now, 'expired domains cannot transfer');

            let new_domain_data: DomainDetails = DomainDetails {
                handler: old_domain_details.handler,
                resolver: to,
                token_id: token_id,
                expiry_date: old_domain_details.expiry_date,
                last_transfer_time: now,
            };

            self._domain_to_details.write(old_domain_details.handler, new_domain_data);

            //balance update
            self._balances.write(from, self._balances.read(from) - 1);
            self._balances.write(to, self._balances.read(to) + 1);

            let balanceOfFrom = self._balances.read(from);
            if (balanceOfFrom >= 1) {
                let isPrimaryDomainOfSender = self._userPrimaryDomain.read(from);
                if (isPrimaryDomainOfSender == old_domain_details.handler) {
                    self._userPrimaryDomain.write(from, 0);
                }
            } else {
                self._userPrimaryDomain.write(from, 0);
            }

            self
                .emit(
                    DomainUpdated {
                        tokenId: token_id,
                        domain: old_domain_details.handler,
                        old_address: from,
                        new_address: to,
                        time: now,
                    }
                );

            // Implicit clear approvals, no need to emit an event
            self._token_approvals.write(token_id, Zeroable::zero());

            self._owners.write(token_id, to);

            self.emit(Transfer { from, to, token_id });
        }

        fn _burn(ref self: ContractState, token_id: u256) {
            let owner = self._owner_of(token_id);

            // Implicit clear approvals, no need to emit an event
            self._token_approvals.write(token_id, Zeroable::zero());

            self._balances.write(owner, self._balances.read(owner) - 1);
            self._owners.write(token_id, Zeroable::zero());
            self._total_supply.write(self._total_supply.read() - 1);

            self.emit(Transfer { from: owner, to: Zeroable::zero(), token_id });
        }


        fn _safe_transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            data: Span<felt252>,
        ) {
            self._transfer(from, to, token_id);
            assert(
                _check_on_erc721_received(from, to, token_id, data), Errors::SAFE_TRANSFER_FAILED
            );
        }

        fn assert_only_owner(self: @ContractState) {
            let owner: ContractAddress = self._owner.read();
            let caller: ContractAddress = get_caller_address();
            assert(caller == owner, 'Caller is not the owner');
        }

        fn _transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            let previous_owner: ContractAddress = self._owner.read();
            self._owner.write(new_owner);
            self
                .emit(
                    OwnershipTransferred { previous_owner: previous_owner, new_owner: new_owner }
                );
        }

        fn _token_uri(self: @ContractState, token_id: u256) -> Array::<felt252> {
            let tokenFile: felt252 = token_id.try_into().unwrap();

            let mut link = ArrayTrait::<felt252>::new();

            let mut j: u8 = 0;

            loop {
                let base_uri_part = self._base_uri_parts.read(j);

                if base_uri_part.is_zero() {
                    break;
                }

                link.append(base_uri_part);

                j += 1;
            };

            if (tokenFile == 0) {
                link.append(0x30);
                return link;
            }

            let mut revNumber: u256 = 0;
            let mut currentInt: u256 = token_id * 10 + 1;
            loop {
                revNumber = revNumber * 10 + currentInt % 10;
                currentInt = currentInt / 10_u256;
                if currentInt < 1 {
                    break;
                };
            };
            loop {
                let lastChar: u256 = revNumber % 10_u256;
                link.append(self._intToChar(lastChar));
                revNumber = revNumber / 10_u256;
                if revNumber < 2 {
                    break;
                };
            };
            link
        }


        fn _set_base_uri_parts(ref self: ContractState, new_base_uri_parts: Array<felt252>) {
            assert(new_base_uri_parts.len() != 0, 'Base URI cannot be empty');
            assert(new_base_uri_parts.len() < 256, 'Max length is 256x32 bytes');

            // Remove old base URI parts.
            let mut j: u8 = 0;

            loop {
                if self._base_uri_parts.read(j).is_zero() {
                    break;
                }
                self._base_uri_parts.write(j, Zeroable::zero());
                j += 1;
            };

            // Set new base URI parts.
            let mut i: u8 = 0;

            loop {
                if i.into() == new_base_uri_parts.len() {
                    break;
                }

                let _uri_part = new_base_uri_parts.at(i.into());
                self._base_uri_parts.write(i, _uri_part.clone());

                i += 1;
            }
        }


        fn _start(ref self: ContractState) {
            assert(!self._reentrancy_guard_entered.read(), Errors::REENTRANT_CALL);
            self._reentrancy_guard_entered.write(true);
        }

        fn _end(ref self: ContractState) {
            self._reentrancy_guard_entered.write(false);
        }


        fn get_chars_len(self: @ContractState, domain: u256) -> usize {
            if domain == (u256 { low: 0, high: 0 }) {
                return 0;
            };
            // 38 = simple_alphabet_size
            let (p, q, _) = u256_safe_divmod(domain, u256_as_non_zero(u256 { low: 38, high: 0 }));
            if q == (u256 { low: 37, high: 0 }) {
                // 3 = complex_alphabet_size
                let (shifted_p, _, _) = u256_safe_divmod(
                    p, u256_as_non_zero(u256 { low: 2, high: 0 })
                );
                let next = self.get_chars_len(shifted_p);
                return 1 + next;
            };
            let next = self.get_chars_len(p);
            1 + next
        }
    }


    #[external(v0)]
    impl OwnableImpl of ownable::interface::IOwnable<ContractState> {
        fn owner(self: @ContractState) -> ContractAddress {
            self._owner.read()
        }

        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            assert(!new_owner.is_zero(), 'New owner is the zero address');
            self.assert_only_owner();
            self._transfer_ownership(new_owner);
        }

        fn renounce_ownership(ref self: ContractState) {
            self.assert_only_owner();
            self._transfer_ownership(Zeroable::zero());
        }
    }

    #[generate_trait]
    impl BaseHelperImpl of BaseHelperTrait {
        fn _intToChar(self: @ContractState, input: u256) -> felt252 {
            if input == 0 {
                return 0x30;
            } else if input == 1 {
                return 0x31;
            } else if input == 2 {
                return 0x32;
            } else if input == 3 {
                return 0x33;
            } else if input == 4 {
                return 0x34;
            } else if input == 5 {
                return 0x35;
            } else if input == 6 {
                return 0x36;
            } else if input == 7 {
                return 0x37;
            } else if input == 8 {
                return 0x38;
            } else if input == 9 {
                return 0x39;
            }
            0x0
        }
    }

    fn _check_on_erc721_received(
        from: ContractAddress, to: ContractAddress, token_id: u256, data: Span<felt252>
    ) -> bool {
        if (DualCaseSRC5 { contract_address: to }
            .supports_interface(interface::IERC721_RECEIVER_ID)) {
            DualCaseERC721Receiver { contract_address: to }
                .on_erc721_received(
                    get_caller_address(), from, token_id, data
                ) == interface::IERC721_RECEIVER_ID
        } else {
            DualCaseSRC5 { contract_address: to }.supports_interface(account::interface::ISRC6_ID)
        }
    }
}
