import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid w-full max-w-xl place-items-center px-5 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <Leaf className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">This page slipped out of the envelope</h1>
      <p className="mt-2 text-sm text-muted-foreground">The link you followed doesn't exist here. The send screen is still one tap away.</p>
      <Link to="/" className="mt-6">
        <Button size="lg" className="rounded-xl">
          Back to the send screen
        </Button>
      </Link>
    </div>
  );
}
