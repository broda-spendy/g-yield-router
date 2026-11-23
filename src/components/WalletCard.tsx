import { Check, Copy, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { Skeleton } from "./ui/skeleton";
import { RefreshButton } from "./ui/refresh-button";
import { Badge } from "./ui/badge";
import { ConnectButton } from "./ConnectButton";
import { useWallet } from "../lib/useWallet";
import { useGdBalance } from "../lib/goodbuild/gooddollar";
import { shortAddress } from "../lib/utils";
import { copyText } from "../lib/giftLinks";

/**
 * The connected wallet, the network the app runs on, and the wallet's live G$ balance.
 * Reads only: nothing here ever moves a token.
 */
export function WalletCard() {
  const { account, walletName, networkName, onRightNetwork, wrongNetwork, switchNetwork, disconnect } = useWallet();
  const gd = useGdBalance();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!account) return;
    if (await copyText(account)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your wallet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Where your G$ sits, and which network you're on.</p>
        </div>
        <RefreshButton />
      </div>

      {!account ? (
        <div className="mt-4 grid gap-3">
          <Notice tone="info" title="No wallet connected">
            Connect a wallet to see your G$ balance on {networkName}. You can still write a demo gift below without one.
          </Notice>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm leading-tight">{shortAddress(account)}</p>
              <p className="text-xs text-muted-foreground">{walletName ? "via " + walletName : "Connected"}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onCopy} aria-label="Copy your wallet address" title="Copy address">
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} aria-label="Disconnect wallet" title="Disconnect">
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Network</span>
            {onRightNetwork ? (
              <Badge tone="success">{networkName}</Badge>
            ) : (
              <Badge tone="warning">{wrongNetwork ? "Wrong network" : networkName}</Badge>
            )}
          </div>

          {wrongNetwork && (
            <Notice tone="warning" title="Your wallet is on another network" action={<Button variant="outline" size="sm" onClick={switchNetwork}>Switch</Button>}>
              Sente only works on {networkName}. Switch the wallet to read your real G$ balance.
            </Notice>
          )}

          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">G$ balance</p>
            {!gd.available ? (
              <p className="mt-1 text-sm text-muted-foreground">There is no G$ on this network yet.</p>
            ) : gd.error ? (
              <Notice tone="danger" className="mt-2">
                {gd.error}
              </Notice>
            ) : gd.loading && !gd.formatted ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : (
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {gd.formatted ?? "0"}
                <span className="ml-1 text-base font-normal text-muted-foreground">G$</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
