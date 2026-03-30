import React, { createContext, useContext } from "react";
import {
  StarknetConfig,
  argent,
  braavos,
  useInjectedConnectors,
  jsonRpcProvider,
  voyager,
} from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ArgentMobileConnector } from "starknetkit/argentMobile";

const SEPOLIA_RPC_URL = (import.meta as any).env?.VITE_STARKNET_RPC || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/3S-9NEC4IdEbT_sx5zfRd";

const customProvider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: SEPOLIA_RPC_URL }),
});

const InternalContext = createContext<any | null>(null);

export const useStarknetInternal = () => {
  const ctx = useContext(InternalContext);
  if (!ctx) throw new Error("useStarknetInternal must be used within StarknetProvider");
  return ctx;
};

export const StarknetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chains = [sepolia];
  
  const { connectors: injected } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: "always",
  });

  const mobile = ArgentMobileConnector.init({
    options: {
      dappName: "Brother ID",
      url: typeof window !== "undefined" ? window.location.origin : "",
    },
  });

  const allConnectors = [...injected, mobile as any];

  return (
    <StarknetConfig
      autoConnect
      chains={chains}
      provider={customProvider}
      connectors={allConnectors}
      explorer={voyager}
    >
      <InternalContext.Provider value={{}}>{children}</InternalContext.Provider>
    </StarknetConfig>
  );
};


