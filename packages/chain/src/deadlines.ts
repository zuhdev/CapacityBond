import type { Reservation } from "./types";
import { formatDateTimeShort, formatRelativeTime } from "./format";

export interface ReservationDeadlines {
  claimOpensAt: bigint;
  claimDeadline: bigint;
  checkpointSubmissionDeadline: bigint;
  isClaimOpen: boolean;
  isClaimWindowOpen: boolean;
  isClaimWindowClosed: boolean;
  canMarkFulfilled: boolean;
  canMarkClaimable: boolean;
  canReleaseUndisputed: boolean;
  nextDeadlineMs: bigint;
  nextDeadlineLabel: string;
}

export function deriveDeadlines(
  reservation: Reservation,
  gracePeriodSeconds: bigint,
  now: number,
): ReservationDeadlines {
  const claimOpensAt = reservation.serviceEnd + gracePeriodSeconds;
  const claimDeadline =
    reservation.claimDeadline > 0n
      ? reservation.claimDeadline
      : claimOpensAt + reservation.claimWindow;
  const checkpointSubmissionDeadline = claimOpensAt;
  const nowBig = BigInt(Math.floor(now));
  const isClaimWindowOpen = nowBig >= claimOpensAt && nowBig <= claimDeadline;
  const isClaimWindowClosed = nowBig > claimDeadline;

  return {
    claimOpensAt,
    claimDeadline,
    checkpointSubmissionDeadline,
    isClaimOpen: nowBig >= claimOpensAt,
    isClaimWindowOpen,
    isClaimWindowClosed,
    canMarkFulfilled:
      reservation.status === 2 && nowBig >= reservation.serviceEnd,
    canMarkClaimable:
      reservation.status === 2 &&
      nowBig >= claimOpensAt &&
      nowBig <= claimDeadline,
    canReleaseUndisputed:
      (reservation.status === 4 && nowBig > claimDeadline) ||
      (reservation.status === 2 &&
        nowBig > claimDeadline),
    nextDeadlineMs: chooseNextDeadline(reservation, claimOpensAt, claimDeadline, nowBig),
    nextDeadlineLabel: nextDeadlineLabel(reservation, claimOpensAt, claimDeadline, nowBig, gracePeriodSeconds),
  };
}

function chooseNextDeadline(
  reservation: Reservation,
  claimOpensAt: bigint,
  claimDeadline: bigint,
  now: bigint,
): bigint {
  if (reservation.status === 0 || reservation.status === 1) {
    return reservation.acceptanceDeadline;
  }
  if (reservation.status === 2) {
    if (now < reservation.serviceEnd) return reservation.serviceEnd;
    if (now < claimOpensAt) return claimOpensAt;
    return claimDeadline;
  }
  if (reservation.status === 4 || reservation.status === 5) return claimDeadline;
  return 0n;
}

function nextDeadlineLabel(
  reservation: Reservation,
  claimOpensAt: bigint,
  claimDeadline: bigint,
  now: bigint,
  gracePeriodSeconds: bigint,
): string {
  if (reservation.status === 0) return "Fund and accept terms";
  if (reservation.status === 1) return "Both-party acceptance";
  if (reservation.status === 2) {
    if (now < reservation.serviceEnd) return "Service window ends";
    if (now < claimOpensAt) return `Grace period (${Number(gracePeriodSeconds)}s)`;
    return now <= claimDeadline ? "Claim window closes" : "Undisputed release";
  }
  if (reservation.status === 4) return "Buyer claim window";
  if (reservation.status === 5) return "Resolver decision";
  return "Settled";
}

export function humanDeadline(
  reservation: Reservation,
  deadline: bigint,
  now: number,
): string {
  if (deadline === 0n) return "No deadline";
  const target = Number(deadline);
  return `${formatDateTimeShort(deadline)} UTC · ${formatRelativeTime(deadline, now)}`;
}

export function nextCheckpoint(reservation: Reservation, count: number): number {
  return Math.min(count + 1, reservation.requiredCheckpoints);
}

export function acceptanceDeadlinePassed(reservation: Reservation, now: number): boolean {
  return BigInt(Math.floor(now)) > reservation.acceptanceDeadline;
}
