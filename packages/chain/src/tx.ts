import type { TxState } from "./types";

export type TxEvent =
  | { type: "signing" }
  | { type: "submitted"; hash: `0x${string}` }
  | { type: "confirmed"; hash: `0x${string}` }
  | { type: "reverted"; hash?: `0x${string}`; error: string }
  | { type: "rejected"; error: string }
  | { type: "reset" };

export const initialTxState: TxState = { status: "idle" };

export function txReducer(state: TxState, event: TxEvent): TxState {
  switch (event.type) {
    case "signing":
      return { status: "awaiting-signature" };
    case "submitted":
      return { status: "pending", hash: event.hash };
    case "confirmed":
      return {
        status: "confirmed",
        hash: event.hash,
        confirmedAt: Date.now(),
      };
    case "reverted": {
      const hash = event.hash ?? state.hash;
      return {
        status: "reverted",
        ...(hash ? { hash } : {}),
        error: event.error,
      };
    }
    case "rejected":
      return { status: "rejected", error: event.error };
    case "reset":
      return initialTxState;
  }
}

export function txCanRetry(state: TxState): boolean {
  return state.status === "reverted" || state.status === "rejected" || state.status === "idle";
}

export function isConfirmed(state: TxState): boolean {
  return state.status === "confirmed";
}

export function friendlyTxError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|denied transaction|rejected the request/i.test(message)) {
    return "Wallet signature was rejected.";
  }
  if (/insufficient funds/i.test(message)) return "Insufficient BOT in this wallet for the bond or gas.";
  if (/nonce/i.test(message)) return "Wallet nonce changed. Refresh and try again.";
  if (/revert/i.test(message)) {
    const first = message.split("\n")[0];
    return first || "The contract rejected this transaction.";
  }
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}
