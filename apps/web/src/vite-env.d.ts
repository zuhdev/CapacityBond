/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAPACITY_BOND_ADDRESS?: string;
  readonly VITE_BOHR_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
