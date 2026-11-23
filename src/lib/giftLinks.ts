/**
 * Shareable gift cards, kept on this device only.
 *
 * A card is packed into the part of the link after "#/gift/", so the note travels inside the
 * link itself (no server, no account). The Activity page keeps a named copy of every link you
 * make on this device, so you can find it again later.
 */
import { useCallback, useSyncExternalStore } from "react";
import { cleanText } from "./gifts";

/** The data a shared card carries. Amounts are G$ (whole or fractional), not smallest units. */
export interface GiftCardData {
  amount: string;
  note: string;
  from: string;
  /** A card funded on chain: the contract's card id and the secret that claims it. */
  cardId?: string;
  cardCode?: string;
}

/** One link you made, remembered in this browser. */
export interface SavedGiftLink extends GiftCardData {
  id: string;
  at: number;
}

const KEY = "sente.giftLinks.v1";
const CARDS: GiftCardData[] = [
  { amount: "10", note: "Kola for the week", from: "" },
  { amount: "25", note: "Thanks for the lift home", from: "" },
  { amount: "50", note: "Jollof money", from: "" },
  { amount: "100", note: "Happy Sunday", from: "" },
];

let cache: SavedGiftLink[] | null = null;
const listeners = new Set<() => void>();

function read(): SavedGiftLink[] {
  if (cache) return cache;
  let list: SavedGiftLink[] = [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      list = parsed.filter(
        (g): g is SavedGiftLink =>
          !!g &&
          typeof (g as SavedGiftLink).id === "string" &&
          typeof (g as SavedGiftLink).amount === "string" &&
          typeof (g as SavedGiftLink).note === "string" &&
          typeof (g as SavedGiftLink).at === "number",
      );
    }
  } catch {
    list = [];
  }
  cache = list;
  return list;
}

function write(next: SavedGiftLink[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Base64url with UTF-8 support, so a note with accents or emoji survives the trip. */
function encodeText(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeText(code: string) {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** A tidy amount string: "10", "12.5", and never anything that isn't a positive number. */
export function tidyAmount(value: string) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n
    .toFixed(6)
    .replace(/\.?0+$/, "")
    .slice(0, 14);
}

/** Pack a card into the token that goes after "#/gift/". */
export function encodeCard(card: GiftCardData) {
  return encodeText(
    JSON.stringify({
      a: tidyAmount(card.amount),
      n: cleanText(card.note, 80),
      f: cleanText(card.from, 30),
      ...(card.cardId && card.cardCode ? { i: card.cardId, k: card.cardCode } : {}),
    }),
  );
}

/** Read a card back out of a link. Anything malformed returns null instead of throwing. */
export function decodeCard(code: string): GiftCardData | null {
  try {
    const parsed: unknown = JSON.parse(decodeText(code.trim()));
    if (!parsed || typeof parsed !== "object") return null;
    const raw = parsed as Record<string, unknown>;
    const amount = tidyAmount(typeof raw.a === "string" ? raw.a : "");
    if (!amount) return null;
    const word = /^0x[0-9a-fA-F]{64}$/;
    const cardId = typeof raw.i === "string" && word.test(raw.i) ? raw.i : undefined;
    const cardCode = typeof raw.k === "string" && word.test(raw.k) ? raw.k : undefined;
    return {
      amount,
      note: cleanText(typeof raw.n === "string" ? raw.n : "", 80),
      from: cleanText(typeof raw.f === "string" ? raw.f : "", 30),
      ...(cardId && cardCode ? { cardId, cardCode } : {}),
    };
  } catch {
    return null;
  }
}

/** The full link to this card, ready to paste into a chat. Works from any page of the app. */
export function giftUrl(card: GiftCardData) {
  const base = window.location.origin + window.location.pathname;
  return base + "#/gift/" + encodeCard(card);
}

/** A handle for the giver: an ENS-ish "@tola", or the short wallet address. */
export function giftLinkName(from: string) {
  const value = from.trim();
  if (!value) return "Somebody";
  if (value.startsWith("@")) return value;
  return value.slice(0, 6) + "…" + value.slice(-4);
}

/** Remember a link you made, newest first, without duplicating the exact same card. */
export function rememberGiftLink(card: GiftCardData) {
  const amount = tidyAmount(card.amount);
  const note = cleanText(card.note, 80);
  const from = cleanText(card.from, 30);
  const entry: SavedGiftLink = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    amount,
    note,
    from,
    at: Date.now(),
    ...(card.cardId && card.cardCode ? { cardId: card.cardId, cardCode: card.cardCode } : {}),
  };
  const same = (l: SavedGiftLink) =>
    card.cardId && card.cardCode ? l.cardId === card.cardId : l.amount === amount && l.note === note && l.from === from;
  write([entry, ...read().filter((l) => !same(l))].slice(0, 20));
  return entry;
}

/** Forget the saved links, but keep the one the visitor is looking at. */
export function forgetGiftLinks(keepId?: string) {
  write(keepId ? read().filter((l) => l.id === keepId) : []);
}

/** The saved links, live across tabs on this device. */
export function useSavedGiftLinks() {
  const links = useSyncExternalStore(subscribe, read, read);
  const clear = useCallback((keepId?: string) => forgetGiftLinks(keepId), []);
  return { links, clear };
}

/** The example cards offered on the share screen. */
export function exampleCards(): GiftCardData[] {
  return CARDS.map((c) => ({ ...c }));
}

/** Copy text to the clipboard, with a fallback for browsers that refuse the modern API. */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the old way
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
