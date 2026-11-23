import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Link2, PenLine, Share2 } from "lucide-react";
import { GiftLinkPanel } from "../components/GiftLinkPanel";
import { GiftLinkRow } from "../components/GiftLinkRow";
import { Button } from "../components/ui/button";
import { useSavedGiftLinks } from "../lib/giftLinks";

const steps = [
  { icon: PenLine, title: "Fill the card", body: "An amount, a note, and your name if you want them to know." },
  { icon: Link2, title: "Copy the link", body: "The whole card is packed into the link, so it works in any chat app." },
  { icon: Share2, title: "They open it", body: "The recipient sees the card on their own phone, note and all." },
];

/** The share screen: build a card, get a link, keep the link on this device. */
export default function GiftLink() {
  const { links } = useSavedGiftLinks();
  const recent = links.slice(0, 3);

  useEffect(() => {
    document.title = "Make a gift link · Sente";
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -left-24 top-[-6rem] size-[26rem] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-12 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12 lg:pb-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Gift links
            </span>
            <h1 className="mt-5 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              A card they can open, not a form they must fill.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Compose a G$ gift here and Sente packs it into a link. Send the link in a chat, and the person on the other side opens the
              card with your note on it.
            </p>

            <ol className="mt-8 grid gap-4 border-t border-border pt-6 sm:max-w-md">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <s.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold leading-tight">
                      <span className="mr-1.5 tabular-nums text-muted-foreground">0{i + 1}</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link to="/">
                <Button variant="outline" className="rounded-xl">
                  Send straight to an address instead
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:-mt-2">
            <GiftLinkPanel />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Links you've kept</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Only you see this list, on this device. It is a shortcut so you don't have to retype a card you already made.
              </p>
              <Link to="/activity" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                See the full activity
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-background px-5 shadow-sm">
              {recent.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-lg font-semibold">No links kept yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                    Make a card above and press "Keep this link on my device".
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((l) => (
                    <GiftLinkRow key={l.id} link={l} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
