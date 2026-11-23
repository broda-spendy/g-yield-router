import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Link2, PenLine, Send, UserRoundCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { SendPanel } from "../components/SendPanel";
import { WalletCard } from "../components/WalletCard";
import { ChainGiftsCard } from "../components/ChainGiftsCard";
import { GiftRow } from "../components/GiftCard";
import { Badge } from "../components/ui/badge";
import { showAmount, totalAmount, useDemoGifts } from "../lib/gifts";
import { useWallet } from "../lib/useWallet";

const steps = [
  { icon: UserRoundCheck, title: "Pick a recipient", body: "Paste any Celo wallet address. No usernames, no sign-up." },
  { icon: PenLine, title: "Write a note", body: "A few words so the money carries a reason with it." },
  { icon: Send, title: "Sign once", body: "Your wallet sends the G$ straight to theirs, with the note recorded on Celo." },
];

export default function Home() {
  const { gifts } = useDemoGifts();
  const { account, networkName } = useWallet();

  useEffect(() => {
    document.title = "Sente · Send G$ like a gift";
  }, []);

  const recent = gifts.slice(0, 2);

  return (
    <div>
      {/* Hero: words one side, the real form the other */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -left-24 top-[-6rem] size-[26rem] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12 lg:pb-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              GoodDollar on Celo
            </span>
            <h1 className="mt-5 max-w-[18ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Send G$ like a gift, not a transaction.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Sente passes a little GoodDollar to any wallet with a short note attached, so a transfer arrives looking like something
              someone meant.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone={account ? "success" : "default"}>{account ? "Wallet connected" : "Wallet ready to connect"}</Badge>
              <Badge>Live on {networkName}</Badge>
              <Badge tone="success">G$ moves on chain</Badge>
            </div>

            <dl className="mt-9 grid max-w-md grid-cols-2 gap-4 border-t border-border pt-6">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Demo gifts</dt>
                <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{gifts.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total written</dt>
                <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">
                  {showAmount(String(totalAmount(gifts)))}
                  <span className="ml-1 text-base font-normal text-muted-foreground">G$</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-4 lg:-mt-2">
            <SendPanel />
            <WalletCard />
          </div>
        </div>
      </section>

      {/* Gift links: the shareable side of the app */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Link2 className="size-3.5" aria-hidden="true" />
              New: gift links
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">No address to hand? Send the card itself.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Set G$ aside on Celo behind one link, drop it in a chat, and the person opens the card and claims it into their own wallet.
            </p>
          </div>
          <Link to="/gift" className="shrink-0">
            <Button size="lg" className="h-12 rounded-xl text-base">
              Make a gift card
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-md font-display text-2xl font-semibold tracking-tight sm:text-3xl">Three steps, no ceremony.</h2>
            <p className="max-w-sm text-sm text-primary-foreground/70">Built for people who send money home, not for people who read whitepapers.</p>
          </div>
          <ol className="mt-9 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t border-primary-foreground/20 pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/10">
                    <s.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-display text-sm tabular-nums text-primary-foreground/60">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-primary-foreground/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* On chain: the public strip of real gifts */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Gifts on chain</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Each gift is recorded by the Sente contract with its note, so the person receiving it can look it up on Celo.
            </p>
            <Link to="/activity" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              See everything you've sent
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ChainGiftsCard limit={3} />
        </div>
      </section>

      {/* Local demo drafts */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Your practice cards</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Gifts you wrote while the contract was still being deployed stay in this browser. They are drafts, not payments.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-5 shadow-sm">
            {recent.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-display text-lg font-semibold">No drafts yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Compose one above and it will appear here, note and all.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((g) => (
                  <GiftRow key={g.id} gift={g} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
