"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, UserRound } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, PageTitle, ProNotice } from "@/components/ui";
import { APPOINTMENT_TARGETS } from "@/lib/appointments";

export function AppointmentsHome({ folders, sheets, plan, initialFolder }: { folders: { id: string; name: string }[]; sheets: { id: string; title: string; target: string; updated_at: string }[]; plan: string; initialFolder: string }) {
  const [target, setTarget] = useState("france_services");
  const [folder, setFolder] = useState(initialFolder);
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>("/api/appointments", { method: "POST", json: { target, folder_id: folder || null, use_ai: useAi } });
      location.href = `/rendez-vous/${r.id}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Création impossible.");
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Rendez-vous" title="Préparer un rendez-vous">
        Une fiche avec le résumé, la chronologie, les pièces à apporter et les questions à poser. Allô Papiers ne réserve aucun rendez-vous : prenez-le directement auprès de l'interlocuteur.
      </PageTitle>
      <div className="card grid gap-4 p-5 sm:p-6">
        <div>
          <label className="field-label" htmlFor="target">Avec qui&nbsp;?</label>
          <select id="target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>{Object.entries(APPOINTMENT_TARGETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div>
          <label className="field-label" htmlFor="folder">À partir de quel dossier&nbsp;? <span className="font-normal text-muted">(facultatif)</span></label>
          <select id="folder" className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">Aucun — fiche vierge à compléter</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <label className={`flex items-start gap-3 ${plan !== "plus" ? "opacity-60" : ""}`}>
          <input type="checkbox" className="check" checked={useAi} disabled={plan !== "plus" || !folder} onChange={(e) => setUseAi(e.target.checked)} />
          <span><Sparkles className="mr-1 inline h-4 w-4 text-orange" aria-hidden />Faire préparer la fiche par l'IA à partir du dossier {plan !== "plus" && <span className="text-muted">(offre Plus)</span>}</span>
        </label>
        {error && <Alert tone="danger">{error}</Alert>}
        <button className="btn btn-primary" onClick={create} disabled={busy}><UserRound className="h-5 w-5" aria-hidden /> {busy ? "Préparation…" : "Créer la fiche"}</button>
      </div>
      {sheets.length > 0 && (
        <section className="card mt-6 p-5">
          <h2 className="text-lg font-semibold">Mes fiches</h2>
          <ul className="mt-3 grid gap-2">{sheets.map((s) => <li key={s.id}><Link href={`/rendez-vous/${s.id}`} className="block rounded-xl border border-line p-3 font-semibold hover:border-navy/30">{s.title} <span className="block text-sm font-normal text-muted">{new Date(s.updated_at).toLocaleDateString("fr-FR")}</span></Link></li>)}</ul>
        </section>
      )}
      <ProNotice className="mt-6" />
    </div>
  );
}
