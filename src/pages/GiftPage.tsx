import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Leaf, Send, Sparkles } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Notice } from "../components/ui/notice";
import { GiftCardView } from "../components/GiftCardView";
import { copyText, decodeCard, giftUrl, tidyAmount } from "../lib/giftLinks";
import { showAmount } from "../lib/gifts";

/** The page a recipient opens from a shared link: the card, who it came from, and what comes next. */
export default function GiftPage() {
  const { code = "" } = useParams();
  const card = useMemo(() => decodeCard(code), [code]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = card ? "A " + showAmount(card.amount) + " G$ gift for you · Sente" : "Card not found · Sente";
  }, [card]);

  if (!card) {
    return (
      <div className="mx-auto grid w-full max-w-xl place-items-center px-5 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Leaf className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">This card didn't arrive intact</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The link looks incomplete, maybe a few characters got cut when it was pasted. Ask for it again, or make a card of your own.
        </p>
        <Link to="/gift" className="mt-6">
          <Button size="lg" className="rounded-xl">
            Make a card
          </Button>
        </Link>
      </div>
    );
  }

  const link = giftUrl({ ...card, amount: tidyAmount(card.amount) });

  async function onCopy() {
    if (await copyText(link)) setCopied(true);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 leaf-wash" aria-hidden="true" />
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">A gift, waiting</Badge>
          <Badge>Demo card</Badge>
        </div>
        <h1 className="mt-4 max-w-[22ch] font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Somebody set aside {showAmount(card.amount)} G$ for you.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          This is the card they made. Read the note, then see what claiming it will look like once real transfers switch on.
        </p>

        <div className="mt-7">
          <GiftCardView amount={card.amount} note={card.note} from={card.from} sealed />
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Claim it</h2>
              <p className="mt-1 text-sm text-muted-foreground">The G$ will land in your own wallet, not ours.</p>
            </div>
            <Sparkles className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
          </div>

          <Button size="lg" className="mt-4 h-12 w-full rounded-xl text-base" disabled>
            <Send className="size-4" aria-hidden="true" />
            Claim {showAmount(card.amount)} G$
          </Button>
          <Notice tone="warning" className="mt-3" title="Claiming is still to come">
            Nothing has moved: this card is a preview saved inside the link. Real G$ transfers arrive in the next milestone, and you will
            approve them from your own wallet.
          </Notice>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onCopy}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Link copied" : "Copy this link"}
            </Button>
            <Link to="/gift">
              <Button variant="outline" className="rounded-xl">
                Make your own card
              </Button>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          The whole card lives inside the link, so nothing was stored on a server and nobody had to sign in.
        </p>
      </div>
    </div>
  );
}
