import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RefreshButton } from "./ui/refresh-button";
import { Skeleton } from "./ui/skeleton";
import { Notice } from "./ui/notice";
import { DeployNotice } from "./DeployNotice";
import { shortAddress } from "../lib/utils";
import { timeAgo } from "../lib/gifts";
import { giftsAddress, showGd, useGdToken, useRecentGifts } from "../lib/senteChain";

/** The newest gifts recorded on chain, newest first: the app's public activity strip. */
export function ChainGiftsCard({ limit = 3 }: { limit?: number }) {
  const { decimals } = useGdToken();
  const gifts = useRecentGifts(limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-xl">Gifts on chain</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">The last few gifts anyone sent with a note.</p>
        </div>
        {giftsAddress && <RefreshButton read={gifts} />}
      </CardHeader>
      <CardContent>
        {!giftsAddress ? (
          <DeployNotice />
        ) : gifts.error ? (
          <Notice tone="danger" title="Couldn't read the gifts">
            {gifts.error}
          </Notice>
        ) : gifts.loading ? (
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : gifts.gifts.length === 0 ? (
          <div className="py-6 text-center">
            <Sprout className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 font-display text-base font-semibold">No gifts on chain yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Send the first one above and it will appear here, note and all.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {gifts.gifts.map((g, i) => (
              <li key={g.from + g.to + g.at + i} className="flex items-start gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 font-display text-xs font-semibold text-accent">
                  G$
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold tabular-nums leading-tight">{showGd(g.amount, decimals)} G$</p>
                  <p className="truncate text-sm text-foreground/80">{g.note || "No note"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {shortAddress(g.from)} → {shortAddress(g.to)} · {timeAgo(g.at * 1000)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/activity" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          See everything you've sent
        </Link>
      </CardContent>
    </Card>
  );
}
