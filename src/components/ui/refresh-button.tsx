import { RotateCw } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { lastRefreshedAt, refreshAll, subscribeRefreshed } from "../../lib/goodbuild/live";
import { cn } from "../../lib/utils";

interface Refreshable {
  refresh: () => Promise<unknown>;
  refreshing?: boolean;
  updatedAt?: number | null;
}

function ago(at: number | null | undefined, now: number): string {
  if (!at) return "Refresh";
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 5) return "Updated just now";
  if (s < 60) return "Updated " + s + "s ago";
  const m = Math.round(s / 60);
  return m < 60 ? "Updated " + m + " min ago" : "Updated over an hour ago";
}

/**
 * A small round-arrow button that fetches again and spins while it does. Hovering shows when the
 * value last arrived.
 *   <RefreshButton read={balance} />   one useRead or useCollection (it also spins on their own refreshes)
 *   <RefreshButton />                  everything on the page (refreshAll)
 * Put it in a card's header, next to its title, or beside a big number. Values refresh on their own
 * after transactions and saved-data writes, so it's the fallback, not the way things update.
 */
export function RefreshButton({ read, label = "Refresh", className }: { read?: Refreshable; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pageAt = useSyncExternalStore(subscribeRefreshed, lastRefreshedAt, lastRefreshedAt);
  const spinning = busy || read?.refreshing === true;
  const updatedAt = read ? read.updatedAt : pageAt;

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await (read ? read.refresh() : refreshAll());
    } finally {
      setBusy(false);
      setNow(Date.now());
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setNow(Date.now())}
      onFocus={() => setNow(Date.now())}
      aria-label={label}
      aria-busy={spinning}
      title={spinning ? "Refreshing…" : ago(updatedAt, now)}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <RotateCw className={cn("size-4", spinning && "motion-safe:animate-spin")} aria-hidden="true" />
    </button>
  );
}
