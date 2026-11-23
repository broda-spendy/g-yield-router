import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Loader2, Trash2 } from "lucide-react";
import { GiftRow } from "../components/GiftCard";
import { GiftLinkRow } from "../components/GiftLinkRow";
import { WalletCard } from "../components/WalletCard";
import { DeployNotice } from "../components/DeployNotice";
import { ConnectButton } from "../components/ConnectButton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Notice } from "../components/ui/notice";
import { Skeleton } from "../components/ui/skeleton";
import { RefreshButton } from "../components/ui/refresh-button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { showAmount, timeAgo, totalAmount, useDemoGifts } from "../lib/gifts";
import { useSavedGiftLinks } from "../lib/giftLinks";
import { useTx } from "../lib/hooks";
import { SenteCardsAbi } from "../contracts/SenteCards";
import { writeContract } from "../lib/chain";
import { cardsAddress, giftsAddress, showGd, useGdToken, useMyCards, useMyGifts } from "../lib/senteChain";
import { useWallet } from "../lib/useWallet";
import { shortAddress } from "../lib/utils";

export default function Activity() {
  const { account, networkName } = useWallet();
  const { decimals } = useGdToken();
  const myGifts = useMyGifts(account ?? undefined);
  const myCards = useMyCards(account ?? undefined);
  const { gifts, clear } = useDemoGifts();
  const { links } = useSavedGiftLinks();
  const [confirming, setConfirming] = useState(false);
  const reclaimTx = useTx();

  async function onReclaim(id: `0x${string}`) {
    if (!cardsAddress) return;
    await reclaimTx.run(() => writeContract({ address: cardsAddress, abi: SenteCardsAbi, functionName: "reclaim", args: [id] }));
  }

  useEffect(() => {
    document.title = "Gifts you've sent · Sente";
  }, []);

  const sentTotal = myGifts.gifts.reduce((sum, g) => sum + g.amount, BigInt(0));

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {giftsAddress ? "On Celo" : "Not deployed"}
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Gifts you've sent</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Gifts and funded cards from this wallet, read from Celo. Demo drafts saved in this browser sit at the bottom.
          </p>
        </div>
        {myGifts.gifts.length > 0 && <RefreshButton read={myGifts} />}
      </div>

      {!giftsAddress ? (
        <DeployNotice className="mt-6" />
      ) : !account ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Connect a wallet to see what you've sent and funded on {networkName}.</p>
          <div className="mt-3">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Gifts sent</p>
              {myGifts.loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{myGifts.gifts.length}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total sent</p>
              {myGifts.loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{showGd(sentTotal, decimals)} G$</p>}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold tracking-tight">On chain</h2>
            {myGifts.error ? (
              <Notice tone="danger" className="mt-3" title="Couldn't read your gifts">
                {myGifts.error}
              </Notice>
            ) : myGifts.loading ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-5">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myGifts.gifts.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
                <p className="font-display text-lg font-semibold">Nothing sent from this wallet yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">A gift carries its note with it, so it reads like a card, not a receipt.</p>
                <Link to="/" className="mt-4 inline-flex">
                  <Button className="rounded-xl">Send your first G$</Button>
                </Link>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-border bg-card px-5 shadow-sm">
                <ul className="divide-y divide-border">
                  {myGifts.gifts.map((g, i) => (
                    <li key={g.from + g.to + g.at + i} className="flex items-start gap-4 py-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 font-display text-sm font-semibold text-accent">G$</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold tabular-nums leading-tight">{showGd(g.amount, decimals)} G$</p>
                        <p className="truncate text-sm text-foreground/80">{g.note || "No note"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">To {shortAddress(g.to)}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(g.at * 1000)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Cards you funded</h2>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">Each card is locked on Celo until someone opens its link.</p>
              </div>
              {cardsAddress && <RefreshButton read={myCards} />}
            </div>
            {reclaimTx.error && (
              <Notice tone="danger" className="mt-3" title="Nothing returned">
                {reclaimTx.error}
              </Notice>
            )}
            {reclaimTx.receipt && (
              <Notice tone="success" className="mt-3" title="Card taken back">
                The unclaimed G$ is on its way back to your wallet.
              </Notice>
            )}
            {!cardsAddress ? (
              <DeployNotice className="mt-3" />
            ) : myCards.error ? (
              <Notice tone="danger" className="mt-3" title="Couldn't read your cards">
                {myCards.error}
              </Notice>
            ) : myCards.loading ? (
              <Skeleton className="mt-3 h-16 w-full rounded-2xl" />
            ) : myCards.cards.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center">
                <p className="font-display text-lg font-semibold">No cards funded yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">A card is G$ set aside for whoever opens your link.</p>
                <Link to="/gift" className="mt-4 inline-flex">
                  <Button variant="outline" className="rounded-xl">
                    Make a gift card
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-border bg-card px-5 shadow-sm">
                <ul className="divide-y divide-border">
                  {myCards.cards.map((c) => {
                    const expired = c.expiry * 1000 < Date.now();
                    return (
                      <li key={c.id} className="flex items-start gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg font-semibold tabular-nums leading-tight">{showGd(c.amount, decimals)} G$</p>
                          <p className="truncate text-sm text-foreground/80">{c.note || "No note"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.claimed ? "Claimed" : expired ? "Expired" : "Waiting to be claimed"} · until{" "}
                            {new Date(c.expiry * 1000).toLocaleDateString()}
                          </p>
                          {expired && !c.claimed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 rounded-xl"
                              onClick={() => onReclaim(c.id)}
                              disabled={reclaimTx.pending}
                            >
                              {reclaimTx.pending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                              Take it back
                            </Button>
                          )}
                        </div>
                        <Badge tone={c.claimed ? "success" : expired ? "warning" : "default"}>
                          {c.claimed ? "Claimed" : expired ? "Expired" : "Claimable"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">Demo, saved on this device</h2>
              <Badge tone="warning">Demo</Badge>
            </div>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              {gifts.length} draft{gifts.length === 1 ? "" : "s"} written here, worth {showAmount(String(totalAmount(gifts)))} G$. No G$ moved.
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
                  <DialogDescription>This forgets all {gifts.length} demo gifts on this device. It can't be undone.</DialogDescription>
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

        {gifts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Leaf className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold">No demo gifts yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Compose one and it will be listed here with its note.</p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card px-5 shadow-sm">
            <ul className="divide-y divide-border">
              {gifts.map((g) => (
                <GiftRow key={g.id} gift={g} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Links you've kept</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">Cards you packed into a link, saved here so you can find them again.</p>
          </div>
          <Link to="/gift">
            <Button variant="outline" className="rounded-xl">
              Make a gift card
            </Button>
          </Link>
        </div>
        {links.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">No links kept yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              A gift link carries an amount, a note and the secret that claims it.
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
    </div>
  );
}
