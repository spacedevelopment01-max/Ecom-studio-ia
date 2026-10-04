"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, FileDown, Paperclip, ScanLine, Sparkles, X } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert, Spinner } from "@/components/ui";
import { pieceLabel } from "@/lib/pieces";

type Doc = { id: string; label: string; type: string | null; pages: number };
type Suggestion = {
  need: { type: string; libelle: string };
  match: { id: string; label: string; period: string | null; valid_until: string | null } | null;
  others: number;
  note: string | null;
};

/**
 * Pièces justificatives du courrier. « Apporter mes documents enregistrés » retrouve dans le
 * coffre la pièce la plus récente (et encore valable si une date est écrite) pour chaque besoin.
 * Rien n'est envoyé : la personne vérifie, retire ou ajoute, puis valide elle-même.
 */
export function PiecesPanel({
  letterId,
  needs,
  initialAttachments,
  docs,
  excludeId,
  reviewed,
  autoAttached = null,
}: {
  letterId: string;
  needs: { type: string; libelle: string }[];
  initialAttachments: string[];
  docs: Doc[];
  excludeId: string | null;
  reviewed: boolean;
  autoAttached?: number | null;
}) {
  const [attached, setAttached] = useState<string[]>(initialAttachments);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(() => {
    if (autoAttached == null || needs.length === 0) return null;
    return autoAttached > 0
      ? `${autoAttached} pièce${autoAttached > 1 ? "s" : ""} sur ${needs.length} retrouvée${autoAttached > 1 ? "s" : ""} dans votre coffre et jointe${autoAttached > 1 ? "s" : ""} automatiquement. Vérifiez qu'il s'agit des bonnes.`
      : "Aucune des pièces demandées n'est encore dans votre coffre : scannez-les ci-dessous, elles seront rangées et jointes.";
  });
  const byId = new Map(docs.map((d) => [d.id, d]));

  async function bring() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ suggestions: Suggestion[]; attachments: string[] }>(`/api/letters/${letterId}/attachments`, { method: "POST" });
      setSuggestions(r.suggestions);
      setAttached(r.attachments);
      const found = r.suggestions.filter((s) => s.match).length;
      setMsg(
        r.suggestions.length === 0
          ? "Aucune pièce particulière n'est demandée pour ce courrier. Vous pouvez en ajouter depuis votre coffre ci-dessous."
          : `${found} pièce${found > 1 ? "s" : ""} sur ${r.suggestions.length} trouvée${found > 1 ? "s" : ""} dans votre coffre et ajoutée${found > 1 ? "s" : ""}. Vérifiez qu'il s'agit des bonnes.`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Recherche impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function save(next: string[]) {
    setAttached(next);
    try {
      await api(`/api/letters/${letterId}/attachments`, { method: "PUT", json: { document_ids: next } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    }
  }

  async function downloadWithPieces() {
    setError(null);
    try {
      const blob = await withStepUp(async () => {
        const r = await fetch(`/api/letters/${letterId}/pdf?avec_pieces=1`);
        if (r.status === 403) throw new ApiError(403, "verification_requise", "");
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new ApiError(r.status, d.error ?? "erreur", d.message ?? "PDF impossible.");
        }
        return r.blob();
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "courrier-avec-pieces.pdf";
      a.click();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "verification_annulee")) setError(e instanceof ApiError ? e.message : "PDF impossible.");
    }
  }

  const available = docs.filter((d) => d.id !== excludeId && !attached.includes(d.id));
  const retour = encodeURIComponent(`/courriers/${letterId}`);

  return (
    <section id="pieces" className="card mt-5 scroll-mt-24 p-5 sm:p-6" aria-labelledby="titre-pieces">
      <h2 id="titre-pieces" className="flex items-center gap-2 text-xl font-semibold"><Paperclip className="h-5 w-5 text-orange" aria-hidden /> Pièces justificatives</h2>
      {needs.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.97rem] text-muted">{excludeId ? "Pièces demandées dans le courrier reçu :" : "Pièces généralement utiles pour cette démarche (à vérifier auprès du destinataire) :"}</p>
          <ul className="mt-2 grid gap-1.5">
            {needs.map((n, i) => {
              const s = suggestions?.find((x) => x.need.type === n.type && x.need.libelle === n.libelle);
              const has = s ? Boolean(s.match) : docs.some((d) => d.type === n.type && attached.includes(d.id));
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  {has ? <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" aria-hidden /> : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-line" aria-hidden />}
                  <span className="font-medium">{n.libelle}</span>
                  {s && !s.match && (
                    <>
                      <span className="text-sm text-warn">{s.note ?? "pas encore dans votre coffre"}</span>
                      <Link href={`/nouveau?mode=piece&type=${n.type}&retour=${retour}`} className="inline-flex items-center gap-1 text-sm font-semibold text-orange underline"><ScanLine className="h-4 w-4" aria-hidden /> La scanner maintenant</Link>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button className="btn btn-primary mt-4 w-full" onClick={bring} disabled={busy}>
        {busy ? <Spinner label="Recherche dans votre coffre…" /> : <><Sparkles className="h-5 w-5" aria-hidden /> Apporter mes documents enregistrés</>}
      </button>
      {msg && <Alert tone="ok" className="mt-3">{msg}</Alert>}
      {error && <Alert tone="danger" className="mt-3">{error}</Alert>}

      <div className="mt-4">
        <p className="font-semibold">Joint à ce courrier ({attached.length})</p>
        {attached.length === 0 ? (
          <p className="mt-1 text-muted">Aucune pièce jointe pour l'instant.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {attached.map((id) => {
              const d = byId.get(id);
              return (
                <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d?.label ?? "Document"}</span>
                    <span className="text-sm text-muted">{pieceLabel(d?.type)} · {d?.pages ?? 1} page{(d?.pages ?? 1) > 1 ? "s" : ""}</span>
                  </span>
                  <button className="btn btn-ghost !min-h-10 !px-2" onClick={() => save(attached.filter((x) => x !== id))} aria-label={`Retirer ${d?.label ?? "ce document"}`}><X className="h-5 w-5" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {available.length > 0 && (
        <div className="mt-4">
          <label htmlFor="ajout-piece" className="field-label">Ajouter un autre document de mon coffre</label>
          <select id="ajout-piece" className="input" value="" onChange={(e) => e.target.value && save([...attached, e.target.value].slice(0, 8))}>
            <option value="">Choisir…</option>
            {available.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
      )}
      <p className="mt-3 text-sm">
        <Link href={`/nouveau?mode=piece&retour=${retour}`} className="font-semibold text-orange underline">Scanner une nouvelle pièce</Link>
      </p>

      <button className="btn btn-outline mt-4 w-full" onClick={downloadWithPieces} disabled={!reviewed || attached.length === 0}>
        <FileDown className="h-5 w-5" aria-hidden /> Télécharger le courrier avec ses pièces (PDF)
      </button>
      <p className="mt-2 text-sm text-muted">Les originaux sont inclus : une vérification (empreinte ou code) est demandée. Les pièces jointes sont aussi reprises si vous choisissez l'envoi en recommandé.</p>
    </section>
  );
}
