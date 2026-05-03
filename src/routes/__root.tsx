import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import { CookieBanner, getCookieConsent } from "@/components/CookieBanner";
import { applyAnalyticsConsent, captureAttribution, trackPageView } from "@/lib/analytics";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vystaveno.cz — Fakturace, která vám ušetří hodiny týdně" },
      {
        name: "description",
        content:
          "Moderní česká fakturace pro OSVČ a firmy. Faktury s IČO, DIČ, DPH 21 %, QR platbou a AI asistentem v češtině. 14 dní zdarma bez karty.",
      },
      { name: "author", content: "Vystaveno.cz" },
      { property: "og:title", content: "Vystaveno.cz — Fakturace, která vám ušetří hodiny týdně" },
      {
        property: "og:description",
        content:
          "Vystavujte faktury česky během 30 sekund. AI asistent, QR platby, automatické DPH, krásný design.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Vystaveno.cz — Fakturace, která vám ušetří hodiny týdně" },
      { name: "description", content: "Vystaveno.cz: Chytrá fakturační aplikace pro české podnikatele." },
      { property: "og:description", content: "Vystaveno.cz: Chytrá fakturační aplikace pro české podnikatele." },
      { name: "twitter:description", content: "Vystaveno.cz: Chytrá fakturační aplikace pro české podnikatele." },
      { property: "og:image", content: "https://vystaveno.cz/og-image.png" },
      { name: "twitter:image", content: "https://vystaveno.cz/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon-64.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Preload webfont CSS jako style — sníží render-blocking dobu, prohlížeč začne fetchnout dřív.
      // `display=swap` v URL zajistí, že text je viditelný ve fallback fontu během načítání Interu.
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='vystaveno-theme';var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:'dark';var r=document.documentElement;if(t==='dark')r.classList.add('dark');r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    captureAttribution();
    const consent = getCookieConsent();
    if (consent?.analytics) applyAnalyticsConsent(true);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <PageViewTracker />
        <Outlet />
        <ThemedToaster />
        <CookieBanner />
      </AuthProvider>
    </ThemeProvider>
  );
}

function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-center" theme={theme} />;
}
