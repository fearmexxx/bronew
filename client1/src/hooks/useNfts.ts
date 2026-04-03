import { useCallback, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { shortString } from "starknet";
import { useBns } from "./useBns";

export interface NFTAsset {
  contractAddress: string;
  tokenId: string;
  name: string;
  image?: string;
  value: string; // The value to store on-chain (max 31 chars)
  isBns?: boolean;
}

export function useNfts() {
  const { address } = useAccount();
  const { getUserDomains, getDomainSvg } = useBns();
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserNfts = useCallback(async (): Promise<NFTAsset[]> => {
    if (!address) return [];
    setIsLoading(true);

    try {
      const assets: NFTAsset[] = [];

      // 1. Fetch BNS Domains (Native NFTs)
      const domains = await getUserDomains(address);
      for (const domainRef of domains) {
        try {
          const nameFelt = typeof domainRef === 'string' ? domainRef : (domainRef as any).nameFelt;
          if (!nameFelt) continue;
          
          const asHex = nameFelt.startsWith('0x') ? nameFelt : '0x' + BigInt(nameFelt).toString(16);
          const nameOnly = shortString.decodeShortString(asHex);
          const name = nameOnly + '.real';
          
          // For BNS domains, use the on-chain SVG as the image
          const svg = await getDomainSvg(name);
          const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(svgBlob);

          assets.push({
            contractAddress: "BNS", 
            tokenId: nameFelt,
            name: name,
            image: url,
            value: nameOnly, // Store the name without .real to save space
            isBns: true
          });
        } catch (e) {
          console.error("Error parsing BNS NFT:", e);
        }
      }

      // 2. Fetch External NFTs (Placeholder for production indexer)
      // Note: In a real production app, we would use Alchemy's getNFTs or Voyager API here.
      // For now, we only show BNS domains as they are reliably available on-chain.
      
      return assets;
    } catch (e) {
      console.error("Error fetching NFTs:", e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [address, getUserDomains, getDomainSvg]);

  return { fetchUserNfts, isLoading };
}
