import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createStore } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import {
  RpcProvider,
  WalletAccountV6,
  constants,
  validateAndParseAddress,
  walletV6,
} from "starknet";
import { supportsStrk20Spec } from "../strk20/actions";

const SEPOLIA_RPC_URL =
  (import.meta as any).env?.VITE_STARKNET_RPC ||
  "https://api.cartridge.gg/x/starknet/sepolia";

export const walletProvider = new RpcProvider({ nodeUrl: SEPOLIA_RPC_URL });

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
  connectAsync: (args: { connector: Connector }) => Promise<void>;
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
    const accounts = await walletV6.requestAccounts(connector.wallet);
    if (!Array.isArray(accounts) || !accounts[0]) {
      throw new Error("The selected wallet did not return a Starknet account.");
    }
    const nextAddress = validateAndParseAddress(accounts[0]);
    const [nextChainId, specs] = await Promise.all([
      walletV6.requestChainId(connector.wallet),
      walletV6.supportedSpecs(connector.wallet).catch(() => []),
    ]);
    if (nextChainId !== constants.StarknetChainId.SN_SEPOLIA) {
      throw new Error("Brother ID privacy beta currently requires Starknet Sepolia.");
    }
    setAccount(walletAccount);
    setAddress(nextAddress);
    setChainId(nextChainId);
    setSupportedSpecs(specs.map(String));
    localStorage.setItem("last_wallet_connector", connector.id);
  };

  const disconnect = async () => {
    setAccount(undefined);
    setAddress(undefined);
    setChainId(undefined);
    setSupportedSpecs([]);
    localStorage.removeItem("last_wallet_connector");
  };

  const isPrivacyCapable = Boolean(
    account &&
      typeof account.strk20InvokeTransaction === "function" &&
      typeof account.strk20Balances === "function" &&
      supportedSpecs.some(supportsStrk20Spec),
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
      connectAsync,
      disconnect,
    }),
    [account, address, chainId, connectors, isPrivacyCapable, supportedSpecs],
  );

  return <StarknetContext.Provider value={value}>{children}</StarknetContext.Provider>;
};

const useStarknet = () => {
  const value = useContext(StarknetContext);
  if (!value) throw new Error("Starknet hooks must be used inside StarknetProvider");
  return value;
};

export const useAccount = () => {
  const { account, address, isConnected, isPrivacyCapable, supportedSpecs, chainId } = useStarknet();
  return { account, address, isConnected, isPrivacyCapable, supportedSpecs, chainId };
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
