import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createStore } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import {
  constants,
  WalletAccountV6,
  validateAndParseAddress,
  walletV6,
} from "starknet";
import { hasStrk20WalletMethods, supportsStrk20Spec } from "../strk20/actions";
import { isSupportedChain, sepoliaProvider } from "../constants";

export const walletProvider = sepoliaProvider;

export interface Connector {
  id: string;
  name: string;
  icon?: string;
  wallet: WalletWithStarknetFeatures;
  available: () => boolean;
}

interface StarknetContextValue {
  account?: WalletAccountV6;
  address?: string;
  chainId?: string;
  connectors: Connector[];
  isConnected: boolean;
  isPrivacyCapable: boolean;
  supportedSpecs: string[];
  walletName?: string;
  connectAsync: (args: { connector: Connector }) => Promise<void>;
  switchNetwork: (chainId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const StarknetContext = createContext<StarknetContextValue | null>(null);

const normalizeWalletId = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

const toConnector = (wallet: WalletWithStarknetFeatures): Connector => ({
  id: normalizeWalletId(wallet.name),
  name: wallet.name,
  icon: wallet.icon,
  wallet,
  available: () => true,
});

export const StarknetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [account, setAccount] = useState<WalletAccountV6>();
  const [address, setAddress] = useState<string>();
  const [chainId, setChainId] = useState<string>();
  const [supportedSpecs, setSupportedSpecs] = useState<string[]>([]);
  const [activeConnector, setActiveConnector] = useState<Connector>();

  useEffect(() => {
    const discovery = createStore({ eip1193Adapters: [] });
    const update = (wallets: WalletWithStarknetFeatures[]) =>
      setConnectors(wallets.map(toConnector));
    update(discovery.getWallets().slice());
    const unsubscribe = discovery.subscribe((wallets) => update(wallets.slice()));
    return () => unsubscribe();
  }, []);

  const connectAsync = async ({ connector }: { connector: Connector }) => {
    const walletAccount = await WalletAccountV6.connect(walletProvider, connector.wallet);
    if (!walletAccount.address) {
      throw new Error("The selected wallet did not return a Starknet account.");
    }
    const nextAddress = validateAndParseAddress(walletAccount.address);
    const [nextChainId, specs] = await Promise.all([
      walletV6.requestChainId(connector.wallet),
      walletV6.supportedSpecs(connector.wallet).catch(() => []),
    ]);
    if (!isSupportedChain(nextChainId)) {
      throw new Error("Brother ID supports Starknet Mainnet and Sepolia.");
    }
    setAccount(walletAccount);
    setAddress(nextAddress);
    setChainId(nextChainId);
    setSupportedSpecs(specs.map(String));
    setActiveConnector(connector);
    localStorage.setItem("last_wallet_connector", connector.id);
  };

  const switchNetwork = async (nextChainId: string) => {
    if (!activeConnector) throw new Error("Connect a wallet before changing networks.");
    if (!isSupportedChain(nextChainId)) throw new Error("Unsupported Starknet network.");
    const isXverse = activeConnector.id.includes("xverse");

    if (isXverse) {
      const { BitcoinNetworkType, request: satsRequest } = await import("@sats-connect/core");
      const response = await satsRequest(
        "wallet_changeNetwork",
        { name: nextChainId === constants.StarknetChainId.SN_MAIN ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet },
        "XverseProviders.BitcoinProvider",
      );
      if (response.status === "error") {
        throw new Error(response.error?.message || "Xverse declined the network switch.");
      }
    } else {
      const accepted = await walletV6.switchStarknetChain(activeConnector.wallet, nextChainId);
      if (!accepted) {
        throw new Error(`${activeConnector.name} did not approve the network switch. Change the network inside the wallet, then return to Brother ID.`);
      }
    }

    // Wallet extensions can acknowledge before their provider reports the new
    // chain. Verify the result instead of presenting a false success state.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const reportedChainId = await walletV6.requestChainId(activeConnector.wallet);
      if (reportedChainId === nextChainId) {
        setChainId(reportedChainId);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`${activeConnector.name} did not change networks. Select the network manually in the wallet, then retry.`);
  };

  const disconnect = async () => {
    setAccount(undefined);
    setAddress(undefined);
    setChainId(undefined);
    setSupportedSpecs([]);
    setActiveConnector(undefined);
    localStorage.removeItem("last_wallet_connector");
  };

  useEffect(() => {
    if (!activeConnector) return;
    return walletV6.subscribeWalletEvent(activeConnector.wallet, (change: any) => {
      const nextWalletAddress = change?.accounts?.[0]?.address;
      if (change?.accounts && !nextWalletAddress) {
        void disconnect();
        return;
      }
      if (nextWalletAddress) setAddress(validateAndParseAddress(nextWalletAddress));
      void Promise.all([
        walletV6.requestChainId(activeConnector.wallet),
        walletV6.supportedSpecs(activeConnector.wallet).catch(() => []),
      ]).then(([nextChainId, specs]) => {
        if (!isSupportedChain(nextChainId)) return;
        setChainId(nextChainId);
        setSupportedSpecs(specs.map(String));
      });
    });
  }, [activeConnector]);

  // Xverse currently exposes the STRK20 methods but may not implement
  // wallet_supportedSpecs on the same discovery connector. Runtime methods are
  // the authoritative capability signal; reported specs remain diagnostic.
  const isKnownStrk20Wallet = Boolean(
    activeConnector?.id.includes("xverse") ||
    activeConnector?.id.includes("ready") ||
    activeConnector?.id.includes("argent"),
  );
  const isPrivacyCapable = Boolean(
    hasStrk20WalletMethods(account) &&
    (isKnownStrk20Wallet || supportedSpecs.some(supportsStrk20Spec)),
  );

  const value = useMemo<StarknetContextValue>(
    () => ({
      account,
      address,
      chainId,
      connectors,
      isConnected: Boolean(account && address),
      isPrivacyCapable,
      supportedSpecs,
      walletName: activeConnector?.name,
      connectAsync,
      switchNetwork,
      disconnect,
    }),
    [account, activeConnector?.name, address, chainId, connectors, isPrivacyCapable, supportedSpecs],
  );

  return <StarknetContext.Provider value={value}>{children}</StarknetContext.Provider>;
};

const useStarknet = () => {
  const value = useContext(StarknetContext);
  if (!value) throw new Error("Starknet hooks must be used inside StarknetProvider");
  return value;
};

export const useAccount = () => {
  const { account, address, isConnected, isPrivacyCapable, supportedSpecs, chainId, switchNetwork, walletName } = useStarknet();
  return { account, address, isConnected, isPrivacyCapable, supportedSpecs, chainId, switchNetwork, walletName };
};

export const useConnect = () => {
  const { connectors, connectAsync } = useStarknet();
  return { connectors, connectAsync };
};

export const useDisconnect = () => {
  const { disconnect } = useStarknet();
  return { disconnect };
};

export const useStarknetInternal = useStarknet;
