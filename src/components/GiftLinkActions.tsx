import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { copyText, encodeCard, giftUrl, tidyAmount, type GiftCardData } from "../lib/giftLinks";

/**
 * The link controls for a gift card: copy it, share it with the phone's own sheet, or open it.
 * Everything is client side; the card travels inside the link.
 */
export function GiftLinkActions({ card, className }: { card: GiftCardData; className?: string }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<null | "copied" | "failed">(null);
  const amount = tidyAmount(card.amount);
  const link = useMemo(() => (amount ? giftUrl({ ...card, amount }) : ""), [amount, card.amount, card.note, card.from]);

  if (!amount) {
    return (
      <p className={"rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground " + (className ?? "")}>
        Add an amount and your shareable link appears here.
      </p>
    );
  }

  async function onCopy() {
    setStatus((await copyText(link)) ? "copied" : "failed");
  }

  async function onShare() {
    try {
      await navigator.share({ title: "A G$ gift for you", text: card.note ? "“" + card.note + "”" : "A little GoodDollar", url: link });
    } catch {
      // The visitor closed the share sheet: nothing to do.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={"grid gap-3 " + (className ?? "")}>
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Your gift link</p>
        <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground/80" data-testid="gift-link">
          {link}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onCopy} className="rounded-xl">
          {status === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {status === "copied" ? "Copied" : "Copy link"}
        </Button>
        {canShare && (
          <Button variant="outline" onClick={onShare} className="rounded-xl">
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => navigate("/gift/" + encodeCard({ ...card, amount }))}
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Open the card
        </Button>
      </div>

      {status === "copied" && (
        <Notice tone="success" title="Link copied">
          Paste it into a chat. Whoever opens it sees the card, note and all.
        </Notice>
      )}
      {status === "failed" && (
        <Notice tone="warning" title="Copy it by hand">
          This browser blocked the clipboard. Select the link above and copy it.
        </Notice>
      )}
    </div>
  );
}
