import { useEffect, useMemo, useState } from "react";
import {
  deriveDeadlines,
  explorerAddressUrl,
  explorerTxUrl,
  formatBps,
  formatBot,
  formatDateTimeShort,
  formatDuration,
  formatRelativeTime,
  formatTimestamp,
  shortAddress,
  statusName,
  statusTone,
  validateEvidenceURI,
  type Checkpoint,
  type Reservation,
} from "@capacitybond/chain";
import {
  AddressChip,
  Badge,
  Button,
  Field,
  Meter,
  Notice,
  SectionLabel,
  Spinner,
  type Tone,
} from "@capacitybond/ui";
import { getAddress, keccak256, toBytes, type Address, type Hash } from "viem";
import { useNow, useProtocol, useReservationDetail } from "../hooks/useProtocol";
import { useTx } from "../hooks/useTx";
import { useWallet } from "../hooks/useWallet";
import {
  CONTRACT_ADDRESS,
  IS_DEMO,
  contractUrl,
  publicClient,
  readWithdrawable,
} from "../lib/contract";
import { appPath } from "../lib/routes";

function localInputFrom(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToSeconds(value: string): bigint {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? BigInt(Math.floor(ms / 1000)) : 0n;
}

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return false;
  }
}

function uriHref(uri: string): string | null {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return null;
}

