import deployment from "../../../deployments/bohr.json";
import { getAddress, type Address } from "viem";

export interface Deployment {
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

function optionalAddress(value: string): Address | null {
  if (!value) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

export const BOHR_DEPLOYMENT: Deployment = {
  chainId: deployment.chainId,
  contractName: deployment.contractName,
  address: optionalAddress(deployment.address),
  deploymentBlock: deployment.deploymentBlock,
  deploymentTxHash: deployment.deploymentTxHash,
  deployedAt: deployment.deployedAt,
  deployer: optionalAddress(deployment.deployer),
  attestor: optionalAddress(deployment.attestor),
  resolver: optionalAddress(deployment.resolver),
  gracePeriodSeconds: deployment.gracePeriodSeconds,
  explorerUrl: deployment.explorerUrl,
};

export const DEPLOYMENT_CONFIGURED = BOHR_DEPLOYMENT.address !== null;
