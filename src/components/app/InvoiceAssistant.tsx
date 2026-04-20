import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Send, X, Loader2, Wand2, Trash2,
  FileText, MessageCircle, PlusCircle, Paperclip, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InvoiceItemDraft, VatRate } from "@/lib/invoice";

export type InvoiceContext = {
  invoice_number: string;
  client_name: string;
  vat_payer: boolean;
  issue_date: string;
  taxable_date: string;
  due_date: string;
  payment_method: string;
  variable_symbol: string;
  notes: string;
  template_color: string;
  available_clients: string[];
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_rate: number;
  }>;
};

export type InvoicePatch = {
  replace_items?: boolean;
  items?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_rate: number;
  }>;
  invoice_number?: string;
  issue_date?: string;
  taxable_date?: string;
  due_date?: string;
  notes?: string;
  variable_symbol?: string;
  payment_method?: "bank_transfer" | "cash" | "card";
  client_name?: string;
  template_color?: string;
};

export type ApplyPatchFn = (patch: InvoicePatch) => void;

type ChatMsg = { role: "user" | "assistant"; content: string; image_thumb?: string };

type Mode = "invoice" | "general";

const INVOICE_SUGGESTIONS = [
  "Přidej položku: konzultace 2 hodiny po 1500 Kč",
  "Vygeneruj 3 položky pro vývoj webu za 30 000 Kč",
  "Změň barvu šablony na zelenou (#16A34A)",
  "Změň splatnost na 30 dní a napiš poděkování",
];

const GENERAL_SUGGESTIONS = [
  "Vysvětli sazby DPH v ČR (21 %, 12 %, 0 %)",
  "Co je IBAN a jak se liší od čísla účtu?",
  "Jak funguje QR platba SPAYD na faktuře?",
  "Co je DUZP a kdy se uvádí?",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: InvoiceContext;
  onApplyPatch: ApplyPatchFn;
  /** Klíč pro localStorage persistenci konverzace (např. ID faktury nebo "new"). */
  storageKey?: string;
};

const STORAGE_PREFIX = "fakturio:assistant:";
const MODE_STORAGE_KEY = "fakturio:assistant:mode";
const GENERAL_STORAGE_KEY = "global";

function loadHistory(key?: string): ChatMsg[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((m) => m && (m.role === "user" || m.role === "assistant"));
  } catch {
    /* ignore */
  }
  return [];
}

function loadMode(): Mode {
  if (typeof window === "undefined") return "invoice";
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    return v === "general" ? "general" : "invoice";
  } catch {
    return "invoice";
  }
}

