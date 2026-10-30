import { useCallback, useReducer, useState } from "react";
import { friendlyTxError, initialTxState, txReducer, type TxState } from "@capacitybond/chain";
import type { Hash } from "viem";
import { publicClient } from "../lib/contract";

export interface ActionState extends TxState {
  label?: string;
}

export function useTx() {
  const [state, dispatch] = useReducer(txReducer, initialTxState as ActionState);
  const [label, setLabel] = useState<string | null>(null);

  const run = useCallback(
    async (
      actionLabel: string,
      action: () => Promise<Hash>,
      onSuccess?: (hash: Hash) => void | Promise<void>,
    ): Promise<boolean> => {
      setLabel(actionLabel);
      dispatch({ type: "signing" });
      let hash: Hash;
      try {
        hash = await action();
      } catch (error) {
        const message = friendlyTxError(error);
        dispatch({ type: "rejected", error: message });
        return false;
      }
      dispatch({ type: "submitted", hash });
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        if (receipt.status === "reverted") {
          dispatch({ type: "reverted", hash, error: "The transaction was mined but reverted." });
          return false;
        }
        dispatch({ type: "confirmed", hash });
        if (onSuccess) await onSuccess(hash);
        return true;
      } catch (error) {
        dispatch({ type: "reverted", hash, error: friendlyTxError(error) });
        return false;
      }
    },
    [],
  );

  return {
    state: { ...state, label: label ?? undefined } as ActionState,
    run,
    reset: () => dispatch({ type: "reset" }),
  };
}
