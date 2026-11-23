/**
 * Everything the app reads from Sente's two contracts on this network: the gifts that carry a note,
 * and the funded gift cards that a link claims. Reads only; writes happen in the panels themselves
 * through writeContract, so every read here refreshes by itself after a transaction.
 */
import { erc20Abi, formatUnits, parseUnits, type Address, type Hex } from "viem";
import { SenteCardsAbi, SenteCardsAddress } from "../contracts/SenteCards";
import { SenteGiftsAbi, SenteGiftsAddress } from "../contracts/SenteGifts";
import { chain, publicClient } from "./chain";
import { formatAmount } from "./format";
import { gdAddress } from "./goodbuild/gooddollar";
import { useRead } from "./hooks";

/** Where the contracts live on this app's network. undefined until the person deploys. */
export const giftsAddress: Address | undefined = SenteGiftsAddress[chain.id];
export const cardsAddress: Address | undefined = SenteCardsAddress[chain.id];

/** One gift recorded by SenteGifts. `at` is a unix time in seconds. */
export interface ChainGift {
  from: Address;
  to: Address;
  amount: bigint;
  at: number;
  note: string;
}

/** One card funded in SenteCards. `expiry` is a unix time in seconds. */
export interface ChainCard {
  id: Hex;
  sender: Address;
  amount: bigint;
  expiry: number;
  claimed: boolean;
  note: string;
}

type RawGift = readonly [Address, Address, bigint, bigint, string];
type RawCard = { sender: Address; amount: bigint; expiry: bigint; claimed: boolean; note: string; codeHash: Hex };

const MY_MAX = 20;

/** One typed contract read, so each caller below only names the function and its arguments. */
async function chainRead<T>(address: Address, abi: readonly unknown[], functionName: string, args?: readonly unknown[]): Promise<T> {
  const result = await publicClient.readContract({ address, abi, functionName, args } as never);
  return result as T;
}

function toGift(raw: RawGift): ChainGift {
  return { from: raw[0], to: raw[1], amount: raw[2], at: Number(raw[3]), note: raw[4] };
}

/** G$ from a typed amount ("12.5") to the token's smallest unit, or null when it isn't a positive number. */
export function toUnits(value: string, decimals: number): bigint | null {
  try {
    const units = parseUnits(value.trim(), decimals);
    return units > BigInt(0) ? units : null;
  } catch {
    return null;
  }
}

/** Smallest unit to "1,234.5". */
export function showGd(value: bigint | undefined, decimals: number) {
  if (value === undefined) return "0";
  return formatAmount(value, decimals, 2);
}

/** A fresh 32-byte secret for a card id or its claim code. */
export function randomSecret(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let hex = "0x";
  bytes.forEach((b) => {
    hex += b.toString(16).padStart(2, "0");
  });
  return hex as Hex;
}

/** How much G$ `owner` has let `spender` move. Read with the token's own decimals-agnostic allowance. */
export async function readAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
  return chainRead<bigint>(token, erc20Abi, "allowance", [owner, spender]);
}

/**
 * The G$ token this app moves: read from the gifts contract (its `gd()` getter) so the address always
 * matches the contract in use, with GoodBuild's G$ as the fallback before anything is deployed.
 */
export function useGdToken() {
  const tokenRead = useRead(
    async () => {
      if (!giftsAddress) return undefined;
      return chainRead<Address>(giftsAddress, SenteGiftsAbi, "gd");
    },
    [giftsAddress],
    true,
    { live: false },
  );
  const token: Address | undefined = tokenRead.data ?? gdAddress ?? undefined;

  const decimalsRead = useRead(
    async () => Number(await chainRead<bigint>(token!, erc20Abi, "decimals")),
    [token],
    !!token,
    { live: false },
  );

  return { token, decimals: decimalsRead.data ?? 18, tokenError: tokenRead.error };
}

/** The newest gifts on the whole app, newest first. */
export function useRecentGifts(limit = 3) {
  const read = useRead(
    async () => {
      const rows = await chainRead<RawGift[]>(giftsAddress!, SenteGiftsAbi, "recent", [BigInt(limit)]);
      return rows.map(toGift);
    },
    [limit],
    !!giftsAddress,
  );
  return { ...read, gifts: read.data ?? [] };
}

