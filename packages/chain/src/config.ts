import { defineChain } from "viem";

export const BOHR_CHAIN_ID = 968 as const;
export const BOHR_RPC_URL = "https://rpc.bohr.life";
export const BOHR_EXPLORER_URL = "https://scan.bohr.life";
export const BOT_MAINNET_CHAIN_ID = 677 as const;
export const BOT_MAINNET_RPC_URL = "https://rpc.botchain.ai";
export const BOT_MAINNET_EXPLORER_URL = "https://scan.botchain.ai";
export const BOT_WEBSITE_URL = "https://www.botchain.ai/en/";
export const BOT_FAUCET_URL = "https://faucet.botchain.ai/basic";
export const BOT_BUNDLER_URL = "https://bundler.bohr.life/rpc";

export const bohrTestnet = defineChain({
  id: BOHR_CHAIN_ID,
  name: "BOT Chain Bohr Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOHR_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Bohr Explorer", url: BOHR_EXPLORER_URL },
  },
  testnet: true,
});

export const botchainMainnet = defineChain({
  id: BOT_MAINNET_CHAIN_ID,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOT_MAINNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "BOT Explorer", url: BOT_MAINNET_EXPLORER_URL },
  },
  testnet: false,
});

export type NetworkSelection = "testnet" | "mainnet";

export interface BondChainConfig {
  /** Build-time key ("testnet" | "mainnet"). */
  key: NetworkSelection;
  chain: typeof bohrTestnet | typeof botchainMainnet;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  /** Short display label, e.g. "Bohr 968". */
  label: string;
  /** Full display label, e.g. "BOT Chain Bohr Testnet". */
  labelFull: string;
  /** Deployment record file the frontend bakes in. */
  recordFile: string;
  /** Native-token acquisition hint shown to users on testnet. */
  fundingHint: string;
  testnet: boolean;
}

export const CHAIN_CONFIGS: Record<NetworkSelection, BondChainConfig> = {
  testnet: {
    key: "testnet",
    chain: bohrTestnet,
    chainId: BOHR_CHAIN_ID,
    rpcUrl: BOHR_RPC_URL,
    explorerUrl: BOHR_EXPLORER_URL,
    label: "Bohr 968",
    labelFull: "BOT Chain Bohr Testnet",
    recordFile: "deployments/bohr.json",
    fundingHint: "Test BOT comes from the BOT Chain faucet.",
    testnet: true,
  },
  mainnet: {
    key: "mainnet",
    chain: botchainMainnet,
    chainId: BOT_MAINNET_CHAIN_ID,
    rpcUrl: BOT_MAINNET_RPC_URL,
    explorerUrl: BOT_MAINNET_EXPLORER_URL,
    label: "BOT 677",
    labelFull: "BOT Chain Mainnet",
    recordFile: "deployments/botchain.json",
    fundingHint: "BOT is the native gas token of the BOT Chain mainnet.",
    testnet: false,
  },
};

/**
 * Build-time network selection. The production UI targets the BOT Chain
 * mainnet by default; set VITE_BOND_NETWORK=testnet to build a Bohr testnet
 * bundle. This never selects keys, only which deployment record, RPC endpoint,
 * and chain id the frontend targets.
 */
function readBuildTimeNetwork(): NetworkSelection {
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return meta?.VITE_BOND_NETWORK === "testnet" ? "testnet" : "mainnet";
  } catch {
    return "mainnet";
  }
}

export const ACTIVE_NETWORK = readBuildTimeNetwork();
export const ACTIVE_CHAIN_CONFIG = CHAIN_CONFIGS[ACTIVE_NETWORK];

export const EXPLORER_TX_BASE = `${ACTIVE_CHAIN_CONFIG.explorerUrl}/tx`;
export const EXPLORER_ADDRESS_BASE = `${ACTIVE_CHAIN_CONFIG.explorerUrl}/address`;
