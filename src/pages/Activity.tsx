import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Trash2 } from "lucide-react";
import { GiftRow } from "../components/GiftCard";
import { GiftLinkRow } from "../components/GiftLinkRow";
import { WalletCard } from "../components/WalletCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { showAmount, totalAmount, useDemoGifts } from "../lib/gifts";
import { useSavedGiftLinks } from "../lib/giftLinks";

export default function Activity() {
  const { gifts, clear } = useDemoGifts();
  const { links } = useSavedGiftLinks();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    document.title = "Gifts you've sent · Sente";
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Local demo
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Gifts you've sent</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            These are demo gifts composed on this device. They are stored in this browser only, and no G$ has moved.
          </p>
        </div>
        {gifts.length > 0 && (
          <Dialog open={confirming} onOpenChange={setConfirming}>
            <Button variant="outline" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Clear demo gifts
            </Button>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Clear the demo history?</DialogTitle>
                <DialogDescription>
                  This forgets all {gifts.length} demo gifts on this device. It can't be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-5">
                <DialogClose asChild>
                  <Button variant="outline">Keep them</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    clear();
                    setConfirming(false);
                  }}
                >
                  Clear everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Demo gifts</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{gifts.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total written</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{showAmount(String(totalAmount(gifts)))} G$</p>
        </div>
      </div>

      {gifts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Leaf className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold">No gifts yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Compose your first one and it will be listed here with its note.
          </p>
          <Link to="/" className="mt-5 inline-flex">
            <Button size="lg" className="rounded-xl">
              Send your first G$
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-card px-5 shadow-sm">
          <ul className="divide-y divide-border">
            {gifts.map((g) => (
              <GiftRow key={g.id} gift={g} />
            ))}
          </ul>
        </div>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Gift links you've kept</h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Cards you packed into a link, saved here so you can find them again.
            </p>
          </div>
          <Link to="/gift">
            <Button variant="outline" className="rounded-xl">
              Make a gift link
            </Button>
          </Link>
        </div>

        {links.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">No links kept yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              A gift link carries an amount, a note and your name, and can be opened by anyone you send it to.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card px-5 shadow-sm">
            <ul className="divide-y divide-border">
              {links.map((l) => (
                <GiftLinkRow key={l.id} link={l} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <WalletCard />
      </section>

      <p className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="warning">Demo mode</Badge>
        Real G$ transfers and on-chain receipts arrive in the next milestone.
      </p>
    </div>
  );
}
