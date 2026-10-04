"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, FolderOpen, Plus } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, EmptyState, PageTitle, Spinner, StatusBadge } from "@/components/ui";

type F = { id: string; name: string; goal: string | null; organism: string | null; next_action: string | null; status: "a_traiter" | "en_attente" | "traite" | "envoye"; resolved_at: string | null; documents: number; pieces_manquantes: number; prochaine_echeance: string | null };

export function Folders() {
  const [list, setList] = useState<F[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", organism: "", next_action: "" });
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ folders: F[] }>("/api/folders").then((r) => setList(r.folders)).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible."));
  useEffect(() => void load(), []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ id: string }>("/api/folders", { method: "POST", json: Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim())) });
      location.href = `/dossiers/${r.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible.");
    }
  }

  return (
    <div className="container-page max-w-4xl pb-10">
      <PageTitle eyebrow="Suivi" title="Mes dossiers">Regroupez les courriers, réponses et pièces d'une même démarche, avec la prochaine action et les échéances.</PageTitle>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {!open ? (
        <button className="btn btn-primary mb-6" onClick={() => setOpen(true)}><Plus className="h-5 w-5" aria-hidden /> Nouveau dossier</button>
      ) : (
        <form onSubmit={create} className="card mb-6 grid gap-4 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Nouveau dossier</h2>
          <div><label className="field-label" htmlFor="f-name">Nom du dossier</label><input id="f-name" className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Aide au logement 2026" /></div>
          <div><label className="field-label" htmlFor="f-goal">Objectif <span className="font-normal text-muted">(facultatif)</span></label><input id="f-goal" className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Ex. Faire rétablir mes droits" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="f-org">Organisme concerné</label><input id="f-org" className="input" value={form.organism} onChange={(e) => setForm({ ...form, organism: e.target.value })} placeholder="Ex. CAF" /></div>
            <div><label className="field-label" htmlFor="f-next">Prochaine action</label><input id="f-next" className="input" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="Ex. Envoyer l'attestation" /></div>
          </div>
          <div className="flex gap-3"><button className="btn btn-primary">Créer</button><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button></div>
        </form>
      )}
      {!list && !error && <Spinner />}
      {list?.length === 0 && !open && <EmptyState icon={<FolderOpen className="h-7 w-7" />} title="Aucun dossier">Un dossier rassemble tout ce qui concerne une démarche : courriers reçus, réponses, pièces, rendez-vous.</EmptyState>}
      <ul className="grid gap-3 md:grid-cols-2">
        {list?.map((f) => (
          <li key={f.id}>
            <Link href={`/dossiers/${f.id}`} className={`card block h-full p-5 hover:shadow-lg ${f.resolved_at ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                {f.resolved_at ? <span className="chip bg-ok-soft text-ok"><CheckCircle2 className="h-4 w-4" aria-hidden /> Réglé</span> : <StatusBadge status={f.status} />}
                {f.organism && <span className="chip">{f.organism}</span>}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{f.name}</h2>
              {f.next_action && !f.resolved_at && <p className="mt-1 text-[0.97rem]"><strong>Prochaine action :</strong> {f.next_action}</p>}
              <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted">
                <span>{f.documents} document{f.documents > 1 ? "s" : ""}</span>
                {f.pieces_manquantes > 0 && <span className="font-semibold text-warn">{f.pieces_manquantes} pièce{f.pieces_manquantes > 1 ? "s" : ""} manquante{f.pieces_manquantes > 1 ? "s" : ""}</span>}
                {f.prochaine_echeance && <span><CalendarClock className="mr-1 inline h-4 w-4" aria-hidden />{new Date(`${f.prochaine_echeance}T12:00:00Z`).toLocaleDateString("fr-FR")}</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
