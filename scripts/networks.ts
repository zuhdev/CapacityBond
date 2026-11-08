/**
 * Deployment network metadata shared by all live-chain scripts.
 *
 * Add a network here (and a matching entry in hardhat.config.ts) to deploy
 * CapacityBond against a new chain. Live scripts refuse to run on a chain
 * id that does not match the descriptor.
 */

export interface NetworkDescriptor {
  /** Hardhat network name (`--network <name>`). */
  name: string;
  /** Human-readable label for logs and records. */
  label: string;
  chainId: number;
  testnet: boolean;
  /** Env var that may override the default RPC endpoint. */
  rpcEnvVar: string;
  defaultRpcUrl: string;
  explorerUrl: string;
  /** Etherscan-style API base used by hardhat-verify. */
  explorerApiUrl: string;
  /** Deployments record file, relative to the repository root. */
  recordFile: string;
  /** Confirmations awaited before treating a transaction as final. */
  confirmations: number;
  /** Where operators obtain the native gas token. */
  fundingHint: string;
}

const BOHR: NetworkDescriptor = {
  name: "bohr",
  label: "BOT Chain Bohr Testnet",
  chainId: 968,
  testnet: true,
  rpcEnvVar: "BOHR_RPC_URL",
  defaultRpcUrl: "https://rpc.bohr.life",
  explorerUrl: "https://scan.bohr.life",
  explorerApiUrl: "https://scan.bohr.life/api",
  recordFile: "deployments/bohr.json",
  confirmations: 1,
  fundingHint: "claim test BOT at https://faucet.botchain.ai/basic",
};

const BOTCHAIN: NetworkDescriptor = {
  name: "botchain",
  label: "BOT Chain Mainnet",
  chainId: 677,
  testnet: false,
  rpcEnvVar: "BOT_MAINNET_RPC_URL",
  defaultRpcUrl: "https://rpc.botchain.ai",
  explorerUrl: "https://scan.botchain.ai",
  explorerApiUrl: "https://scan.botchain.ai/api",
  recordFile: "deployments/botchain.json",
  confirmations: 5,
  fundingHint: "swap for BOT on the official DEX https://dex.botchain.ai",
};

const REGISTRY: Record<string, NetworkDescriptor> = {
  bohr: BOHR,
  botchain: BOTCHAIN,
};

/** Resolve a Hardhat network name. Mainnet scripts use "botchain". */
export function networkFor(name: string): NetworkDescriptor {
  const network = REGISTRY[name];
  if (!network) {
    throw new Error(
      `Unknown deployment network "${name}". Use --network bohr (testnet) or --network botchain (mainnet).`,
    );
  }
  return network;
}

/**
 * Resolve the network for the current Hardhat run. The in-memory "hardhat"
 * network defaults to the Bohr testnet descriptor so local helpers keep
 * working.
 */
export function currentNetwork(name: string): NetworkDescriptor {
  return networkFor(name === "hardhat" ? "bohr" : name);
}