function hashLabel(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function ReservationDetail({ id }: { id: bigint }) {
  const { reservation, checkpoints, loading, error, refresh } = useReservationDetail(id);
  const { snapshot, refresh: refreshProtocol } = useProtocol();
  const wallet = useWallet();
  const tx = useTx();
  const now = useNow();
  const [withdrawable, setWithdrawable] = useState(0n);

  useEffect(() => {
    if (!wallet.address || IS_DEMO) {
      setWithdrawable(0n);
      return;
    }
    let cancelled = false;
    readWithdrawable(wallet.address)
      .then((value) => {
        if (!cancelled) setWithdrawable(value);
      })
      .catch(() => {
        if (!cancelled) setWithdrawable(0n);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet.address, reservation, tx.state.status]);

  function afterWrite() {
    refresh();
    refreshProtocol();
  }

  if (loading) {
    return <div className="workspace"><div className="loading-panel loading-panel--tall"><Spinner label="Reading reservation from Bohr" /></div></div>;
  }

  if (error || !reservation) {
    return (
      <div className="workspace">
        <div className="detail-error">
          <SectionLabel index="404">Reservation</SectionLabel>
          <h1>Record not found.</h1>
          <p>{error ?? "This reservation does not exist on the configured contract."}</p>
          <a href={appPath()} className="text-link">← Return to the ledger</a>
        </div>
      </div>
    );
  }

  const deadlines = deriveDeadlines(reservation, snapshot?.gracePeriod ?? 120n, now);
  const providerProfile = snapshot?.providers.find(
    (provider) => provider.address.toLowerCase() === reservation.provider.toLowerCase(),
  )?.profile;
  const isProvider = sameAddress(wallet.address, reservation.provider);
  const isBuyer = sameAddress(wallet.address, reservation.buyer);
  const isAttestor = sameAddress(wallet.address, snapshot?.attestor);
  const isResolver = sameAddress(wallet.address, snapshot?.resolver);
  const settled = reservation.status === 6 || reservation.status === 3;
  const fullyAwarded = settled && reservation.providerAwardBps === 10_000;

  return (
    <div className="workspace reservation-detail">
      <div className="detail-breadcrumb">
        <a href={appPath()}>Ledger</a>
        <span>/</span>
        <span>Reservation #{reservation.id.toString()}</span>
      </div>

      <header className="detail-head">
        <div className="detail-head__main">
          <div className="detail-head__meta">
            <span className="mono-label">RESERVATION / {reservation.id.toString().padStart(3, "0")}</span>
            <Badge tone={statusTone(reservation.status) as Tone}>{statusName(reservation.status)}</Badge>
            {IS_DEMO ? <span className="preview-chip">Fixture preview</span> : null}
          </div>
          <h1>{reservation.capacity}</h1>
          <p className="detail-head__sub">
            {providerProfile?.name ?? shortAddress(reservation.provider)} → {shortAddress(reservation.buyer)}
            <span>·</span>
            Policy v{reservation.policyVersion}
            <span>·</span>
            {reservation.requiredCheckpoints} checkpoint{reservation.requiredCheckpoints === 1 ? "" : "s"} required
          </p>
        </div>
        <div className="detail-head__bond">
          <span className="mono-label">PROVIDER BOND</span>
          <strong>{formatBot(reservation.bondAmount)} <small>BOT</small></strong>
          <span>{settled ? (fullyAwarded ? "Released to provider" : "Split recorded") : "Locked in contract"}</span>
        </div>
      </header>

      {IS_DEMO ? (
        <Notice tone="info" title="Illustrative reservation">
          Writes are disabled because no contract is configured. The layout and state machine
          are shown against fixture data from the protocol model.
        </Notice>
      ) : null}

      <div className="reservation-layout">
        <main className="reservation-main">
          <section className="summary-strip">
            <div>
              <span>Service window</span>
              <strong>{formatDateTimeShort(reservation.serviceStart)} → {formatDateTimeShort(reservation.serviceEnd)}</strong>
              <small>{formatDuration(reservation.serviceEnd - reservation.serviceStart)}</small>
            </div>
            <div>
              <span>Checkpoint record</span>
              <strong><Meter value={checkpoints.length} max={reservation.requiredCheckpoints} /></strong>
              <small>Cadence {formatDuration(reservation.checkpointInterval)}</small>
            </div>
            <div>
              <span>Claim window</span>
              <strong>{deadlines.claimOpensAt > 0n ? formatRelativeTime(deadlines.claimOpensAt, now) : "—"}</strong>
              <small>{deadlines.claimOpensAt ? `After grace · ${formatDateTimeShort(deadlines.claimOpensAt)}` : ""}</small>
            </div>
            <div>
              <span>Next action</span>
              <strong>{deadlines.nextDeadlineLabel}</strong>
              <small>{deadlines.nextDeadlineMs > 0n ? formatRelativeTime(deadlines.nextDeadlineMs, now) : "Settled"}</small>
            </div>
          </section>

          <section className="phase-card">
            <div className="panel-heading">
              <div>
                <span className="mono-label">LIFECYCLE</span>
                <h2>Where the promise stands</h2>
              </div>
              <span className="mono-label">{IS_DEMO ? "FIXTURE" : `BLOCK TIME ${formatTimestamp(now, { year: undefined })}`}</span>
            </div>
            <PhaseTimeline
              reservation={reservation}
              checkpoints={checkpoints}
              now={now}
              gracePeriod={snapshot?.gracePeriod ?? 120n}
            />
          </section>

          <section className="checkpoint-card">
            <div className="panel-heading">
              <div>
                <span className="mono-label">CHECKPOINTS</span>
                <h2>Signed observations</h2>
              </div>
              <span>{checkpoints.length} / {reservation.requiredCheckpoints}</span>
            </div>
            <CheckpointList checkpoints={checkpoints} required={reservation.requiredCheckpoints} />
            {reservation.status === 2 && isAttestor ? (
              <CheckpointForm reservation={reservation} checkpoints={checkpoints} wallet={wallet} tx={tx} afterWrite={afterWrite} />
            ) : null}
            <div className="checkpoint-note">
              <span className="checkpoint-note__mark">i</span>
              <p>
                A valid signature proves the configured attestor authorized this observation at
                this sequence. It does not prove that the capacity existed, ran, or met a quality bar.
              </p>
            </div>
          </section>

          <section className="terms-card">
            <div className="panel-heading">
              <div>
                <span className="mono-label">TERMS</span>
                <h2>The reservation record</h2>
              </div>
            </div>
            <dl className="terms-grid">
              <div><dt>Agreement reference</dt><dd><Reference uri={reservation.agreementURI} /></dd></div>
              <div><dt>Agreement hash</dt><dd className="mono-value">{hashLabel(reservation.agreementHash)}</dd></div>
              <div><dt>Provider</dt><dd><AddressChip address={reservation.provider} href={explorerAddressUrl(reservation.provider)} /></dd></div>
              <div><dt>Buyer</dt><dd><AddressChip address={reservation.buyer} href={explorerAddressUrl(reservation.buyer)} /></dd></div>
              <div><dt>Acceptance deadline</dt><dd>{formatTimestamp(reservation.acceptanceDeadline)}</dd></div>
              <div><dt>Claim window</dt><dd>{formatDuration(reservation.claimWindow)}</dd></div>
              <div><dt>Activated</dt><dd>{reservation.activatedAt ? formatTimestamp(reservation.activatedAt) : "Not yet"}</dd></div>
              <div><dt>Resolved</dt><dd>{reservation.resolvedAt ? formatTimestamp(reservation.resolvedAt) : "Not yet"}</dd></div>
              {reservation.buyerStatementURI ? <div className="terms-grid__wide"><dt>Buyer statement</dt><dd><Reference uri={reservation.buyerStatementURI} /><span className="mono-value">{hashLabel(reservation.buyerStatementHash)}</span></dd></div> : null}
              {reservation.resolutionURI ? <div className="terms-grid__wide"><dt>Resolution</dt><dd><Reference uri={reservation.resolutionURI} /><span className="mono-value">{hashLabel(reservation.resolutionHash)}</span></dd></div> : null}
            </dl>
          </section>
        </main>

        <aside className="reservation-side">
          <RoleCard
            reservation={reservation}
            address={wallet.address}
            isProvider={isProvider}
            isBuyer={isBuyer}
            isAttestor={isAttestor}
            isResolver={isResolver}
            walletAvailable={wallet.isAvailable}
            onConnect={() => void wallet.connect()}
          />

          <ActionPanel
            reservation={reservation}
            snapshots={{ attestor: snapshot?.attestor ?? null, resolver: snapshot?.resolver ?? null }}
            deadlines={deadlines}
            now={now}
            wallet={wallet}
            tx={tx}
            afterWrite={afterWrite}
            isProvider={isProvider}
            isBuyer={isBuyer}
            isAttestor={isAttestor}
            isResolver={isResolver}
          />

          {wallet.address && withdrawable > 0n ? (
            <section className="action-card action-card--withdraw">
              <span className="mono-label">WITHDRAWABLE</span>
              <h3>{formatBot(withdrawable)} BOT</h3>
              <p>Credited to {shortAddress(wallet.address)} from settled reservations.</p>
              <Button
                variant="primary"
                loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}
                onClick={() =>
                  void tx.run("Withdraw BOT", () => wallet.write({ functionName: "withdraw" }), async () => {
                    afterWrite();
                    if (wallet.address) setWithdrawable(await readWithdrawable(wallet.address));
                  })
                }
              >
                Withdraw BOT
              </Button>
            </section>
          ) : null}

          {tx.state.status !== "idle" ? (
            <div className={`tx-card tx-card--${tx.state.status}`}>
              <span className="mono-label">{tx.state.label ?? "TRANSACTION"}</span>
              <strong>{tx.state.status === "confirmed" ? "Confirmed on Bohr" : tx.state.status === "pending" ? "Waiting for receipt" : tx.state.status === "awaiting-signature" ? "Confirm in wallet" : tx.state.error}</strong>
              {tx.state.hash ? <a href={explorerTxUrl(tx.state.hash)} target="_blank" rel="noreferrer">View transaction ↗</a> : null}
            </div>
          ) : null}

          <section className="network-card">
            <span className="mono-label">CONTRACT CONTEXT</span>
            <dl>
              <div><dt>Network</dt><dd>Bohr Testnet · 968</dd></div>
              <div><dt>Contract</dt><dd>{CONTRACT_ADDRESS ? <AddressChip address={CONTRACT_ADDRESS} href={contractUrl(CONTRACT_ADDRESS)} /> : "Pending"}</dd></div>
              <div><dt>Attestor</dt><dd><AddressChip address={snapshot?.attestor ?? "0x0000000000000000000000000000000000000000"} /></dd></div>
              <div><dt>Resolver</dt><dd><AddressChip address={snapshot?.resolver ?? "0x0000000000000000000000000000000000000000"} /></dd></div>
              <div><dt>Grace period</dt><dd>{snapshot ? formatDuration(snapshot.gracePeriod) : "—"}</dd></div>
            </dl>
            <p>Native BOT only. Withdrawals are pull payments protected against reentrancy.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PhaseTimeline({
  reservation,
  checkpoints,
  now,
  gracePeriod,
}: {
  reservation: Reservation;
  checkpoints: Checkpoint[];
  now: number;
  gracePeriod: bigint;
}) {
  const completedCheckpoints = checkpoints.length >= reservation.requiredCheckpoints;
  const serviceEnded = now > Number(reservation.serviceEnd);
  const claimOpensAt = Number(reservation.serviceEnd + gracePeriod);
  const phases = [
    {
      label: "Terms recorded",
      detail: reservation.fundedAt ? `Funded ${formatTimestamp(reservation.fundedAt)}` : "Awaiting exact bond deposit",
      done: reservation.status >= 2 || reservation.status === 7,
      active: reservation.status < 2 && reservation.status !== 7,
    },
    {
      label: "Both parties accept",
      detail: reservation.activatedAt ? `Activated ${formatTimestamp(reservation.activatedAt)}` : `${reservation.providerAccepted ? "Provider accepted" : "Provider pending"} · ${reservation.buyerAccepted ? "Buyer accepted" : "Buyer pending"}`,
      done: Boolean(reservation.activatedAt),
      active: reservation.status === 1,
    },
    {
      label: "Service window",
      detail: `${formatTimestamp(reservation.serviceStart)} → ${formatTimestamp(reservation.serviceEnd)}`,
      done: serviceEnded,
      active: now >= Number(reservation.serviceStart) && !serviceEnded,
    },
    {
      label: "Checkpoint record",
      detail: `${checkpoints.length} of ${reservation.requiredCheckpoints} · ${completedCheckpoints ? "complete" : "incomplete"}`,
      done: completedCheckpoints,
      active: reservation.status === 2 && !completedCheckpoints && serviceEnded,
    },
    {
      label: reservation.status === 4 || reservation.status === 5 ? "Claim / dispute" : "Settlement",
      detail:
        reservation.resolvedAt
          ? `${formatTimestamp(reservation.resolvedAt)} · ${formatBps(reservation.providerAwardBps)} provider`
          : reservation.status === 4
            ? `Claim window closes ${formatTimestamp(reservation.claimDeadline)}`
            : reservation.status === 5
              ? "Awaiting resolver"
              : reservation.status === 2 && serviceEnded
                ? completedCheckpoints
                  ? "Ready for full release"
                  : now < claimOpensAt
                    ? `Claim path opens ${formatTimestamp(reservation.serviceEnd + gracePeriod)}`
                    : "Claim or undisputed release"
                : "Not open yet",
      done: reservation.status === 6 || reservation.status === 3 || reservation.status === 7,
      active:
        reservation.status === 4 ||
        reservation.status === 5 ||
        (reservation.status === 2 &&
          serviceEnded &&
          (completedCheckpoints || now >= claimOpensAt)),
    },
  ];
  return (
    <div className="phase-timeline">
      {phases.map((phase, index) => (
        <div className={`phase ${phase.done ? "phase--done" : ""} ${phase.active ? "phase--active" : ""}`} key={phase.label}>
          <span className="phase__marker">{phase.done ? "✓" : String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{phase.label}</strong>
            <span>{phase.detail}</span>
          </div>
          {phase.active ? <em>current</em> : null}
        </div>
      ))}
    </div>
  );
}

function CheckpointList({ checkpoints, required }: { checkpoints: Checkpoint[]; required: number }) {
  if (checkpoints.length === 0) {
    return (
      <div className="checkpoint-empty">
        <span>00</span>
        <div>
          <strong>No signed observations yet.</strong>
          <p>The attestor can add them after service starts. Each one must be ordered and within the service window.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="checkpoint-list">
      {checkpoints.map((checkpoint, index) => (
        <div className="checkpoint-row" key={`${checkpoint.observedAt}-${index}`}>
          <span className="checkpoint-row__seq">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong><Reference uri={checkpoint.evidenceURI} /></strong>
            <span>Observed {formatTimestamp(checkpoint.observedAt)} · submitted {formatTimestamp(checkpoint.submittedAt)}</span>
          </div>
          <div className="checkpoint-row__hash">
            <span className="mono-value">{hashLabel(checkpoint.evidenceHash)}</span>
            <span>{shortAddress(checkpoint.attestor)}</span>
          </div>
        </div>
      ))}
      <div className="checkpoint-list__foot">
        <span>{checkpoints.length} / {required} recorded</span>
        <span>Ordered by observed time</span>
      </div>
    </div>
  );
}

function CheckpointForm({
  reservation,
  checkpoints,
  wallet,
  tx,
  afterWrite,
}: {
  reservation: Reservation;
  checkpoints: Checkpoint[];
  wallet: ReturnType<typeof useWallet>;
  tx: ReturnType<typeof useTx>;
  afterWrite: () => void;
}) {
  const serviceStart = Number(reservation.serviceStart);
  const serviceEnd = Number(reservation.serviceEnd);
  const initial = Math.max(serviceStart, Math.floor(Date.now() / 1000) - 30);
  const [observedAt, setObservedAt] = useState(localInputFrom(new Date(Math.min(initial, serviceEnd) * 1000)));
  const [evidenceURI, setEvidenceURI] = useState("");
  const [touched, setTouched] = useState(false);
  const sequence = BigInt(checkpoints.length + 1);
  const observed = localInputToSeconds(observedAt);
  const uriError = validateEvidenceURI(evidenceURI);
  const timeError = observed < reservation.serviceStart
    ? "Observation is before service start."
    : observed > reservation.serviceEnd
      ? "Observation is after service end."
      : observed > BigInt(Math.floor(Date.now() / 1000))
        ? "Observation cannot be in the future."
        : null;
  const blocked = Boolean(uriError || timeError);

  return (
    <form
      className="inline-action-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (blocked) return;
        const hash = keccak256(toBytes(evidenceURI));
        void tx.run(
          `Submit checkpoint #${sequence}`,
          async () => {
            const signature = await wallet.signCheckpoint({
              reservationId: reservation.id,
              sequence,
              observedAt: observed,
              evidenceHash: hash,
              evidenceURI,
            });
            return wallet.write({
              functionName: "submitCheckpoint",
              args: [reservation.id, sequence, observed, hash, evidenceURI, signature],
            });
          },
          () => {
            afterWrite();
            setEvidenceURI("");
            setTouched(false);
          },
        );
      }}
    >
      <div className="inline-action-form__head">
        <div>
          <span className="mono-label">ATTESTOR CONSOLE</span>
          <h3>Add observation #{sequence.toString()}</h3>
        </div>
        <Badge tone="active">Attestor connected</Badge>
      </div>
      <div className="form-grid">
        <Field label="Observed at" hint="Must be inside the service window and not in the future." error={touched && timeError ? timeError : undefined}>
          <input type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} />
        </Field>
        <Field label="Evidence reference" hint="URI, log reference, or URN. Public and immutable." error={touched && uriError ? uriError : undefined}>
          <input value={evidenceURI} onChange={(event) => setEvidenceURI(event.target.value)} placeholder="ipfs://… or urn:…" />
        </Field>
      </div>
      <div className="inline-action-form__foot">
        <span>Hash <code>{hashLabel(keccak256(toBytes(evidenceURI)))}</code></span>
        <Button type="submit" size="sm" loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}>
          Sign &amp; submit
        </Button>
      </div>
    </form>
  );
}

function DisputeForm({
  reservation,
  wallet,
  tx,
  afterWrite,
}: {
  reservation: Reservation;
  wallet: ReturnType<typeof useWallet>;
  tx: ReturnType<typeof useTx>;
  afterWrite: () => void;
}) {
  const [statementURI, setStatementURI] = useState("");
  const [touched, setTouched] = useState(false);
  const uriError = validateEvidenceURI(statementURI);
  return (
    <form
      className="inline-action-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (uriError) return;
        void tx.run(
          "Open buyer dispute",
          () =>
            wallet.write({
              functionName: "openDispute",
              args: [reservation.id, statementURI, keccak256(toBytes(statementURI))],
            }),
          () => {
            afterWrite();
            setStatementURI("");
            setTouched(false);
          },
        );
      }}
    >
      <div className="inline-action-form__head">
        <div>
          <span className="mono-label">BUYER CLAIM</span>
          <h3>Dispute this bond</h3>
        </div>
      </div>
      <Field label="Statement reference" hint="Where the buyer's written claim lives." error={touched && uriError ? uriError : undefined}>
        <input value={statementURI} onChange={(event) => setStatementURI(event.target.value)} placeholder="ipfs://… or https://…" />
      </Field>
      <Button type="submit" size="sm" loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}>
        Open dispute
      </Button>
    </form>
  );
}

