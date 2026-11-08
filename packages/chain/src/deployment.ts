import { getAddress, type Address } from "viem";
import { ACTIVE_NETWORK } from "./config";

export interface Deployment {
  network: string;
  chainId: number;
  contractName: string;
  address: Address | null;
  deploymentBlock: number;
  deploymentTxHash: string;
  deployedAt: string;
  deployer: Address | null;
  attestor: Address | null;
  resolver: Address | null;
  gracePeriodSeconds: number;
  explorerUrl: string;
}

// Both records are baked at build time. A blank address keeps the frontend in
// fixture/demo mode with writes disabled until that network is deployed.
import bohrDeployment from "../../../deployments/bohr.json";
import botchainDeployment from "../../../deployments/botchain.json";

const RECORDS = {
  testnet: bohrDeployment,
  mainnet: botchainDeployment,
} as const;

function optionalAddress(value: string): Address | null {
  if (!value) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

export function toDeploymentRecord(raw: Record<string, unknown>): Deployment {
  return {
    network: typeof raw.network === "string" ? raw.network : "",
    chainId: Number(raw.chainId ?? 0),
    contractName: (raw.contractName as string) ?? "CapacityBond",
    address: optionalAddress((raw.address as string) ?? ""),
    deploymentBlock: Number(raw.deploymentBlock ?? 0),
    deploymentTxHash: (raw.deploymentTxHash as string) ?? "",
    deployedAt: (raw.deployedAt as string) ?? "",
    deployer: optionalAddress((raw.deployer as string) ?? ""),
    attestor: optionalAddress((raw.attestor as string) ?? ""),
    resolver: optionalAddress((raw.resolver as string) ?? ""),
    gracePeriodSeconds: Number(raw.gracePeriodSeconds ?? 0),
    explorerUrl: (raw.explorerUrl as string) ?? "",
  };
}

export const BOHR_DEPLOYMENT: Deployment = toDeploymentRecord(
  RECORDS.testnet as unknown as Record<string, unknown>,
);

export const BOTCHAIN_DEPLOYMENT: Deployment = toDeploymentRecord(
  RECORDS.mainnet as unknown as Record<string, unknown>,
);

/** Deployment record keyed by build-time network selection. */
export const NETWORK_DEPLOYMENTS: Record<"testnet" | "mainnet", Deployment> = {
  testnet: BOHR_DEPLOYMENT,
  mainnet: BOTCHAIN_DEPLOYMENT,
};

/** The deployment record matching the build-time network selection. */
export const ACTIVE_DEPLOYMENT: Deployment = NETWORK_DEPLOYMENTS[ACTIVE_NETWORK];

export const DEPLOYMENT_CONFIGURED = ACTIVE_DEPLOYMENT.address !== null;
