import { useCallback, useMemo } from "react";
import { Abi, Contract, RpcProvider, shortString } from "starknet";
import { toast } from "react-hot-toast";
import { useAccount } from "@starknet-react/core";
import { BNS_CONTRACT_ADDRESS, BROTHER_TOKEN_ADDRESS, provider } from "../constants";

const AUCTION_ABI: Abi = [
  { type: "function", name: "create_auction", inputs: [
    { name: "domain", type: "core::felt252" },
    { name: "duration_secs", type: "core::integer::u64" },
    { name: "reserve", type: "core::integer::u256" },
    { name: "min_increment", type: "core::integer::u256" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "bid", inputs: [
    { name: "domain", type: "core::felt252" },
    { name: "amount", type: "core::integer::u256" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "withdraw", inputs: [
    { name: "domain", type: "core::felt252" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "settle", inputs: [
    { name: "domain", type: "core::felt252" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "cancel_auction", inputs: [
    { name: "domain", type: "core::felt252" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "get_auction", inputs: [
    { name: "domain", type: "core::felt252" },
  ], outputs: [
    { type: "core::starknet::contract_address::ContractAddress" },
    { type: "core::integer::u256" },
    { type: "core::integer::u256" },
    { type: "core::integer::u256" },
    { type: "core::integer::u256" },
    { type: "core::starknet::contract_address::ContractAddress" },
    { type: "core::integer::u64" },
    { type: "core::bool" },
  ], state_mutability: "view" },
  { type: "function", name: "get_refundable", inputs: [
    { name: "user", type: "core::starknet::contract_address::ContractAddress" },
  ], outputs: [{ type: "core::integer::u256" }], state_mutability: "view" },
  { type: "function", name: "get_active_auction_domains", inputs: [], outputs: [
    { type: "core::array::Array::<core::felt252>" },
  ], state_mutability: "view" },
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

const ERC721_MIN_ABI: Abi = [
  { type: "function", name: "approve", inputs: [
    { name: "approved", type: "core::starknet::contract_address::ContractAddress" },
    { name: "token_id", type: "core::integer::u256" },
  ], outputs: [], state_mutability: "external" },
  { type: "function", name: "getApproved", inputs: [
    { name: "tokenId", type: "core::integer::u256" },
  ], outputs: [{ type: "core::starknet::contract_address::ContractAddress" }], state_mutability: "view" },
];

export function useAuction() {
  const contract = useMemo(() => new Contract(AUCTION_ABI, BNS_CONTRACT_ADDRESS, provider as RpcProvider), []);
  const tokenContract = useMemo(() => new Contract(ERC20_MIN_ABI, BROTHER_TOKEN_ADDRESS, provider as RpcProvider), []);
  const { account, address, isConnected } = useAccount();

  const u256ToBigInt = (u256: any): bigint => {
    if (typeof u256 === 'bigint') return u256;
    if (typeof u256 === 'string' || typeof u256 === 'number') return BigInt(u256);
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

  const createAuction = useCallback(async (
    domainName: string,
    durationHours: number,
    reserveAmount: string,
    minIncrement: string
  ) => {
    if (!domainName || !contract || !isConnected || !account || !address) {
      throw new Error("Invalid input or wallet not connected");
    }

    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    const durationSecs = durationHours * 3600;
    const reserve = BigInt(reserveAmount);
    const increment = BigInt(minIncrement);

    const id = toast.loading("Creating auction...");
    try {
      const tx = await account.execute([
        contract.populate("create_auction", [domain, durationSecs, reserve, increment])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Auction created!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, address, isConnected, contract]);

  const placeBid = useCallback(async (domainName: string, amount: string) => {
    if (!domainName || !amount || !contract || !isConnected || !account || !address) {
      throw new Error("Invalid input or wallet not connected");
    }

    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    const bidAmount = BigInt(amount);

    const id = toast.loading("Checking allowance...");
    try {
      const currentAllowance: any = await tokenContract.allowance(address, BNS_CONTRACT_ADDRESS, { blockIdentifier: 'latest' });
      const allowanceBig = u256ToBigInt(currentAllowance);

      const calls: any[] = [];

      if (allowanceBig < bidAmount) {
        toast.loading("Preparing transaction...", { id });
        if (allowanceBig > BigInt(0)) {
          calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, 0n]));
        }
        calls.push(tokenContract.populate("approve", [BNS_CONTRACT_ADDRESS, bidAmount]));
      }

      calls.push(contract.populate("bid", [domain, bidAmount]));

      toast.loading("Placing bid...", { id });
      const tx = await account.execute(calls);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Bid placed!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, address, isConnected, contract, tokenContract]);

  const withdraw = useCallback(async (domainName: string) => {
    if (!domainName || !contract || !isConnected || !account) {
      throw new Error("Invalid input or wallet not connected");
    }

    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    const id = toast.loading("Withdrawing refund...");
    try {
      const tx = await account.execute([
        contract.populate("withdraw", [domain])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Refund withdrawn!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, isConnected, contract]);

  const settle = useCallback(async (domainName: string) => {
    if (!domainName || !contract || !isConnected || !account) {
      throw new Error("Invalid input or wallet not connected");
    }

    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    const id = toast.loading("Settling auction...");
    try {
      const tx = await account.execute([
        contract.populate("settle", [domain])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Auction settled!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, isConnected, contract]);

  const cancelAuction = useCallback(async (domainName: string) => {
    if (!domainName || !contract || !isConnected || !account) {
      throw new Error("Invalid input or wallet not connected");
    }
    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    const id = toast.loading("Cancelling auction...");
    try {
      const tx = await account.execute([
        contract.populate("cancel_auction", [domain])
      ]);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      toast.success("Auction cancelled!", { id });
      return tx.transaction_hash as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Transaction failed", { id });
      throw e;
    }
  }, [account, isConnected, contract]);


  const getAuctionDetails = useCallback(async (domainName: string) => {

    if (!domainName || !contract) {
      console.error("getAuctionDetails: Invalid input or contract not available", { domainName, contract: !!contract });
      throw new Error("Invalid input or contract not available");
    }

    const domain = shortString.encodeShortString(domainName.replace('.real', ''));
    console.log(`getAuctionDetails: Encoded domain "${domainName}" to felt: ${domain}`);
    
    try {
      const result: any = await contract.get_auction(domain, { blockIdentifier: 'latest' });
      console.log(`getAuctionDetails: Raw result for ${domainName}:`, result);
      console.log(`getAuctionDetails: Result type:`, typeof result, "Is array:", Array.isArray(result));
      
      if (!result) {
        console.log(`getAuctionDetails: No result for ${domainName}`);
        return null;
      }
      
      let seller, tokenId, reserve, minIncrement, highestBid, highestBidder, endsAt, active;
      
      if (Array.isArray(result) && result.length >= 8) {
        [seller, tokenId, reserve, minIncrement, highestBid, highestBidder, endsAt, active] = result;
      } else if (typeof result === 'object' && result !== null) {
        seller = result.seller ?? result[0];
        tokenId = result.token_id ?? result[1];
        reserve = result.reserve ?? result[2];
        minIncrement = result.min_increment ?? result[3];
        highestBid = result.highest_bid ?? result[4];
        highestBidder = result.highest_bidder ?? result[5];
        endsAt = result.ends_at ?? result[6];
        active = result.active ?? result[7];
      } else {
        console.error(`getAuctionDetails: Unexpected result format for ${domainName}:`, result);
        return null;
      }
      
      console.log(`getAuctionDetails: Parsed values for ${domainName}:`, {
        seller,
        tokenId,
        reserve,
        minIncrement,
        highestBid,
        highestBidder,
        endsAt,
        active,
      });
      
      const reserveBig = u256ToBigInt(reserve);
      const minIncrementBig = u256ToBigInt(minIncrement);
      const highestBidBig = u256ToBigInt(highestBid);
      const endsAtNum = typeof endsAt === 'string' ? BigInt(endsAt) : (typeof endsAt === 'bigint' ? endsAt : BigInt(endsAt as any));
      
      let isActive = false;
      if (typeof active === 'boolean') {
        isActive = active;
      } else if (typeof active === 'number') {
        isActive = active === 1;
      } else if (typeof active === 'bigint') {
        isActive = active === BigInt(1);
      } else if (active && typeof active === 'object') {
        if ('True' in active) isActive = true;
        else if ('False' in active) isActive = false;
        else if ('value' in active) isActive = (active as any).value === 1 || (active as any).value === BigInt(1);
      }
      
      const details = {
        seller: seller as string,
        tokenId: u256ToBigInt(tokenId),
        reserve: reserveBig,
        minIncrement: minIncrementBig,
        highestBid: highestBidBig,
        highestBidder: highestBidder as string,
        endsAt: Number(endsAtNum),
        active: isActive,
      };
      
      console.log(`getAuctionDetails: Final details for ${domainName}:`, details);
      return details;
    } catch (e: any) {
      console.error(`getAuctionDetails: Error fetching auction for ${domainName}:`, e);
      console.error(`getAuctionDetails: Error stack:`, e?.stack);
      return null;
    }
  }, [contract]);

  const fetchActiveAuctionDomains = useCallback(async (): Promise<string[]> => {
    if (!contract) {
      console.log("fetchActiveAuctionDomains: No contract");
      return [];
    }

    try {
      console.log("fetchActiveAuctionDomains: Calling contract.get_active_auction_domains()");
      const result: any = await contract.get_active_auction_domains({ blockIdentifier: 'latest' });
      console.log("fetchActiveAuctionDomains: Raw result:", result);
      console.log("fetchActiveAuctionDomains: Result type:", typeof result);
      console.log("fetchActiveAuctionDomains: Is array?", Array.isArray(result));
      
      if (!result) {
        console.log("fetchActiveAuctionDomains: No result");
        return [];
      }

      let domainArray: any[] = [];
      
      if (Array.isArray(result)) {
        domainArray = result;
      } 
      else if (typeof result === 'object' && result !== null) {
        if ('length' in result) {
          const length = Number(result.length);
          domainArray = [];
          for (let i = 0; i < length; i++) {
            if (result[i] !== undefined) {
              domainArray.push(result[i]);
            }
          }
        } else if (result[0] !== undefined) {
          domainArray = Object.keys(result)
            .filter(key => !isNaN(Number(key)))
            .sort((a, b) => Number(a) - Number(b))
            .map(key => result[key]);
        } else {
          console.log("fetchActiveAuctionDomains: Unknown result format:", result);
          return [];
        }
      } else {
        console.log("fetchActiveAuctionDomains: Unexpected result type:", typeof result);
        return [];
      }

      console.log("fetchActiveAuctionDomains: Parsed domain array:", domainArray);

      const domains: string[] = [];
      for (const domainFelt of domainArray) {
        try {
          let domainBigInt: bigint;
          if (typeof domainFelt === 'bigint') {
            domainBigInt = domainFelt;
          } else if (typeof domainFelt === 'string') {
            domainBigInt = BigInt(domainFelt);
          } else if (typeof domainFelt === 'number') {
            domainBigInt = BigInt(domainFelt);
          } else {
            console.error('Unknown domainFelt type:', typeof domainFelt, domainFelt);
            continue;
          }

          const domainHex = '0x' + domainBigInt.toString(16);
          const domainName = shortString.decodeShortString(domainHex);
          console.log(`fetchActiveAuctionDomains: Decoded ${domainHex} -> ${domainName}`);
          if (domainName) {
            domains.push(domainName + '.real');
          }
        } catch (e) {
          console.error('Failed to decode domain:', domainFelt, e);
        }
      }

      console.log("fetchActiveAuctionDomains: Final domains:", domains);
      return domains;
    } catch (e: any) {
      console.error("Error fetching active auction domains:", e);
      console.error("Error stack:", e?.stack);
      return [];
    }
  }, [contract]);

  return { createAuction, cancelAuction, placeBid, withdraw, settle, getAuctionDetails, fetchActiveAuctionDomains };
}


