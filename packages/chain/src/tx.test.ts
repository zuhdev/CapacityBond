import { describe, expect, it } from "vitest";
import { initialTxState, isConfirmed, txReducer } from "./tx";

describe("transaction state machine", () => {
  it("does not report success when a hash is merely submitted", () => {
    const afterSign = txReducer(initialTxState, { type: "signing" });
    expect(afterSign.status).toBe("awaiting-signature");
    const afterSubmit = txReducer(afterSign, { type: "submitted", hash: "0xabc" });
    expect(afterSubmit.status).toBe("pending");
    expect(isConfirmed(afterSubmit)).toBe(false);
  });

  it("only reaches confirmed after a receipt event", () => {
    const pending = { status: "pending" as const, hash: "0xabc" as const };
    const confirmed = txReducer(pending, { type: "confirmed", hash: "0xabc" });
    expect(confirmed.status).toBe("confirmed");
    expect(isConfirmed(confirmed)).toBe(true);
  });

  it("keeps reverted and rejected states distinct", () => {
    const reverted = txReducer(initialTxState, {
      type: "reverted",
      hash: "0xabc",
      error: "execution reverted",
    });
    expect(reverted.status).toBe("reverted");
    const rejected = txReducer(initialTxState, { type: "rejected", error: "user rejected" });
    expect(rejected.status).toBe("rejected");
  });
});
