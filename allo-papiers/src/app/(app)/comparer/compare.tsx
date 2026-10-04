"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitCompare } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, PageTitle, ProNotice, Spinner } from "@/components/ui";
import type { Comparison } from "@/lib/ai/schema";

type Doc = { id: string; title: string; created_at: string; status: string };
const KINDS = [
  { v: "paie", l: "Deux fiches de paie" },
  { v: "contrat", l: "Deux versions d'un contrat" },
  { v: "devis_facture", l: "Un devis (A) et une facture (B)" },
];

function Src({ s }: { s: { page: number; citation: string } | null }) {
  if (!s) return null;
  return <span className="mt-1 block text-sm text-muted">« {s.citation} » — p. {s.page}</span>;
}

export function Compare() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [kind, setKind] = useState("paie");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Comparison | null>(null);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents.filter((d) => d.status !== "analyzing"))).catch(() => setDocs([]));
    api<{ plan: string }>("/api/account/usage").then((u) => setPlan(u.plan)).catch(() => {});
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api<{ comparison: Comparison }>("/api/compare", { method: "POST", json: { a, b, kind } });
      setResult(r.comparison);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Comparaison impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-4xl pb-10">
      <PageTitle eyebrow="Comparaison" title="Comparer deux documents">
        Les différences sont montrées avec leur source. Les changements observés sont séparés de leur interprétation possible. Un écart ne prouve rien à lui seul.
      </PageTitle>
      {plan !== "plus" && (
        <Alert tone="info" title="Fonction de l'offre Plus" className="mb-5">La comparaison fait partie de l'offre Plus. <Link href="/compte/abonnement" className="font-semibold underline">Voir l'offre</Link></Alert>
      )}
      <div className="card grid gap-4 p-5 sm:p-6">
        <div>
          <label className="field-label" htmlFor="kind">Que voulez-vous comparer&nbsp;?</label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select>
        </div>
        {!docs ? <Spinner /> : docs.length < 2 ? (
          <Alert tone="info">Ajoutez d'abord au moins deux documents. <Link href="/nouveau" className="font-semibold underline">Nouveau document</Link></Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ id: "a", v: a, set: setA, l: "Document A (le plus ancien)" }, { id: "b", v: b, set: setB, l: "Document B (le plus récent)" }].map((x) => (
              <div key={x.id}>
                <label className="field-label" htmlFor={`doc-${x.id}`}>{x.l}</label>
                <select id={`doc-${x.id}`} className="input" value={x.v} onChange={(e) => x.set(e.target.value)}>
                  <option value="">Choisir…</option>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.title} ({new Date(d.created_at).toLocaleDateString("fr-FR")})</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={run} disabled={busy || !a || !b || a === b || plan !== "plus"}><GitCompare className="h-5 w-5" aria-hidden /> Comparer</button>
        {busy && <Spinner label="Comparaison en cours…" />}
        {error && <Alert tone="danger">{error}</Alert>}
      </div>

      {result && (
        <section className="mt-6 grid gap-4">
          <Alert tone="info">{result.avertissement}</Alert>
          <div className="card overflow-hidden">
            <h2 className="p-5 text-xl font-semibold">Différences constatées</h2>
            <ul className="divide-y divide-line">
              {result.differences.map((d, i) => (
                <li key={i} className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr]">
                  <div><p className="font-semibold">{d.element}</p><p className="mt-1 text-[0.96rem]">{d.observation}</p></div>
                  <div className="rounded-xl bg-sand/60 p-3"><p className="text-xs font-bold uppercase text-muted">A</p><p className="font-medium">{d.valeur_a ?? "—"}</p><Src s={d.source_a} /></div>
                  <div className="rounded-xl bg-orange-soft/70 p-3"><p className="text-xs font-bold uppercase text-muted">B</p><p className="font-medium">{d.valeur_b ?? "—"}</p><Src s={d.source_b} /></div>
                  {(d.interpretation_possible || d.a_verifier_aupres_de) && (
                    <div className="text-[0.95rem] text-muted md:col-span-3">
                      {d.interpretation_possible && <p><strong className="text-ink">Interprétation possible (non certaine) :</strong> {d.interpretation_possible}</p>}
                      {d.a_verifier_aupres_de && <p><strong className="text-ink">À vérifier auprès de :</strong> {d.a_verifier_aupres_de}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {result.limites.length > 0 && <Alert tone="warn" title="Limites"><ul className="list-disc pl-5">{result.limites.map((l, i) => <li key={i}>{l}</li>)}</ul></Alert>}
        </section>
      )}
      <ProNotice className="mt-6" />
    </div>
  );
}
