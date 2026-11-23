import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { cn } from "../lib/utils";
import { ConnectButton } from "./ConnectButton";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/gift", label: "Gift link", end: true },
  { to: "/activity", label: "Activity", end: false },
  { to: "/about", label: "About", end: false },
];

/** The app mark: a leaf on a forest square. */
export function AppMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground", className)}>
      <Leaf className="size-5" aria-hidden="true" />
    </span>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/" className="order-1 flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40" aria-label="Sente, home">
            <AppMark />
            <span className="font-display text-xl font-semibold tracking-tight">Sente</span>
          </Link>

          <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
            <ConnectButton />
          </div>

          {/* One nav for every screen: it wraps under the logo on a phone, sits inline from md up. */}
          <nav className="order-3 flex w-full items-center gap-1 md:order-2 md:ml-5 md:w-auto" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={(s) => cn(navClass(s), "flex-1 text-center md:flex-none md:text-left")}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm">Sente passes a little GoodDollar (G$) to any wallet on Celo, with a note attached.</p>
          <nav className="flex items-center gap-5" aria-label="Footer">
            <Link to="/gift" className="hover:text-foreground">
              Gift links
            </Link>
            <Link to="/activity" className="hover:text-foreground">
              Activity
            </Link>
            <Link to="/about" className="hover:text-foreground">
              How G$ works
            </Link>
            <span className="text-xs">On Celo</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
