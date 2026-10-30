import { useEffect, useMemo, useState } from "react";
import {
  explorerAddressUrl,
  formatBot,
  formatTimestamp,
  shortAddress,
  statusName,
} from "@capacitybond/chain";
import { AddressChip, Badge, Field, Notice, SectionLabel, Spinner } from "@capacitybond/ui";
import { useProtocol } from "../hooks/useProtocol";
import { useTx } from "../hooks/useTx";
import { useWallet } from "../hooks/useWallet";
import { IS_DEMO } from "../lib/contract";
import { appPath } from "../lib/routes";

export function Providers() {
  const { snapshot, loading, refresh, isDemo } = useProtocol();
  const wallet = useWallet();
  const tx = useTx();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [touched, setTouched] = useState(false);

  const ownProfile = useMemo(
    () =>
      wallet.address
        ? snapshot?.providers.find((provider) => provider.address.toLowerCase() === wallet.address?.toLowerCase())
        : undefined,
    [snapshot, wallet.address],
  );

  useEffect(() => {
    if (!ownProfile) return;
    setName(ownProfile.profile.name);
    setContact(ownProfile.profile.contact);
    setMetadataURI(ownProfile.profile.metadataURI);
  }, [ownProfile]);

  const errors: string[] = [];
  if (!name.trim()) errors.push("Add a provider name.");
  if (name.length > 80) errors.push("Name must be 80 characters or fewer.");
  if (!contact.trim()) errors.push("Add a contact reference.");
  if (contact.length > 160) errors.push("Contact must be 160 characters or fewer.");
  if (metadataURI.length > 256) errors.push("Metadata URI must be 256 characters or fewer.");

  async function submit() {
    setTouched(true);
    if (errors.length > 0 || !wallet.address) return;
    const functionName = ownProfile ? "updateProvider" : "registerProvider";
    const succeeded = await tx.run(
      ownProfile ? "Update provider profile" : "Register provider profile",
      () => wallet.write({ functionName, args: [name.trim(), contact.trim(), metadataURI.trim()] }),
      refresh,
    );
    if (succeeded) setTouched(false);
  }

  return (
    <div className="workspace">
      <header className="workspace-head">
        <div>
          <SectionLabel index="Providers">Registry</SectionLabel>
          <h1>Contactable providers</h1>
          <p>A provider profile is public infrastructure. It makes the counterparty reachable before collateral is locked.</p>
        </div>
        <a href={appPath()} className="back-link">← Back to ledger</a>
      </header>

      {isDemo ? (
        <Notice tone="info" title="Fixture preview">
          Provider registration is disabled until a contract address is configured.
        </Notice>
      ) : null}

      <div className="providers-layout">
        <section className="providers-list-panel">
          <div className="panel-heading">
            <div>
              <span className="mono-label">REGISTERED</span>
              <h2>{snapshot?.providers.length ?? 0} active profiles</h2>
            </div>
          </div>
          {loading && !snapshot ? <div className="loading-panel"><Spinner /></div> : null}
          <div className="provider-cards">
            {snapshot?.providers.map(({ address, profile }) => {
              const reservations = snapshot.reservations.filter((reservation) => reservation.provider.toLowerCase() === address.toLowerCase());
              const locked = reservations
                .filter((reservation) => [1, 2, 4, 5].includes(reservation.status))
                .reduce((sum, reservation) => sum + reservation.bondAmount, 0n);
              return (
                <article className="provider-card" key={address}>
                  <div className="provider-card__head">
                    <div className="provider-monogram">{profile.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <h3>{profile.name}</h3>
                      <span className="provider-contact">{profile.contact}</span>
                    </div>
                    <Badge tone={profile.active ? "active" : "expired"}>{profile.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="provider-card__metrics">
                    <div><span>Bond currently locked</span><strong>{formatBot(locked)} BOT</strong></div>
                    <div><span>Reservations</span><strong>{reservations.length}</strong></div>
                  </div>
                  <div className="provider-card__foot">
                    <AddressChip address={address} href={explorerAddressUrl(address)} />
                    <span>Updated {formatTimestamp(profile.updatedAt)}</span>
                  </div>
                  {reservations.length > 0 ? (
                    <div className="provider-card__reservations">
                      {reservations.slice(-3).map((reservation) => (
                        <a key={reservation.id.toString()} href={appPath(`/reservations/${reservation.id}`)}>
                          <span>#{reservation.id.toString()}</span>
                          <span>{statusName(reservation.status)}</span>
                          <span>{formatBot(reservation.bondAmount)} BOT</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="provider-form-panel">
          <div className="provider-form-panel__inner">
            <span className="mono-label">{ownProfile ? "YOUR PROFILE" : "NEW PROFILE"}</span>
            <h2>{ownProfile ? "Update the public record." : "Become reachable."}</h2>
            <p>
              The registry stores a name, a contact string, and an optional metadata URI.
              All of it is public and permanent on-chain.
            </p>
            {!wallet.address ? (
              <div className="connect-block">
                <span>Connect the provider wallet to register or update.</span>
                <button type="button" className="btn btn--secondary btn--md" onClick={() => void wallet.connect()} disabled={!wallet.isAvailable}>
                  {wallet.isAvailable ? "Connect wallet" : "No wallet detected"}
                </button>
              </div>
            ) : (
              <div className="provider-form">
                <Field label="Provider name" error={touched && !name.trim() ? "Name is required." : undefined}>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Northstar Compute" maxLength={80} />
                </Field>
                <Field label="Contact" hint="Public. Use a role address or handle, not a secret." error={touched && !contact.trim() ? "Contact is required." : undefined}>
                  <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="ops@example.com" maxLength={160} />
                </Field>
                <Field label="Metadata URI" hint="Optional public profile reference.">
                  <input value={metadataURI} onChange={(event) => setMetadataURI(event.target.value)} placeholder="ipfs://…" maxLength={256} />
                </Field>
                {touched && errors.length > 0 ? (
                  <Notice tone="danger">
                    <ul className="error-list">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
                  </Notice>
                ) : null}
                <button
                  type="button"
                  className="btn btn--primary btn--md btn--full"
                  disabled={IS_DEMO || tx.state.status === "awaiting-signature" || tx.state.status === "pending"}
                  onClick={() => void submit()}
                >
                  {tx.state.status === "pending" || tx.state.status === "awaiting-signature"
                    ? "Writing profile…"
                    : ownProfile
                      ? "Update profile"
                      : "Register provider"}
                </button>
                {ownProfile ? (
                  <span className="profile-note">Connected as {shortAddress(wallet.address)}. This wallet can update only this profile.</span>
                ) : null}
                {tx.state.error ? <Notice tone="danger">{tx.state.error}</Notice> : null}
              </div>
            )}
            <div className="provider-form-panel__rule">
              <span className="mono-label">WHY IT MATTERS</span>
              <p>
                A bond without a reachable counterparty is just locked capital.
                Profiles do not rank providers or vouch for service quality.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
