import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOHR_DEPLOYMENT,
  DEMO_ACTIVITY,
  DEMO_CHECKPOINTS,
  DEMO_PROVIDER_PROFILES,
  DEMO_RESERVATIONS,
  capacityBondAbi,
  type ActivityItem,
  type Checkpoint,
  type ProviderProfile,
  type Reservation,
  type VaultAccounting,
} from "@capacitybond/chain";
import type { Address } from "viem";
import {
  CONTRACT_ADDRESS,
  IS_DEMO,
  normalizeAccounting,
  normalizeProvider,
  normalizeReservation,
  publicClient,
} from "../lib/contract";

export interface ProviderRecord {
  address: Address;
  profile: ProviderProfile;
}

export interface ProtocolSnapshot {
  reservations: Reservation[];
  providers: ProviderRecord[];
  accounting: VaultAccounting;
  attestor: Address | null;
  resolver: Address | null;
  gracePeriod: bigint;
  nextReservationId: bigint;
  checkpointCounts: Record<string, number>;
  activity: ActivityItem[];
}

const demoAccounting: VaultAccounting = {
  balance: 1_700_000_000_000_000_000n,
  locked: 1_700_000_000_000_000_000n,
  withdrawableTotal: 0n,
  surplus: 0n,
};

const demoSnapshot: ProtocolSnapshot = {
  reservations: DEMO_RESERVATIONS,
  providers: DEMO_PROVIDER_PROFILES,
  accounting: demoAccounting,
  attestor: DEMO_CHECKPOINTS["1"]?.[0]?.attestor ?? null,
  resolver: "0x4444444444444444444444444444444444444444",
  gracePeriod: 120n,
  nextReservationId: 4n,
  checkpointCounts: Object.fromEntries(
    Object.entries(DEMO_CHECKPOINTS).map(([id, values]) => [id, values.length]),
  ),
  activity: DEMO_ACTIVITY,
};

async function mapLimit<T, R>(items: readonly T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      output[index] = await mapper(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return output;
}

export async function loadProtocolSnapshot(): Promise<ProtocolSnapshot> {
  if (!CONTRACT_ADDRESS) return demoSnapshot;
  const address = CONTRACT_ADDRESS;

  const [nextReservationId, providerCount, attestor, resolver, gracePeriod, rawAccounting] = await Promise.all([
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "nextReservationId" }),
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "providerCount" }),
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "attestor" }),
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "resolver" }),
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "gracePeriod" }),
    publicClient.readContract({ address, abi: capacityBondAbi, functionName: "vaultAccounting" }),
  ]);

  const next = nextReservationId as bigint;
  const ids = Array.from({ length: Math.max(0, Number(next) - 1) }, (_, index) => BigInt(index + 1)).slice(-60);

  const reservationRows = await mapLimit(ids, 6, async (id) => {
    const [rawReservation, checkpointCount] = await Promise.all([
      publicClient.readContract({
        address,
        abi: capacityBondAbi,
        functionName: "getReservation",
        args: [id],
      }),
      publicClient.readContract({
        address,
        abi: capacityBondAbi,
        functionName: "checkpointCount",
        args: [id],
      }),
    ]);
    const reservation = normalizeReservation(rawReservation as unknown as Record<string, unknown>);
    return { reservation, checkpointCount: Number(checkpointCount) };
  });

  const reservations = reservationRows.map((row) => row.reservation);
  const providerIndexes = Array.from({ length: Math.min(Number(providerCount), 40) }, (_, index) => BigInt(index));
  const providers = await mapLimit(providerIndexes, 5, async (index) => {
    const providerAddress = (await publicClient.readContract({
      address,
      abi: capacityBondAbi,
      functionName: "providerAt",
      args: [index],
    })) as Address;
    const rawProfile = await publicClient.readContract({
      address,
      abi: capacityBondAbi,
      functionName: "getProvider",
      args: [providerAddress],
    });
    return {
      address: providerAddress,
      profile: normalizeProvider(rawProfile as unknown as Record<string, unknown>),
    };
  });

  const checkpointCounts = new Map<string, number>(
    reservationRows.map((row) => [row.reservation.id.toString(), row.checkpointCount]),
  );

  const activity: ActivityItem[] = reservations
    .map((reservation) => {
      const checkpointCount = checkpointCounts.get(reservation.id.toString()) ?? 0;
      const kind = reservation.status === 5 ? "Dispute" : reservation.status === 4 ? "Claimable" : reservation.status === 6 || reservation.status === 3 ? "Settled" : "Reservation";
      const timestamp = reservation.resolvedAt || reservation.activatedAt || reservation.fundedAt;
      return {
        kind,
        reservationId: reservation.id,
        blockNumber: 0n,
        txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        logIndex: Number(reservation.id),
        summary:
          checkpointCount > 0
            ? `${checkpointCount} checkpoint${checkpointCount === 1 ? "" : "s"} observed`
            : reservation.status === 4
              ? "Claim window opened with checkpoints missing"
              : `Reservation is ${reservation.status === 2 ? "active" : "in the ledger"}`,
        timestamp,
      } satisfies ActivityItem;
    })
    .sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)))
    .slice(0, 6);

  return {
    reservations,
    providers,
    accounting: normalizeAccounting(rawAccounting as unknown as readonly [bigint, bigint, bigint, bigint]),
    attestor: attestor as Address,
    resolver: resolver as Address,
    gracePeriod: gracePeriod as bigint,
    nextReservationId: next,
    checkpointCounts: Object.fromEntries(checkpointCounts),
    activity,
  };
}

export function useProtocol() {
  const [snapshot, setSnapshot] = useState<ProtocolSnapshot | null>(IS_DEMO ? demoSnapshot : null);
  const [loading, setLoading] = useState(!IS_DEMO);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (IS_DEMO) {
      setSnapshot(demoSnapshot);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadProtocolSnapshot()
      .then((next) => {
        if (cancelled) return;
        setSnapshot(next);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load protocol state.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    if (IS_DEMO) return;
    const interval = window.setInterval(refresh, 25_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh,
    isDemo: IS_DEMO,
    deployment: BOHR_DEPLOYMENT,
  };
}

export function useNow(intervalMs = 20_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}

export function useReservationDetail(id: bigint | null) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (id === null) {
      setLoading(false);
      return;
    }
    if (IS_DEMO) {
      const demo = DEMO_RESERVATIONS.find((item) => item.id === id) ?? null;
      setReservation(demo);
      setCheckpoints(DEMO_CHECKPOINTS[id.toString()] ?? []);
      setLoading(false);
      setError(demo ? null : "This demo reservation does not exist.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS!,
        abi: capacityBondAbi,
        functionName: "getReservation",
        args: [id],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS!,
        abi: capacityBondAbi,
        functionName: "getCheckpoints",
        args: [id],
      }),
    ])
      .then(([rawReservation, rawCheckpoints]) => {
        if (cancelled) return;
        setReservation(normalizeReservation(rawReservation as unknown as Record<string, unknown>));
        setCheckpoints((rawCheckpoints as unknown as Array<Record<string, unknown>>).map((raw) => ({
          attestor: raw.attestor as Address,
          submitter: raw.submitter as Address,
          observedAt: raw.observedAt as bigint,
          submittedAt: raw.submittedAt as bigint,
          evidenceHash: raw.evidenceHash as `0x${string}`,
          evidenceURI: raw.evidenceURI as string,
        })));
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load reservation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  return { reservation, checkpoints, loading, error, refresh };
}
