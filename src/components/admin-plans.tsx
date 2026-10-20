"use client";
/**
 * Administration des forfaits V2 : « Abonnements » (comptes → projets → abonnements, budgets IA, recharges, revenus,
 * conversions, coûts IA, marge estimée) et « Rendez-vous » (créneaux, réservations, heures offertes, tarif DOMINER).
 */
import { useState } from "react";
import { api, Badge, Button, Card, Field, formatDate, Input, Select, useApi, useToast } from "./ui";
import { formatEur } from "./billing-client";
import { useLang, useT } from "./i18n";
import { PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";
import type { billingOverview } from "@/lib/admin-billing";
import type { adminCalls } from "@/lib/appointments";

type Overview = ReturnType<typeof billingOverview>;
type Calls = ReturnType<typeof adminCalls>;

const STATUS: Record<string, [string, string, "ok" | "warn" | "bad" | "neutral"]> = {
  active: ["Payant", "Paid", "ok"],
  manual: ["Offert", "Complimentary", "ok"],
  past_due: ["Impayé", "Unpaid", "warn"],
  canceled: ["Résilié", "Canceled", "bad"],
};

export function SubscriptionsAdmin() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [days, setDays] = useState(30);
  const { data, setData } = useApi<Overview>(`/api/admin/billing/overview?jours=${days}`);
  const [q, setQ] = useState("");
  const eur = (n: number) => formatEur(Math.round(n * 100) / 100, lang);
  const act = async (body: unknown) => {
    try {
      setData(await api<Overview>("/api/admin/billing/overview", { body }));
      toast("ok", t("Enregistré.", "Saved."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  const T = data.totals;
  const list = data.accounts.filter((a) => !q || a.email.toLowerCase().includes(q.toLowerCase()) || a.projects.some((p) => (p.project ?? "").toLowerCase().includes(q.toLowerCase())));
  const kpi = (label: string, value: string, note?: string) => (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpi(t("Abonnements actifs / mois", "Active subscriptions / month"), eur(T.mrrEur), t("TTC, abonnements payés", "Incl. VAT, paid subscriptions"))}
        {kpi(t("Par forfait", "By plan"), PLAN_IDS.map((p) => `${PLANS[p].name[lang]} ${T.byPlan[p] ?? 0}`).join(" · "), t(`${T.complimentary} offert(s) · ${T.pastDue} impayé(s) · ${T.pending} sans projet`, `${T.complimentary} complimentary · ${T.pastDue} unpaid · ${T.pending} without project`))}
        {kpi(t("Conversion", "Conversion"), `${T.conversionPct.toLocaleString(lang)} %`, t(`${T.subscribers} abonné(s) / ${T.accounts} compte(s)`, `${T.subscribers} subscriber(s) / ${T.accounts} account(s)`))}
        {kpi(t(`Marge estimée (${data.days} j)`, `Estimated margin (${data.days} d)`), eur(T.marginEstimateEur), t(`Encaissé ${eur(T.revenueTtcEur)} TTC − coût IA ${eur(T.aiCostEur)}`, `Collected ${eur(T.revenueTtcEur)} incl. VAT − AI cost ${eur(T.aiCostEur)}`))}
      </div>
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("Comptes, projets et abonnements", "Accounts, projects and subscriptions")}</h2>
            <p className="text-sm text-muted">{t(`Revenus par type (${data.days} j) : `, `Revenue by type (${data.days} d): `)}{Object.entries(T.revenueByKind).map(([k, v]) => `${k} ${eur(v)}`).join(" · ") || "—"} · {t(`heures offertes utilisées : ${T.freeCallsUsed}`, `free hours used: ${T.freeCallsUsed}`)}</p>
          </div>
          <div className="flex gap-2">
            <Select aria-label={t("Période", "Period")} value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{t(`${d} jours`, `${d} days`)}</option>)}
            </Select>
            <Input aria-label={t("Rechercher", "Search")} placeholder={t("E-mail ou projet", "Email or project")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {list.length === 0 && <p className="text-sm text-muted">{t("Aucun abonnement.", "No subscriptions.")}</p>}
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <p className="font-medium">{a.email}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{t("Total :", "Total:")} <strong className="text-ink">{eur(a.monthlyEur)}</strong> {t("TTC/mois", "incl. VAT/mo")}</span>
                  <Select aria-label={t(`Offrir un abonnement à ${a.email}`, `Offer a subscription to ${a.email}`)} value="" onChange={(e) => e.target.value && act({ action: "offer", userId: a.id, plan: e.target.value })}>
                    <option value="">{t("Offrir un abonnement…", "Offer a subscription…")}</option>
                    {PLAN_IDS.map((p) => <option key={p} value={p}>{PLANS[p].name[lang]}</option>)}
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted">
                    <tr>{[t("Projet", "Project"), t("Forfait", "Plan"), t("Statut", "Status"), t("Échéance", "Renewal"), t("Budget IA", "AI budget"), t(`Coût IA (${data.days} j)`, `AI cost (${data.days} d)`), t("Recharges", "Top-ups"), t("Rendez-vous", "Calls"), ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {a.projects.map((p) => {
                      const st = STATUS[p.status] ?? [p.status, p.status, "neutral"];
                      return (
                        <tr key={p.key} className="border-t border-line align-top">
                          <td className="px-3 py-2">{p.project ?? <span className="text-muted">{t("En attente de projet", "Waiting for its project")}</span>}{p.sector && <span className="block text-xs text-muted">{p.sector}</span>}</td>
                          <td className="px-3 py-2">{PLANS[p.plan as PlanId]?.name[lang] ?? p.plan}<span className="block text-xs text-muted">{p.billing === "year" ? t("annuel", "yearly") : t("mensuel", "monthly")}{p.monthlyEur ? ` · ${eur(p.monthlyEur)}` : ""}</span></td>
                          <td className="px-3 py-2"><Badge tone={st[2]} dot>{lang === "en" ? st[1] : st[0]}</Badge>{p.stripe && <span className="block text-xs text-muted">Stripe{p.cancelAtPeriodEnd ? t(" · résiliation prévue", " · cancellation scheduled") : ""}</span>}</td>
                          <td className="px-3 py-2 tabular-nums">{p.periodEnd ? formatDate(p.periodEnd, { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{p.ai ? <>{eur(p.ai.usedEur)} / {eur(p.ai.allowanceEur)}{p.ai.topupEur > 0 && <span className="block text-xs text-muted">{t(`+ recharges ${eur(p.ai.topupEur)}`, `+ top-ups ${eur(p.ai.topupEur)}`)}</span>}</> : "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{eur(p.aiCostEur)}</td>
                          <td className="px-3 py-2 tabular-nums">{p.topups.count ? `${p.topups.count} · ${eur(p.topups.eur)}` : "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{p.calls || "—"}{p.freeCall && <span className="block text-xs text-muted">{t("heure offerte", "free hour")}</span>}</td>
                          <td className="px-3 py-2">
                            {p.projectId && !(p.stripe && (p.status === "active" || p.status === "past_due")) && (
                              <Select aria-label={t("Changer le forfait offert", "Change complimentary plan")} value="" onChange={(e) => e.target.value && act(e.target.value === "revoke" ? { action: "revoke", projectId: p.projectId } : { action: "grant", projectId: p.projectId, plan: e.target.value })}>
                                <option value="">{t("Modifier…", "Change…")}</option>
                                {PLAN_IDS.map((x) => <option key={x} value={x}>{t(`Offrir ${PLANS[x].name.fr}`, `Grant ${PLANS[x].name.en}`)}</option>)}
                                {p.status !== "canceled" && <option value="revoke">{t("Retirer", "Revoke")}</option>}
                              </Select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{t("Marge estimée = encaissements TTC ÷ 1,2 − coût réel des fournisseurs IA sur la période (hors frais Stripe et autres charges).", "Estimated margin = collected incl. VAT ÷ 1.2 − real AI provider cost over the period (excluding Stripe fees and other costs).")}</p>
      </Card>
    </div>
  );
}

export function CallsAdmin() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, setData } = useApi<Calls>("/api/admin/calls");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ from: today, to: today, weekdays: [1, 2, 3, 4, 5], hours: "10:00, 14:00, 16:00" });
  const [price, setPrice] = useState<string>("");
  const post = async (body: unknown, done?: string) => {
    try {
      const r = await api<Calls & { opened?: number }>("/api/admin/calls", { body });
      setData(r);
      toast("ok", done ?? t("Enregistré.", "Saved."));
      return r;
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const when = (ms: number) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(ms));
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  const days = lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 p-5">
        <h2 className="font-display text-xl font-semibold">{t("Ouvrir des créneaux (heure de Paris, 60 min)", "Open slots (Paris time, 60 min)")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("Du", "From")} htmlFor="slot-from"><Input id="slot-from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label={t("Au", "To")} htmlFor="slot-to"><Input id="slot-to" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
          <Field label={t("Heures de début", "Start times")} htmlFor="slot-hours"><Input id="slot-hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Jours", "Days")}>
          {days.map((d, i) => (
            <button key={d} type="button" aria-pressed={form.weekdays.includes(i)} onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(i) ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i] })} className={form.weekdays.includes(i) ? "h-10 rounded-full bg-ink px-4 text-sm text-paper" : "h-10 rounded-full border border-line px-4 text-sm"}>{d}</button>
          ))}
        </div>
        <Button className="justify-self-start" onClick={async () => { const r = await post({ action: "open", from: form.from, to: form.to, weekdays: form.weekdays, hours: form.hours.split(/[,\s]+/).filter(Boolean) }); if (r) toast("ok", t(`${r.opened ?? 0} créneau(x) ouvert(s).`, `${r.opened ?? 0} slot(s) opened.`)); }}>{t("Ouvrir les créneaux", "Open slots")}</Button>
      </Card>
      <Card className="grid gap-3 p-5">
        <h2 className="font-display text-xl font-semibold">{t("Ancien tarif DOMINER conservé (non proposé)", "Legacy DOMINATE price kept (not offered)")}</h2>
        <p className="text-sm text-muted">{t("La grille actuelle prévoit un seul appel de départ par compte. Ce réglage historique ne crée aucun droit supplémentaire.","The current grid includes one introductory call per account. This legacy setting creates no additional entitlement.")}</p>
        <p className="text-sm text-muted">{t(`Actuel : ${data.dominerPriceEur != null ? formatEur(data.dominerPriceEur, lang) : "non fixé (réservation payante DOMINER impossible)"} · heures offertes utilisées : ${data.freeHoursUsed}`, `Current: ${data.dominerPriceEur != null ? formatEur(data.dominerPriceEur, lang) : "not set (paid DOMINATE booking unavailable)"} · free hours used: ${data.freeHoursUsed}`)}</p>
        <div className="flex flex-wrap gap-2">
          <div className="w-40"><Input aria-label={t("Prix TTC en euros", "Price incl. VAT in euros")} type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <Button variant="secondary" onClick={() => post({ action: "price", eur: price ? Number(price) : null })}>{t("Enregistrer", "Save")}</Button>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-xl font-semibold">{t("Rendez-vous", "Appointments")}</h2>
        {data.bookings.length === 0 ? <p className="mt-2 text-sm text-muted">{t("Aucun rendez-vous.", "No appointments.")}</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {data.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{when(b.startsAt)}</strong> · {b.email} · {b.project} · {PLANS[b.plan as PlanId]?.name[lang] ?? b.plan} · {b.free ? t("offert", "free") : formatEur(b.priceEur, lang)}{b.refunded ? ` · ${t("remboursé", "refunded")}` : ""}{b.phone ? ` · ${b.phone}` : ""}{b.topic ? ` — ${b.topic}` : ""}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={b.status === "confirmed" ? "ok" : b.status === "done" ? "neutral" : b.status === "canceled" ? "bad" : "warn"}>{b.status}</Badge>
                  {b.status === "confirmed" && <Button size="sm" variant="ghost" onClick={() => post({ action: "done", bookingId: b.id })}>{t("Fait", "Done")}</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-xl font-semibold">{t("Créneaux à venir", "Upcoming slots")}</h2>
        {data.slots.length === 0 ? <p className="mt-2 text-sm text-muted">{t("Aucun créneau ouvert.", "No open slots.")}</p> : (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {data.slots.map((s) => (
              <li key={s.id} className="flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1">
                <span className={s.status === "blocked" ? "text-muted line-through" : ""}>{when(s.startsAt)}</span>
                {s.booked ? <Badge tone="ok">{t("réservé", "booked")}</Badge> : (
                  <>
                    <button type="button" className="rounded-full px-2 py-0.5 text-xs hover:bg-paper-2" onClick={() => post({ action: s.status === "blocked" ? "unblock" : "block", slotId: s.id })}>{s.status === "blocked" ? t("Rouvrir", "Reopen") : t("Bloquer", "Block")}</button>
                    <button type="button" className="rounded-full px-2 py-0.5 text-xs text-bad hover:bg-paper-2" onClick={() => post({ action: "delete", slotId: s.id })}>{t("Supprimer", "Delete")}</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
