import { defineChain } from "viem";

export const BOHR_CHAIN_ID = 968 as const;
export const BOHR_RPC_URL = "https://rpc.bohr.life";
export const BOHR_EXPLORER_URL = "https://scan.bohr.life";
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

export const EXPLORER_TX_BASE = `${BOHR_EXPLORER_URL}/tx`;
export const EXPLORER_ADDRESS_BASE = `${BOHR_EXPLORER_URL}/address`;
