import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { CookieBanner, getCookieConsent } from "@/components/CookieBanner";
import { applyAnalyticsConsent } from "@/lib/analytics";

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
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/9Q9Y4oL0HBR78WMyBC2sTscsL3b2/social-images/social-1776945491708-vystaveno-logo-Cgf8lq5p.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/9Q9Y4oL0HBR78WMyBC2sTscsL3b2/social-images/social-1776945491708-vystaveno-logo-Cgf8lq5p.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
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
    const consent = getCookieConsent();
    if (consent?.analytics) applyAnalyticsConsent(true);
  }, []);

  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" theme="dark" />
      <CookieBanner />
    </AuthProvider>
  );
}
