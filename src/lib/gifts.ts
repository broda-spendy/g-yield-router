import { useCallback, useSyncExternalStore } from "react";

/** One demo gift, kept on this device only. Nothing here touches the chain. */
export interface DemoGift {
  id: string;
  amount: string;
  recipient: string;
  note: string;
  at: number;
}

const KEY = "sente.demoGifts.v1";

let cache: DemoGift[] | null = null;
const listeners = new Set<() => void>();

function read(): DemoGift[] {
  if (cache) return cache;
  let list: DemoGift[] = [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      list = parsed.filter(
        (g): g is DemoGift =>
          !!g && typeof (g as DemoGift).id === "string" && typeof (g as DemoGift).amount === "string" && typeof (g as DemoGift).recipient === "string",
      );
    }
  } catch {
    list = [];
  }
  cache = list;
  return list;
}

function write(next: DemoGift[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or blocked storage still works for this visit, just not the next one.
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

/** Add a demo gift to the top of the local history. */
export function addDemoGift(gift: Omit<DemoGift, "id" | "at">) {
  const entry: DemoGift = {
    ...gift,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    at: Date.now(),
  };
  write([entry, ...read()]);
  return entry;
}

/** Forget every demo gift on this device. */
export function clearDemoGifts() {
  write([]);
}

/** The newline-free text a person typed, trimmed to a sane length. */
export function cleanText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** The gift history, live: it updates in this tab and in any other tab on the same device. */
export function useDemoGifts() {
  const gifts = useSyncExternalStore(subscribe, read, read);
  const clear = useCallback(() => clearDemoGifts(), []);
  return { gifts, clear };
}

/** "just now", "5 min ago", "3 days ago". */
export function timeAgo(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : h + " hours ago";
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : d + " days ago";
}

/** Total of the demo gifts, as a plain number (amounts in G$, whole or fractional). */
export function totalAmount(gifts: DemoGift[]) {
  return gifts.reduce((sum, g) => sum + (Number.parseFloat(g.amount) || 0), 0);
}

/** A wallet address looks like 0x + 40 hex characters. */
export function looksLikeAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

/** Shorten an amount for display: "50" stays, "12.3456" becomes "12.34". */
export function showAmount(amount: string) {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount || "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
