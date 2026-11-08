import { ACTIVE_DEPLOYMENT, ACTIVE_CHAIN_CONFIG, formatBot } from "@capacitybond/chain";
import { Button, SectionLabel } from "@capacitybond/ui";
import { BrandMark } from "../components/Brand";
import { ConnectButton } from "../components/ConnectButton";
import { Footer } from "../components/Footer";
import { appPath } from "../lib/routes";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return (
    <div className="marketing">
      <header className="marketing-nav">
        <BrandMark />
        <nav className="marketing-nav__links" aria-label="Primary">
          <button type="button" onClick={() => scrollToId("protocol")}>Protocol</button>
          <button type="button" onClick={() => scrollToId("roles")}>Roles</button>
          <button type="button" onClick={() => scrollToId("boundaries")}>Boundaries</button>
        </nav>
        <div className="marketing-nav__actions">
          <span className="network-chip"><span className="status-dot" /> {ACTIVE_CHAIN_CONFIG.label}</span>
          <ConnectButton compact />
          <a className="text-link text-link--arrow" href={appPath()}>Workspace</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <div className="eyebrow-row">
              <span className="eyebrow">Reservation assurance</span>
              <span className="eyebrow-separator" />
              <span className="eyebrow eyebrow--muted">Native BOT in escrow</span>
            </div>
            <h1>
              Make compute<br />
              commitments <em>carry weight.</em>
            </h1>
            <p className="hero__lead">
              CapacityBond adds a reservation-specific bond to capacity negotiated
              off-chain. The provider locks native BOT, both parties accept one set
              of terms, and settlement follows a signed checkpoint record.
            </p>
            <div className="hero__actions">
              <a href={appPath()}>
                <Button size="lg">Open the workspace <span className="arrow">↗</span></Button>
              </a>
              <button type="button" className="link-button" onClick={() => scrollToId("protocol")}>
                See how collateral moves <span className="arrow">↓</span>
              </button>
            </div>
            <dl className="hero__facts">
              <div><dt>Chain</dt><dd>{ACTIVE_CHAIN_CONFIG.labelFull}</dd></div>
              <div><dt>Asset</dt><dd>Native BOT</dd></div>
              <div><dt>Unit</dt><dd>One reservation</dd></div>
            </dl>
          </div>

          <div className="hero__specimen" aria-label="Reservation specimen preview">
            <div className="specimen__top">
              <span className="mono-label">RESERVATION / 001</span>
              <span className="specimen__status"><span className="status-dot" /> Fixture preview</span>
            </div>
            <div className="specimen__title">
              <span>Simulated GPU capacity</span>
              <span className="specimen__id">#001</span>
            </div>
            <p className="specimen__capacity">8 × A100-hours · us-east · batch inference</p>
            <div className="specimen__bond">
              <span className="mono-label">PROVIDER BOND</span>
              <strong>{formatBot(500_000_000_000_000_000n)} <small>BOT</small></strong>
            </div>
            <div className="specimen__grid">
              <div><span>Service window</span><strong>4 hours</strong></div>
              <div><span>Checkpoints</span><strong>2 / 4</strong></div>
              <div><span>Provider</span><strong>Accepted</strong></div>
              <div><span>Buyer</span><strong>Accepted</strong></div>
            </div>
            <div className="specimen__footer">
              <div className="specimen__progress"><span style={{ width: "50%" }} /></div>
              <span>Claim window opens after grace</span>
            </div>
            <span className="specimen__stamp">DEMO</span>
          </div>
        </section>

        <section className="marquee" aria-label="Protocol properties">
          <span>Off-chain terms</span><i />
          <span>On-chain bond</span><i />
          <span>Attested checkpoints</span><i />
          <span>Bounded claims</span><i />
          <span>Pull payments</span>
        </section>

        <section className="gap section-pad" id="why">
          <SectionLabel index="01">The gap</SectionLabel>
          <div className="gap__headline">
            <h2>The expensive part is not compute.<br /><em>It is the promise around it.</em></h2>
            <p>
              Capacity is reserved in a call, an email thread, or a private order form.
              The bond, the acceptance, and the proof of delivery usually live somewhere else.
              When a checkpoint is missed, the disagreement starts from a blank page.
            </p>
          </div>
          <div className="gap__columns">
            <article>
              <span className="column-number">A</span>
              <h3>Terms live in a thread</h3>
              <p>Capacity, window, and price are agreed in prose. A hash fixes the exact off-chain reference in the reservation.</p>
            </article>
            <article>
              <span className="column-number">B</span>
              <h3>The bond lives outside</h3>
              <p>Native BOT is deposited into the contract, not promised in a screenshot. It stays locked until settlement or expiry.</p>
            </article>
            <article>
              <span className="column-number">C</span>
              <h3>The record is public</h3>
              <p>Acceptance, checkpoint count, claim openings, and final splits are observable without trusting a central dashboard.</p>
            </article>
          </div>
        </section>

        <section className="mechanism section-pad" id="protocol">
          <div className="mechanism__intro">
            <SectionLabel index="02">Mechanism</SectionLabel>
            <h2>A narrow instrument<br /><em>for a specific promise.</em></h2>
            <p>
              Four moves. No marketplace, no hardware oracle, no hidden underwriting.
              The contract enforces the reservation terms it is given.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step__index">01</span>
              <div>
                <h3>Fix the terms</h3>
                <p>The provider references an off-chain agreement, names a buyer, and sets the service window, bond, claim window, and checkpoint cadence.</p>
              </div>
              <span className="step__state">Draft</span>
            </div>
            <div className="step">
              <span className="step__index">02</span>
              <div>
                <h3>Lock the bond</h3>
                <p>The provider deposits the exact native-BOT bond. Both provider and buyer must accept before the reservation becomes active.</p>
              </div>
              <span className="step__state">Funded → Active</span>
            </div>
            <div className="step">
              <span className="step__index">03</span>
              <div>
                <h3>Record checkpoints</h3>
                <p>An attestor signs observations against the reservation. Evidence is referenced by URI and hash; a signature proves authorization, not compute quality.</p>
              </div>
              <span className="step__state">Attested</span>
            </div>
            <div className="step">
              <span className="step__index">04</span>
              <div>
                <h3>Settle or claim</h3>
                <p>Complete checkpoints release the bond after service. Missing checkpoints open a bounded buyer claim, with a resolver only if the claim is disputed.</p>
              </div>
              <span className="step__state">Resolved</span>
            </div>
          </div>
        </section>

        <section className="lifecycle" aria-label="Reservation lifecycle">
          <div className="lifecycle__rail">
            {["Draft", "Funded", "Active", "Fulfilled / Claimable", "Resolved"].map((stage, index) => (
              <div className="lifecycle__node" key={stage}>
                <span className="lifecycle__dot" data-active={index === 2 ? "true" : undefined} />
                <span>{stage}</span>
              </div>
            ))}
          </div>
          <p>Native BOT stays locked from deposit until the contract records a final split or expiry. Withdrawals are pull-based.</p>
        </section>

        <section className="roles section-pad" id="roles">
          <SectionLabel index="03">Roles</SectionLabel>
          <div className="roles__head">
            <h2>No anonymous middle.<br /><em>Four explicit roles.</em></h2>
            <p>Each role has a different job. The contract separates attestor signatures from resolver decisions, and neither role can move collateral directly.</p>
          </div>
          <div className="role-grid">
            <article className="role-card role-card--provider">
              <span className="role-card__name">Provider</span>
              <h3>Puts collateral behind capacity.</h3>
              <p>Registers a contactable profile, creates the reservation, funds the exact bond, and accepts its own terms.</p>
              <span className="role-card__action">register → create → deposit → accept</span>
            </article>
            <article className="role-card role-card--buyer">
              <span className="role-card__name">Buyer</span>
              <h3>Accepts the same terms.</h3>
              <p>Confirms the reservation and, if the checkpoint record is incomplete after grace, opens a claim inside the fixed window.</p>
              <span className="role-card__action">accept → monitor → claim</span>
            </article>
            <article className="role-card role-card--attestor">
              <span className="role-card__name">Attestor</span>
              <h3>Signs observations.</h3>
              <p>Authorizes ordered checkpoint records. The attestor is a configured operator key, not an independent compute verifier.</p>
              <span className="role-card__action">observe → sign → submit</span>
            </article>
            <article className="role-card role-card--resolver">
              <span className="role-card__name">Resolver</span>
              <h3>Divides a disputed bond.</h3>
              <p>Can settle only a claim that the buyer has opened. Chooses a provider split from zero to the full bond and records a resolution reference.</p>
              <span className="role-card__action">review → split → settle</span>
            </article>
          </div>
        </section>

        <section className="boundaries section-pad" id="boundaries">
          <div className="boundaries__copy">
            <SectionLabel index="04">Boundaries</SectionLabel>
            <h2>Trust is a design surface,<br /><em>not a slogan.</em></h2>
            <p>
              The protocol makes a narrow promise: collateral follows a known reservation
              record. It does not turn an off-chain service into a trustless one.
            </p>
            <div className="boundaries__quote">
              <span>“Signed” means authorized by the configured attestor. It does not mean “verified by the protocol.”</span>
            </div>
          </div>
          <div className="boundary-table">
            <div className="boundary-table__head"><span>What the contract can do</span><span>What it cannot</span></div>
            <div><span>Lock native BOT against one reservation</span><span>Prove that a GPU existed or ran</span></div>
            <div><span>Require both parties to accept the same terms</span><span>Replace a legal service agreement</span></div>
            <div><span>Record ordered, signed checkpoint references</span><span>Certify compute quality or uniqueness</span></div>
            <div><span>Open a claim for objectively missing checkpoints</span><span>Decide subjective performance</span></div>
            <div><span>Route an unresolved claim to a named resolver</span><span>Guarantee recovery or a fair outcome</span></div>
            <div><span>Pay withdrawals in a reentrancy-safe flow</span><span>Insure the buyer beyond the posted bond</span></div>
          </div>
        </section>

        <section className="research-note section-pad">
          <div className="research-note__mark">BOT<br />NATIVE</div>
          <div>
            <SectionLabel index="05">Network note</SectionLabel>
            <h2>BOT Chain is the settlement rail.<br /><em>It is not the compute oracle.</em></h2>
            <p>
              {ACTIVE_CHAIN_CONFIG.labelFull} supplies an EVM execution environment and
              native BOT. It does not supply a public compute-quality feed. This build
              names a trusted attestor, expects an externally funded EOA for gas, and
              treats provider APIs as future integration points rather than protocol
              facts.
            </p>
            <div className="research-note__facts">
              <span><strong>{ACTIVE_CHAIN_CONFIG.chainId}</strong> chain ID</span>
              <span><strong>Native BOT</strong> bond asset</span>
              <span><strong>EntryPoint v0.7</strong> available, not required</span>
              <span><strong>No public paymaster</strong> assumed</span>
            </div>
          </div>
        </section>

        <section className="closing">
          <div>
            <span className="eyebrow">{ACTIVE_CHAIN_CONFIG.labelFull} · {ACTIVE_CHAIN_CONFIG.chainId}</span>
            <h2>Put the promise<br /><em>where the record is.</em></h2>
          </div>
          <div className="closing__right">
            <p>
              Open the ledger, create a reservation, and watch the bond move through
              acceptance, checkpoints, claims, and withdrawal.
            </p>
            <a href={appPath()}>
              <Button size="lg">Enter the workspace <span className="arrow">↗</span></Button>
            </a>
            <span className="closing__contract">
              {ACTIVE_DEPLOYMENT.address
                ? `Contract ${ACTIVE_DEPLOYMENT.address.slice(0, 8)}…${ACTIVE_DEPLOYMENT.address.slice(-6)}`
                : "Contract address pending deployment"}
            </span>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
