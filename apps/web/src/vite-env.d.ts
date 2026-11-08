/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAPACITY_BOND_ADDRESS?: string;
  /** "testnet" selects deployments/bohr.json; the default build is mainnet. */
  readonly VITE_BOND_NETWORK?: string;
  /** Preferred endpoint override for both networks. */
  readonly VITE_RPC_URL?: string;
  /** Legacy testnet-only endpoint override, kept for backward compatibility. */
  readonly VITE_BOHR_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
