import { Logo } from "./Logo";
import { Link } from "@tanstack/react-router";
import { openCookieSettings } from "@/components/CookieBanner";

const productLinks = [
  { to: "/funkce", label: "Funkce" },
  { to: "/cenik", label: "Ceník" },
  { to: "/akce", label: "Akce do 1. 6." },
  { to: "/nase-sliby", label: "Naše sliby" },
  { to: "/srovnani", label: "Srovnání" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-soft">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Moderní česká fakturace pro OSVČ a firmy. Postaveno s ❤ v Praze.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Produkt</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {productLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Společnost</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">O nás</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-foreground">Kontakt</a></li>
              <li><a href="#" className="hover:text-foreground">Kariéra</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Právní</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/podminky" className="hover:text-foreground">
                  Obchodní podmínky
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="hover:text-foreground">
                  Ochrana soukromí
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="hover:text-foreground"
                >
                  Nastavení cookies
                </button>
              </li>
              <li>
                <Link to="/gdpr" className="hover:text-foreground">
                  GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Vystaveno.cz. Všechna práva vyhrazena.
          </p>
          <p className="text-xs text-muted-foreground">IČO: 24991686 · Neplátce DPH</p>
        </div>
      </div>
    </footer>
  );
}