function ResolveForm({
  reservation,
  wallet,
  tx,
  afterWrite,
}: {
  reservation: Reservation;
  wallet: ReturnType<typeof useWallet>;
  tx: ReturnType<typeof useTx>;
  afterWrite: () => void;
}) {
  const [award, setAward] = useState(50);
  const [resolutionURI, setResolutionURI] = useState("");
  const [touched, setTouched] = useState(false);
  const uriError = validateEvidenceURI(resolutionURI);
  const providerAmount = (reservation.bondAmount * BigInt(Math.round(award * 100))) / 10_000n;
  const buyerAmount = reservation.bondAmount - providerAmount;
  return (
    <form
      className="inline-action-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (uriError) return;
        void tx.run(
          "Resolve dispute",
          () =>
            wallet.write({
              functionName: "resolveDispute",
              args: [reservation.id, Math.round(award * 100), resolutionURI, keccak256(toBytes(resolutionURI))],
            }),
          () => {
            afterWrite();
            setResolutionURI("");
            setTouched(false);
          },
        );
      }}
    >
      <div className="inline-action-form__head">
        <div>
          <span className="mono-label">RESOLVER</span>
          <h3>Split the bond</h3>
        </div>
        <span className="mono-label">BPS {Math.round(award * 100)}</span>
      </div>
      <label className="range-field">
        <span>Provider award</span>
        <input type="range" min="0" max="100" step="1" value={award} onChange={(event) => setAward(Number(event.target.value))} />
        <span className="range-value">{award}% / {100 - award}%</span>
      </label>
      <div className="split-preview">
        <span>Provider <strong>{formatBot(providerAmount)} BOT</strong></span>
        <span>Buyer <strong>{formatBot(buyerAmount)} BOT</strong></span>
      </div>
      <Field label="Resolution reference" hint="The written rationale and evidence." error={touched && uriError ? uriError : undefined}>
        <input value={resolutionURI} onChange={(event) => setResolutionURI(event.target.value)} placeholder="ipfs://… or https://…" />
      </Field>
      <Button type="submit" size="sm" loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}>
        Record decision
      </Button>
    </form>
  );
}

