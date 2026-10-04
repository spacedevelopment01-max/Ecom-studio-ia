import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { clientRows } from "@/lib/admin-stats";
import { intlLocale } from "@/lib/i18n";
import { L, uiLang } from "@/lib/i18n-server";

const SEG: Record<string, { fr: string; en: string }> = {
  abonne: { fr: "Abonné", en: "Subscribed" },
  offert: { fr: "Offert", en: "Complimentary" },
  essai: { fr: "Essai", en: "Trial" },
  sans: { fr: "Sans abonnement", en: "No subscription" },
  impaye: { fr: "Impayé", en: "Unpaid" },
  resilie: { fr: "Résilié", en: "Canceled" },
};

/** Export CSV des clients (ouvrable dans Excel, Numbers ou Google Sheets). */
export const GET = handle(async () => {
  await requireAdmin();
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lang = uiLang();
  const date = (t: number | null) => (t ? new Date(t).toLocaleDateString(intlLocale(lang)) : "");
  // Séparateur décimal selon la langue (virgule en français, point en anglais).
  const num = (n: number) => (lang === "en" ? n.toFixed(2) : n.toFixed(2).replace(".", ","));
  const head = L(
    ["E-mail", "Nom", "Statut", "Boutiques", "Prix mensuel TTC (€)", "Projets", "Inscription", "Dernière activité", "Créations (30 j)", "Coût IA (30 j, €)", "Forfait utilisé (%)", "Total payé (€)"],
    ["Email", "Name", "Status", "Stores", "Monthly price incl. VAT (€)", "Projects", "Signed up", "Last activity", "Creations (30 d)", "AI cost (30 d, €)", "Plan used (%)", "Total paid (€)"],
  );
  const lines = clientRows()
    .filter((r) => r.role !== "admin")
    .map((r) => [r.email, r.name, SEG[r.segment]?.[lang] ?? r.segment, r.stores, num(r.monthlyEur), r.projects, date(r.createdAt), date(r.lastActive), r.jobs30, num(r.aiCost30Eur), Math.round(r.usedPct * 100), num(r.paidEur)].map(cell).join(";"));
  const csv = "\uFEFF" + [head.map(cell).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
