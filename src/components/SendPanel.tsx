import { useState } from "react";
import { ArrowRight, Loader2, Sparkles, Wallet } from "lucide-react";
import { erc20Abi, type Address } from "viem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { Skeleton } from "./ui/skeleton";
import { ConnectButton } from "./ConnectButton";
import { DeployNotice } from "./DeployNotice";
import { GiftCard } from "./GiftCard";
import { addDemoGift, looksLikeAddress, showAmount } from "../lib/gifts";
import { SenteGiftsAbi } from "../contracts/SenteGifts";
import { writeContract } from "../lib/chain";
import { errorMessage } from "../lib/format";
import { useTx, useRead } from "../lib/hooks";
import { giftsAddress, readAllowance, toUnits, useGdToken } from "../lib/senteChain";
import { useWallet } from "../lib/useWallet";
import { useGdBalance } from "../lib/goodbuild/gooddollar";
import { shortAddress } from "../lib/utils";

const QUICK = ["10", "25", "50", "100"];
const NOTE_MAX = 80;

/**
 * The send form. With the contract deployed and a wallet connected it moves real G$ to the recipient
 * in two signed steps (approve, then sendGift, which forwards straight to their wallet). Without a
 * contract it records the gift on this device and says so.
 */
export function SendPanel() {
  const { account, networkName, onRightNetwork, wrongNetwork, switchNetwork } = useWallet();
  const gd = useGdBalance();
  const { token, decimals } = useGdToken();
  const approveTx = useTx();
  const sendTx = useTx();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ amount: string; note: string; onChain: boolean } | null>(null);

  const pending = approveTx.pending || sendTx.pending;
  const shown = showAmount(amount.trim() || "10");
  const label = "Send " + shown + " G$";

  const allowance = useRead(
    () => readAllowance(token!, account as Address, giftsAddress!),
    [token, account, giftsAddress],
    !!token && !!account && !!giftsAddress,
  );

  const ready = !!giftsAddress && !!account && onRightNetwork && !!token;

  async function sendOnChain(to: Address, units: bigint, words: string) {
    if (allowance.data === undefined || allowance.data < units) {
      const ok = await approveTx.run(() =>
        writeContract({ address: token!, abi: erc20Abi, functionName: "approve", args: [giftsAddress!, units] }),
      );
      if (!ok) return false;
    }
    const done = await sendTx.run(() =>
      writeContract({ address: giftsAddress!, abi: SenteGiftsAbi, functionName: "sendGift", args: [to, units, words] }),
    );
    return !!done;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(null);
    setError(null);
    const to = recipient.trim();
    const value = amount.trim();
    const words = note.trim();
    if (!to) return setError("Add a recipient address.");
    if (!looksLikeAddress(to)) return setError("That doesn't look like a wallet address.");
    if (!value || !(Number.parseFloat(value) > 0)) return setError("Enter an amount to send.");
    const units = toUnits(value, decimals);
    if (!units) return setError("Enter an amount to send.");

    if (!ready) {
      addDemoGift({ amount: value, recipient: to, note: words });
      setSent({ amount: value, note: words, onChain: false });
      setAmount("");
      return;
    }
    if (gd.balance !== null && gd.balance < units) {
      return setError("That's more G$ than this wallet holds. Top up or send a smaller gift.");
    }
    approveTx.reset();
    sendTx.reset();
    if (await sendOnChain(to as Address, units, words)) {
      setSent({ amount: value, note: words, onChain: true });
      setAmount("");
      setNote("");
    }
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
            {giftsAddress ? "On Celo" : "Local draft"}
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
                  aria-label="Fill the form with my own wallet address"
                >
                  Use mine
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs leading-snug text-muted-foreground">Connect a wallet to send real G$.</p>
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

        {!giftsAddress && <DeployNotice className="mt-4" />}

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

          <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-xl text-base">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>
                {label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>

          {error && (
            <Notice tone="danger" title="Nothing sent">
              {error}
            </Notice>
          )}
          {(approveTx.error || sendTx.error) && (
            <Notice tone="danger" title="Nothing sent">
              {approveTx.error ?? sendTx.error}
            </Notice>
          )}

          {sent?.onChain && (
            <Notice tone="success" title="Gift sent">
              {showAmount(sent.amount)} G$ went straight to {shortAddress(recipient)} on Celo
              {sent.note ? " with the note “" + sent.note + "”" : ""}. It's in the on-chain list below.
            </Notice>
          )}
          {sent && !sent.onChain && (
            <Notice tone="success" title="Demo gift recorded">
              {showAmount(sent.amount)} G$ {sent.note ? "for “" + sent.note + "” " : ""}is saved on this device only, because the gift contract isn't live here yet.
            </Notice>
          )}

          {!ready && (
            <Notice tone="info">
              {giftsAddress
                ? "Connect a wallet on " + networkName + " to send real G$. Until then your gift is kept on this device."
                : "Gifts live on Celo. Deploy the contract from this project to switch real sending on."}
            </Notice>
          )}
        </div>
      </form>

      <GiftCard amount={amount} recipient={recipient} note={note} />
    </div>
  );
}

/** Kept for the error text of a refused write elsewhere. */
export function sendErrorText(e: unknown) {
  return errorMessage(e);
}
