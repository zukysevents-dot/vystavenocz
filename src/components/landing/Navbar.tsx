import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { to: "/funkce", label: "Funkce" },
  { to: "/srovnani", label: "Srovnání" },
  { to: "/cenik", label: "Ceník" },
  { to: "/clanky", label: "Články" },
  { to: "/akce", label: "Akce" },
  { to: "/nase-sliby", label: "Naše sliby" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle size="sm" />
          <Button variant="ghost" size="sm" asChild>
            <a href="/prihlaseni">Přihlásit se</a>
          </Button>
          <Button variant="coral" size="sm" asChild>
            <a href="/registrace">Vyzkoušet zdarma</a>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle size="sm" />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" asChild>
                <a href="/prihlaseni">Přihlásit se</a>
              </Button>
              <Button variant="coral" size="sm" asChild>
                <a href="/registrace">Vyzkoušet zdarma</a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
