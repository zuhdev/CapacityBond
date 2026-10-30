import { formatEther } from "viem";
import type { Address } from "viem";
import { RESERVATION_STATUS_NAMES, type Reservation, type ReservationStatusName } from "./types";

export function formatBot(value: bigint, maximumFractionDigits = 4): string {
  const numeric = Number(formatEther(value));
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export function formatBotExact(value: bigint): string {
  const raw = formatEther(value);
  const [wholePart, fraction] = raw.split(".");
  const whole = wholePart ?? "0";
  const trimmed = (fraction ?? "").replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed.slice(0, 6)}` : whole;
}

export function shortAddress(address: Address | string | null | undefined, size = 4): string {
  if (!address) return "—";
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}

export function statusName(status: Reservation["status"]): ReservationStatusName {
  return RESERVATION_STATUS_NAMES[status] ?? "Draft";
}

export function statusTone(status: Reservation["status"]): string {
  switch (status) {
    case 2:
      return "active";
    case 3:
    case 6:
      return "settled";
    case 4:
      return "attention";
    case 5:
      return "disputed";
    case 7:
      return "expired";
    case 1:
      return "funded";
    default:
      return "draft";
  }
}

export function formatTimestamp(seconds: bigint | number, options?: Intl.DateTimeFormatOptions): string {
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
    ...options,
  }).format(new Date(ms));
}

export function formatDateTimeShort(seconds: bigint | number): string {
  return formatTimestamp(seconds, { year: undefined });
}

export function formatRelativeTime(target: bigint, now: number): string {
  const delta = Number(target) - now;
  const abs = Math.abs(delta);
  if (abs < 60) return delta >= 0 ? "in under a minute" : "under a minute ago";
  if (abs < 3600) {
    const minutes = Math.round(abs / 60);
    return delta >= 0 ? `in ${minutes} min` : `${minutes} min ago`;
  }
  if (abs < 86_400) {
    const hours = Math.round(abs / 3600);
    return delta >= 0 ? `in ${hours} h` : `${hours} h ago`;
  }
  const days = Math.round(abs / 86_400);
  return delta >= 0 ? `in ${days} d` : `${days} d ago`;
}

export function formatDuration(seconds: bigint | number): string {
  const total = Number(seconds);
  if (total < 60) return `${total}s`;
  if (total < 3600) {
    const minutes = Math.round(total / 60);
    return `${minutes} min`;
  }
  if (total < 86_400) {
    const hours = Math.floor(total / 3600);
    const minutes = Math.round((total % 3600) / 60);
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  const days = Math.round(total / 86_400);
  return `${days} d`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function explorerAddressUrl(address: Address | string): string {
  return `https://scan.bohr.life/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `https://scan.bohr.life/tx/${hash}`;
}

export function validateEvidenceURI(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Add an evidence URI or hash reference.";
  if (trimmed.length > 256) return "Evidence reference must be 256 characters or fewer.";
  if (/\s/.test(trimmed)) return "Evidence reference cannot contain whitespace.";
  if (/^(javascript|data):/i.test(trimmed)) return "That URI scheme is not allowed.";
  return null;
}
