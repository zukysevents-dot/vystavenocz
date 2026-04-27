import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const APP_URL = "https://vystaveno.cz";

// Cron endpoint — pošle připomínkový email uživatelům, jejichž trial končí
// za zhruba 3 dny (okno 2.5–3.5 dne), pokud ještě nemají placené předplatné
// a email jim ještě nebyl odeslán. Idempotenci řeší sloupec
// `profiles.trial_reminder_sent_at`.
export const Route = createFileRoute("/api/public/hooks/trial-reminder")({
  server: {
    handlers: {
      POST: async () => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!SUPABASE_URL || !SERVICE_ROLE) {
          return json({ error: "Supabase env missing" }, 500);
        }
        if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
          return json({ error: "Resend env missing" }, 500);
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Cílové okno: 2.5–3.5 dne od teď
        const now = Date.now();
        const lower = new Date(now + 2.5 * 24 * 60 * 60 * 1000).toISOString();
        const upper = new Date(now + 3.5 * 24 * 60 * 60 * 1000).toISOString();

        const { data: candidates, error } = await admin
          .from("profiles")
          .select("id, email, full_name, company_name, trial_ends_at")
          .eq("subscription_active", false)
          .eq("account_status", "active")
          .is("trial_reminder_sent_at", null)
          .gte("trial_ends_at", lower)
          .lte("trial_ends_at", upper);

        if (error) {
          console.error("trial-reminder query error:", error);
          return json({ error: error.message }, 500);
        }

        let sent = 0;
        let failed = 0;
        const failures: Array<{ id: string; reason: string }> = [];

        for (const p of candidates ?? []) {
          if (!p.email) continue;

          const greetingName =
            (p.full_name && p.full_name.trim()) ||
            (p.company_name && p.company_name.trim()) ||
            null;

          const trialEnd = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
          const daysLeft = trialEnd
            ? Math.max(1, Math.ceil((trialEnd.getTime() - now) / (1000 * 60 * 60 * 24)))
            : 3;

          const html = renderReminderHtml({ name: greetingName, daysLeft });
          const text = renderReminderText({ name: greetingName, daysLeft });

          try {
            const res = await fetch(`${RESEND_GATEWAY}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "Vystaveno.cz <faktury@vystaveno.cz>",
                to: [p.email],
                subject: `Vaše zkušební doba končí za ${daysLeft} ${daysLeft === 1 ? "den" : daysLeft < 5 ? "dny" : "dní"}`,
                html,
                text,
              }),
            });

            if (!res.ok) {
              const body = await res.text().catch(() => "");
              throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
            }

            // Označ jako odesláno (idempotence)
            await admin
              .from("profiles")
              .update({ trial_reminder_sent_at: new Date().toISOString() })
              .eq("id", p.id);

            sent++;
          } catch (e) {
            failed++;
            const reason = e instanceof Error ? e.message : String(e);
            failures.push({ id: p.id, reason });
            console.error("trial-reminder send failed for", p.id, reason);
          }
        }

        return json({
          ok: true,
          candidates: candidates?.length ?? 0,
          sent,
          failed,
          failures,
        });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderReminderHtml(opts: { name: string | null; daysLeft: number }) {
  const greeting = opts.name ? `Dobrý den, ${escapeHtml(opts.name)},` : "Dobrý den,";
  const dayWord = opts.daysLeft === 1 ? "den" : opts.daysLeft < 5 ? "dny" : "dní";
  return `<!doctype html>
<html lang="cs">
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 40px 8px 40px;">
                <div style="font-size:20px;font-weight:700;color:#0fbfb6;letter-spacing:-0.01em;">Vystaveno.cz</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 0 40px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">
                  Vaše zkušební doba končí za ${opts.daysLeft} ${dayWord}
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                  děkujeme, že jste si vyzkoušeli <strong>Vystaveno.cz</strong>. Vaše 14denní zkušební
                  doba se chýlí ke konci — zbývá jen <strong>${opts.daysLeft} ${dayWord}</strong>.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Aby vám fakturace fungovala bez přerušení, aktivujte si předplatné už dnes.
                  Stojí jen <strong>100 Kč měsíčně</strong> nebo <strong>990 Kč ročně</strong>
                  (ušetříte přes 200 Kč).
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 40px 16px 40px;">
                <a href="${APP_URL}/app/predplatne"
                   style="display:inline-block;background:#0fbfb6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">
                  Aktivovat předplatné
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 32px 40px;">
                <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#475569;">
                  Co získáte aktivací:
                </p>
                <ul style="margin:8px 0 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#475569;">
                  <li>Neomezené vystavování faktur a dobropisů</li>
                  <li>Odesílání faktur klientům přímo z aplikace</li>
                  <li>QR platby, ARES lookup, AI asistent</li>
                  <li>Kdykoli zrušíte — bez závazků</li>
                </ul>
                <hr style="margin:32px 0 16px 0;border:none;border-top:1px solid #e2e8f0;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Pokud už pro fakturaci používáte něco jiného, nemusíte dělat nic — váš účet
                  zůstane zachován a kdykoli se k nám můžete vrátit.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;">
            Vystaveno.cz · <a href="${APP_URL}" style="color:#94a3b8;text-decoration:underline;">vystaveno.cz</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderReminderText(opts: { name: string | null; daysLeft: number }) {
  const greeting = opts.name ? `Dobrý den, ${opts.name},` : "Dobrý den,";
  const dayWord = opts.daysLeft === 1 ? "den" : opts.daysLeft < 5 ? "dny" : "dní";
  return `${greeting}

děkujeme, že jste si vyzkoušeli Vystaveno.cz. Vaše 14denní zkušební doba se chýlí ke konci — zbývá jen ${opts.daysLeft} ${dayWord}.

Aktivujte si předplatné, ať vám fakturace funguje bez přerušení:
${APP_URL}/app/predplatne

Cena: 100 Kč/měs nebo 990 Kč/rok. Bez závazků, kdykoli zrušíte.

S pozdravem,
Tým Vystaveno.cz`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}