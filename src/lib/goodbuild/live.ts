/**
 * Written by GoodBuild: keeps the numbers on the page in step with the chain and the app's saved data.
 * Don't edit it. useRead and useCollection already listen, writeContract and useTx already announce a
 * confirmed transaction, and saved-data writes announce themselves. Use refreshAll() (or
 * <RefreshButton /> with no props) to fetch everything on the page again.
 */

/** Why the page is fetching again. "tick" is the slow background timer. */
export type ChangeKind = "tx" | "data" | "wallet" | "focus" | "tick" | "manual";

type Run = (kinds: ReadonlySet<ChangeKind>) => unknown;
interface Listener {
  run: Run;
  on: ReadonlySet<ChangeKind>;
}

const ALL: ChangeKind[] = ["tx", "data", "wallet", "focus", "tick", "manual"];
/** The background timer while someone is using the page. */
export const ACTIVE_EVERY_MS = 15_000;
/** The background timer once nobody has touched the page for IDLE_AFTER_MS. */
export const IDLE_EVERY_MS = 60_000;
const IDLE_AFTER_MS = 120_000;
/** Coming back to the tab refreshes only after this long away, and at most this often. */
const AWAY_MS = 15_000;
/** Signals inside this window become one fetch per read. */
const MERGE_MS = 60;
/** A confirmed transaction fetches again after this, in case the first read hit a node one block behind. */
const TX_FOLLOW_UP_MS = 3_000;

const listeners = new Set<Listener>();
const refreshedListeners = new Set<() => void>();
let pending = new Set<ChangeKind>();
let waiters: Array<() => void> = [];
let mergeTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setTimeout> | null = null;
let tickDue = 0;
let started = false;
let lastActive = Date.now();
let lastRefreshed = 0;
let hiddenSince = 0;
let lastAwayRefresh = 0;

const hasDocument = () => typeof document !== "undefined";
const isHidden = () => hasDocument() && document.visibilityState === "hidden";
const isIdle = () => Date.now() - lastActive > IDLE_AFTER_MS;
const jitter = (ms: number) => Math.round(ms * (0.8 + Math.random() * 0.4));
const wantsTicks = () => [...listeners].some((l) => l.on.has("tick"));

function flush() {
  mergeTimer = null;
  const kinds: ReadonlySet<ChangeKind> = pending;
  pending = new Set();
  const done = waiters;
  waiters = [];
  const runs: Promise<unknown>[] = [];
  for (const listener of [...listeners]) {
    if (![...kinds].some((k) => listener.on.has(k))) continue;
    try {
      runs.push(Promise.resolve(listener.run(kinds)));
    } catch {
      // One broken read never stops the others.
    }
  }
  void Promise.allSettled(runs).then(() => {
    lastRefreshed = Date.now();
    for (const listener of [...refreshedListeners]) listener();
    for (const resolve of done) resolve();
  });
}

/**
 * Tell the page something changed, so every read that cares fetches again. Signals close together are
 * merged. Resolves when those reads have finished.
 */
export function markChanged(kind: ChangeKind = "manual"): Promise<void> {
  start();
  pending.add(kind);
  const finished = new Promise<void>((resolve) => waiters.push(resolve));
  if (!mergeTimer) mergeTimer = setTimeout(flush, MERGE_MS);
  if (kind === "tx") setTimeout(() => void markChanged("tick"), TX_FOLLOW_UP_MS);
  return finished;
}

/** Fetch every read on the page again (what a page-wide refresh button does). */
export function refreshAll(): Promise<void> {
  return markChanged("manual");
}

/**
 * Run fn whenever something it cares about changes. on defaults to every kind; saved data leaves out
 * "tick" and "tx" so it never polls GoodBuild's server. Returns the unsubscribe function.
 */
export function subscribeChanges(fn: Run, options: { on?: ChangeKind[] } = {}): () => void {
  start();
  const listener: Listener = { run: fn, on: new Set(options.on ?? ALL) };
  listeners.add(listener);
  scheduleTick();
  return () => {
    listeners.delete(listener);
    if (!wantsTicks()) stopTick();
  };
}

/** When the page last finished a refresh (ms since 1970), or 0. For "Updated 12s ago". */
export function lastRefreshedAt(): number {
  return lastRefreshed;
}

/** Called after every finished refresh (for useSyncExternalStore). */
export function subscribeRefreshed(listener: () => void): () => void {
  refreshedListeners.add(listener);
  return () => {
    refreshedListeners.delete(listener);
  };
}

function stopTick() {
  if (tickTimer) clearTimeout(tickTimer);
  tickTimer = null;
  tickDue = 0;
}

/** Start the shared timer if a read wants it and the tab is showing; never more than one. */
function scheduleTick(force = false) {
  if (!wantsTicks() || isHidden()) return stopTick();
  const wait = jitter(isIdle() ? IDLE_EVERY_MS : ACTIVE_EVERY_MS);
  if (tickTimer && !force) return;
  // A visitor coming back from idle shouldn't wait out a 60 s timer: bring it forward, never push it back.
  if (tickTimer && Date.now() + wait >= tickDue) return;
  stopTick();
  tickDue = Date.now() + wait;
  tickTimer = setTimeout(onTick, wait);
}

function onTick() {
  tickTimer = null;
  tickDue = 0;
  if (isHidden() || !wantsTicks()) return;
  const every = isIdle() ? IDLE_EVERY_MS : ACTIVE_EVERY_MS;
  // The page fetched recently anyway (a transaction, a button): skip this one.
  if (Date.now() - lastRefreshed >= every * 0.5) void markChanged("tick");
  scheduleTick();
}

function onActivity() {
  const wasIdle = isIdle();
  lastActive = Date.now();
  if (wasIdle) scheduleTick(true);
}

function onVisibility() {
  if (isHidden()) {
    hiddenSince = Date.now();
    stopTick();
    return;
  }
  const now = Date.now();
  lastActive = now;
  if (hiddenSince && now - hiddenSince >= AWAY_MS && now - lastAwayRefresh >= AWAY_MS) {
    lastAwayRefresh = now;
    void markChanged("focus");
  }
  hiddenSince = 0;
  scheduleTick();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const passive = { passive: true } as const;
  for (const event of ["pointerdown", "keydown", "scroll", "touchstart"]) window.addEventListener(event, onActivity, passive);
  if (hasDocument()) document.addEventListener("visibilitychange", onVisibility);
  // Back online after a dropped connection: whatever was shown may be out of date.
  window.addEventListener("online", () => void markChanged("focus"));
}
