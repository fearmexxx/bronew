'use strict';
const { RpcProvider, Contract } = require('starknet');
const config = require('../config');

const provider = new RpcProvider({ nodeUrl: config.rpcUrl });

// ─── Full ABI for all read-only endpoints ──────────────────────────────────
const BNS_ABI = [
  // Resolution
  {
    type: 'function', name: 'resolve_domain',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
    state_mutability: 'view',
  },
  {
    type: 'function', name: 'get_primary_domain',
    inputs: [{ name: 'address', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'view',
  },
  // Domain info
  {
    type: 'function', name: 'get_domain_info',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'brother_identity::BrotherNamingService::DomainDetails' }],
    state_mutability: 'view',
  },
  {
    type: 'struct', name: 'brother_identity::BrotherNamingService::DomainDetails',
    members: [
      { name: 'handler', type: 'core::felt252' },
      { name: 'resolver', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'token_id', type: 'core::integer::u256' },
      { name: 'expiry_date', type: 'core::integer::u64' },
      { name: 'last_transfer_time', type: 'core::integer::u64' },
      { name: 'parent_domain', type: 'core::felt252' },
      { name: 'is_subdomain', type: 'core::bool' },
    ],
  },
  // Availability & expiry
  {
    type: 'function', name: 'is_domain_available',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
  {
    type: 'function', name: 'is_domain_expired',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
  // Verification
  {
    type: 'function', name: 'is_verified',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
  // Full profile
  {
    type: 'function', name: 'get_full_profile',
    inputs: [{ name: 'domain', type: 'core::felt252' }],
    outputs: [{ type: 'brother_identity::BrotherNamingService::FullProfile' }],
    state_mutability: 'view',
  },
  {
    type: 'struct', name: 'brother_identity::BrotherNamingService::FullProfile',
    members: [
      { name: 'domain_details', type: 'brother_identity::BrotherNamingService::DomainDetails' },
      { name: 'avatar', type: 'core::felt252' },
      { name: 'twitter', type: 'core::felt252' },
      { name: 'discord', type: 'core::felt252' },
      { name: 'url', type: 'core::felt252' },
      { name: 'description', type: 'core::felt252' },
    ],
  },
  // Text records
  {
    type: 'function', name: 'get_text',
    inputs: [
      { name: 'domain', type: 'core::felt252' },
      { name: 'key', type: 'core::felt252' },
    ],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'view',
  },
  // Subdomains
  {
    type: 'function', name: 'get_subdomains',
    inputs: [{ name: 'parent_domain', type: 'core::felt252' }],
    outputs: [{ type: 'core::array::Array::<core::felt252>' }],
    state_mutability: 'view',
  },
  // Domains of address
  {
    type: 'function', name: 'get_domains_of',
    inputs: [{ name: 'owner', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::array::Array::<core::felt252>' }],
    state_mutability: 'view',
  },
];

const contract = new Contract(BNS_ABI, config.bnsContractAddress, provider);

module.exports = { provider, contract };
