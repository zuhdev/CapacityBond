import { describe, expect, it } from "vitest";
import { deriveDeadlines, nextCheckpoint } from "./deadlines";
import { computeCoverage } from "./coverage";
import type { Reservation, VaultAccounting } from "./types";

const base: Reservation = {
  id: 1n,
  provider: "0x1111111111111111111111111111111111111111",
  buyer: "0x2222222222222222222222222222222222222222",
  agreementHash: `0x${"a".repeat(64)}`,
  agreementURI: "https://example.test/a",
  capacity: "demo",
  bondAmount: 100n,
  serviceStart: 1000n,
  serviceEnd: 2000n,
  acceptanceDeadline: 900n,
  claimWindow: 600n,
  checkpointInterval: 100n,
  activatedAt: 1000n,
  fundedAt: 950n,
  resolvedAt: 0n,
  claimDeadline: 0n,
  requiredCheckpoints: 10,
  providerAwardBps: 0,
  policyVersion: 1,
  providerAccepted: true,
  buyerAccepted: true,
  status: 2,
  buyerStatementURI: "",
  buyerStatementHash: `0x${"0".repeat(64)}`,
  resolutionURI: "",
  resolutionHash: `0x${"0".repeat(64)}`,
};

describe("deadlines and coverage", () => {
  it("derives claim opening from service end plus grace", () => {
    const d = deriveDeadlines(base, 120n, 2050);
    expect(d.claimOpensAt).toBe(2120n);
    expect(d.claimDeadline).toBe(2720n);
    expect(d.canMarkClaimable).toBe(false);
    expect(d.canReleaseUndisputed).toBe(false);
  });

  it("allows an undisputed release only after the claim window", () => {
    const d = deriveDeadlines(base, 120n, 2800);
    expect(d.canReleaseUndisputed).toBe(true);
  });

  it("computes locked and at-risk coverage from states, not user claims", () => {
    const claimable = { ...base, id: 2n, status: 4 as const, claimDeadline: 3000n, bondAmount: 50n };
    const draft = { ...base, id: 3n, status: 0 as const, bondAmount: 25n };
    const accounting: VaultAccounting = { balance: 150n, locked: 150n, withdrawableTotal: 0n, surplus: 0n };
    const result = computeCoverage([base, claimable, draft], accounting, 120n, 2100);
    expect(result.reservedLocked).toBe(150n);
    expect(result.atRisk).toBe(50n);
    expect(result.activeCount).toBe(1);
    expect(result.claimableCount).toBe(1);
    expect(nextCheckpoint(base, 3)).toBe(4);
  });
});
