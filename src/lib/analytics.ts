/**
 * GDPR-compliant analytics loader.
 *
 * - Plausible: privacy-first, no cookies. Loaded only after explicit opt-in
 *   to keep the cookie banner UX consistent (one switch = one decision).
 * - Google Analytics 4: cookie-based, requires explicit opt-in.
 *
 * Both scripts are injected at runtime once the user grants consent and are
 * never injected when consent is denied or absent.
 *
 * Required env vars (build-time, all public/safe to expose):
 *   VITE_GA_MEASUREMENT_ID  e.g. "G-XXXXXXXXXX"
 *   VITE_PLAUSIBLE_DOMAIN   e.g. "vystaveno.cz"
 */

const GA_SCRIPT_ID = "ga-gtag-loader";
const GA_INLINE_ID = "ga-gtag-init";
const PLAUSIBLE_SCRIPT_ID = "plausible-loader";

// Default GA4 measurement ID for vystaveno.cz. Override via VITE_GA_MEASUREMENT_ID.
const DEFAULT_GA_ID = "G-77KM55J70P";

function getGaId(): string | undefined {
  return (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || DEFAULT_GA_ID;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (...args: unknown[]) => void;
  }
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  const id = getGaId();
  if (!id || document.getElementById(GA_SCRIPT_ID)) return;

  const loader = document.createElement("script");
  loader.id = GA_SCRIPT_ID;
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(loader);

  const init = document.createElement("script");
  init.id = GA_INLINE_ID;
  init.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${id}', { anonymize_ip: true });
  `;
  document.head.appendChild(init);
}

function loadPlausible() {
  if (typeof window === "undefined") return;
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain || document.getElementById(PLAUSIBLE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = PLAUSIBLE_SCRIPT_ID;
  script.defer = true;
  script.dataset.domain = domain;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}

function unloadAnalytics() {
  if (typeof window === "undefined") return;
  // Best-effort removal. Browser keeps already-set GA cookies; we clear
  // the obvious ones so a denial after acceptance has visible effect.
  [GA_SCRIPT_ID, GA_INLINE_ID, PLAUSIBLE_SCRIPT_ID].forEach((id) => {
    document.getElementById(id)?.remove();
  });
  window.dataLayer = undefined;
  window.gtag = undefined;

  const id = getGaId();
  if (id) {
    const cookies = ["_ga", `_ga_${id.replace(/^G-/, "")}`, "_gid", "_gat"];
    cookies.forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  }
}

export function applyAnalyticsConsent(analyticsAllowed: boolean) {
  if (analyticsAllowed) {
    loadGoogleAnalytics();
    loadPlausible();
  } else {
    unloadAnalytics();
  }
}

// ---------------------------------------------------------------------------
// Event tracking + UTM attribution
// ---------------------------------------------------------------------------

const UTM_KEY = "vystaveno.attribution.v1";
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

export type Attribution = Partial<Record<(typeof UTM_PARAMS)[number], string>> & {
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
};

/** Capture UTM/gclid params from current URL into localStorage on first touch. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const existing = window.localStorage.getItem(UTM_KEY);
    if (existing) return; // first-touch attribution
    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    let hasAny = false;
    for (const key of UTM_PARAMS) {
      const v = params.get(key);
      if (v) {
        attribution[key] = v;
        hasAny = true;
      }
    }
    if (!hasAny && !document.referrer) return;
    attribution.landing_page = window.location.pathname;
    attribution.referrer = document.referrer || undefined;
    attribution.captured_at = new Date().toISOString();
    window.localStorage.setItem(UTM_KEY, JSON.stringify(attribution));
  } catch {
    // ignore storage errors
  }
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Fire a GA4 event if analytics is loaded. No-op otherwise (no consent / blocker). */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/** GA4 page_view (manual, since we don't reload on TanStack Router transitions). */
export function trackPageView(path: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const id = getGaId();
  if (!id) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Get GA client_id (cid) for server-side Measurement Protocol calls. */
export function getGaClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/);
  return match?.[1] ?? null;
}