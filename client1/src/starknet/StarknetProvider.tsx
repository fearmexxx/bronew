import React, { createContext, useContext } from "react";
import {
  StarknetConfig,
  argent,
  braavos,
  useInjectedConnectors,
  jsonRpcProvider,
  voyager,
  injected,
} from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ArgentMobileConnector } from "starknetkit/argentMobile";

const SEPOLIA_RPC_URL = (import.meta as any).env?.VITE_STARKNET_RPC || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/qXU4ta4yLmxUhIoLb-cZ7KtsNn808Pjw";

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
  
  const { connectors: injectedConnectors } = useInjectedConnectors({
    recommended: [
      argent(), 
      braavos(), 
      injected({ id: "xverse" }), 
      injected({ id: "metamask" })
    ],
    includeRecommended: "always",
  });

  const mobile = ArgentMobileConnector.init({
    options: {
      dappName: "Brother ID",
      url: typeof window !== "undefined" ? window.location.origin : "",
    },
  });

  const allConnectors = [...injectedConnectors, mobile as any];

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


