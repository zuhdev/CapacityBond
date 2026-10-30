import {
  BOHR_CHAIN_ID,
  BOHR_DEPLOYMENT,
  BOHR_RPC_URL,
  capacityBondAbi,
  bohrTestnet,
  type Checkpoint,
  type ProviderProfile,
  type Reservation,
  type VaultAccounting,
} from "@capacitybond/chain";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  type Address,
  type Hash,
} from "viem";

const envAddress = import.meta.env.VITE_CAPACITY_BOND_ADDRESS?.trim();
const configuredAddress = envAddress && isAddress(envAddress) ? getAddress(envAddress) : BOHR_DEPLOYMENT.address;

export const CONTRACT_ADDRESS: Address | null = configuredAddress;
export const IS_DEMO = CONTRACT_ADDRESS === null;

export const publicClient = createPublicClient({
  chain: bohrTestnet,
  transport: http(import.meta.env.VITE_BOHR_RPC_URL || BOHR_RPC_URL, {
    retryCount: 2,
    retryDelay: 600,
    timeout: 20_000,
  }),
});

export const CHECKPOINT_TYPES = {
  Checkpoint: [
    { name: "reservationId", type: "uint256" },
    { name: "sequence", type: "uint256" },
    { name: "observedAt", type: "uint64" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "evidenceURI", type: "string" },
  ],
} as const;

export const CHECKPOINT_DOMAIN = {
  name: "CapacityBond",
  version: "1",
  chainId: BOHR_CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
} as const;

export function normalizeReservation(raw: Record<string, unknown>): Reservation {
  return {
    id: BigInt(raw.id as bigint),
    provider: raw.provider as Address,
    buyer: raw.buyer as Address,
    agreementHash: raw.agreementHash as `0x${string}`,
    agreementURI: raw.agreementURI as string,
    capacity: raw.capacity as string,
    bondAmount: raw.bondAmount as bigint,
    serviceStart: raw.serviceStart as bigint,
    serviceEnd: raw.serviceEnd as bigint,
    acceptanceDeadline: raw.acceptanceDeadline as bigint,
    claimWindow: raw.claimWindow as bigint,
    checkpointInterval: raw.checkpointInterval as bigint,
    activatedAt: raw.activatedAt as bigint,
    fundedAt: raw.fundedAt as bigint,
    resolvedAt: raw.resolvedAt as bigint,
    claimDeadline: raw.claimDeadline as bigint,
    requiredCheckpoints: Number(raw.requiredCheckpoints),
    providerAwardBps: Number(raw.providerAwardBps),
    policyVersion: Number(raw.policyVersion),
    providerAccepted: raw.providerAccepted as boolean,
    buyerAccepted: raw.buyerAccepted as boolean,
    status: Number(raw.status) as Reservation["status"],
    buyerStatementURI: raw.buyerStatementURI as string,
    buyerStatementHash: raw.buyerStatementHash as `0x${string}`,
    resolutionURI: raw.resolutionURI as string,
    resolutionHash: raw.resolutionHash as `0x${string}`,
  };
}

export function normalizeCheckpoint(raw: Record<string, unknown>): Checkpoint {
  return {
    attestor: raw.attestor as Address,
    submitter: raw.submitter as Address,
    observedAt: raw.observedAt as bigint,
    submittedAt: raw.submittedAt as bigint,
    evidenceHash: raw.evidenceHash as `0x${string}`,
    evidenceURI: raw.evidenceURI as string,
  };
}

export function normalizeProvider(raw: Record<string, unknown>): ProviderProfile {
  return {
    name: raw.name as string,
    contact: raw.contact as string,
    metadataURI: raw.metadataURI as string,
    registeredAt: raw.registeredAt as bigint,
    updatedAt: raw.updatedAt as bigint,
    active: raw.active as boolean,
  };
}

export function normalizeAccounting(raw: readonly [bigint, bigint, bigint, bigint]): VaultAccounting {
  return { balance: raw[0], locked: raw[1], withdrawableTotal: raw[2], surplus: raw[3] };
}

export async function readReservation(id: bigint): Promise<Reservation> {
  if (!CONTRACT_ADDRESS) throw new Error("No deployed contract configured.");
  const raw = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: capacityBondAbi,
    functionName: "getReservation",
    args: [id],
  });
  return normalizeReservation(raw as unknown as Record<string, unknown>);
}

export async function readCheckpoints(id: bigint): Promise<Checkpoint[]> {
  if (!CONTRACT_ADDRESS) throw new Error("No deployed contract configured.");
  const raw = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: capacityBondAbi,
    functionName: "getCheckpoints",
    args: [id],
  });
  return (raw as unknown as Array<Record<string, unknown>>).map(normalizeCheckpoint);
}

export async function readWithdrawable(account: Address): Promise<bigint> {
  if (!CONTRACT_ADDRESS) return 0n;
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: capacityBondAbi,
    functionName: "withdrawable",
    args: [account],
  });
}

export async function decodeCreatedReservation(hash: Hash): Promise<bigint | null> {
  if (!CONTRACT_ADDRESS) return null;
  const receipt = await publicClient.getTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: capacityBondAbi,
        eventName: "ReservationCreated",
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ReservationCreated") return decoded.args.reservationId;
    } catch {
      continue;
    }
  }
  return null;
}

export function contractUrl(address: Address): string {
  return `${BOHR_DEPLOYMENT.explorerUrl}/address/${address}`;
}
