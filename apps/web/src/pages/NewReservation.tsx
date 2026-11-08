import { useMemo, useState } from "react";
import {
  formatBot,
  formatDuration,
  formatTimestamp,
  shortAddress,
  validateEvidenceURI,
} from "@capacitybond/chain";
import { Field, Notice, SectionLabel } from "@capacitybond/ui";
import { getAddress, isAddress, keccak256, parseEther, toBytes } from "viem";
import { useProtocol } from "../hooks/useProtocol";
import { useTx } from "../hooks/useTx";
import { useWallet } from "../hooks/useWallet";
import { activeChainConfig, CONTRACT_ADDRESS, IS_DEMO, decodeCreatedReservation } from "../lib/contract";
import { appPath, navigate } from "../lib/routes";

function localInputFrom(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewReservation() {
  const wallet = useWallet();
  const { snapshot, refresh, loading } = useProtocol();
  const tx = useTx();
  const defaultStart = useMemo(() => {
    const date = new Date(Date.now() + 90 * 60_000);
    date.setMinutes(Math.ceil(date.getMinutes() / 10) * 10, 0, 0);
    return localInputFrom(date);
  }, []);

  const [buyer, setBuyer] = useState("");
  const [capacity, setCapacity] = useState("");
  const [bond, setBond] = useState("0.05");
  const [agreementURI, setAgreementURI] = useState("");
  const [serviceStart, setServiceStart] = useState(defaultStart);
  const [durationHours, setDurationHours] = useState("4");
  const [acceptanceMinutes, setAcceptanceMinutes] = useState("30");
  const [claimWindowHours, setClaimWindowHours] = useState("6");
  const [checkpointMinutes, setCheckpointMinutes] = useState("60");
  const [touched, setTouched] = useState(false);

  const profile = wallet.address
    ? snapshot?.providers.find((provider) => provider.address.toLowerCase() === wallet.address?.toLowerCase())?.profile
    : undefined;

  const values = useMemo(() => {
    const startMs = Date.parse(serviceStart);
    const start = Number.isFinite(startMs) ? Math.floor(startMs / 1000) : 0;
    const duration = Number(durationHours) * 3600;
    const end = start + (Number.isFinite(duration) ? duration : 0);
    const acceptance = start - Number(acceptanceMinutes) * 60;
    const claimWindow = Number(claimWindowHours) * 3600;
    const interval = Number(checkpointMinutes) * 60;
    const required = interval > 0 && duration > 0 ? Math.ceil(duration / interval) : 0;
    let bondWei = 0n;
    try {
      bondWei = parseEther(bond || "0");
    } catch {
      bondWei = 0n;
    }
    return { start, end, acceptance, claimWindow, interval, required, bondWei, duration };
  }, [acceptanceMinutes, bond, checkpointMinutes, claimWindowHours, durationHours, serviceStart]);

  const errors = useMemo(() => {
    const list: string[] = [];
    const now = Math.floor(Date.now() / 1000);
    if (!wallet.address) list.push("Connect the provider wallet.");
    if (!profile) list.push("This wallet is not a registered provider.");
    if (!isAddress(buyer)) list.push("Enter a valid buyer address.");
    else if (wallet.address && getAddress(buyer) === wallet.address) list.push("The buyer cannot be the provider.");
    if (!capacity.trim()) list.push("Describe the reserved capacity.");
    if (capacity.length > 280) list.push("Capacity must be 280 characters or fewer.");
    if (values.bondWei <= 0n) list.push("Bond must be greater than zero.");
    if (values.start <= now + 60) list.push("Service must start at least one minute in the future.");
    if (values.end <= values.start) list.push("Service end must be after service start.");
    if (values.duration > 365 * 86_400) list.push("Service duration cannot exceed 365 days.");
    if (values.acceptance <= now) list.push("Acceptance deadline must still be in the future.");
    if (values.acceptance > values.start) list.push("Acceptance deadline must be before service start.");
    if (values.claimWindow < 300 || values.claimWindow > 90 * 86_400) list.push("Claim window must be between 5 minutes and 90 days.");
    if (values.interval < 30 || values.interval > values.duration) list.push("Checkpoint interval must be 30 seconds or more and fit inside the service window.");
    if (values.required > 100) list.push("The terms require more than 100 checkpoints.");
    const uriError = validateEvidenceURI(agreementURI);
    if (uriError) list.push(uriError.replace("Evidence", "Agreement"));
    if (agreementURI.length > 256) list.push("Agreement reference must be 256 characters or fewer.");
    return list;
  }, [agreementURI, buyer, capacity, profile, values, wallet.address]);

  const canSubmit = errors.length === 0 && tx.state.status !== "pending" && tx.state.status !== "awaiting-signature" && !IS_DEMO;
  const agreementHash = agreementURI ? keccak256(toBytes(agreementURI)) : null;

  async function submit() {
    setTouched(true);
    if (errors.length > 0 || !wallet.address || !CONTRACT_ADDRESS) return;
    const succeeded = await tx.run(
      "Create reservation",
      () =>
        wallet.write({
          functionName: "createReservation",
          args: [
            getAddress(buyer),
            values.bondWei,
            agreementHash!,
            agreementURI,
            capacity.trim(),
            BigInt(values.start),
            BigInt(values.end),
            BigInt(values.acceptance),
            BigInt(values.claimWindow),
            BigInt(values.interval),
          ],
        }),
      async (hash) => {
        refresh();
        const id = await decodeCreatedReservation(hash);
        if (id !== null) navigate(`/app/reservations/${id}`);
      },
    );
    if (succeeded) setTouched(false);
  }

  return (
    <div className="workspace workspace--form">
      <header className="workspace-head">
        <div>
          <SectionLabel index="New">Reservation</SectionLabel>
          <h1>Fix the terms.</h1>
          <p>The reservation starts as a draft. Nothing is locked until the exact bond is deposited.</p>
        </div>
        <a href={appPath()} className="back-link">← Back to ledger</a>
      </header>

      {IS_DEMO ? (
        <Notice tone="warning" title="No contract configured">
          Creation is disabled in fixture preview. Deploy the contract and update the deployment record first.
        </Notice>
      ) : null}

      {!IS_DEMO && wallet.address && !loading && !profile ? (
        <Notice tone="warning" title="Register the provider first">
          This wallet has no active provider profile. <a className="inline-link" href={appPath("/providers")}>Register a contactable profile</a> before creating reservations.
        </Notice>
      ) : null}

      <div className="form-layout">
        <div className="form-panel">
          <div className="form-section">
            <div className="form-section__head">
              <span className="mono-label">01 / PARTIES</span>
              <h2>Who is the promise with?</h2>
            </div>
            <div className="form-grid">
              <Field label="Provider wallet" hint="The connected wallet creates and funds the reservation.">
                <input value={wallet.address ? shortAddress(wallet.address, 6) : "Not connected"} readOnly />
              </Field>
              <Field label="Buyer address" hint="The buyer accepts later from this address." error={touched && !isAddress(buyer) ? "A valid address is required." : undefined}>
                <input
                  value={buyer}
                  onChange={(event) => setBuyer(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="mono-label">02 / AGREEMENT</span>
              <h2>What is being reserved?</h2>
            </div>
            <div className="form-grid">
              <Field label="Capacity statement" hint="Short public description. Do not put confidential terms here." wide error={touched && !capacity.trim() ? "Describe the capacity." : undefined}>
                <input
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  placeholder="8 × A100-hours · us-east · batch inference"
                  maxLength={280}
                />
              </Field>
              <Field label="Agreement reference" hint="A URI or stable reference to the off-chain terms." wide error={touched ? validateEvidenceURI(agreementURI)?.replace("Evidence", "Agreement") ?? undefined : undefined}>
                <input
                  value={agreementURI}
                  onChange={(event) => setAgreementURI(event.target.value)}
                  placeholder="ipfs://… or https://…"
                  spellCheck={false}
                  maxLength={256}
                />
              </Field>
              <Field label="Agreement hash" hint="Derived from the reference in this browser. It fixes the reference, not the content." wide>
                <input value={agreementHash ? `${agreementHash.slice(0, 22)}…${agreementHash.slice(-10)}` : "Generated on submit"} readOnly className="mono-input" />
              </Field>
              <Field label="Provider bond" hint="Exact native-BOT amount locked at deposit." error={touched && values.bondWei <= 0n ? "Enter a positive bond." : undefined}>
                <div className="input-suffix">
                  <input inputMode="decimal" value={bond} onChange={(event) => setBond(event.target.value)} />
                  <span>BOT</span>
                </div>
              </Field>
              <Field label="Service start" hint="Local browser time. Stored as a UTC timestamp.">
                <input type="datetime-local" value={serviceStart} onChange={(event) => setServiceStart(event.target.value)} />
              </Field>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="mono-label">03 / WINDOWS</span>
              <h2>When does the record open and close?</h2>
            </div>
            <div className="form-grid form-grid--three">
              <Field label="Duration" hint="Hours">
                <div className="input-suffix"><input inputMode="decimal" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} /><span>h</span></div>
              </Field>
              <Field label="Acceptance closes" hint="Minutes before start">
                <div className="input-suffix"><input inputMode="numeric" value={acceptanceMinutes} onChange={(event) => setAcceptanceMinutes(event.target.value)} /><span>min</span></div>
              </Field>
              <Field label="Claim window" hint="After grace period">
                <div className="input-suffix"><input inputMode="decimal" value={claimWindowHours} onChange={(event) => setClaimWindowHours(event.target.value)} /><span>h</span></div>
              </Field>
              <Field label="Checkpoint cadence" hint="Minimum 30 seconds">
                <div className="input-suffix"><input inputMode="numeric" value={checkpointMinutes} onChange={(event) => setCheckpointMinutes(event.target.value)} /><span>min</span></div>
              </Field>
            </div>
          </div>

          {touched && errors.length > 0 ? (
            <Notice tone="danger" title="Check the terms">
              <ul className="error-list">
                {errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </Notice>
          ) : null}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              {tx.state.status === "awaiting-signature" || tx.state.status === "pending" ? "Creating…" : "Create draft reservation"}
              <span className="arrow">↗</span>
            </button>
            <span className="form-actions__note">
              {wallet.address ? "You will sign one transaction. The bond is deposited separately." : "Connect a provider wallet to continue."}
            </span>
          </div>

          {tx.state.error ? <Notice tone="danger" title="Transaction not completed">{tx.state.error}</Notice> : null}
        </div>

        <aside className="form-preview">
          <div className="preview-card">
            <div className="preview-card__top">
              <span className="mono-label">DRAFT PREVIEW</span>
              <span className="preview-chip">{profile ? "Provider registered" : "Provider not registered"}</span>
            </div>
            <h2>{capacity || "Reserved compute capacity"}</h2>
            <p>{agreementURI || "No agreement reference yet"}</p>
            <div className="preview-bond">
              <span>Provider bond</span>
              <strong>{formatBot(values.bondWei || 0n)} <small>BOT</small></strong>
            </div>
            <div className="preview-rows">
              <div><span>Service window</span><strong>{values.start ? `${formatTimestamp(values.start)} → ${formatTimestamp(values.end)}` : "—"}</strong></div>
              <div><span>Checkpoints</span><strong>{values.required || "—"} required</strong></div>
              <div><span>Cadence</span><strong>{values.interval ? formatDuration(values.interval) : "—"}</strong></div>
              <div><span>Buyer</span><strong>{isAddress(buyer) ? shortAddress(buyer) : "Not set"}</strong></div>
            </div>
            <div className="preview-flow">
              {["Draft", "Funded", "Active", "Resolved"].map((stage, index) => (
                <span key={stage} className={index === 0 ? "is-current" : ""}>{stage}</span>
              ))}
            </div>
          </div>

          <div className="preview-notes">
            <span className="mono-label">BEFORE YOU SIGN</span>
            <ul>
              <li>The provider pays the bond and all gas.</li>
              <li>The buyer must accept before the deadline and before service starts.</li>
              <li>No checkpoints can be submitted after service end plus grace.</li>
              <li>Un-audited software. Bonds are real BOT on {activeChainConfig.labelFull}.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
