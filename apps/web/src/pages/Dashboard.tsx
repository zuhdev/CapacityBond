import { useEffect, useMemo, useState } from "react";
import {
  computeCoverage,
  deriveDeadlines,
  explorerAddressUrl,
  explorerTxUrl,
  formatBot,
  formatDuration,
  formatRelativeTime,
  formatTimestamp,
  shortAddress,
  statusName,
  statusTone,
  type Reservation,
} from "@capacitybond/chain";
import { AddressChip, Badge, Button, Meter, Notice, SectionLabel, Spinner, Stat, type Tone } from "@capacitybond/ui";
import { ConnectButton } from "../components/ConnectButton";
import { useNow, useProtocol, type ProtocolSnapshot } from "../hooks/useProtocol";
import { useTx } from "../hooks/useTx";
import { useWallet } from "../hooks/useWallet";
import { activeChainConfig, CONTRACT_ADDRESS, IS_DEMO, contractUrl, readWithdrawable } from "../lib/contract";
import { appPath } from "../lib/routes";

export function Dashboard() {
  const { snapshot, loading, error, refresh, isDemo } = useProtocol();
  const wallet = useWallet();
  const now = useNow();
  const tx = useTx();
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
  }, [wallet.address, snapshot, tx.state.status]);

  const coverage = useMemo(
    () =>
      snapshot
        ? computeCoverage(snapshot.reservations, snapshot.accounting, snapshot.gracePeriod, now)
        : null,
    [snapshot, now],
  );

  return (
    <div className="workspace">
      <header className="workspace-head">
        <div>
          <SectionLabel index="Ledger">Workspace</SectionLabel>
          <h1>Reservation ledger</h1>
          <p>One row per compute promise. Collateral, acceptance, and the checkpoint record stay visible together.</p>
        </div>
        <div className="workspace-head__actions">
          <a href={appPath("/new")} className="btn btn--primary btn--md">Create reservation <span className="arrow">↗</span></a>
          <button type="button" className="btn btn--quiet btn--md" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {isDemo ? (
        <Notice tone="info" title="Fixture preview — no contract configured">
          These reservations are illustrative fixtures. Deploy to the configured
          network and update <code> {activeChainConfig.recordFile} </code> to read and
          write live protocol state.
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="danger" title="Could not read the contract">
          {error} <button type="button" className="link-button" onClick={refresh}>Try again</button>
        </Notice>
      ) : null}

      <div className="ledger-rail">
        <span className={`live-mark ${isDemo ? "live-mark--demo" : ""}`}>
          <span className="status-dot" /> {isDemo ? "Fixture data" : `Live on ${activeChainConfig.label}`}
        </span>
        <span className="rail-separator" />
        {CONTRACT_ADDRESS ? (
          <span>Contract <AddressChip address={CONTRACT_ADDRESS} href={contractUrl(CONTRACT_ADDRESS)} /></span>
        ) : (
          <span>Contract pending deployment</span>
        )}
        <span className="rail-separator" />
        <span>Attestor <AddressChip address={snapshot?.attestor ?? "0x0000000000000000000000000000000000000000"} href={snapshot?.attestor ? explorerAddressUrl(snapshot.attestor) : undefined} /></span>
        <span className="rail-separator" />
        <span>Grace <strong>{snapshot ? formatDuration(snapshot.gracePeriod) : "—"}</strong></span>
        <span className="rail-spacer" />
        <span>Policy v1</span>
      </div>

      {!snapshot && loading ? (
        <div className="loading-panel"><Spinner label={`Reading reservation state from ${activeChainConfig.labelFull}`} /></div>
      ) : null}

      {snapshot && coverage ? (
        <>
          <div className="stats-row">
            <Stat label="Locked collateral" value={<>{formatBot(snapshot.accounting.locked)} <small>BOT</small></>} detail={`${snapshot.reservations.length} reservations in ledger`} />
            <Stat label="Active reservations" value={coverage.activeCount} detail={`${coverage.claimableCount} claimable · ${coverage.disputedCount} disputed`} />
            <Stat label="Collateral at risk" value={<>{formatBot(coverage.atRisk)} <small>BOT</small></>} detail="Claimable or disputed bonds" accent />
            <Stat
              label="Next deadline"
              value={coverage.nextDeadline ? formatRelativeTime(coverage.nextDeadline.at, now) : "None"}
              detail={coverage.nextDeadline ? `#${coverage.nextDeadline.reservationId} · ${coverage.nextDeadline.label}` : "No open windows"}
            />
          </div>

          {wallet.address && withdrawable > 0n ? (
            <div className="withdraw-banner">
              <div>
                <span className="mono-label">AVAILABLE TO WITHDRAW</span>
                <strong>{formatBot(withdrawable)} BOT</strong>
                <span>Credited to {shortAddress(wallet.address)} from settled reservations.</span>
              </div>
              <Button
                variant="secondary"
                loading={tx.state.status === "awaiting-signature" || tx.state.status === "pending"}
                onClick={() =>
                  void tx.run("Withdraw BOT", () => wallet.write({ functionName: "withdraw" }), () => {
                    refresh();
                    if (wallet.address) void readWithdrawable(wallet.address).then(setWithdrawable);
                  })
                }
              >
                Withdraw
              </Button>
            </div>
          ) : null}

          <div className="dashboard-grid">
            <section className="ledger-panel">
              <div className="panel-heading">
                <div>
                  <span className="mono-label">RESERVATIONS</span>
                  <h2>Open positions</h2>
                </div>
                <span>{snapshot.reservations.length} total</span>
              </div>
              <ReservationTable snapshot={snapshot} now={now} />
            </section>

            <aside className="dashboard-side">
              <section className="side-card">
                <div className="panel-heading">
                  <div>
                    <span className="mono-label">SETTLEMENT QUEUE</span>
                    <h2>Needs attention</h2>
                  </div>
                </div>
                {snapshot.reservations.filter((r) => r.status === 4 || r.status === 5).length === 0 ? (
                  <p className="side-empty">No claims or disputes are open.</p>
                ) : (
                  <div className="queue-list">
                    {snapshot.reservations
                      .filter((r) => r.status === 4 || r.status === 5)
                      .slice(0, 4)
                      .map((reservation) => (
                        <QueueItem key={reservation.id.toString()} reservation={reservation} now={now} grace={snapshot.gracePeriod} />
                      ))}
                  </div>
                )}
              </section>

              <section className="side-card side-card--ink">
                <span className="mono-label">VAULT ACCOUNTING</span>
                <div className="vault-line"><span>Contract balance</span><strong>{formatBot(snapshot.accounting.balance)} BOT</strong></div>
                <div className="vault-line"><span>Locked collateral</span><strong>{formatBot(snapshot.accounting.locked)} BOT</strong></div>
                <div className="vault-line"><span>Withdrawable total</span><strong>{formatBot(snapshot.accounting.withdrawableTotal)} BOT</strong></div>
                <div className="vault-line"><span>Unexplained surplus</span><strong>{formatBot(snapshot.accounting.surplus)} BOT</strong></div>
                <hr />
                <p>Collateral is native BOT. There is no ERC-20 wrapper and no yield-bearing vault.</p>
              </section>

              <section className="side-card">
                <span className="mono-label">RECENT STATE</span>
                <div className="activity-list">
                  {snapshot.activity.map((item) => (
                    <a href={appPath(`/reservations/${item.reservationId}`)} className="activity-item" key={`${item.reservationId}-${item.kind}`}>
                      <span className="activity-item__dot" />
                      <div>
                        <strong>{item.summary}</strong>
                        <span>Reservation #{item.reservationId?.toString()} · {item.timestamp ? formatTimestamp(item.timestamp, { year: undefined }) : "on-chain"}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              <section className="side-card side-card--plain">
                <span className="mono-label">WALLET</span>
                <div className="wallet-side">
                  <span>{wallet.address ? shortAddress(wallet.address) : "Not connected"}</span>
                  <ConnectButton compact />
                </div>
                <p className="side-note">
                  {activeChainConfig.testnet
                    ? `Writes require ${activeChainConfig.labelFull}. Test BOT is required for bonds and gas.`
                    : `Writes require ${activeChainConfig.labelFull}. BOT is required for bonds and gas.`}
                </p>
              </section>
            </aside>
          </div>

          {tx.state.status !== "idle" ? (
            <div className={`tx-toast tx-toast--${tx.state.status}`}>
              <span className="tx-toast__label">{tx.state.label}</span>
              <span>{tx.state.status === "confirmed" ? `Confirmed on ${activeChainConfig.chain.name}` : tx.state.status === "pending" ? "Waiting for receipt" : tx.state.status === "awaiting-signature" ? "Confirm in wallet" : tx.state.error}</span>
              {tx.state.hash ? <a href={explorerTxUrl(tx.state.hash)} target="_blank" rel="noreferrer">View ↗</a> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ReservationTable({ snapshot, now }: { snapshot: ProtocolSnapshot; now: number }) {
  if (snapshot.reservations.length === 0) {
    return (
      <div className="empty-ledger">
        <span className="empty-ledger__index">00</span>
        <h3>No reservations yet.</h3>
        <p>Create the first reservation on this contract.</p>
        <a href={appPath("/new")} className="text-link text-link--arrow">Create reservation</a>
      </div>
    );
  }
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Reservation ledger table">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Reservation</th>
            <th>Status</th>
            <th>Bond</th>
            <th>Checkpoints</th>
            <th>Next window</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {[...snapshot.reservations].reverse().map((reservation) => {
            const count = snapshot.checkpointCounts[reservation.id.toString()] ?? 0;
            const deadlines = deriveDeadlines(reservation, snapshot.gracePeriod, now);
            return (
              <tr key={reservation.id.toString()}>
                <td>
                  <a className="ledger-id" href={appPath(`/reservations/${reservation.id}`)}>
                    <span>#{reservation.id.toString().padStart(3, "0")}</span>
                    <small>{reservation.capacity}</small>
                  </a>
                </td>
                <td><Badge tone={statusTone(reservation.status) as Tone}>{statusName(reservation.status)}</Badge></td>
                <td><span className="bond-cell">{formatBot(reservation.bondAmount)} <small>BOT</small></span></td>
                <td>
                  <Meter value={count} max={reservation.requiredCheckpoints} label={`${count} of ${reservation.requiredCheckpoints} checkpoints`} />
                </td>
                <td>
                  <span className="deadline-cell">
                    <strong>{deadlines.nextDeadlineLabel}</strong>
                    <small>{deadlines.nextDeadlineMs > 0n ? formatRelativeTime(deadlines.nextDeadlineMs, now) : "Complete"}</small>
                  </span>
                </td>
                <td><a className="row-arrow" href={appPath(`/reservations/${reservation.id}`)} aria-label={`Open reservation ${reservation.id}`}>↗</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QueueItem({ reservation, now, grace }: { reservation: Reservation; now: number; grace: bigint }) {
  const deadlines = deriveDeadlines(reservation, grace, now);
  return (
    <a className="queue-item" href={appPath(`/reservations/${reservation.id}`)}>
      <div>
        <span className="queue-item__id">#{reservation.id.toString()}</span>
        <strong>{statusName(reservation.status)}</strong>
      </div>
      <span>{formatBot(reservation.bondAmount)} BOT</span>
      <small>{deadlines.claimDeadline > 0n ? formatRelativeTime(deadlines.claimDeadline, now) : "No deadline"}</small>
    </a>
  );
}
