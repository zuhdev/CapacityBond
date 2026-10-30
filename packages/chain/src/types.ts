import type { Address, Hash, Hex } from "viem";

export type ReservationStatus =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

export const RESERVATION_STATUS_NAMES = [
  "Draft",
  "Funded",
  "Active",
  "Fulfilled",
  "Claimable",
  "Disputed",
  "Resolved",
  "Expired",
] as const;

export type ReservationStatusName = (typeof RESERVATION_STATUS_NAMES)[number];

export interface ProviderProfile {
  name: string;
  contact: string;
  metadataURI: string;
  registeredAt: bigint;
  updatedAt: bigint;
  active: boolean;
}

export interface Reservation {
  id: bigint;
  provider: Address;
  buyer: Address;
  agreementHash: Hex;
  agreementURI: string;
  capacity: string;
  bondAmount: bigint;
  serviceStart: bigint;
  serviceEnd: bigint;
  acceptanceDeadline: bigint;
  claimWindow: bigint;
  checkpointInterval: bigint;
  activatedAt: bigint;
  fundedAt: bigint;
  resolvedAt: bigint;
  claimDeadline: bigint;
  requiredCheckpoints: number;
  providerAwardBps: number;
  policyVersion: number;
  providerAccepted: boolean;
  buyerAccepted: boolean;
  status: ReservationStatus;
  buyerStatementURI: string;
  buyerStatementHash: Hex;
  resolutionURI: string;
  resolutionHash: Hex;
}

export interface Checkpoint {
  attestor: Address;
  submitter: Address;
  observedAt: bigint;
  submittedAt: bigint;
  evidenceHash: Hex;
  evidenceURI: string;
}

export interface VaultAccounting {
  balance: bigint;
  locked: bigint;
  withdrawableTotal: bigint;
  surplus: bigint;
}

export type TxStatus =
  | "idle"
  | "awaiting-signature"
  | "pending"
  | "confirmed"
  | "reverted"
  | "rejected";

export interface TxState {
  status: TxStatus;
  hash?: Hash;
  error?: string;
  confirmedAt?: number;
}

export interface ActivityItem {
  kind: string;
  reservationId?: bigint;
  blockNumber: bigint;
  txHash: Hash;
  logIndex: number;
  actor?: Address;
  summary: string;
  timestamp?: bigint;
}

export interface CoverageStats {
  totalLocked: bigint;
  reservedLocked: bigint;
  atRisk: bigint;
  withdrawable: bigint;
  activeCount: number;
  claimableCount: number;
  disputedCount: number;
  nextDeadline: { reservationId: bigint; at: bigint; label: string } | null;
}
