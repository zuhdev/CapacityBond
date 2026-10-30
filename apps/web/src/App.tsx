import { ConnectButton } from "./components/ConnectButton";
import { AppBrand } from "./components/Brand";
import { Footer } from "./components/Footer";
import { WalletProvider, useWallet } from "./hooks/useWallet";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { NewReservation } from "./pages/NewReservation";
import { Providers } from "./pages/Providers";
import { ReservationDetail } from "./pages/ReservationDetail";
import { appPath, useHashRoute } from "./lib/routes";

export function App() {
  const route = useHashRoute();
  return (
    <WalletProvider>
      {route.name === "landing" ? <Landing /> : <WorkspaceShell route={route} />}
    </WalletProvider>
  );
}

function WorkspaceShell({
  route,
}: {
  route: ReturnType<typeof useHashRoute>;
}) {
  const wallet = useWallet();
  return (
    <div className="app-shell">
      <header className="app-nav">
        <AppBrand />
        <nav className="app-nav__links" aria-label="Workspace">
          <a className={route.name === "dashboard" || route.name === "reservation" ? "is-active" : ""} href={appPath()}>Ledger</a>
          <a className={route.name === "providers" ? "is-active" : ""} href={appPath("/providers")}>Providers</a>
          <a className={route.name === "new" ? "is-active" : ""} href={appPath("/new")}>New reservation</a>
        </nav>
        <div className="app-nav__right">
          {wallet.address && !wallet.isCorrectChain ? (
            <button type="button" className="network-warning" onClick={() => void wallet.switchToBohr()}>Wrong network</button>
          ) : (
            <span className="network-chip"><span className="status-dot" /> Bohr 968</span>
          )}
          <ConnectButton compact />
          <a href="#/" className="app-nav__site" title="Public site" aria-label="Open the public site">?</a>
        </div>
      </header>

      {route.name === "dashboard" ? <Dashboard /> : null}
      {route.name === "new" ? <NewReservation /> : null}
      {route.name === "providers" ? <Providers /> : null}
      {route.name === "reservation" ? <ReservationDetail id={route.id} /> : null}
      {route.name === "not-found" ? (
        <div className="workspace detail-error">
          <span className="mono-label">404</span>
          <h1>No such ledger page.</h1>
          <p>The route does not exist in this workspace.</p>
          <a href={appPath()} className="text-link">Return to the ledger</a>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