function RoleCard({
  reservation,
  address,
  isProvider,
  isBuyer,
  isAttestor,
  isResolver,
  walletAvailable,
  onConnect,
}: {
  reservation: Reservation;
  address: Address | null;
  isProvider: boolean;
  isBuyer: boolean;
  isAttestor: boolean;
  isResolver: boolean;
  walletAvailable: boolean;
  onConnect: () => void;
}) {
  const roles = [
    isProvider ? "Provider" : null,
    isBuyer ? "Buyer" : null,
    isAttestor ? "Attestor" : null,
    isResolver ? "Resolver" : null,
  ].filter(Boolean);
  return (
    <section className="role-context">
      <span className="mono-label">YOUR POSITION</span>
      {address ? (
        <>
          <div className="role-context__address"><AddressChip address={address} /><span>{roles.length ? roles.join(" · ") : "Observer"}</span></div>
          <p>
            {roles.length
              ? "Controls below reflect this wallet's role and the current reservation state."
              : "You can inspect the record and withdraw any balance credited to this address."}
          </p>
        </>
      ) : (
        <>
          <h3>Read-only until connected.</h3>
          <p>
            {walletAvailable
              ? "Connect the wallet for your role to see eligible actions."
              : "No injected wallet was detected. Install a browser wallet with BOT Chain support to act."}
          </p>
          {walletAvailable ? (
            <Button variant="secondary" size="sm" onClick={onConnect}>Connect wallet</Button>
          ) : null}
        </>
      )}
      <div className="role-context__parties">
        <span>Provider <strong>{shortAddress(reservation.provider)}</strong></span>
        <span>Buyer <strong>{shortAddress(reservation.buyer)}</strong></span>
      </div>
    </section>
  );
}

