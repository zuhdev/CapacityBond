import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIVE_CHAIN_CONFIG,
  capacityBondAbi,
} from "@capacitybond/chain";
import {
  createWalletClient,
  custom,
  getAddress,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { CONTRACT_ADDRESS, CHECKPOINT_DOMAIN, CHECKPOINT_TYPES } from "../lib/contract";

interface InjectedProvider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

interface WalletContextValue {
  address: Address | null;
  chainId: number | null;
  walletClient: WalletClient | null;
  isConnecting: boolean;
  isAvailable: boolean;
  isCorrectChain: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToNetwork: () => Promise<void>;
  write: (request: { functionName: string; args?: readonly unknown[]; value?: bigint }) => Promise<Hash>;
  signCheckpoint: (message: {
    reservationId: bigint;
    sequence: bigint;
    observedAt: bigint;
    evidenceHash: `0x${string}`;
    evidenceURI: string;
  }) => Promise<`0x${string}`>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAvailable = typeof window !== "undefined" && Boolean(window.ethereum);

  const syncChain = useCallback(async (provider: InjectedProvider) => {
    try {
      const hex = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(hex, 16));
    } catch {
      setChainId(null);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No injected wallet found. Install a browser wallet to write to the contract.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const first = accounts[0];
      if (!first) throw new Error("The wallet returned no account.");
      const normalized = getAddress(first);
      setAddress(normalized);
      setWalletClient(
        createWalletClient({
          account: normalized,
          chain: ACTIVE_CHAIN_CONFIG.chain,
          transport: custom(window.ethereum),
        }) as WalletClient,
      );
      await syncChain(window.ethereum);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  }, [syncChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setWalletClient(null);
    setError(null);
  }, []);

  const switchToNetwork = useCallback(async () => {
    if (!window.ethereum) throw new Error("No injected wallet found.");
    const chainIdHex = `0x${ACTIVE_CHAIN_CONFIG.chainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number }).code;
      if (code !== 4902) throw switchError;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: ACTIVE_CHAIN_CONFIG.labelFull,
            nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
            rpcUrls: [ACTIVE_CHAIN_CONFIG.rpcUrl],
            blockExplorerUrls: [ACTIVE_CHAIN_CONFIG.explorerUrl],
          },
        ],
      });
    }
    await syncChain(window.ethereum);
  }, [syncChain]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      const first = accounts?.[0];
      if (!first) {
        setAddress(null);
        setWalletClient(null);
        return;
      }
      const normalized = getAddress(first);
      setAddress(normalized);
      setWalletClient(
        createWalletClient({
          account: normalized,
          chain: ACTIVE_CHAIN_CONFIG.chain,
          transport: custom(provider),
        }) as WalletClient,
      );
    };
    const onChainChanged = () => {
      void syncChain(provider);
    };
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [syncChain]);

  const write = useCallback(
    async ({
      functionName,
      args = [],
      value,
    }: {
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }): Promise<Hash> => {
      if (!CONTRACT_ADDRESS) throw new Error("No contract is configured. The workspace is in demo mode.");
      if (!walletClient || !address) throw new Error("Connect a wallet before sending a transaction.");
      if (chainId !== ACTIVE_CHAIN_CONFIG.chainId) await switchToNetwork();
      return walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: capacityBondAbi,
        functionName,
        args,
        account: address,
        chain: ACTIVE_CHAIN_CONFIG.chain,
        ...(value === undefined ? {} : { value }),
      } as never);
    },
    [address, chainId, switchToNetwork, walletClient],
  );

  const signCheckpoint = useCallback(
    async (message: {
      reservationId: bigint;
      sequence: bigint;
      observedAt: bigint;
      evidenceHash: `0x${string}`;
      evidenceURI: string;
    }): Promise<`0x${string}`> => {
      if (!walletClient || !address) throw new Error("Connect the attestor wallet first.");
      if (chainId !== ACTIVE_CHAIN_CONFIG.chainId) await switchToNetwork();
      return walletClient.signTypedData({
        account: address,
        domain: CHECKPOINT_DOMAIN,
        types: CHECKPOINT_TYPES,
        primaryType: "Checkpoint",
        message,
      });
    },
    [address, chainId, switchToNetwork, walletClient],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      walletClient,
      isConnecting,
      isAvailable,
      isCorrectChain: chainId === ACTIVE_CHAIN_CONFIG.chainId,
      error,
      connect,
      disconnect,
      switchToNetwork,
      write,
      signCheckpoint,
    }),
    [
      address,
      chainId,
      walletClient,
      isConnecting,
      isAvailable,
      error,
      connect,
      disconnect,
      switchToNetwork,
      write,
      signCheckpoint,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider.");
  return context;
}
