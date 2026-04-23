import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { applyAnalyticsConsent } from "@/lib/analytics";

const STORAGE_KEY = "vystaveno.cookieConsent.v1";

type Consent = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

export function getCookieConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean) {
  const consent: Consent = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("vystaveno:cookie-consent", { detail: consent }));
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("vystaveno:cookie-consent-reset"));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);

  useEffect(() => {
    const check = () => {
      const existing = getCookieConsent();
      setVisible(!existing);
      if (!existing) setAnalyticsOn(false); // GDPR: opt-in default
    };
    check();
    window.addEventListener("vystaveno:cookie-consent-reset", check);
    return () => window.removeEventListener("vystaveno:cookie-consent-reset", check);
  }, []);

  if (!visible) return null;

  const handleSavePreferences = () => {
    saveConsent(analyticsOn);
    applyAnalyticsConsent(analyticsOn);
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true);
    applyAnalyticsConsent(true);
    setVisible(false);
  };

  const handleNecessaryOnly = () => {
    saveConsent(false);
    applyAnalyticsConsent(false);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md"
    >
      <div className="rounded-2xl border border-border bg-card p-5 shadow-glow">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="cookie-banner-title" className="text-sm font-semibold text-foreground">
                Soukromí na Vystaveno
              </h2>
              <button
                type="button"
                onClick={handleNecessaryOnly}
                aria-label="Zavřít a uložit pouze nezbytné"
                className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-surface-soft hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p id="cookie-banner-desc" className="mt-1 text-xs text-muted-foreground">
              Používáme nezbytné cookies pro přihlášení a — s vaším souhlasem — analytiku
              pro zlepšování služby. Marketingové cookies nepoužíváme.{" "}
              <Link to="/gdpr" className="text-primary underline">
                Více v GDPR
              </Link>
              .
            </p>

            <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-soft/60 p-3">
              <div className="flex items-center justify-between gap-3 opacity-70">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">Nezbytné</div>
                  <div className="text-[11px] text-muted-foreground">Přihlášení, bezpečnost. Vždy zapnuto.</div>
                </div>
                <Switch checked disabled aria-label="Nezbytné cookies (vždy aktivní)" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="cookie-analytics" className="text-xs font-semibold text-foreground">
                    Analytika
                  </Label>
                  <div className="text-[11px] text-muted-foreground">Google Analytics & Plausible — měření návštěvnosti.</div>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={analyticsOn}
                  onCheckedChange={setAnalyticsOn}
                  aria-label="Povolit analytické cookies"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button size="sm" variant="coral" onClick={handleAcceptAll} className="w-full">
                Přijmout vše
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSavePreferences}
                className="w-full"
              >
                Uložit volbu
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNecessaryOnly}
                className="w-full"
              >
                Jen nezbytné
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}