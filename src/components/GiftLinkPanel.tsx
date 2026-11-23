import { useState } from "react";
import { Check, Copy, Loader2, Share2, ShieldCheck, Wallet } from "lucide-react";
import { erc20Abi, keccak256, type Address, type Hex } from "viem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { Skeleton } from "./ui/skeleton";
import { ConnectButton } from "./ConnectButton";
import { DeployNotice } from "./DeployNotice";
import { GiftCardView } from "./GiftCardView";
import { SenteCardsAbi } from "../contracts/SenteCards";
import { publicClient, writeContract } from "../lib/chain";
import { copyText, giftUrl, rememberGiftLink, tidyAmount, type GiftCardData } from "../lib/giftLinks";
import { useRead, useTx } from "../lib/hooks";
import { cardsAddress, randomSecret, readAllowance, toUnits, useGdToken } from "../lib/senteChain";
import { useWallet } from "../lib/useWallet";
import { useGdBalance } from "../lib/goodbuild/gooddollar";
import { shortAddress } from "../lib/utils";

const NOTE_IDEAS = ["Jollof money", "Thanks for the lift home", "Kola for the week", "Happy Sunday"];
const LIVES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/**
 * Fund a real gift card: the G$ is locked in SenteCards behind a secret that only the link carries.
 * The recipient opens the link and claims it; the sender can take it back once it expires.
 */
export function GiftLinkPanel() {
  const { account, networkName, onRightNetwork, wrongNetwork, switchNetwork } = useWallet();
  const gd = useGdBalance();
  const { token, decimals } = useGdToken();
  const approveTx = useTx();
  const fundTx = useTx();
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("Jollof money");
  const [from, setFrom] = useState("");
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [funded, setFunded] = useState<{ card: GiftCardData; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const card: GiftCardData = { amount, note, from };
  const units = toUnits(amount, decimals);
  const pending = approveTx.pending || fundTx.pending;
  const ready = !!cardsAddress && !!account && onRightNetwork && !!token;
  const label = units ? "Fund this card · " + tidyAmount(amount) + " G$" : "Fund this card";

  const allowance = useRead(
    () => readAllowance(token!, account as Address, cardsAddress!),
    [token, account, cardsAddress],
    !!token && !!account && !!cardsAddress,
  );

  function touch() {
    setFunded(null);
    setError(null);
  }

  async function onFund() {
    setError(null);
    setFunded(null);
    if (!units) return setError("Add an amount to put on the card.");
    if (!account) return setError("Connect a wallet first, so the G$ can come from it.");
    if (wrongNetwork) return setError("Switch your wallet to " + networkName + " first.");
    if (!cardsAddress || !token) return setError("The gift card contract isn't deployed yet.");

    const id: Hex = randomSecret();
    const code: Hex = randomSecret();
    const codeHash = keccak256(code);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
    const words = note.trim().slice(0, 80);
    const who = from.trim().slice(0, 30);

    approveTx.reset();
    fundTx.reset();
    if (allowance.data === undefined || allowance.data < units) {
      const ok = await approveTx.run(() =>
        writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [cardsAddress, units] }),
      );
      if (!ok) return;
    }
    const done = await fundTx.run(() =>
      writeContract({
        address: cardsAddress,
        abi: SenteCardsAbi,
        functionName: "fundCard",
        args: [id, units, expiry, words, codeHash],
      }),
    );
    if (!done) return;

    const made: GiftCardData = { amount: tidyAmount(amount), note: words, from: who, cardId: id, cardCode: code };
    rememberGiftLink(made);
    setFunded({ card: made, link: giftUrl(made) });
  }

  async function onCopy() {
    if (!funded) return;
    setCopied(await copyText(funded.link));
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function onShare() {
    if (!funded) return;
    try {
      await navigator.share({ title: "A G$ gift for you", text: funded.card.note || "A little GoodDollar", url: funded.link });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Fund a gift card</h2>
            <p className="mt-1 text-sm text-muted-foreground">The G$ is held on Celo until someone opens the link.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Real G$
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
              {wrongNetwork && (
                <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={switchNetwork}>
                  Switch to {networkName}
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs leading-snug text-muted-foreground">Connect a wallet to fund a card.</p>
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
        {!cardsAddress && <DeployNotice className="mt-4" />}

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

          <div className="grid gap-1.5">
            <Label id="live-for">Keep it claimable for</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="live-for">
              {LIVES.map((l) => (
                <button
                  key={l.days}
                  type="button"
                  onClick={() => {
                    setDays(l.days);
                    touch();
                  }}
                  aria-pressed={days === l.days}
                  className={
                    "h-9 rounded-full border px-3.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 " +
                    (days === l.days ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">After that, you can take an unclaimed card back.</p>
          </div>

          <Button type="button" onClick={onFund} disabled={pending || !cardsAddress} size="lg" className="h-12 w-full rounded-xl text-base">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Funding…
              </>
            ) : (
              label
            )}
          </Button>

          {!account && !error && (
            <Notice tone="info">Connect a wallet on {networkName} and the card is funded from it in one signature.</Notice>
          )}
          {error && (
            <Notice tone="danger" title="Nothing funded">
              {error}
            </Notice>
          )}
          {(approveTx.error || fundTx.error) && (
            <Notice tone="danger" title="Nothing funded">
              {approveTx.error ?? fundTx.error}
            </Notice>
          )}

          {funded && (
            <div className="grid gap-3">
              <Notice tone="success" title="Card funded">
                {funded.card.amount} G$ is locked on Celo behind this link. Only whoever opens it can claim it.
              </Notice>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Your gift link</p>
                <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground/80" data-testid="gift-link">
                  {funded.link}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onCopy} className="rounded-xl">
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                {canShare && (
                  <Button type="button" variant="outline" onClick={onShare} className="rounded-xl">
                    <Share2 className="size-4" aria-hidden="true" />
                    Share
                  </Button>
                )}
              </div>
              <Notice tone="warning" title="Anyone with the link can claim it">
                The secret travels inside the link, so treat it like cash. It works once, and you can take it back after {days} days if
                nobody claims it.
              </Notice>
            </div>
          )}

          {!ready && cardsAddress && (
            <Notice tone="info">The card is funded by your own wallet. Connect on {networkName} to make one.</Notice>
          )}
          {!cardsAddress && (
            <Notice tone="info">Preview only for now: the card above is drawn exactly as the recipient will see it.</Notice>
          )}
        </div>
      </div>

      <GiftCardView amount={amount} note={note} from={from} />
    </div>
  );
}
