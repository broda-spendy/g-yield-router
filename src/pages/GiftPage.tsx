import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Leaf, Loader2, Lock, Send } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Notice } from "../components/ui/notice";
import { Skeleton } from "../components/ui/skeleton";
import { ConnectButton } from "../components/ConnectButton";
import { DeployNotice } from "../components/DeployNotice";
import { GiftCardView } from "../components/GiftCardView";
import { SenteCardsAbi } from "../contracts/SenteCards";
import { copyText, decodeCard, giftUrl } from "../lib/giftLinks";
import { useTx } from "../lib/hooks";
import { cardsAddress, cardExists, showGd, useCard, useGdToken } from "../lib/senteChain";
import { writeContract } from "../lib/chain";
import { useWallet } from "../lib/useWallet";
import { shortAddress } from "../lib/utils";
import { showAmount } from "../lib/gifts";

/** The page a recipient opens from a shared link: the card as read from the chain, and the claim. */
export default function GiftPage() {
  const { code = "" } = useParams();
  const card = useMemo(() => decodeCard(code), [code]);
  const onChainId = card?.cardId;
  const { account, networkName, onRightNetwork, wrongNetwork, switchNetwork } = useWallet();
  const { decimals } = useGdToken();
  const info = useCard(onChainId);
  const tx = useTx();
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState<bigint | null>(null);

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

  const funded = !!card.cardId && !!card.cardCode;
  const live = funded ? info.card : undefined;
  const exists = funded && cardExists(live);
  const expired = !!live && live.expiry * 1000 < Date.now();
  const taken = !!live && (live.claimed || claimed !== null);
  const link = giftUrl(card);
  const amountText = live ? showGd(live.amount, decimals) : card.amount;

  async function onCopy() {
    if (await copyText(link)) setCopied(true);
  }

  async function onClaim() {
    if (!card?.cardId || !card.cardCode || !cardsAddress) return;
    const receipt = await tx.run(() =>
      writeContract({
        address: cardsAddress,
        abi: SenteCardsAbi,
        functionName: "claimCard",
        args: [card.cardId as `0x${string}`, card.cardCode as `0x${string}`],
      }),
    );
    if (receipt && live) setClaimed(live.amount);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 leaf-wash" aria-hidden="true" />
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">A gift, waiting</Badge>
          {funded ? <Badge>Funded on Celo</Badge> : <Badge tone="warning">Preview only</Badge>}
        </div>
        <h1 className="mt-4 max-w-[24ch] font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Somebody set aside {amountText} G$ for you.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          {funded
            ? "Read the note, then claim it into your own wallet. The G$ is already locked on Celo and only this link can open it."
            : "This is a preview card. The sender hasn't put G$ behind it yet, so nothing can be claimed."}
        </p>

        <div className="mt-7">
          <GiftCardView amount={amountText} displayAmount={amountText} note={live?.note || card.note} from={card.from} sealed />
        </div>

        {funded && live?.sender && (
          <p className="mt-2 text-xs text-muted-foreground">Locked by {shortAddress(live.sender)}</p>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Claim it</h2>
              <p className="mt-1 text-sm text-muted-foreground">The G$ lands in your own wallet, not ours.</p>
            </div>
            <Lock className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
          </div>

          {!funded ? (
            <Notice tone="warning" className="mt-4" title="Nothing to claim yet">
              This link is a preview: no G$ is locked behind it. Ask the sender for a funded card, or make one of your own.
            </Notice>
          ) : !cardsAddress ? (
            <DeployNotice className="mt-4" />
          ) : info.error ? (
            <Notice tone="danger" className="mt-4" title="Couldn't read this card">
              {info.error}
            </Notice>
          ) : info.loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : !exists ? (
            <Notice tone="warning" className="mt-4" title="This card isn't on chain">
              The link looks complete, but no card with this id exists on Celo. It may have been made on another network.
            </Notice>
          ) : claimed !== null || live?.claimed ? (
            <Notice tone="success" className="mt-4" title="Claimed">
              {showGd(claimed ?? live?.amount, decimals)} G$ went to your wallet. If someone else claimed it first, they got there a moment
              earlier: each link works once.
            </Notice>
          ) : expired ? (
            <Notice tone="warning" className="mt-4" title="This card has expired">
              It can no longer be claimed. The sender can take the G$ back from their activity page.
            </Notice>
          ) : (
            <>
              {!account ? (
                <div className="mt-4 grid gap-2">
                  <p className="text-sm text-muted-foreground">Connect a wallet on {networkName} to claim it.</p>
                  <ConnectButton />
                </div>
              ) : wrongNetwork ? (
                <div className="mt-4 grid gap-2">
                  <p className="text-sm text-muted-foreground">Your wallet is on another network. Switch to {networkName} to claim.</p>
                  <Button variant="outline" onClick={switchNetwork} className="rounded-xl">
                    Switch to {networkName}
                  </Button>
                </div>
              ) : (
                <Button size="lg" onClick={onClaim} disabled={tx.pending || !onRightNetwork} className="mt-4 h-12 w-full rounded-xl text-base">
                  {tx.pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Claiming…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" aria-hidden="true" />
                      Claim {showGd(live?.amount, decimals)} G$
                    </>
                  )}
                </Button>
              )}
              {tx.error && (
                <Notice tone="danger" className="mt-3" title="Nothing claimed">
                  {tx.error}
                </Notice>
              )}
              {live && live.expiry > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Claimable until {new Date(live.expiry * 1000).toLocaleDateString()}
                </p>
              )}
            </>
          )}

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
          The claim secret travels inside the link, so treat it like cash: anyone holding the link can claim the card. Sente never touches
          the G$ itself, the contract pays it straight to whoever claims.
        </p>
      </div>
    </div>
  );
}
