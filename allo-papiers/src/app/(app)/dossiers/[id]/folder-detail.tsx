"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, FileText, ListTodo, Plus, Trash2, UserRound } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, STATUS_LABELS, Spinner, UrgencyBadge } from "@/components/ui";

type Data = {
  folder: { id: string; name: string; goal: string | null; organism: string | null; next_action: string | null; status: keyof typeof STATUS_LABELS; resolved_at: string | null };
  documents: { id: string; title: string; created_at: string; urgency: "vert" | "orange" | "rouge" | null; deadline: string | null }[];
  events: { id: string; event_date: string; kind: string; label: string }[];
  pieces: { id: string; label: string; status: "recue" | "manquante" }[];
  deadlines: { id: string; label: string; due_date: string; confirmed_at: string | null }[];
  letters: { id: string; title: string }[];
};

const KINDS = { courrier_recu: "Courrier reçu", reponse_envoyee: "Réponse envoyée", appel: "Appel", rendez_vous: "Rendez-vous", autre: "Autre" };
const fr = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function FolderDetail({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ev, setEv] = useState({ event_date: new Date().toISOString().slice(0, 10), kind: "courrier_recu", label: "" });
  const [piece, setPiece] = useState("");
  const [edit, setEdit] = useState<Data["folder"] | null>(null);

  const load = useCallback(() => api<Data>(`/api/folders/${id}`).then((r) => { setD(r); setEdit(r.folder); }).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible.")), [id]);
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

  if (!d || !edit) return <div className="container-page py-16">{error ? <Alert tone="danger">{error}</Alert> : <Spinner />}</div>;
  const f = d.folder;

  return (
    <div className="container-page max-w-4xl pb-10">
      <div className="mb-5 mt-6 md:mt-10">
        <Link href="/dossiers" className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Mes dossiers</Link>
        <h1 className="font-display mt-3 text-[1.9rem] font-semibold md:text-[2.4rem]">{f.name}</h1>
        {f.resolved_at && <p className="mt-2 chip bg-ok-soft text-ok"><CheckCircle2 className="h-4 w-4" aria-hidden /> Réglé le {fr(f.resolved_at)}</p>}
      </div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <form className="card grid gap-4 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/folders/${id}`, { method: "PATCH", json: { name: edit.name, goal: edit.goal || null, organism: edit.organism || null, next_action: edit.next_action || null, status: edit.status } })); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="fd-name">Nom</label><input id="fd-name" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="fd-org">Organisme</label><input id="fd-org" className="input" value={edit.organism ?? ""} onChange={(e) => setEdit({ ...edit, organism: e.target.value })} /></div>
        </div>
        <div><label className="field-label" htmlFor="fd-goal">Objectif</label><input id="fd-goal" className="input" value={edit.goal ?? ""} onChange={(e) => setEdit({ ...edit, goal: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div><label className="field-label" htmlFor="fd-next">Prochaine action</label><input id="fd-next" className="input" value={edit.next_action ?? ""} onChange={(e) => setEdit({ ...edit, next_action: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="fd-status">Statut</label>
            <select id="fd-status" className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as typeof edit.status })}>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-outline">Enregistrer</button>
          {!f.resolved_at ? (
            <button type="button" className="btn btn-primary" onClick={() => run(() => api(`/api/folders/${id}`, { method: "PATCH", json: { resolved: true } }))}><CheckCircle2 className="h-5 w-5" aria-hidden /> Mon problème est réglé</button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => run(() => api(`/api/folders/${id}`, { method: "PATCH", json: { resolved: false } }))}>Rouvrir le dossier</button>
          )}
        </div>
        {!f.resolved_at && <p className="text-sm text-muted">« Mon problème est réglé » classe le dossier et désactive ses rappels.</p>}
      </form>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><FileText className="h-5 w-5 text-orange" aria-hidden /> Documents</h2>
          {d.documents.length === 0 ? <p className="mt-2 text-muted">Ajoutez un document à ce dossier depuis sa page de résultat.</p> : (
            <ul className="mt-3 grid gap-2">{d.documents.map((doc) => <li key={doc.id}><Link href={`/documents/${doc.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 hover:border-navy/30"><span className="min-w-0 truncate font-semibold">{doc.title}</span><UrgencyBadge level={doc.urgency} /></Link></li>)}</ul>
          )}
          {d.letters.length > 0 && (
            <>
              <p className="mt-4 font-semibold">Courriers</p>
              <ul className="mt-2 grid gap-1">{d.letters.map((l) => <li key={l.id}><Link className="text-orange underline" href={`/courriers/${l.id}`}>{l.title}</Link></li>)}</ul>
            </>
          )}
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarClock className="h-5 w-5 text-orange" aria-hidden /> Échéances</h2>
          {d.deadlines.length === 0 ? <p className="mt-2 text-muted">Aucune échéance.</p> : (
            <ul className="mt-3 grid gap-2">{d.deadlines.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3"><span><span className="block font-semibold">{x.label}</span><span className="text-sm text-muted">{fr(x.due_date)}</span></span>{x.confirmed_at ? <span className="chip bg-ok-soft text-ok">Confirmée</span> : <Link href="/rappels" className="chip bg-warn-soft text-warn">À confirmer</Link>}</li>)}</ul>
          )}
          <Link href="/rappels" className="mt-3 inline-block font-semibold text-orange underline">Ajouter une échéance</Link>
        </section>
      </div>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ListTodo className="h-5 w-5 text-orange" aria-hidden /> Pièces</h2>
        <ul className="mt-3 grid gap-2">
          {d.pieces.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <input type="checkbox" className="check" checked={p.status === "recue"} onChange={(e) => run(() => api(`/api/folders/${id}/pieces`, { method: "PATCH", json: { piece: p.id, status: e.target.checked ? "recue" : "manquante" } }))} aria-label={`${p.label} reçue`} />
              <span className={`flex-1 ${p.status === "recue" ? "text-muted line-through" : "font-semibold"}`}>{p.label}</span>
              <span className={`chip ${p.status === "recue" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{p.status === "recue" ? "Reçue" : "Manquante"}</span>
              <button className="btn btn-ghost !min-h-10 !px-2 text-danger" onClick={() => run(() => api(`/api/folders/${id}/pieces`, { method: "PATCH", json: { piece: p.id, remove: true } }))} aria-label="Retirer"><Trash2 className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (piece.trim().length > 1) void run(async () => { await api(`/api/folders/${id}/pieces`, { method: "POST", json: { label: piece } }); setPiece(""); }); }}>
          <input className="input flex-1" placeholder="Ex. Avis d'imposition 2025" value={piece} onChange={(e) => setPiece(e.target.value)} aria-label="Nouvelle pièce" />
          <button className="btn btn-outline" aria-label="Ajouter la pièce"><Plus className="h-5 w-5" /></button>
        </form>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Chronologie</h2>
        {d.events.length === 0 ? <p className="mt-2 text-muted">Aucun événement pour l'instant.</p> : (
          <ol className="mt-4 grid gap-4 border-l-2 border-orange/40 pl-5">
            {d.events.map((x) => (
              <li key={x.id} className="relative">
                <span className="absolute -left-[1.72rem] top-1.5 h-3 w-3 rounded-full bg-orange" aria-hidden />
                <p className="text-sm text-muted">{fr(x.event_date)} · {KINDS[x.kind as keyof typeof KINDS]}</p>
                <p className="font-semibold">{x.label}</p>
              </li>
            ))}
          </ol>
        )}
        <form className="mt-5 grid gap-3 sm:grid-cols-[10rem_12rem_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (ev.label.trim().length > 1) void run(async () => { await api(`/api/folders/${id}/events`, { method: "POST", json: ev }); setEv({ ...ev, label: "" }); }); }}>
          <input type="date" className="input" value={ev.event_date} onChange={(e) => setEv({ ...ev, event_date: e.target.value })} aria-label="Date" />
          <select className="input" value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })} aria-label="Type">{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input className="input" placeholder="Ex. Appel à la CAF, dossier en cours" value={ev.label} onChange={(e) => setEv({ ...ev, label: e.target.value })} aria-label="Description" />
          <button className="btn btn-outline">Ajouter</button>
        </form>
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href={`/rendez-vous?dossier=${id}`} className="btn btn-navy"><UserRound className="h-5 w-5" aria-hidden /> Préparer un rendez-vous</Link>
        <button className="btn btn-danger" onClick={async () => { if (confirm("Supprimer ce dossier ? Les documents ne sont pas supprimés.")) { await api(`/api/folders/${id}`, { method: "DELETE" }); location.href = "/dossiers"; } }}><Trash2 className="h-5 w-5" aria-hidden /> Supprimer le dossier</button>
      </div>
    </div>
  );
}
