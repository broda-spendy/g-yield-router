import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { cn } from "../lib/utils";
import { looksLikeAddress, showAmount, timeAgo, type DemoGift } from "../lib/gifts";

/**
 * The paper gift card the visitor is composing, drawn live from the form. Purely a preview:
 * it never sends anything.
 */
export function GiftCard({
  amount,
  recipient,
  note,
  className,
}: {
  amount: string;
  recipient: string;
  note: string;
  className?: string;
}) {
  const hasRecipient = looksLikeAddress(recipient);
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-accent/10 blur-xl" aria-hidden="true" />
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Preview of your gift</p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums tracking-tight">
        {amount.trim() ? showAmount(amount) + " G$" : "0 G$"}
      </p>
      <p className="mt-3 min-h-10 max-w-[24ch] font-display text-lg leading-snug text-foreground/90">
        {note.trim() ? "“" + note.trim() + "”" : "Your note will sit here, like a card slipped into an envelope."}
      </p>
      <p className="mt-4 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
        {hasRecipient ? "To " + recipient.slice(0, 6) + "…" + recipient.slice(-4) : "To an address you'll add"}
      </p>
    </div>
  );
}

/** One row in the demo history: amount, note, short recipient, when it was recorded. */
export function GiftRow({ gift }: { gift: DemoGift }) {
  return (
    <li className="flex items-start gap-4 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 font-display text-sm font-semibold tabular-nums text-accent">
        G$
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold tabular-nums leading-tight">{showAmount(gift.amount)} G$</p>
        <p className="truncate text-sm text-foreground/80">{gift.note || "No note"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          To {gift.recipient.slice(0, 6)}…{gift.recipient.slice(-4)}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground" data-testid="gift-time">
        {timeAgo(gift.at)}
      </span>
    </li>
  );
}

/** Three grey rows standing in for the history while it loads. */
export function GiftListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
