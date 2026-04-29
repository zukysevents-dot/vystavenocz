import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Sparkles,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/landing/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InvoiceAssistant, type InvoiceContext } from "@/components/app/InvoiceAssistant";

const nav: { to: "/app" | "/app/faktury" | "/app/klienti" | "/app/predplatne" | "/app/nastaveni"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/app", label: "Přehled", icon: LayoutDashboard, exact: true },
  { to: "/app/faktury", label: "Faktury", icon: FileText },
  { to: "/app/klienti", label: "Klienti", icon: Users },
  { to: "/app/predplatne", label: "Předplatné", icon: CreditCard },
  { to: "/app/nastaveni", label: "Nastavení", icon: Settings },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Prázdný kontext — asistent v sidebaru funguje v general režimu (bez konkrétní faktury).
  const emptyContext: InvoiceContext = {
    invoice_number: "",
    client_name: "",
    vat_payer: false,
    issue_date: "",
    taxable_date: "",
    due_date: "",
    payment_method: "",
    variable_symbol: "",
    notes: "",
    template_color: "",
    available_clients: [],
    items: [],
  };

  // Zavřít mobilní menu při změně cesty
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navList = (
    <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
            onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );

  const footer = (
    <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="w-full rounded-lg bg-gradient-to-br from-primary-soft to-accent p-3 text-left text-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI asistent
          </div>
          <p className="mt-1 text-muted-foreground">Zeptej se na cokoli o fakturách a DPH</p>
        </button>

        <div className="mt-3 flex items-center gap-2 rounded-lg p-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 truncate">
            <div className="truncate text-xs font-medium">{user?.email}</div>
          </div>
          <ThemeToggle size="sm" />
          <Button variant="ghost" size="icon" onClick={signOut} title="Odhlásit se">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
    </div>
  );

  return (
    <>
      {/* Mobilní topbar – jen na malých obrazovkách */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Otevřít menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktopový sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
        </div>
        {navList}
        {footer}
      </aside>

      {/* Mobilní off-canvas overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobilní drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Zavřít menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {navList}
        {footer}
      </aside>

      {/* AI asistent — globální plovoucí chat */}
      <InvoiceAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        context={emptyContext}
        onApplyPatch={() => { /* no-op v sidebaru — patche se aplikují jen v editoru faktury */ }}
        storageKey="sidebar"
      />
    </>
  );
}
