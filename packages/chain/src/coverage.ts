import type { CoverageStats, Reservation, VaultAccounting } from "./types";
import { deriveDeadlines } from "./deadlines";

export function computeCoverage(
  reservations: readonly Reservation[],
  accounting: VaultAccounting | null,
  gracePeriodSeconds: bigint,
  now: number,
): CoverageStats {
  let reservedLocked = 0n;
  let atRisk = 0n;
  let activeCount = 0;
  let claimableCount = 0;
  let disputedCount = 0;
  let nextDeadline: CoverageStats["nextDeadline"] = null;

  for (const reservation of reservations) {
    if (reservation.status === 1 || reservation.status === 2 || reservation.status === 4 || reservation.status === 5) {
      reservedLocked += reservation.bondAmount;
    }
    if (reservation.status === 4 || reservation.status === 5) atRisk += reservation.bondAmount;
    if (reservation.status === 2) activeCount += 1;
    if (reservation.status === 4) claimableCount += 1;
    if (reservation.status === 5) disputedCount += 1;

    const deadlines = deriveDeadlines(reservation, gracePeriodSeconds, now);
    if (
      deadlines.nextDeadlineMs > 0n &&
      (nextDeadline === null || deadlines.nextDeadlineMs < nextDeadline.at)
    ) {
      nextDeadline = {
        reservationId: reservation.id,
        at: deadlines.nextDeadlineMs,
        label: deadlines.nextDeadlineLabel,
      };
    }
  }

  return {
    totalLocked: accounting?.locked ?? reservedLocked,
    reservedLocked,
    atRisk,
    withdrawable: accounting?.withdrawableTotal ?? 0n,
    activeCount,
    claimableCount,
    disputedCount,
    nextDeadline,
  };
}

export function countCheckpointsForReservation(
  checkpoints: readonly { reservationId: bigint }[],
  reservationId: bigint,
): number {
  return checkpoints.filter((checkpoint) => checkpoint.reservationId === reservationId).length;
}