export function InvoiceAssistant({ open, onOpenChange, context, onApplyPatch, storageKey }: Props) {
  const [mode, setMode] = useState<Mode>(() => loadMode());
  // Aktivní storage klíč: invoice režim → editorův klíč; general → "global"
  const activeStorageKey = mode === "general" ? GENERAL_STORAGE_KEY : storageKey;
  const [messages, setMessages] = useState<ChatMsg[]>(() => loadHistory(activeStorageKey));
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Načti historii pokud se změní klíč (přepnutí mezi fakturami nebo režimy)
  useEffect(() => {
    abortRef.current?.abort();
    setMessages(loadHistory(activeStorageKey));
  }, [activeStorageKey]);

  // Persist režim
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  // Ukládej do localStorage při každé změně zpráv
  useEffect(() => {
    if (!activeStorageKey || typeof window === "undefined") return;
    try {
      if (messages.length === 0) {
        localStorage.removeItem(STORAGE_PREFIX + activeStorageKey);
      } else {
        localStorage.setItem(STORAGE_PREFIX + activeStorageKey, JSON.stringify(messages));
      }
    } catch {
      /* quota exceeded — ignore */
    }
  }, [messages, activeStorageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const newConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setPendingImage(null);
    if (activeStorageKey && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_PREFIX + activeStorageKey);
    }
    toast.success("Nová konverzace");
  };

  const suggestions = useMemo(
    () => (mode === "general" ? GENERAL_SUGGESTIONS : INVOICE_SUGGESTIONS),
    [mode],
  );

  const send = async (text: string, imageDataUrl?: string | null) => {
    const trimmed = text.trim();
    const image = imageDataUrl ?? pendingImage;
    // Povolíme odeslat samotný obrázek bez textu (asistent dostane výchozí pokyn)
    if (!trimmed && !image) return;
    if (isStreaming) return;
    const userMsg: ChatMsg = {
      role: "user",
      content: trimmed || (image ? "📎 Přiložen obrázek — rozpoznej položky." : ""),
      image_thumb: image ?? undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPendingImage(null);
    setIsStreaming(true);

    let assistantSoFar = "";
    let toolName = "";
    let toolArgsBuf = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-assistant`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          invoice_context: mode === "invoice" ? context : null,
          mode,
          image_data_url: image ?? undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Příliš mnoho požadavků, zkuste to za chvíli.");
        else if (resp.status === 402) toast.error("AI kredit vyčerpán. Doplňte si kredit.");
        else toast.error("Asistent nedostupný.");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) upsertAssistant(delta.content);
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) toolName = tc.function.name;
                if (tc.function?.arguments) toolArgsBuf += tc.function.arguments;
              }
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (toolName === "apply_invoice_changes" && toolArgsBuf) {
        try {
          const patch = JSON.parse(toolArgsBuf) as InvoicePatch;
          onApplyPatch(patch);
          if (!assistantSoFar.trim()) {
            upsertAssistant("✅ Hotovo, změny aplikovány do faktury.");
          }
          toast.success("Faktura aktualizována asistentem");
        } catch (e) {
          console.error("Tool args parse error:", e, toolArgsBuf);
          toast.error("Asistent vrátil neplatná data.");
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
        toast.error("Chyba spojení s asistentem.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-coral-foreground shadow-glow transition-all hover:scale-105"
      >
        <Sparkles className="h-4 w-4" />
        AI asistent
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[600px] w-[400px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-glow">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral/15">
            <Sparkles className="h-4 w-4 text-coral" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI asistent</div>
            <div className="text-xs text-muted-foreground">
              {mode === "invoice" ? "Editor i generátor faktur" : "Obecné dotazy k fakturaci"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={newConversation}
            title="Nová konverzace"
            disabled={messages.length === 0 && !isStreaming}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-1 border-b border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setMode("invoice")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "invoice"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Tato faktura
        </button>
        <button
          type="button"
          onClick={() => setMode("general")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "general"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Obecný chat
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-primary-soft/50 p-3 text-sm text-foreground">
              <div className="flex items-center gap-1.5 font-semibold">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Ahoj!
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "invoice"
                  ? "Pomůžu ti vyplnit fakturu. Řekni, co fakturuješ — položky vygeneruju a vložím přímo do formuláře."
                  : "Zeptej se mě na cokoli kolem fakturace v ČR — DPH, IBAN, QR platba, DUZP, lhůty…"}
              </p>
            </div>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary-soft/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1">
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="max-w-[90%] rounded-2xl bg-muted px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Napiš mi, co potřebuješ…"
            className="min-h-[44px] resize-none"
            disabled={isStreaming}
          />
          <Button type="submit" size="icon" variant="coral" disabled={isStreaming || !input.trim()}>
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Pomocná: aplikuje patch z asistenta do stavu položek + ostatních polí. */
export function applyPatchToItems(
  current: InvoiceItemDraft[],
  patch: InvoicePatch,
): InvoiceItemDraft[] {
  if (!patch.items || patch.items.length === 0) return current;
  const newOnes: InvoiceItemDraft[] = patch.items.map((it) => ({
    id: crypto.randomUUID(),
    description: it.description,
    quantity: Number(it.quantity) || 1,
    unit: it.unit || "ks",
    unit_price: Number(it.unit_price) || 0,
    vat_rate: ([0, 12, 21].includes(Number(it.vat_rate)) ? Number(it.vat_rate) : 21) as VatRate,
  }));
  if (patch.replace_items) return newOnes;
  // Pokud původně je jediná prázdná položka, nahradíme ji
  if (current.length === 1 && !current[0].description.trim() && current[0].unit_price === 0) {
    return newOnes;
  }
  return [...current, ...newOnes];
}
