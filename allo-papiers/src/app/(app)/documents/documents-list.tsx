"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, FileText, Lock, Plus, Search } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, EmptyState, PageTitle, Spinner, StatusBadge, STATUS_LABELS, UrgencyBadge } from "@/components/ui";
import { PARCOURS } from "@/lib/parcours";

type Doc = {
  id: string;
  created_at: string;
  title: string;
  parcours: keyof typeof PARCOURS;
  status: "uploaded" | "analyzing" | "analyzed" | "failed";
  user_status: keyof typeof STATUS_LABELS;
  page_count: number;
  organism: string | null;
  urgency: "vert" | "orange" | "rouge" | null;
  deadline: string | null;
  deadline_kind: string | null;
  summary: string | null;
  sensitive: boolean;
};

export function DocumentsList() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [parcours, setParcours] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (statut) p.set("statut", statut);
      if (parcours) p.set("parcours", parcours);
      api<{ documents: Doc[] }>(`/api/documents?${p}`)
        .then((r) => setDocs(r.documents))
        .catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible."));
    }, 250);
    return () => clearTimeout(t);
  }, [q, statut, parcours]);

  return (
    <div className="container-page max-w-4xl pb-10">
      <PageTitle eyebrow="Historique" title="Mes documents" />
      <div className="card grid gap-3 p-4 sm:grid-cols-[1.5fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input !pl-12" placeholder="Rechercher (titre, organisme…)" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={parcours} onChange={(e) => setParcours(e.target.value)} aria-label="Filtrer par type">
          <option value="">Tous les types</option>
          {Object.entries(PARCOURS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="mt-5" aria-live="polite">
        {error && <Alert tone="danger">{error}</Alert>}
        {!docs && !error && <Spinner />}
        {docs && docs.length === 0 && (
          <EmptyState icon={<FileText className="h-7 w-7" />} title={q || statut || parcours ? "Aucun document ne correspond" : "Aucun document pour le moment"} action={<Link href="/nouveau" className="btn btn-primary"><Plus className="h-5 w-5" /> Nouveau document</Link>}>
            {q || statut || parcours ? "Modifiez la recherche ou les filtres." : "Prenez en photo votre premier courrier : l'explication arrive en moins d'une minute."}
          </EmptyState>
        )}
        <ul className="grid gap-3">
          {docs?.map((d) => (
            <li key={d.id}>
              <Link href={d.status === "uploaded" || d.status === "failed" ? `/documents/${d.id}` : `/documents/${d.id}`} className="card block p-5 transition-shadow hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                  {d.status === "analyzed" ? <UrgencyBadge level={d.urgency} /> : <span className="chip">{d.status === "failed" ? "Analyse échouée" : d.status === "analyzing" ? "Analyse en cours" : "Pas encore analysé"}</span>}
                  <StatusBadge status={d.user_status} />
                  {d.sensitive && <span className="chip"><Lock className="h-4 w-4" aria-hidden /> Protégé</span>}
                </div>
                <h2 className="mt-3 text-lg font-semibold">{d.title}</h2>
                {d.summary && <p className="mt-1 line-clamp-2 text-[0.97rem] text-muted">{d.summary}</p>}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
                  <span>{PARCOURS[d.parcours]?.label}</span>
                  <span>{d.page_count} page{d.page_count > 1 ? "s" : ""}</span>
                  {d.deadline && <span className="font-semibold text-ink"><CalendarClock className="mr-1 inline h-4 w-4" aria-hidden />{new Date(`${d.deadline}T12:00:00Z`).toLocaleDateString("fr-FR")}{d.deadline_kind === "calculee" ? " (calculée)" : ""}</span>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
