import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { clientRows } from "@/lib/admin-stats";

const SEG: Record<string, string> = { abonne: "Abonné", offert: "Offert", essai: "Essai", sans: "Sans abonnement", impaye: "Impayé", resilie: "Résilié" };

/** Export CSV des clients (ouvrable dans Excel, Numbers ou Google Sheets). */
export const GET = handle(async () => {
  await requireAdmin();
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const date = (t: number | null) => (t ? new Date(t).toLocaleDateString("fr-FR") : "");
  const head = ["E-mail", "Nom", "Statut", "Boutiques", "Prix mensuel TTC (€)", "Projets", "Inscription", "Dernière activité", "Créations (30 j)", "Coût IA (30 j, €)", "Forfait utilisé (%)", "Total payé (€)"];
  const lines = clientRows()
    .filter((r) => r.role !== "admin")
    .map((r) => [r.email, r.name, SEG[r.segment], r.stores, r.monthlyEur.toFixed(2).replace(".", ","), r.projects, date(r.createdAt), date(r.lastActive), r.jobs30, r.aiCost30Eur.toFixed(2).replace(".", ","), Math.round(r.usedPct * 100), r.paidEur.toFixed(2).replace(".", ",")].map(cell).join(";"));
  const csv = "\uFEFF" + [head.map(cell).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
