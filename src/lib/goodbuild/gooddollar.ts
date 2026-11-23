/**
 * Written by GoodBuild: G$ (GoodDollar) on this app's network. Don't edit it, and never type a token
 * address yourself. gdAddress is the real G$ on Celo, GoodBuild's test G$ on Celo Sepolia, or null where
 * this network has none yet. useGdBalance() reads the connected wallet's G$ and updates by itself after a
 * transaction, a wallet switch and on the page's refresh timer.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { subscribeChanges } from "./live";
import { appChain, subscribeWallet, walletState } from "./wallet";

/** Written by GoodBuild for this project's network. */
export const gdAddress: Address | null = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";

const client = createPublicClient({ chain: appChain, transport: http() });
let decimals: number | null = null;

/** The G$ balance of an address, in G$'s smallest unit, and G$'s decimals. Throws when it can't be read. */
export async function readGdBalance(owner: Address): Promise<{ raw: bigint; decimals: number }> {
  if (!gdAddress) throw new Error("There is no G$ on this network yet.");
  const [raw, dec] = await Promise.all([
    client.readContract({ address: gdAddress, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    decimals === null ? client.readContract({ address: gdAddress, abi: erc20Abi, functionName: "decimals" }) : Promise.resolve(decimals),
  ]);
  decimals = Number(dec);
  return { raw: raw as bigint, decimals };
}

/**
 * The connected wallet's G$: balance (smallest unit) and formatted ("1,234.5"), or null before it is known.
 * error is a short sentence to show when it can't be read; available is false where there is no G$.
 */
export function useGdBalance(): { balance: bigint | null; formatted: string | null; loading: boolean; error: string | null; available: boolean } {
  const { account } = useSyncExternalStore(subscribeWallet, walletState, walletState);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [formatted, setFormatted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBalance(null);
    setFormatted(null);
    setError(null);
    if (!account || !gdAddress) return;
    let stopped = false;
    const load = async () => {
      setLoading(true);
      try {
        const { raw, decimals: dec } = await readGdBalance(account);
        if (stopped) return;
        setBalance(raw);
        setFormatted(Number(formatUnits(raw, dec)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setError(null);
      } catch {
        if (!stopped) setError("Couldn't read the G$ balance right now.");
      } finally {
        if (!stopped) setLoading(false);
      }
    };
    void load();
    const unsubscribe = subscribeChanges(() => load());
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, [account]);

  return { balance, formatted, loading, error, available: gdAddress !== null };
}
