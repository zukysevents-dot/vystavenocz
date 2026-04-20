import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, Settings, LogOut, Sparkles, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/landing/Logo";
import { Button } from "@/components/ui/button";

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

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo />
      </div>

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

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-gradient-to-br from-primary-soft to-accent p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI asistent
          </div>
          <p className="mt-1 text-muted-foreground">Brzy: chat pro tvorbu faktur</p>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg p-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 truncate">
            <div className="truncate text-xs font-medium">{user?.email}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} title="Odhlásit se">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
