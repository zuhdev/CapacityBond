import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";

export const EXPLORER = "https://scan.bohr.life";
export const CHECKPOINT_TYPES = {
  Checkpoint: [
    { name: "reservationId", type: "uint256" },
    { name: "sequence", type: "uint256" },
    { name: "observedAt", type: "uint64" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "evidenceURI", type: "string" },
  ],
};

export interface DeploymentRecord {
  chainId: number;
  address: string;
  attestor: string;
  resolver: string;
  gracePeriodSeconds: number;
  explorerUrl: string;
}

export function readDeployment(): DeploymentRecord {
  const path = resolve(process.cwd(), "deployments/bohr.json");
  const record = JSON.parse(readFileSync(path, "utf8")) as DeploymentRecord;
  if (!record.address || !ethers.isAddress(record.address)) {
    throw new Error("deployments/bohr.json has no contract address. Run npm run deploy:bohr first.");
  }
  return record;
}

export async function chainNow(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  if (!block) throw new Error("Could not read latest block.");
  return block.timestamp;
}

export async function sleepUntil(timestamp: number, label = "waiting"): Promise<void> {
  let now = await chainNow();
  if (now >= timestamp) return;
  console.log(`  ${label}: waiting ${timestamp - now}s for chain time...`);
  while (now < timestamp) {
    await new Promise((resolveSleep) => setTimeout(resolveSleep, Math.min(15_000, (timestamp - now) * 1000)));
    now = await chainNow();
  }
}

export async function confirm(label: string, tx: { hash: string; wait: (confirmations?: number) => Promise<unknown> }) {
  console.log(`  ${label}: ${EXPLORER}/tx/${tx.hash}`);
  const receipt = (await tx.wait()) as { status?: number } | null;
  if (!receipt || receipt.status !== 1) throw new Error(`${label} reverted.`);
  return receipt;
}

export function hashText(text: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(text));
}

export function signCheckpointDomain(verifyingContract: string, chainId: number) {
  return {
    name: "CapacityBond",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export async function signCheckpoint(
  signer: { signTypedData: (domain: any, types: any, value: any) => Promise<string> },
  verifyingContract: string,
  chainId: number,
  checkpoint: {
    reservationId: bigint;
    sequence: bigint;
    observedAt: number;
    evidenceHash: string;
    evidenceURI: string;
  },
): Promise<string> {
  return signer.signTypedData(
    signCheckpointDomain(verifyingContract, chainId),
    CHECKPOINT_TYPES,
    checkpoint,
  );
}

export async function ensureGas(
  signer: { address: string },
  label: string,
  minimum = ethers.parseEther("0.003"),
): Promise<void> {
  const balance = await ethers.provider.getBalance(signer.address);
  if (balance >= minimum) return;
  const [funder] = await ethers.getSigners();
  if (!funder) throw new Error("No funder signer available.");
  const topUp = minimum + ethers.parseEther("0.005");
  console.log(`  funding ${label} ${signer.address} with ${ethers.formatEther(topUp)} BOT for gas`);
  await confirm(`fund ${label}`, await funder.sendTransaction({ to: signer.address, value: topUp }));
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env. Run npm run keys:generate and fund the accounts.`);
  return value;
}
