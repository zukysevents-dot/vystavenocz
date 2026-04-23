import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Send, X, Loader2, Wand2, Trash2,
  FileText, MessageCircle, PlusCircle, Paperclip, Image as ImageIcon,
  Mic, MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InvoiceItemDraft, VatRate } from "@/lib/invoice";
import { supabase } from "@/integrations/supabase/client";

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

const STORAGE_PREFIX = "vystaveno:assistant:";
const MODE_STORAGE_KEY = "vystaveno:assistant:mode";
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
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [showMicConsent, setShowMicConsent] = useState(false);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInputRef = useRef("");
  const [interimText, setInterimText] = useState("");
  const speechSupported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

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

  // Cleanup speech recognition při unmountu
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
  }, []);

  // Drž poslední input v ref pro auto-send timer
  useEffect(() => { latestInputRef.current = input; }, [input]);

  // Mluvený výstup (TTS) — zpětná vazba pro hands-free režim
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "cs-CZ";
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    } catch { /* ignore */ }
  };

  const MIC_CONSENT_KEY = "vystaveno:assistant:mic-consent";

  const toggleDictation = () => {
    if (!speechSupported) {
      toast.error("Tvůj prohlížeč nepodporuje hlasový vstup. Zkus Chrome, Edge nebo Safari.");
      return;
    }
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      return;
    }
    // První spuštění → zobraz potvrzovací dialog
    let consented = false;
    try { consented = localStorage.getItem(MIC_CONSENT_KEY) === "1"; } catch { /* ignore */ }
    if (!consented) {
      setShowMicConsent(true);
      return;
    }
    startDictation();
  };

  const startDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "cs-CZ";
    rec.continuous = true;
    rec.interimResults = true;
    let baseText = input;
    rec.onstart = () => {
      setIsListening(true);
      baseText = input;
      if (handsFree) speak("Poslouchám");
    };
    rec.onresult = (event: any) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        baseText = (baseText ? baseText + " " : "") + finalText.trim();
      }
      const combined = (baseText + (interim ? " " + interim : "")).trim();
      setInput(combined);
      setInterimText(interim.trim());
      // Hands-free auto-send: po 1,6s ticha odešli automaticky
      if (handsFree) {
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = setTimeout(() => {
          const txt = latestInputRef.current.trim();
          if (txt.length >= 3) {
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            send(txt);
          }
        }, 1600);
      }
    };
    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      if (e.error === "not-allowed") toast.error("Mikrofon zamítnut. Povol přístup v nastavení prohlížeče.");
      else if (e.error === "no-speech") { /* ignore */ }
      else toast.error("Chyba hlasového vstupu.");
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setInterimText("");
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error(e);
      toast.error("Nepodařilo se spustit mikrofon.");
      setIsListening(false);
    }
  };

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

  // Načte obrázek, downscale na max 1600px (zachovává poměr) a vrátí jako data URL JPEG.
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Soubor se nepodařilo načíst"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Obrázek se nepodařilo dekódovat"));
        img.onload = () => {
          const MAX = 1600;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const scale = Math.min(MAX / width, MAX / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas nedostupný"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const handlePickFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vyber obrázek (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Obrázek je příliš velký (max 10 MB).");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPendingImage(dataUrl);
      if (mode === "general") setMode("invoice");
    } catch (e) {
      console.error(e);
      toast.error("Nepodařilo se zpracovat obrázek.");
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Pro použití asistenta se přihlaste.");
        setIsStreaming(false);
        return;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-assistant`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
        else if (resp.status === 401) toast.error("Pro použití asistenta se přihlaste.");
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
          if (handsFree) {
            // Krátké hlasové potvrzení v autě
            const itemCount = patch.items?.length ?? 0;
            const parts: string[] = ["Hotovo."];
            if (itemCount > 0) parts.push(`Přidáno ${itemCount} ${itemCount === 1 ? "položka" : itemCount < 5 ? "položky" : "položek"}.`);
            if (patch.client_name) parts.push(`Odběratel ${patch.client_name}.`);
            speak(parts.join(" "));
          }
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
    <>
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

      {/* Hands-free přepínač — pro diktování v autě */}
      {speechSupported && mode === "invoice" && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-coral/5 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground font-medium">🚗 Hands-free režim</span>
            <span className="text-muted-foreground hidden sm:inline">— mluv, automaticky odešle</span>
          </div>
          <button
            type="button"
            onClick={() => setHandsFree((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              handsFree ? "bg-coral" : "bg-muted",
            )}
            aria-pressed={handsFree}
            aria-label="Přepnout hands-free režim"
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                handsFree ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-primary-soft/50 p-3 text-sm text-foreground">
              <div className="flex items-center gap-1.5 font-semibold">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Ahoj!
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "invoice"
                  ? "Pomůžu ti vyplnit fakturu. Napiš, co fakturuješ — nebo přilož foto účtenky/objednávky 📎 a já z něj rozpoznám položky."
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
            {m.image_thumb && (
              <img
                src={m.image_thumb}
                alt="Příloha"
                className="mb-2 max-h-40 rounded-lg border border-border/50 object-contain"
              />
            )}
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
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
            <img
              src={pendingImage}
              alt="Náhled"
              className="h-12 w-12 rounded object-cover"
            />
            <div className="flex-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Příloha připravena
              </div>
              <div>AI rozpozná položky z obrázku.</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPendingImage(null)}
              title="Odebrat přílohu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isListening && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-coral/40 bg-coral/5 p-2 text-xs">
            <span className="relative mt-0.5 flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                🎙️ Poslouchám {handsFree && <span className="text-muted-foreground">(po pauze odešle)</span>}
              </div>
              {interimText ? (
                <div className="mt-0.5 italic text-muted-foreground line-clamp-2">„{interimText}"</div>
              ) : (
                <div className="mt-0.5 text-muted-foreground">Mluv česky…</div>
              )}
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handlePickFile(e.target.files?.[0]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <div className="flex items-end gap-2">
          {mode === "invoice" && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Přidat foto účtenky / objednávky"
              className="shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "coral" : "outline"}
              onClick={toggleDictation}
              disabled={isStreaming}
              title={isListening ? "Zastavit diktování" : "Diktovat hlasem (česky)"}
              className="shrink-0"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={
              isListening
                ? "🎙️ Poslouchám… mluv česky"
                : pendingImage
                  ? "Volitelně doplň pokyn k obrázku…"
                  : "Napiš nebo nadiktuj, co potřebuješ…"
            }
            className="min-h-[44px] resize-none"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            variant="coral"
            disabled={isStreaming || (!input.trim() && !pendingImage)}
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>

    <AlertDialog open={showMicConsent} onOpenChange={setShowMicConsent}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-coral" />
            Spustit hlasový vstup?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Co se stane, když potvrdíš:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Prohlížeč si vyžádá přístup k <strong>mikrofonu</strong>.</li>
                <li>Tvůj hlas převádí na text <strong>samotný prohlížeč</strong> (lokálně, neposílá se nikam).</li>
                <li>Až klikneš na Odeslat (nebo se v hands-free režimu odešle samo), text půjde do <strong>AI asistenta Vystaveno</strong> a může upravit fakturu.</li>
                <li>Tato hláška se ti už nezobrazí — můžeš ji obnovit smazáním cookies / dat stránky.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              try { localStorage.setItem(MIC_CONSENT_KEY, "1"); } catch { /* ignore */ }
              setShowMicConsent(false);
              startDictation();
            }}
          >
            Rozumím, spustit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
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
