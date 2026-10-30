import { shortAddress } from "@capacitybond/chain";
import { useWallet } from "../hooks/useWallet";
import { Button } from "@capacitybond/ui";

export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const wallet = useWallet();
  if (!wallet.isAvailable) {
    return (
      <span className="wallet-missing" title="Install an injected wallet to write on-chain">
        Read-only
      </span>
    );
  }
  if (!wallet.address) {
    return (
      <Button variant="secondary" size="sm" loading={wallet.isConnecting} onClick={() => void wallet.connect()}>
        {compact ? "Connect" : "Connect wallet"}
      </Button>
    );
  }
  return (
    <div className="wallet-pill">
      {!wallet.isCorrectChain ? (
        <button type="button" className="wallet-pill__network" onClick={() => void wallet.switchToBohr()}>
          Switch to Bohr
        </button>
      ) : (
        <span className="wallet-pill__network wallet-pill__network--ok">
          <span className="status-dot" />
          Bohr
        </span>
      )}
      <button type="button" className="wallet-pill__account" onClick={wallet.disconnect} title="Disconnect this view">
        {shortAddress(wallet.address)}
      </button>
    </div>
  );
}
