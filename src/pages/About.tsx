import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, Coins, Sprout } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const status = [
  { icon: CheckCircle2, title: "Interface ready", body: "You can compose a gift with an address, an amount and a note.", tone: "success" as const, label: "Done" },
  { icon: Sprout, title: "Demo gifts on this device", body: "Gifts you write are saved in this browser so you can reread them.", tone: "success" as const, label: "Done" },
  {
    icon: CircleDashed,
    title: "Sending G$ goes live in the next milestone",
    body: "The transfer itself needs a contract and your signature. That comes next.",
    tone: "warning" as const,
    label: "Next",
  },
  { icon: Coins, title: "Built on Celo", body: "G$ lives on Celo, a low-fee network made for everyday money.", tone: "default" as const, label: "Always" },
];

const faqs = [
  {
    q: "What is GoodDollar?",
    a: "GoodDollar (G$) is a free-to-earn currency on Celo. People claim small amounts of it and use it for everyday things, which makes it a good fit for small, personal transfers.",
  },
  {
    q: "Do I need a wallet to try the demo?",
    a: "No. In this milestone everything stays on your device, so you can fill the form and see how a gift reads without connecting anything.",
  },
  {
    q: "Where do my demo gifts go?",
    a: "Into this browser's local storage, under the Activity page. They never leave the device, and clearing your browser data or pressing Clear demo gifts removes them.",
  },
  {
    q: "When will real G$ transfers work?",
    a: "In the next milestone. You will approve the G$ transfer from your own wallet, and the gift will show up on chain with its note.",
  },
];

export default function About() {
  useEffect(() => {
    document.title = "About G$ and Sente";
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 top-0 -z-10 size-[24rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            About Sente
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">What is G$?</h1>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              GoodDollar is a free-to-earn currency on Celo. It is meant for everyday amounts, the kind you send for lunch, transport or a
              small favour, and because it moves on a low-fee network it suits small transfers better than most tokens.
            </p>
            <p className="text-foreground">
              Sente is a way to pass a little of it on with a note attached, so the person receiving it knows the reason, not just the
              number.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-5xl gap-4 px-5 py-12 sm:grid-cols-2 sm:py-14">
          {status.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold leading-snug">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Questions people ask</h2>
        <Accordion type="single" defaultValue="what" className="mt-6">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={i === 0 ? "what" : "q" + i}>
              <AccordionTrigger className="text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="max-w-prose text-sm leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Write your first gift.</h2>
            <p className="mt-2 max-w-sm text-sm text-primary-foreground/70">A recipient, an amount, a note. That is the whole ritual.</p>
          </div>
          <Link to="/">
            <Button size="lg" variant="outline" className="rounded-xl border-primary-foreground/30 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              Back to the send screen
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
