import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionReceipt } from "viem";
import { errorMessage } from "./format";
import { markChanged, subscribeChanges } from "./goodbuild/live";

/**
 * Run an async read (usually publicClient.readContract) with loading and error state, and keep it
 * up to date by itself (D159): it fetches again after any confirmed transaction (writeContract, useTx),
 * a saved-data write, a wallet switch, the tab coming back, and on a slow shared timer while the page
 * is open, so other people's changes show too. Never call refresh() after a write just to update it.
 * Pass enabled=false to skip it (e.g. no wallet or no deployed address yet), and { live: false } for a
 * value that can never change (a token's name or decimals).
 *   const tips = useRead(() => publicClient.readContract({ address, abi, functionName: "totalTips" }), [address], !!address);
 * loading is the first load only (show a Skeleton). refreshing is a fetch with the old value still on
 * screen (don't hide it); updatedAt is when it last arrived. Put <RefreshButton read={tips} /> next to it.
 */
export function useRead<T>(fn: () => Promise<T>, deps: unknown[], enabled = true, options: { live?: boolean } = {}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);
  const hasData = useRef(false);
  const live = options.live !== false;

  // background: keep the value and any earlier error on screen, and don't show a failed timer fetch.
  const load = useCallback(async (background: boolean) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    if (!background) setError(null);
    try {
      const next = await fnRef.current();
      if (id !== seq.current) return; // A newer fetch started: its answer wins.
      hasData.current = true;
      setData(next);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (id !== seq.current) return;
      if (!background || !hasData.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    // New inputs (another account, another address) start fresh rather than refresh the old value.
    hasData.current = false;
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!enabled || !live) return;
    return subscribeChanges((kinds) => loadRef.current(!kinds.has("manual")));
  }, [enabled, live]);

  const refresh = useCallback(() => loadRef.current(false), []);
  return { data, loading, refreshing, error, updatedAt, refresh };
}

/**
 * Track one wallet transaction: pending while the wallet signs and the chain confirms,
 * then success or a readable error. Once it succeeds, every useRead on the page fetches again.
 *   const tx = useTx();
 *   await tx.run(() => writeContract({ ... }));  // returns the receipt, or undefined on error
 */
export function useTx() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  const run = useCallback(async (send: () => Promise<TransactionReceipt>) => {
    setPending(true);
    setError(null);
    setReceipt(null);
    try {
      const r = await send();
      if (r.status !== "success") throw new Error("The transaction was reverted.");
      setReceipt(r);
      void markChanged("tx");
      return r;
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, receipt, reset: () => (setError(null), setReceipt(null)) };
}
