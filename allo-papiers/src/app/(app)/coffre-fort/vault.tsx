"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert, PageTitle, Spinner } from "@/components/ui";
import { StepUpPanel } from "@/components/step-up";

type Doc = { id: string; title: string; created_at: string; page_count: number; sensitive: boolean };
type File = { id: string; mime: string; position: number };

export function Vault({ elevated, until, hasPasskey }: { elevated: boolean; until: string | null; hasPasskey: boolean }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (elevated) api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents)).catch(() => setDocs([]));
  }, [elevated]);

  async function openDoc(id: string) {
    try {
      const r = await withStepUp(() => api<{ files: File[] }>(`/api/documents/${id}`));
      setFiles((f) => ({ ...f, [id]: r.files }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ouverture impossible.");
    }
  }

  if (!elevated)
    return (
      <div className="container-page max-w-md py-10">
        <div className="card p-6">
          <StepUpPanel title="Ouvrir le coffre-fort" onDone={() => location.reload()} />
        </div>
        {!hasPasskey && <p className="mt-4 text-center text-[0.95rem] text-muted">Astuce : ajoutez une <Link href="/compte/securite" className="font-semibold underline">clé d'accès</Link> pour ouvrir le coffre avec votre empreinte ou votre visage.</p>}
      </div>
    );

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Coffre-fort" title="Mes pages originales">
        Coffre ouvert{until ? ` jusqu'à ${new Date(until).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : ""}. Il se referme automatiquement. Chaque ouverture et chaque téléchargement sont inscrits dans votre journal d'accès.
      </PageTitle>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <button className="btn btn-navy" onClick={async () => { await api("/api/stepup/close", { method: "POST" }); location.reload(); }}><Lock className="h-5 w-5" aria-hidden /> Refermer le coffre</button>
        <Link href="/compte/securite#journal" className="btn btn-outline"><ShieldCheck className="h-5 w-5" aria-hidden /> Journal des accès</Link>
      </div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {!docs ? <Spinner /> : docs.length === 0 ? <p className="text-muted">Aucun document dans le coffre.</p> : (
        <ul className="grid gap-3">
          {docs.map((d) => (
            <li key={d.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{d.title}</p><p className="text-sm text-muted">{new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.page_count} page{d.page_count > 1 ? "s" : ""}</p></div>
                {!files[d.id] && <button className="btn btn-outline !min-h-11" onClick={() => openDoc(d.id)}><LockOpen className="h-5 w-5" aria-hidden /> Afficher les fichiers</button>}
              </div>
              {files[d.id] && (
                <ul className="mt-3 grid gap-2">
                  {files[d.id].map((f) => (
                    <li key={f.id}><a className="btn btn-ghost w-full justify-start border border-line" href={`/api/documents/${d.id}/files/${f.id}?telecharger=1`}><Download className="h-5 w-5" aria-hidden /> Télécharger {f.mime === "application/pdf" ? "le PDF" : `la page ${f.position + 1}`}</a></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <Alert tone="info" className="mt-6">
        Vos fichiers sont stockés dans un espace privé en Europe, chiffrés, sans adresse publique. Pour être analysés, ils sont lus temporairement par notre serveur et notre fournisseur d'IA : ce n'est pas un chiffrement « de bout en bout ». <Link href="/confidentialite" className="font-semibold underline">En savoir plus</Link>
      </Alert>
    </div>
  );
}
