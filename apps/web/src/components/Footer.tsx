import { BOT_MAINNET_EXPLORER_URL, BOT_WEBSITE_URL, BOHR_EXPLORER_URL } from "@capacitybond/chain";

function SectionLink({ id, children }: { id: string; children: string }) {
  return (
    <button
      type="button"
      className="footer-section-link"
      onClick={() => {
        const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (window.location.hash === "" || window.location.hash === "#/") {
          scroll();
        } else {
          window.sessionStorage.setItem("capacitybond:scroll", id);
          window.location.hash = "/";
          window.setTimeout(scroll, 80);
        }
      }}
    >
      {children}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__statement">
          <span className="footer-kicker">Built for the reservation layer</span>
          <p>
            CapacityBond is an independent testnet protocol. It does not sell compute,
            verify hardware, or underwrite service outcomes.
          </p>
        </div>
        <div className="site-footer__cols">
          <div>
            <span className="footer-heading">Protocol</span>
            <SectionLink id="protocol">How it works</SectionLink>
            <SectionLink id="boundaries">Boundaries</SectionLink>
            <a href="#/app">Workspace</a>
          </div>
          <div>
            <span className="footer-heading">BOT Chain</span>
            <a href={BOT_WEBSITE_URL} target="_blank" rel="noreferrer">botchain.ai ↗</a>
            <a href={BOHR_EXPLORER_URL} target="_blank" rel="noreferrer">Bohr explorer ↗</a>
            <a href={BOT_MAINNET_EXPLORER_URL} target="_blank" rel="noreferrer">Mainnet explorer ↗</a>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div className="footer-bot">
          <img src="/brand/bot-chain-logo.png" alt="BOT Chain" width="28" height="28" />
          <span>Built on BOT Chain · Bohr Testnet 968</span>
        </div>
        <span>Testnet software. No audit. No production custody.</span>
        <span className="footer-mono">© 2026 CapacityBond</span>
      </div>
    </footer>
  );
}