function ActionPanel({
  reservation,
  snapshots,
  deadlines,
  now,
  wallet,
  tx,
  afterWrite,
  isProvider,
  isBuyer,
  isAttestor,
  isResolver,
}: {
  reservation: Reservation;
  snapshots: { attestor: Address | null; resolver: Address | null };
  deadlines: ReturnType<typeof deriveDeadlines>;
  now: number;
  wallet: ReturnType<typeof useWallet>;
  tx: ReturnType<typeof useTx>;
  afterWrite: () => void;
  isProvider: boolean;
  isBuyer: boolean;
  isAttestor: boolean;
  isResolver: boolean;
}) {
  if (IS_DEMO) {
    return (
      <section className="action-card">
        <span className="mono-label">ACTIONS</span>
        <h3>Fixture mode</h3>
        <p>Configure a contract address to enable deposit, acceptance, checkpoint, claim, and resolution actions.</p>
      </section>
    );
  }

  if (!wallet.address) {
    return (
      <section className="action-card">
        <span className="mono-label">ACTIONS</span>
        <h3>Connect to act.</h3>
        <p>
          {wallet.isAvailable
            ? "The state remains readable without a wallet. Transactions need an EOA with BOT for gas."
            : "No injected wallet was detected. The record stays readable; install a browser wallet to write."}
        </p>
        {wallet.isAvailable ? (
          <Button variant="secondary" size="sm" onClick={() => void wallet.connect()}>Connect wallet</Button>
        ) : null}
      </section>
    );
  }

  if (!wallet.isCorrectChain) {
    return (
      <section className="action-card action-card--warning">
        <span className="mono-label">WRONG NETWORK</span>
        <h3>Switch to Bohr.</h3>
        <p>Writes must be sent to BOT Chain Bohr Testnet, chain ID 968.</p>
        <Button variant="secondary" size="sm" onClick={() => void wallet.switchToBohr()}>Switch network</Button>
      </section>
    );
  }

  const withdraw = () => {
    void tx.run("Withdraw BOT", () => wallet.write({ functionName: "withdraw" }), afterWrite);
  };

  if (reservation.status === 0) {
    return (
      <section className="action-card action-card--primary">
        <span className="mono-label">DRAFT</span>
        <h3>Fund the exact bond.</h3>
        <p>Depositing opens the reservation for acceptance. The provider pays {formatBot(reservation.bondAmount)} BOT plus gas.</p>
        <Button
          disabled={!isProvider}
          loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}
          onClick={() =>
            void tx.run(
              "Deposit bond",
              () => wallet.write({ functionName: "depositBond", args: [reservation.id], value: reservation.bondAmount }),
              afterWrite,
            )
          }
        >
          Deposit {formatBot(reservation.bondAmount)} BOT
        </Button>
        {!isProvider ? <span className="action-reason">Only the provider can deposit this bond.</span> : null}
        {now > Number(reservation.acceptanceDeadline) ? (
          <button type="button" className="text-link text-link--danger" onClick={() => void tx.run("Expire reservation", () => wallet.write({ functionName: "expireReservation", args: [reservation.id] }), afterWrite)}>
            Acceptance deadline passed — expire draft
          </button>
        ) : null}
      </section>
    );
  }

  if (reservation.status === 1) {
    const acceptAllowed = (isProvider && !reservation.providerAccepted) || (isBuyer && !reservation.buyerAccepted);
    return (
      <section className="action-card action-card--primary">
        <span className="mono-label">FUNDED</span>
        <h3>Both sides must accept.</h3>
        <div className="acceptance-pair">
          <div className={reservation.providerAccepted ? "is-accepted" : ""}><span>Provider</span><strong>{reservation.providerAccepted ? "Accepted" : "Pending"}</strong></div>
          <div className={reservation.buyerAccepted ? "is-accepted" : ""}><span>Buyer</span><strong>{reservation.buyerAccepted ? "Accepted" : "Pending"}</strong></div>
        </div>
        <p>Acceptance closes {formatRelativeTime(reservation.acceptanceDeadline, now)}. Service starts {formatRelativeTime(reservation.serviceStart, now)}.</p>
        <Button
          disabled={!acceptAllowed}
          loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}
          onClick={() => void tx.run("Accept terms", () => wallet.write({ functionName: "acceptReservation", args: [reservation.id] }), afterWrite)}
        >
          Accept terms
        </Button>
        {!acceptAllowed ? <span className="action-reason">{isProvider || isBuyer ? "This wallet has already accepted." : "Only the provider or buyer can accept."}</span> : null}
        {now > Number(reservation.acceptanceDeadline) ? (
          <button type="button" className="text-link text-link--danger" onClick={() => void tx.run("Expire reservation", () => wallet.write({ functionName: "expireReservation", args: [reservation.id] }), afterWrite)}>
            Expire and refund the provider
          </button>
        ) : null}
      </section>
    );
  }

  if (reservation.status === 2) {
    const canFulfill = deadlines.canMarkFulfilled;
    const canClaim = deadlines.canMarkClaimable;
    const canRelease = deadlines.canReleaseUndisputed;
    return (
      <section className="action-card">
        <span className="mono-label">ACTIVE</span>
        <h3>Watch the record.</h3>
        <p>
          {now < Number(reservation.serviceEnd)
            ? `Service is open for ${formatRelativeTime(reservation.serviceEnd, now)}.`
            : deadlines.isClaimOpen
              ? "Grace has elapsed. Missing checkpoints now open the claim path."
              : "Service is complete. The grace period is running before a claim can open."}
        </p>
        <div className="action-stack">
          {isAttestor && now >= Number(reservation.serviceStart) && now <= Number(deadlines.checkpointSubmissionDeadline) ? (
            <span className="action-hint">Use the attestor console below the checkpoint record.</span>
          ) : null}
          {canFulfill ? (
            <Button onClick={() => void tx.run("Mark fulfilled", () => wallet.write({ functionName: "markFulfilled", args: [reservation.id] }), afterWrite)} loading={tx.state.status === "pending"}>
              Release full bond
            </Button>
          ) : null}
          {canClaim ? (
            <Button variant="danger" onClick={() => void tx.run("Open claim window", () => wallet.write({ functionName: "markClaimable", args: [reservation.id] }), afterWrite)} loading={tx.state.status === "pending"}>
              Mark claimable
            </Button>
          ) : null}
          {canRelease ? (
            <Button variant="secondary" onClick={() => void tx.run("Release undisputed", () => wallet.write({ functionName: "releaseUndisputed", args: [reservation.id] }), afterWrite)} loading={tx.state.status === "pending"}>
              Release undisputed bond
            </Button>
          ) : null}
          {!canFulfill && !canClaim && !canRelease ? (
            <span className="action-reason">
              {now < Number(reservation.serviceEnd)
                ? "No settlement action is available while the service window is open."
                : "This wallet has no eligible claim or release action."}
            </span>
          ) : null}
        </div>
      </section>
    );
  }

  if (reservation.status === 4) {
    return (
      <section className="action-card action-card--danger">
        <span className="mono-label">CLAIMABLE</span>
        <h3>The checkpoint record is incomplete.</h3>
        <p>
          {checkpointsNeededLabel(reservation)}
          The buyer can dispute until {formatTimestamp(reservation.claimDeadline)}.
        </p>
        {isBuyer ? <DisputeForm reservation={reservation} wallet={wallet} tx={tx} afterWrite={afterWrite} /> : (
          <span className="action-reason">Only the buyer {shortAddress(reservation.buyer)} can open the dispute.</span>
        )}
        {deadlines.canReleaseUndisputed ? (
          <Button variant="secondary" size="sm" onClick={() => void tx.run("Release undisputed", () => wallet.write({ functionName: "releaseUndisputed", args: [reservation.id] }), afterWrite)}>
            Claim window closed — release to provider
          </Button>
        ) : null}
      </section>
    );
  }

  if (reservation.status === 5) {
    return (
      <section className="action-card action-card--danger">
        <span className="mono-label">DISPUTED</span>
        <h3>Resolver required.</h3>
        <p>The buyer has opened a claim. Only the configured resolver can split the bond and record a rationale.</p>
        <div className="role-callout"><span>Resolver</span><AddressChip address={snapshots.resolver ?? "0x0000000000000000000000000000000000000000"} /></div>
        {isResolver ? <ResolveForm reservation={reservation} wallet={wallet} tx={tx} afterWrite={afterWrite} /> : <span className="action-reason">Connect the resolver wallet to record a decision.</span>}
      </section>
    );
  }

  if (reservation.status === 6) {
    return (
      <section className="action-card">
        <span className="mono-label">RESOLVED</span>
        <h3>{formatBps(reservation.providerAwardBps)} to the provider.</h3>
        <p>
          {formatBot((reservation.bondAmount * BigInt(reservation.providerAwardBps)) / 10_000n)} BOT to the provider,
          {" "}{formatBot(reservation.bondAmount - (reservation.bondAmount * BigInt(reservation.providerAwardBps)) / 10_000n)} BOT to the buyer.
          Credits are withdrawn individually.
        </p>
        {reservation.resolutionURI ? <Reference uri={reservation.resolutionURI} /> : null}
        <Button variant="secondary" size="sm" onClick={() => void withdraw()}>Withdraw any balance</Button>
      </section>
    );
  }

  if (reservation.status === 7) {
    return (
      <section className="action-card">
        <span className="mono-label">EXPIRED</span>
        <h3>No service was activated.</h3>
        <p>Any funded bond was credited back to the provider as a withdrawable balance.</p>
        <Button variant="secondary" size="sm" onClick={() => void withdraw()}>Withdraw any balance</Button>
      </section>
    );
  }

  return null;
}

function checkpointsNeededLabel(reservation: Reservation): string {
  return `${reservation.requiredCheckpoints} checkpoints were required. The bond remains locked in the contract.`;
}

function Reference({ uri }: { uri: string }) {
  const href = uriHref(uri);
  if (!uri) return <span>—</span>;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="reference-link">{uri} ↗</a>
  ) : (
    <span className="reference-link reference-link--plain" title={uri}>{uri}</span>
  );
}
