"use client";
import { useCallback, useMemo } from "react";
import { Abi, Contract, RpcProvider, shortString, hash, validateAndParseAddress } from "starknet";
import { toast } from "react-hot-toast";
import { useAccount } from "../starknet/StarknetProvider";
import { BNS_CONTRACT_ADDRESS, BROTHER_TOKEN_ADDRESS, provider } from "../constants";
import { callLatest } from "../starknet/contractView";

const BNS_ABI: Abi = [
  { type: "function", name: "is_domain_available", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [{ type: "core::bool" }], state_mutability: "view" },
  { type: "function", name: "get_domain_price", inputs: [{ name: "domain", type: "core::felt252" }, { name: "years", type: "core::integer::u8" }], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
  { type: "function", name: "get_domain_info", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [
    { type: "core::felt252", name: "handler" },
    { type: "core::starknet::contract_address::ContractAddress", name: "resolver" },
    { type: "core::integer::u256", name: "token_id" },
    { type: "core::integer::u64", name: "expiry_date" },
    { type: "core::integer::u64", name: "last_transfer_time" },
    { type: "core::felt252", name: "parent_domain" },
    { type: "core::bool", name: "is_subdomain" }
  ], state_mutability: "view" },
  { type: "function", name: "get_domains_of", inputs: [{ name: "owner", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::array::Array::<core::felt252>" }], state_mutability: "view" },
  { type: "function", name: "is_verified", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [{ type: "core::bool" }], state_mutability: "view" },
  { type: "function", name: "get_domain_svg", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [{ type: "core::byte_array::ByteArray" }], state_mutability: "view" },
  { type: "function", name: "get_full_profile", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [
    { type: "brother_identity::BrotherNamingService::FullProfile" }
  ], state_mutability: "view" },
  { type: "struct", name: "brother_identity::BrotherNamingService::FullProfile", members: [
    { name: "domain_details", type: "brother_identity::BrotherNamingService::DomainDetails" },
    { name: "avatar", type: "core::felt252" },
    { name: "twitter", type: "core::felt252" },
    { name: "discord", type: "core::felt252" },
    { name: "url", type: "core::felt252" },
    { name: "description", type: "core::felt252" }
  ]},
  { type: "function", name: "register_domain", inputs: [
    { name: "domain", type: "core::felt252" },
    { name: "years", type: "core::integer::u8" },
    { name: "resolver", type: "core::starknet::contract_address::ContractAddress" },
    { name: "has_strkdomain", type: "core::bool" },
    { name: "has_brother_domain", type: "core::bool" },
    { name: "referrer", type: "core::starknet::contract_address::ContractAddress" }
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "get_referral_earnings", inputs: [{ name: "address", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
  { type: "function", name: "propose_param_change", inputs: [{ name: "param_id", type: "core::integer::u8" }, { name: "value", type: "core::integer::u256" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "confirm_param_change", inputs: [{ name: "proposal_id", type: "core::integer::u256" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "execute_param_change", inputs: [{ name: "proposal_id", type: "core::integer::u256" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "get_param_proposal", inputs: [{ name: "proposal_id", type: "core::integer::u256" }], outputs: [
    { type: "core::integer::u8", name: "param_id" },
    { type: "core::integer::u256", name: "value" },
    { type: "core::integer::u8", name: "confirmations" },
    { type: "core::bool", name: "executed" }
  ], state_mutability: "view" },
  { type: "function", name: "get_param_proposal_count", inputs: [], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
  { type: "function", name: "get_base_price", inputs: [], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
  { type: "function", name: "get_treasury", inputs: [], outputs: [{ type: "core::starknet::contract_address::ContractAddress" }], state_mutability: "view" },
  { type: "function", name: "set_text", inputs: [
    { name: "domain", type: "core::felt252" },
    { name: "key", type: "core::felt252" },
    { name: "value", type: "core::felt252" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "get_text", inputs: [
    { name: "domain", type: "core::felt252" },
    { name: "key", type: "core::felt252" },
  ], outputs: [{ type: "core::felt252" }], state_mutability: "view" },
  { type: "function", name: "owner_of", inputs: [{ name: "token_id", type: "core::integer::u256" }], outputs: [{ type: "core::starknet::contract_address::ContractAddress" }], state_mutability: "view" },
  { type: "function", name: "set_primary_domain", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "get_primary_domain", inputs: [{ name: "address", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::felt252" }], state_mutability: "view" },
  { type: "function", name: "transfer_domain", inputs: [{ name: "domain", type: "core::felt252" }, { name: "to", type: "core::starknet::contract_address::ContractAddress" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "renew_domain", inputs: [{ name: "domain", type: "core::felt252" }, { name: "years", type: "core::integer::u8" }], outputs: [], state_mutability: "external" },
];

const ERC20_MIN_ABI: Abi = [
  { type: "function", name: "approve", inputs: [
    { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
    { name: "amount", type: "core::integer::u256" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "allowance", inputs: [
    { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
  ], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
];

export function useBns() {
  const contract = useMemo(() => new Contract({ abi: BNS_ABI, address: BNS_CONTRACT_ADDRESS, providerOrAccount: provider as RpcProvider }), []);
  const tokenContract = useMemo(() => new Contract({ abi: ERC20_MIN_ABI, address: BROTHER_TOKEN_ADDRESS, providerOrAccount: provider as RpcProvider }), []);
  const { account, address, isConnected } = useAccount();

  // Helper for safe shortString decoding
  const safeDecode = useCallback((felt: any): string => {
    if (!felt || felt === '0x0' || felt === 0 || felt === 0n) return "";
    try {
      const decoded = shortString.decodeShortString(felt);
      // Filter out non-printable/weird control characters
      const clean = decoded.replace(/[^\x20-\x7E]/g, '').trim();
      
      // Strict artifact check: Corrupted URLs often turn into random string fragments
      const lower = clean.toLowerCase();
      if (lower === "il" || lower === "ih" || lower === "aa" || lower === "aaa") {
        console.log("SafeDecode identified short artifact:", clean);
        return "";
      }
      
      // if it's 3+ chars and ONLY uppercase letters (A-Z), it is almost certainly a corrupted FELT shard
      if (clean.length >= 3 && /^[A-Z]+$/.test(clean)) {
        console.log("SafeDecode identified long artifact:", clean);
        return "";
      }
      
      // If it looks like a hex string that was partially decoded (lots of V, X, A, N, etc)
      if (clean.length > 5 && /^[A-Z0-9]+$/.test(clean)) {
        console.log("SafeDecode identified hex artifact:", clean);
        return "";
      }

      return clean;
    } catch (e) {
      return "";
    }
  }, []);

  const normalizeBool = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "bigint") return value === BigInt(1);
    if (value && typeof value === "object") {
      const v: any = value as any;
      if ("True" in v) return true;
      if ("False" in v) return false;
      if ("value" in v) return normalizeBool(v.value);
    }
    return false;
  };

  const u256ToBigInt = (u256: any): bigint => {
    if (typeof u256 === 'bigint') {
      return u256;
    }
    if (typeof u256 === 'string' || typeof u256 === 'number') {
      return BigInt(u256);
    }
    if (u256 && typeof u256 === 'object') {
      const low = BigInt(u256.low ?? u256.lowValue ?? 0);
      const high = BigInt(u256.high ?? u256.highValue ?? 0);
      return (high << BigInt(128)) + low;
    }
    return BigInt(0);
  };

  const bigIntToU256Parts = (value: bigint): { low: string; high: string } => {
    const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
    const low = value & mask;
    const high = value >> BigInt(128);
    return { low: low.toString(), high: high.toString() };
  };

  const u256ToHex = (u256: any): string => {
    try {
      const lowValue = BigInt(typeof u256.low === 'string' || typeof u256.low === 'number' ? u256.low : (u256.low ?? 0));
      const highValue = BigInt(typeof u256.high === 'string' || typeof u256.high === 'number' ? u256.high : (u256.high ?? 0));
      const twoPow128 = BigInt(2) ** BigInt(128);
      const value = highValue * twoPow128 + lowValue;
      return "0x" + value.toString(16);
    } catch (error) {
      if (typeof u256 === "string") return u256;
      return "0x0";
    }
  };

  const isAvailable = useCallback(async (name: string) => {
    if (!name || name.length < 4) return false;
    const domain = shortString.encodeShortString(name);
    const res: any = await callLatest(contract, 'is_domain_available', [domain]);
    return normalizeBool(res);
  }, [contract]);

  const getPrice = useCallback(async (name: string, years: number) => {
    if (!name || years <= 0) return "0";
    const domain = shortString.encodeShortString(name);
    try {
      const price: any = await callLatest(contract, 'get_domain_price', [domain, years]);
      if (typeof price === 'bigint') {
        return "0x" + price.toString(16);
      } else if (typeof price === 'string') {
        return price;
      } else if (price && (price.low !== undefined || price.high !== undefined)) {
        return u256ToHex(price);
      } else {
        try {
          const bigIntPrice = BigInt(price);
          return "0x" + bigIntPrice.toString(16);
        } catch {
          return "0x0";
        }
      }
    } catch {
      return "0x0";
    }
  }, [contract]);

  const getUserDomains = useCallback(async (userAddress: string) => {
    if (!userAddress) return [];
    try {
      // 1. Get raw list from contract index
      const result: any = await provider.callContract({
        contractAddress: BNS_CONTRACT_ADDRESS,
        entrypoint: "get_domains_of",
        calldata: [userAddress]
      }, 'latest');
      
      let domainsArray = null;
      if (Array.isArray(result)) {
        domainsArray = result;
      } else if (result.result && Array.isArray(result.result)) {
        domainsArray = result.result;
      } else if (result.data && Array.isArray(result.data)) {
        domainsArray = result.data;
      }

      if (domainsArray && Array.isArray(domainsArray)) {
        const seen = new Set<string>();
        const potentialDomains = domainsArray
          .map((domain: any) => {
            let domainStr = '';
            if (typeof domain === 'string' && domain.startsWith('0x')) {
              domainStr = BigInt(domain).toString();
            } else {
              domainStr = String(domain);
            }
            if (domainStr === '0' || BigInt(domainStr) === BigInt(0)) {
              return null;
            }
            return domainStr;
          })
          .filter((domain: string | null): domain is string => {
            if (!domain) return false;
            if (seen.has(domain)) return false;
            seen.add(domain);
            return true;
          });

        // 2. Secondary Verification: Check actual resolver/owner for each domain
        // This handles cases where contract index is outdated or V2 transfer_domain didn't sync ERC721
        const verifiedDomains = await Promise.all(
          potentialDomains.map(async (domainStr) => {
            try {
              // domainStr is a decimal bigint string of the felt252 — decode it to a human-readable name
              const asHex = '0x' + BigInt(domainStr).toString(16);
              const humanName = shortString.decodeShortString(asHex);
              const details = await getDomainInfo(humanName);
              if (!details || !details.resolver) return null;
              
              // Normalize addresses for comparison (zero-pad to 64 hex chars)
              const actualOwner = details.resolver.toLowerCase().replace(/^0x0*/, '0x').padStart(66, '0');
              const expectedOwner = ("0x" + BigInt(userAddress).toString(16)).padStart(66, '0');
              
              if (actualOwner === expectedOwner) {
                return domainStr; // Return original format (DomainList decodes this)
              }
              return null;
            } catch (e) {
              console.error(`Error verifying owner for ${domainStr}:`, e);
              return null;
            }
          })
        );


        return verifiedDomains.filter((d): d is string => d !== null);
      } else {
        return [];
      }
    } catch (e) {
      console.error('Error fetching user domains:', e);
      return [];
    }
  }, [provider, contract]);

  const getDomainInfo = useCallback(async (domainName: string) => {
    try {
      const domain = shortString.encodeShortString(domainName);
      const result: any = await callLatest(contract, 'get_domain_info', [domain]);
      
      if (!result) {
        return null;
      }
      
      let handler, resolver, tokenId, expiryDate, lastTransferTime, parentDomain, isSubdomain;
      
      if (typeof result === 'object' && !Array.isArray(result)) {
        handler = result.handler;
        resolver = result.resolver;
        tokenId = result.token_id;
        expiryDate = result.expiry_date;
        lastTransferTime = result.last_transfer_time;
        parentDomain = result.parent_domain;
        isSubdomain = result.is_subdomain;
      } else if (Array.isArray(result) && result.length >= 7) {
        handler = result[0];
        resolver = result[1];
        tokenId = result[2];
        expiryDate = result[3];
        lastTransferTime = result[4];
        parentDomain = result[5];
        isSubdomain = result[6];
      } else {
        return null;
      }
      
      const zeroAddressBigInt = BigInt(0);
      if (typeof resolver === 'bigint') {
        if (resolver === zeroAddressBigInt) {
          return null;
        }
      } else if (!resolver || resolver === "0x0" || resolver === "0") {
        return null;
      }
      
      let tokenIdHex = "0x0";
      try {
        let tokenIdBig: bigint;
        if (typeof tokenId === 'bigint') {
          tokenIdBig = tokenId;
        } else {
          tokenIdBig = u256ToBigInt(tokenId);
        }
        tokenIdHex = "0x" + tokenIdBig.toString(16);
      } catch (e) {
        console.error('Error parsing token_id:', e, tokenId);
        tokenIdHex = "0x0";
      }
      
      let expiryNum = 0;
      try {
        if (typeof expiryDate === 'bigint') {
          expiryNum = Number(expiryDate);
        } else if (typeof expiryDate === 'string') {
          if (expiryDate.startsWith('0x')) {
            expiryNum = Number(BigInt(expiryDate));
          } else {
            expiryNum = Number(BigInt(expiryDate));
          }
        } else if (typeof expiryDate === 'number') {
          expiryNum = expiryDate;
        } else if (expiryDate && typeof expiryDate === 'object') {
          if ('low' in expiryDate || 'value' in expiryDate) {
            const low = (expiryDate as any).low ?? (expiryDate as any).value ?? 0;
            expiryNum = Number(BigInt(low));
          } else {
            expiryNum = Number(BigInt(String(expiryDate)));
          }
        }
        if (expiryNum < 0 || isNaN(expiryNum)) {
          expiryNum = 0;
        }
      } catch (e) {
        console.error('Error parsing expiry_date:', e, expiryDate);
        expiryNum = 0;
      }
      
      let resolverAddr: string;
      if (typeof resolver === 'bigint') {
        const hex = resolver.toString(16);
        resolverAddr = "0x" + hex.padStart(64, '0');
      } else if (typeof resolver === 'string') {
        if (!resolver.startsWith('0x')) {
          resolverAddr = "0x" + BigInt(resolver).toString(16).padStart(64, '0');
        } else {
          resolverAddr = resolver;
        }
      } else {
        resolverAddr = String(resolver);
      }
      
      const now = Math.floor(Date.now() / 1000);
      const GRACE_PERIOD = 7776000; // 90 days
      const isGracePeriod = expiryNum > 0 && now > expiryNum && now <= (expiryNum + GRACE_PERIOD);

      let lastTransferNum = 0;
      try {
        if (typeof lastTransferTime === 'bigint') {
           lastTransferNum = Number(lastTransferTime);
        } else if (typeof lastTransferTime === 'string') {
           lastTransferNum = Number(BigInt(lastTransferTime));
        } else if (typeof lastTransferTime === 'number') {
           lastTransferNum = lastTransferTime;
        } else if (lastTransferTime && typeof lastTransferTime === 'object') {
           const low = (lastTransferTime as any).low ?? (lastTransferTime as any).value ?? 0;
           lastTransferNum = Number(BigInt(low));
        }
      } catch {
         lastTransferNum = 0;
      }

      let isVerified = false;
      try {
        const verifiedRes: any = await callLatest(contract, 'is_verified', [domain]);
        isVerified = normalizeBool(verifiedRes);
      } catch { /* ignore */ }

      return {
        resolver: resolverAddr,
        tokenId: tokenIdHex,
        expiryDate: expiryNum > 0 ? expiryNum : undefined,
        lastTransferTime: lastTransferNum > 0 ? lastTransferNum : undefined,
        isGracePeriod,
        gracePeriodEnds: expiryNum > 0 ? expiryNum + GRACE_PERIOD : undefined,
        isVerified,
      };
    } catch (e: any) {
      console.error("Error fetching domain info:", e);
      return null;
    }
  }, [contract]);

  const registerDomain = useCallback(async (name: string, years: number, referrer?: string, records?: Record<string, string>) => {
    if (!name || years <= 0) throw new Error("Invalid input");
    if (!isConnected || !account || !address) throw new Error("Wallet not connected");

    const domain = shortString.encodeShortString(name);
    const referrerAddress = referrer?.trim()
      ? validateAndParseAddress(referrer.trim())
      : "0x0";
    const priceU256: any = await callLatest(contract, 'get_domain_price', [domain, years]);
    const priceBig = u256ToBigInt(priceU256);

    const id = toast.loading("Checking allowance...");
    try {
      const currentAllowance: any = await callLatest(tokenContract, 'allowance', [address, BNS_CONTRACT_ADDRESS]);
      const allowanceBig = u256ToBigInt(currentAllowance);

      const calls: any[] = [];

      if (allowanceBig < priceBig) {
        toast.loading("Preparing transaction...", { id });
        if (allowanceBig > BigInt(0)) {
          calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, 0n]));
        }
        calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, priceBig]));
      }

      calls.push(contract.populate("register_domain", [
        domain, 
        years, 
        address,
        false,
        false,
        referrerAddress
      ]));

      if (records) {
        Object.entries(records).forEach(([key, value]) => {
          if (value) {
            calls.push(contract.populate("set_text", [
              domain, 
              shortString.encodeShortString(key), 
              shortString.encodeShortString(value)
            ]));
          }
        });
      }

      toast.loading("Registering domain...", { id });
      const tx = await account.execute(calls);
      toast.loading("Waiting for Starknet confirmation...", { id });
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Domain registered!", { id });
      return tx?.transaction_hash as string | undefined;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, address, isConnected, contract, tokenContract]);

  const transferDomain = useCallback(async (name: string, to: string) => {
    if (!name || !to) throw new Error("Invalid input");
    if (!isConnected || !account) throw new Error("Wallet not connected");
    const domain = shortString.encodeShortString(name);
    const tx = await account.execute([
      contract.populate("transfer_domain", [domain, to])
    ]);
    await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
    return tx.transaction_hash as string;
  }, [account, isConnected, contract]);

  const renewDomain = useCallback(async (name: string, years: number) => {
    if (!name || years <= 0) throw new Error("Invalid input");
    if (!isConnected || !account || !address) throw new Error("Wallet not connected");

    const domain = shortString.encodeShortString(name);
    const domainInfo = await getDomainInfo(name);
    if (!domainInfo) throw new Error("Domain not found");
    
    const priceU256: any = await callLatest(contract, 'get_domain_price', [domain, years]);
    const priceBig = u256ToBigInt(priceU256);
    const renewalPriceBig = priceBig / BigInt(2);

    const id = toast.loading("Checking allowance...");
    try {
      const currentAllowance: any = await callLatest(tokenContract, 'allowance', [address, BNS_CONTRACT_ADDRESS]);
      const allowanceBig = u256ToBigInt(currentAllowance);

      const calls: any[] = [];

      if (allowanceBig < renewalPriceBig) {
        toast.loading("Preparing transaction...", { id });
        if (allowanceBig > BigInt(0)) {
          calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, 0n]));
        }
        calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, renewalPriceBig]));
      }

      calls.push(contract.populate("renew_domain", [domain, years]));

      toast.loading("Renewing domain...", { id });
      const tx = await account.execute(calls);

      toast.success("Submitted!", { id });
      return tx?.transaction_hash as string | undefined;
    } catch (e: any) {
      toast.error(e?.message ?? "Renewal failed", { id });
      throw e;
    }
  }, [account, address, isConnected, contract, tokenContract, getDomainInfo]);

  const setText = useCallback(async (name: string, key: string, value: string) => {
    if (!name || !key || !value) throw new Error("Invalid input");
    if (!isConnected || !account) throw new Error("Wallet not connected");

    const domain = shortString.encodeShortString(name);
    const keyFelt = shortString.encodeShortString(key);
    // Note: value is encoded as a single felt here. For longer text, we would need a different storage strategy.
    // For simple profile data like 'avatar' (url), 'twitter', etc., ensure they fit in felt252 or use short string.
    // If value > 31 chars, this simple encoding will throw or truncate. 
    // Ideally, value should be encoded carefully. For now, assuming short string values.
    const valueFelt = shortString.encodeShortString(value);

    const id = toast.loading("Updating record...");
    try {
      const tx = await account.execute([
        contract.populate("set_text", [domain, keyFelt, valueFelt])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Record updated!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed", { id });
      throw e;
    }
  }, [account, isConnected]);

  const getText = useCallback(async (name: string, key: string) => {
    try {
      const domain = shortString.encodeShortString(name.replace('.real', ''));
      const keyFelt = shortString.encodeShortString(key);
      const result: any = await callLatest(contract, 'get_text', [domain, keyFelt]);
      return safeDecode(result);
    } catch (e) {
      return "";
    }
  }, [contract, safeDecode]);

  const getFullProfile = useCallback(async (name: string) => {
    try {
      const domain = shortString.encodeShortString(name.replace('.real', ''));
      const fullProfile: any = await callLatest(contract, 'get_full_profile', [domain]);
      const nickname = await getText(name, 'nickname');
      
      return {
        domainDetails: fullProfile.domain_details,
        avatar: safeDecode(fullProfile.avatar),
        twitter: safeDecode(fullProfile.twitter),
        discord: safeDecode(fullProfile.discord),
        url: safeDecode(fullProfile.url),
        description: safeDecode(fullProfile.description),
        nickname: nickname
      };
    } catch (e) {
      console.error("Error fetching full profile:", e);
      return null;
    }
  }, [contract, getText, safeDecode]);

  const getDomainSvg = useCallback(async (name: string) => {
    try {
      const cleanName = name.replace('.real', '');
      if (!cleanName || cleanName.length > 31) return null;
      
      const domain = shortString.encodeShortString(cleanName);
      const result: any = await callLatest(contract, 'get_domain_svg', [domain]);
      return result; // Result is ByteArray
    } catch (e) {
      console.error("Error fetching SVG:", e);
      return null;
    }
  }, [contract]);

  const getReferralEarnings = useCallback(async (userAddress: string) => {
    try {
      const result: any = await callLatest(contract, 'get_referral_earnings', [userAddress]);
      return u256ToHex(result);
    } catch (e) {
      console.error("Error fetching referral earnings:", e);
      return "0x0";
    }
  }, [contract]);

  const proposeParamChange = useCallback(async (paramId: number, value: bigint) => {
    if (!isConnected || !account) throw new Error("Wallet not connected");
    const { low, high } = bigIntToU256Parts(value);
    const tx = await account.execute([{
      contractAddress: BNS_CONTRACT_ADDRESS,
      entrypoint: "propose_param_change",
      calldata: [String(paramId), low, high],
    }]);
    return tx.transaction_hash;
  }, [account, isConnected]);

  const confirmParamChange = useCallback(async (proposalId: string) => {
    if (!isConnected || !account) throw new Error("Wallet not connected");
    const idBig = BigInt(proposalId);
    const { low, high } = bigIntToU256Parts(idBig);
    const tx = await account.execute([{
      contractAddress: BNS_CONTRACT_ADDRESS,
      entrypoint: "confirm_param_change",
      calldata: [low, high],
    }]);
    return tx.transaction_hash;
  }, [account, isConnected]);

  const executeParamChange = useCallback(async (proposalId: string) => {
    if (!isConnected || !account) throw new Error("Wallet not connected");
    const idBig = BigInt(proposalId);
    const { low, high } = bigIntToU256Parts(idBig);
    const tx = await account.execute([{
      contractAddress: BNS_CONTRACT_ADDRESS,
      entrypoint: "execute_param_change",
      calldata: [low, high],
    }]);
    return tx.transaction_hash;
  }, [account, isConnected]);

  const getParamProposalCount = useCallback(async () => {
    try {
      const count: any = await callLatest(contract, 'get_param_proposal_count');
      return u256ToBigInt(count).toString();
    } catch { return "0"; }
  }, [contract]);

  const getParamProposal = useCallback(async (id: string) => {
    try {
      const idBig = BigInt(id);
      const result: any = await callLatest(contract, 'get_param_proposal', [idBig]);
      return {
        paramId: Number(result.param_id),
        value: u256ToBigInt(result.value),
        confirmations: Number(result.confirmations),
        executed: normalizeBool(result.executed),
      };
    } catch (e) {
      console.error("Error fetching param proposal:", e);
      return null;
    }
  }, [contract]);

  const getBasePrice = useCallback(async () => {
    try {
      const price: any = await callLatest(contract, 'get_base_price');
      return u256ToHex(price);
    } catch { return "0x0"; }
  }, [contract]);

  const getTreasury = useCallback(async () => {
    try {
      const addr: any = await callLatest(contract, 'get_treasury');
      return "0x" + BigInt(addr).toString(16);
    } catch { return "0x0"; }
  }, [contract]);

  const getRecentActivity = useCallback(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 50000); 

      const keys = [
         [
           hash.getSelectorFromName("DomainRegistered"),
           hash.getSelectorFromName("BidPlaced"),
           hash.getSelectorFromName("AuctionSettled")
         ]
      ];

      const res = await provider.getEvents({
        address: BNS_CONTRACT_ADDRESS,
        from_block: { block_number: fromBlock },
        to_block: "latest",
        keys,
        chunk_size: 30
      });

      const mappedEvents = res.events.map((ev, index) => {
          const selector = ev.keys[0];
          let type: 'register' | 'bid' | 'sold' = "register";
          let domain = "";
          let price = "- STRK";
          
          if (selector === hash.getSelectorFromName("DomainRegistered")) {
             type = "register";
             try { domain = shortString.decodeShortString(ev.keys[3]); } catch { domain = "unknown"; }
             price = domain.length === 4 ? "5 STRK" : "1 STRK";
          } else if (selector === hash.getSelectorFromName("BidPlaced")) {
             type = "bid";
             try { domain = shortString.decodeShortString(ev.keys[1]); } catch { domain = "unknown"; }
             const amountBigInt = u256ToBigInt({ low: ev.data[0], high: ev.data[1] });
             const whole = amountBigInt / (BigInt(10) ** BigInt(18));
             price = `${whole.toString()} STRK`;
          } else if (selector === hash.getSelectorFromName("AuctionSettled")) {
             type = "sold";
             try { domain = shortString.decodeShortString(ev.keys[1]); } catch { domain = "unknown"; }
             const amountBigInt = u256ToBigInt({ low: ev.data[0], high: ev.data[1] });
             const whole = amountBigInt / (BigInt(10) ** BigInt(18));
             price = `${whole.toString()} STRK`;
          }

          const blocksAgo = currentBlock - ev.block_number;
          let timeAgo = `${blocksAgo} blocks ago`;
          if (blocksAgo < 10) timeAgo = "Just now";
          else if (blocksAgo < 100) timeAgo = "Recently";

          return {
             id: ev.transaction_hash + index.toString(),
             type,
             domain,
             price,
             time: timeAgo
          };
      });

      return mappedEvents.reverse();

    } catch (e) {
      console.error("Error fetching recent activity:", e);
      return [];
    }
  }, []);

  const setPrimaryDomain = useCallback(async (name: string) => {
    if (!name) throw new Error("Invalid input");
    if (!isConnected || !account) throw new Error("Wallet not connected");

    const domain = shortString.encodeShortString(name);
    const id = toast.loading("Setting primary domain...");
    try {
      const tx = await account.execute([
        contract.populate("set_primary_domain", [domain])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Primary domain set!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed", { id });
      throw e;
    }
  }, [account, isConnected, contract]);

  const getPrimaryDomain = useCallback(async (userAddress: string) => {
    try {
      const result: any = await callLatest(contract, 'get_primary_domain', [userAddress]);
      return safeDecode(result);
    } catch (e) {
      return "";
    }
  }, [contract, safeDecode]);

  return { isAvailable, getPrice, registerDomain, getUserDomains, getDomainInfo, transferDomain, renewDomain, setText, getText, getFullProfile, getDomainSvg, getReferralEarnings, proposeParamChange, confirmParamChange, executeParamChange, getParamProposalCount, getParamProposal, getBasePrice, getTreasury, getRecentActivity, setPrimaryDomain, getPrimaryDomain };
}
