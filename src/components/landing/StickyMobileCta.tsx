import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Sticky CTA tlačítko ve spodní části obrazovky — pouze na mobilu.
 * Objeví se po naskrolování ~400px, aby nepřekáželo v hero sekci.
 * Zvyšuje konverzi tím, že CTA "Začít zdarma" je vždy po ruce.
 */
export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Button variant="coral" size="lg" className="group w-full text-base" asChild>
        <a href="/registrace">
          Začít zdarma za 30 sekund
          <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </Button>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        14 dní zdarma · bez karty
      </p>
    </div>
  );
}