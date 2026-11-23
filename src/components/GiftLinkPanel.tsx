import { useState } from "react";
import { BookmarkPlus, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { GiftCardView } from "./GiftCardView";
import { GiftLinkActions } from "./GiftLinkActions";
import { rememberGiftLink, tidyAmount, type GiftCardData } from "../lib/giftLinks";

const NOTE_IDEAS = ["Jollof money", "Thanks for the lift home", "Kola for the week", "Happy Sunday"];

/**
 * The share step: write the amount, note and who it's from, then get a link the recipient can open.
 * The card lives inside the link itself, so there is no server and no sign-in. Demo only: no G$ moves.
 */
export function GiftLinkPanel() {
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("Jollof money");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const card: GiftCardData = { amount, note, from };
  const ready = tidyAmount(amount) !== "";

  function touch() {
    setSaved(false);
    setError(null);
  }

  function onRemember() {
    if (!ready) {
      setError("Add an amount first.");
      return;
    }
    rememberGiftLink(card);
    setSaved(true);
  }

  return (
    <div className="grid gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRemember();
        }}
        noValidate
        className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Make a shareable gift</h2>
            <p className="mt-1 text-sm text-muted-foreground">One link, one card, the note folded inside it.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
            <Share2 className="size-3.5" aria-hidden="true" />
            Link demo
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="link-amount">Amount</Label>
            <div className="relative">
              <Input
                id="link-amount"
                name="link-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  touch();
                }}
                className="h-11 pr-12 text-base tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">G$</span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="link-note">Note</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{note.length}/80</span>
            </div>
            <Input
              id="link-note"
              name="link-note"
              maxLength={80}
              placeholder="What is this for?"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                touch();
              }}
              className="h-11"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {NOTE_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setNote(idea);
                    touch();
                  }}
                  aria-pressed={note === idea}
                  className={
                    "h-8 rounded-full border px-3 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 " +
                    (note === idea ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")
                  }
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="link-from">From (optional)</Label>
            <Input
              id="link-from"
              name="link-from"
              maxLength={30}
              placeholder="Your name or @handle"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                touch();
              }}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">It sits on the card, so they know who to thank.</p>
          </div>

          <GiftLinkActions card={card} />

          <Button type="button" variant="outline" onClick={onRemember} className="rounded-xl">
            <BookmarkPlus className="size-4" aria-hidden="true" />
            Keep this link on my device
          </Button>

          {saved && (
            <Notice tone="success" title="Link kept">
              Find it on the Activity page under gift links. Nothing has been sent or paid yet.
            </Notice>
          )}
          {error && (
            <Notice tone="danger" title="Nothing made">
              {error}
            </Notice>
          )}

          <Notice tone="info">
            The card travels inside the link, so there is no server and no sign-in. Real G$ still waits for the next milestone.
          </Notice>
        </div>
      </form>

      <GiftCardView amount={amount} note={note} from={from} />
    </div>
  );
}
