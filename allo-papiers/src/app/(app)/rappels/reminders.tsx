"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, EmptyState, PageTitle, Spinner } from "@/components/ui";

type D = { id: string; label: string; due_date: string; source: "document" | "calculee" | "utilisateur"; source_quote: string | null; confirmed_at: string | null; remind_days: number[]; enabled: boolean; document_id: string | null; document_title: string | null };

const SOURCE = { document: "Date écrite dans le document", calculee: "Date calculée — à vérifier", utilisateur: "Saisie par vous" };
const OPTIONS = [14, 7, 2, 0];
const parisToday = () => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
const fr = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function Reminders() {
  const [list, setList] = useState<D[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", due_date: "" });

  const load = useCallback(() => api<{ deadlines: D[]; remindersEnabled: boolean }>("/api/deadlines").then((r) => { setList(r.deadlines); setEnabled(r.remindersEnabled); }).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible.")), []);
  useEffect(() => void load(), [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
    }
  }

  const today = parisToday();
  const scheduled = (list ?? [])
    .filter((d) => d.confirmed_at && d.enabled && enabled)
    .flatMap((d) => d.remind_days.map((n) => ({ date: addDays(d.due_date, -n), label: d.label, n })))
    .filter((x) => x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Rappels" title="Échéances et rappels">
        Vous recevez un email avant chaque échéance que vous avez <strong>confirmée</strong>, vers 8 h (heure de Paris). Aucun rappel n'est envoyé sur une date non confirmée.
      </PageTitle>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <div className="card mb-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-semibold">{enabled ? <BellRing className="h-5 w-5 text-ok" aria-hidden /> : <BellOff className="h-5 w-5 text-muted" aria-hidden />} Rappels par email {enabled ? "activés" : "désactivés"}</p>
        <button className="btn btn-outline" onClick={() => run(() => api("/api/account", { method: "PATCH", json: { reminders_enabled: !enabled } }))}>{enabled ? "Désactiver tous les rappels" : "Réactiver les rappels"}</button>
      </div>

      {!list && <Spinner />}
      {list?.length === 0 && <EmptyState title="Aucune échéance">Les dates limites repérées dans vos documents apparaîtront ici. Vous pouvez aussi en ajouter une.</EmptyState>}
      <ul className="grid gap-3">
        {list?.map((d) => (
          <li key={d.id} className={`card p-5 ${d.due_date < today ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{d.label}</p>
                <p className="text-muted">{fr(d.due_date)}</p>
              </div>
              <span className={`chip ${d.source === "calculee" ? "bg-warn-soft text-warn" : ""}`}>{SOURCE[d.source]}</span>
            </div>
            {d.source_quote && <p className="mt-2 rounded-lg bg-sand/60 px-3 py-2 text-[0.95rem]">« {d.source_quote} »</p>}
            {d.document_id && <Link href={`/documents/${d.document_id}`} className="mt-2 inline-block text-[0.95rem] text-orange underline">{d.document_title ?? "Voir le document"}</Link>}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-[0.95rem]">
                <span className="field-label">Date</span>
                <input type="date" className="input" defaultValue={d.due_date} onBlur={(e) => e.target.value && e.target.value !== d.due_date && run(() => api(`/api/deadlines/${d.id}`, { method: "PATCH", json: { due_date: e.target.value } }))} />
              </label>
              {!d.confirmed_at ? (
                <button className="btn btn-navy self-end" onClick={() => run(() => api(`/api/deadlines/${d.id}`, { method: "PATCH", json: { confirm: true } }))}>Confirmer cette date</button>
              ) : (
                <button className="btn btn-outline self-end" onClick={() => run(() => api(`/api/deadlines/${d.id}`, { method: "PATCH", json: { enabled: !d.enabled } }))}>{d.enabled ? "Couper ses rappels" : "Réactiver ses rappels"}</button>
              )}
            </div>
            {d.confirmed_at && (
              <fieldset className="mt-3">
                <legend className="text-[0.95rem] font-semibold">Me prévenir</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OPTIONS.map((n) => {
                    const on = d.remind_days.includes(n);
                    return (
                      <button key={n} className={`chip !min-h-10 !px-4 ${on ? "!bg-navy text-white" : ""}`} aria-pressed={on} onClick={() => run(() => api(`/api/deadlines/${d.id}`, { method: "PATCH", json: { remind_days: on ? d.remind_days.filter((x) => x !== n) : [...d.remind_days, n] } }))}>
                        {n === 0 ? "Le jour même" : `${n} jours avant`}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <button className="mt-3 inline-flex items-center gap-1 text-[0.95rem] text-danger underline" onClick={() => run(() => api(`/api/deadlines/${d.id}`, { method: "DELETE" }))}><Trash2 className="h-4 w-4" aria-hidden /> Supprimer</button>
          </li>
        ))}
      </ul>

      <form className="card mt-6 grid gap-3 p-5 sm:grid-cols-[1fr_11rem_auto]" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api("/api/deadlines", { method: "POST", json: form }); setForm({ label: "", due_date: "" }); }); }}>
        <input className="input" placeholder="Ex. Renvoyer le formulaire" required minLength={2} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} aria-label="Intitulé" />
        <input className="input" type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} aria-label="Date" />
        <button className="btn btn-primary"><Plus className="h-5 w-5" aria-hidden /> Ajouter</button>
      </form>

      <section className="card mt-6 p-5">
        <h2 className="text-lg font-semibold">Rappels effectivement programmés</h2>
        {scheduled.length === 0 ? <p className="mt-2 text-muted">Aucun rappel programmé.</p> : (
          <ul className="mt-3 grid gap-1.5">{scheduled.map((s, i) => <li key={i}><strong>{new Date(`${s.date}T12:00:00Z`).toLocaleDateString("fr-FR")}</strong> — {s.label} ({s.n === 0 ? "le jour même" : `J-${s.n}`})</li>)}</ul>
        )}
      </section>
    </div>
  );
}
