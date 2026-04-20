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
 *   VITE_PLAUSIBLE_DOMAIN   e.g. "fakturio.cz"
 */

const GA_SCRIPT_ID = "ga-gtag-loader";
const GA_INLINE_ID = "ga-gtag-init";
const PLAUSIBLE_SCRIPT_ID = "plausible-loader";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (...args: unknown[]) => void;
  }
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
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

  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
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