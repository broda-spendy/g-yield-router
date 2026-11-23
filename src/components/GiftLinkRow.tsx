import { Link } from "react-router-dom";
import { ArrowUpRight, Link2 } from "lucide-react";
import { showAmount, timeAgo } from "../lib/gifts";
import { encodeCard, giftLinkName, type SavedGiftLink } from "../lib/giftLinks";

/** One saved gift link: what the card says, who it is from, and a way back into it. */
export function GiftLinkRow({ link }: { link: SavedGiftLink }) {
  return (
    <li className="flex items-start gap-4 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Link2 className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold tabular-nums leading-tight">{showAmount(link.amount)} G$</p>
        <p className="truncate text-sm text-foreground/80">{link.note || "No note"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          From {giftLinkName(link.from)} · {timeAgo(link.at)}
        </p>
      </div>
      <Link
        to={"/gift/" + encodeCard(link)}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={"Open the " + showAmount(link.amount) + " G$ card for " + (link.note || "no note")}
      >
        Open
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </li>
  );
}
