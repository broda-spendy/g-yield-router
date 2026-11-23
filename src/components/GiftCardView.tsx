import { Gift } from "lucide-react";
import { showAmount } from "../lib/gifts";
import { giftLinkName, type GiftCardData } from "../lib/giftLinks";

/** The paper card itself: what the giver composes and what the recipient opens. */
export function GiftCardView({
  amount,
  note,
  from,
  sealed,
  displayAmount,
  className,
}: {
  amount: string;
  note: string;
  from: string;
  /** Already-formatted amount (e.g. read from the chain) to show instead of formatting `amount`. */
  displayAmount?: string;
  /** The recipient's view: a wax-style seal instead of the "preview" label. */
  sealed?: boolean;
  className?: string;
}) {
  const value = Number.parseFloat(amount);
  const hasAmount = Number.isFinite(value) && value > 0;

  return (
    <div className={"relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm " + (className ?? "")}>
      <div className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-accent/10 blur-xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-36 rounded-full bg-primary/5 blur-xl" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {sealed ? "For you" : "Preview of your card"}
        </p>
        <span className="grid size-8 place-items-center rounded-full border border-border bg-background text-accent">
          <Gift className="size-4" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 font-display text-5xl font-semibold tabular-nums tracking-tight">
        {displayAmount ?? (hasAmount ? showAmount(amount) : "0")}
        <span className="ml-1.5 text-2xl font-normal text-muted-foreground">G$</span>
      </p>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        <p className="min-h-12 font-display text-lg leading-snug text-foreground/90">
          {note.trim() ? "“" + note.trim() + "”" : "The note sits here, like a line written on the back of a card."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">From {giftLinkName(from)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          GoodDollar
        </span>
        <span className="text-[11px] text-muted-foreground">{sealed ? "Unopened · GoodDollar on Celo" : "Preview · not funded yet"}</span>
      </div>
    </div>
  );
}
