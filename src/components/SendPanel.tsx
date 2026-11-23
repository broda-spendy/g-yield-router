import { useState } from "react";
import { ArrowRight, Sparkles, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { Skeleton } from "./ui/skeleton";
import { ConnectButton } from "./ConnectButton";
import { GiftCard } from "./GiftCard";
import { addDemoGift, looksLikeAddress, showAmount } from "../lib/gifts";
import { useWallet } from "../lib/useWallet";
import { useGdBalance } from "../lib/goodbuild/gooddollar";
import { shortAddress } from "../lib/utils";

const QUICK = ["10", "25", "50", "100"];
const NOTE_MAX = 80;

/**
 * The demo send form. Everything is local: it validates the input, saves the gift to this device
 * and says plainly that no G$ leaves the wallet in this milestone.
 */
export function SendPanel() {
  const { account, networkName, onRightNetwork, wrongNetwork, switchNetwork } = useWallet();
  const gd = useGdBalance();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ amount: string; note: string } | null>(null);

  const label = "Send " + showAmount(amount.trim() || "10") + " G$";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(null);
    const to = recipient.trim();
    const value = amount.trim();
    if (!to) return setError("Add a recipient address.");
    if (!looksLikeAddress(to)) return setError("That doesn't look like a wallet address.");
    if (!value || !(Number.parseFloat(value) > 0)) return setError("Enter an amount to send.");
    setError(null);
    addDemoGift({ amount: value, recipient: to, note: note.trim() });
    setSent({ amount: value, note: note.trim() });
    setAmount("");
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Compose a gift</h2>
            <p className="mt-1 text-sm text-muted-foreground">Any amount, any wallet, one short note.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Local demo
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-background px-3 py-2.5">
          {account ? (
            <>
              <Wallet className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono text-xs leading-tight">{shortAddress(account)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {onRightNetwork ? "On " + networkName : wrongNetwork ? "Wallet is on another network" : "Checking network…"}
                  {gd.available && onRightNetwork ? " · " + (gd.loading && !gd.formatted ? "loading G$…" : (gd.formatted ?? "0") + " G$ available") : ""}
                </p>
              </div>
              {wrongNetwork ? (
                <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={switchNetwork}>
                  Switch to {networkName}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setRecipient(account)}
                  aria-label="Use my own wallet address as the recipient"
                >
                  Use mine
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs leading-snug text-muted-foreground">Connect a wallet to see your G$ here.</p>
              <div className="ml-auto">
                <ConnectButton />
              </div>
            </>
          )}
        </div>

        {account && gd.loading && !gd.formatted && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-24" />
            reading your G$ balance
          </div>
        )}

        {account && gd.error && (
          <Notice tone="danger" className="mt-3">
            {gd.error}
          </Notice>
        )}

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              name="recipient"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x… G$ wallet address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="h-11 font-mono text-[13px]"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pr-12 text-base tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">G$</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  aria-pressed={amount === q}
                  className={
                    "h-9 rounded-full border px-3.5 text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 " +
                    (amount === q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")
                  }
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="note">Note</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {note.length}/{NOTE_MAX}
              </span>
            </div>
            <Input
              id="note"
              name="note"
              maxLength={NOTE_MAX}
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
            />
          </div>

          <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base">
            {label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>

          {error && (
            <Notice tone="danger" title="Nothing sent">
              {error}
            </Notice>
          )}

          {sent && (
            <Notice tone="success" title="Demo gift recorded">
              {showAmount(sent.amount)} G$ {sent.note ? "for “" + sent.note + "” " : ""}is saved on this device. G$ transfers turn on soon.
            </Notice>
          )}

          <Notice tone="info">
            Demo mode: nothing leaves your wallet yet. Gifts made here are saved on this device only.
          </Notice>
        </div>
      </form>

      <GiftCard amount={amount} recipient={recipient} note={note} />
    </div>
  );
}