/** Count and total volume for the whole app. */
export function useGiftTotals() {
  const read = useRead(
    async () => {
      const [count, sent] = await Promise.all([
        chainRead<bigint>(giftsAddress!, SenteGiftsAbi, "totalGifts"),
        chainRead<bigint>(giftsAddress!, SenteGiftsAbi, "totalSent"),
      ]);
      return { count: Number(count), sent };
    },
    [],
    !!giftsAddress,
  );
  return { ...read, totals: read.data };
}

/** The gifts one wallet sent, newest first. */
export function useMyGifts(account?: string) {
  const ids = useRead(
    async () => {
      const list = await chainRead<bigint[]>(giftsAddress!, SenteGiftsAbi, "giftsBy", [account as Address]);
      return list.slice(0, MY_MAX);
    },
    [account],
    !!giftsAddress && !!account,
  );

  const key = ids.data ? ids.data.map(String).join(",") : "";
  const rows = useRead(
    async () => {
      const list = ids.data ?? [];
      return Promise.all(
        list.map(async (id) => toGift(await chainRead<RawGift>(giftsAddress!, SenteGiftsAbi, "giftAt", [id]))),
      );
    },
    [key],
    !!giftsAddress && !!account && ids.data !== undefined,
  );

  async function refresh() {
    await ids.refresh();
    await rows.refresh();
  }

  return {
    gifts: rows.data ?? [],
    loading: ids.loading || rows.loading,
    refreshing: ids.refreshing || rows.refreshing,
    error: ids.error ?? rows.error,
    updatedAt: rows.updatedAt ?? ids.updatedAt,
    refresh,
  };
}

/** The cards one wallet funded, newest first. */
export function useMyCards(account?: string) {
  const ids = useRead(
    async () => {
      const list = await chainRead<Hex[]>(cardsAddress!, SenteCardsAbi, "cardsBy", [account as Address]);
      return list.slice(0, MY_MAX);
    },
    [account],
    !!cardsAddress && !!account,
  );

  const key = ids.data ? ids.data.join(",") : "";
  const rows = useRead(
    async () => {
      const list = ids.data ?? [];
      return Promise.all(
        list.map(async (id) => {
          const raw = await chainRead<RawCard>(cardsAddress!, SenteCardsAbi, "cardInfo", [id]);
          return {
            id,
            sender: raw.sender,
            amount: raw.amount,
            expiry: Number(raw.expiry),
            claimed: raw.claimed,
            note: raw.note,
          };
        }),
      );
    },
    [key],
    !!cardsAddress && !!account && ids.data !== undefined,
  );

  async function refresh() {
    await ids.refresh();
    await rows.refresh();
  }

  return {
    cards: rows.data ?? [],
    loading: ids.loading || rows.loading,
    refreshing: ids.refreshing || rows.refreshing,
    error: ids.error ?? rows.error,
    updatedAt: rows.updatedAt ?? ids.updatedAt,
    refresh,
  };
}

/** One card by its id, for the page a recipient opens. */
export function useCard(id?: string) {
  const read = useRead(
    async () => {
      const raw = await chainRead<RawCard>(cardsAddress!, SenteCardsAbi, "cardInfo", [id as Hex]);
      return {
        sender: raw.sender,
        amount: raw.amount,
        expiry: Number(raw.expiry),
        claimed: raw.claimed,
        note: raw.note,
      };
    },
    [id],
    !!cardsAddress && !!id,
  );
  return { ...read, card: read.data };
}

/** True when a card exists on chain (its sender is not the zero address). */
export function cardExists(card?: { sender?: string }) {
  return !!card?.sender && card.sender !== "0x0000000000000000000000000000000000000000";
}

/** Format a token amount for a token whose decimals we know, falling back to raw 18. */
export function unitsToGd(value: bigint | undefined, decimals = 18) {
  if (value === undefined) return "0";
  return formatUnits(value, decimals);
}
