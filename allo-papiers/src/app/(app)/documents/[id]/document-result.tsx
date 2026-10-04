"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, FolderInput, Lock, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { AnalysisView } from "@/components/analysis-view";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert, STATUS_LABELS, Spinner } from "@/components/ui";
import type { Analysis } from "@/lib/ai/schema";
import { PARCOURS } from "@/lib/parcours";

type Props = {
  doc: { id: string; title: string; status: string; user_status: keyof typeof STATUS_LABELS; parcours: keyof typeof PARCOURS; folder_id: string | null; sensitive: boolean; error_code: string | null; created_at: string; page_count: number };
  analysis: { result: Analysis; created_at: string; provider: string } | null;
  checklist: { step_index: number; done: boolean }[];
  deadline: { id: string; confirmed_at: string | null; enabled: boolean } | null;
  files: { id: string; mime: string; position: number; page_count: number }[];
  folders: { id: string; name: string }[];
  locked: boolean;
  plan: "free" | "plus";
};

export function DocumentResult({ doc, analysis, checklist, deadline, files, folders, locked, plan }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [originals, setOriginals] = useState<{ url: string; mime: string }[] | null>(null);
  const [status, setStatus] = useState(doc.user_status);
  const [folder, setFolder] = useState(doc.folder_id ?? "");
  const [sensitive, setSensitive] = useState(doc.sensitive);

  async function patch(body: Record<string, unknown>) {
    try {
      await withStepUp(() => api(`/api/documents/${doc.id}`, { method: "PATCH", json: body }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Modification impossible.");
      throw e;
    }
  }

  async function unlock() {
    try {
      await withStepUp(() => api(`/api/documents/${doc.id}`).catch((e) => {
        if (e instanceof ApiError && e.status === 403) throw new ApiError(403, "verification_requise", e.message);
        throw e;
      }));
      location.reload();
    } catch {
      /* annulé */
    }
  }

  async function showOriginals() {
    setBusy(true);
    setError(null);
    try {
      const urls: { url: string; mime: string }[] = [];
      for (const f of files) {
        const res = await withStepUp(async () => {
          const r = await fetch(`/api/documents/${doc.id}/files/${f.id}`);
          if (r.status === 403) throw new ApiError(403, "verification_requise", "Vérification requise");
          if (!r.ok) throw new ApiError(r.status, "erreur", "Ouverture impossible.");
          return r.blob();
        });
        urls.push({ url: URL.createObjectURL(res), mime: f.mime });
      }
      setOriginals(urls);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "verification_annulee")) setError(e instanceof ApiError ? e.message : "Ouverture impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${doc.id}/analyze`, { method: "POST" });
      location.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L'analyse n'a pas abouti. Aucun crédit n'a été utilisé.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer définitivement ce document, ses pages et son analyse ? Cette action est irréversible.")) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      location.href = "/documents";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-6 mt-6 md:mt-10">
        <Link href="/documents" className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Mes documents</Link>
        <h1 className="font-display mt-3 text-[1.9rem] font-semibold leading-tight md:text-[2.4rem]">{doc.title}</h1>
        <p className="mt-1 text-muted">{PARCOURS[doc.parcours]?.label} · {doc.page_count} page{doc.page_count > 1 ? "s" : ""} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}</p>
      </div>
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      {locked ? (
        <div className="card p-6 text-center">
          <Lock className="mx-auto h-10 w-10 text-orange" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold">Document protégé</h2>
          <p className="mt-2 text-muted">Vous avez demandé une vérification renforcée pour ce document.</p>
          <button className="btn btn-primary mt-5" onClick={unlock}><ShieldCheck className="h-5 w-5" /> Ouvrir avec vérification</button>
        </div>
      ) : doc.status === "analyzed" && analysis ? (
        <>
          {analysis.provider === "demo" && <Alert tone="warn" className="mb-5" title="Résultat simulé">Ce résultat a été produit en mode démonstration : il ne correspond pas à votre document.</Alert>}
          <AnalysisView analysis={analysis.result} mode="document" documentId={doc.id} checklist={checklist} deadline={deadline} plan={plan} />
        </>
      ) : doc.status === "analyzing" ? (
        <div className="card p-6"><Spinner label="Analyse en cours… Rechargez la page dans un instant." /></div>
      ) : (
        <div className="card p-6">
          <h2 className="text-xl font-semibold">{doc.status === "failed" ? "L'analyse n'a pas abouti" : "Document pas encore analysé"}</h2>
          <p className="mt-2 text-muted">{doc.status === "failed" ? "Aucun crédit n'a été utilisé. Vous pouvez réessayer." : "Vos pages sont enregistrées."}</p>
          <button className="btn btn-primary mt-5 w-full sm:w-auto" onClick={retry} disabled={busy || doc.page_count === 0}><RefreshCw className="h-5 w-5" aria-hidden /> {doc.status === "failed" ? "Réessayer l'analyse" : "Lancer l'analyse"}</button>
        </div>
      )}

      {/* Suivi et gestion */}
      <section className="card mt-5 grid gap-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Suivi de ce document</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="statut">Statut</label>
            <select id="statut" className="input" value={status} onChange={async (e) => { const v = e.target.value as typeof status; setStatus(v); await patch({ user_status: v }).catch(() => {}); }}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="dossier"><FolderInput className="mr-1 inline h-4 w-4" aria-hidden />Dossier</label>
            <select id="dossier" className="input" value={folder} onChange={async (e) => { setFolder(e.target.value); await patch({ folder_id: e.target.value || null }).catch(() => {}); }}>
              <option value="">Aucun dossier</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {folders.length === 0 && <Link href="/dossiers" className="field-help underline">Créer un dossier</Link>}
          </div>
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="check" checked={sensitive} onChange={async (e) => { const v = e.target.checked; try { await patch({ sensitive: v }); setSensitive(v); } catch {} }} />
          <span>Exiger une vérification (empreinte ou code) pour afficher aussi le résultat de ce document</span>
        </label>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
          <button className="btn btn-outline" onClick={showOriginals} disabled={busy || files.length === 0}><Eye className="h-5 w-5" aria-hidden /> Voir les pages originales</button>
          <button className="btn btn-danger" onClick={remove}><Trash2 className="h-5 w-5" aria-hidden /> Supprimer le document</button>
        </div>
        <p className="text-sm text-muted">Les originaux sont rangés dans votre coffre-fort : leur ouverture demande une vérification et elle est inscrite dans votre journal d'accès.</p>
        {originals && (
          <div className="grid gap-3">
            {originals.map((o, i) =>
              o.mime === "application/pdf" ? (
                <a key={i} href={o.url} target="_blank" rel="noreferrer" className="btn btn-outline">Ouvrir le PDF {i + 1}</a>
              ) : (
                <img key={i} src={o.url} alt={`Page originale ${i + 1}`} className="w-full rounded-xl border border-line" />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
