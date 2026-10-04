"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, FileText, ImagePlus, Lock, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { checkAndCompress } from "@/components/image-quality";
import { Alert, PageTitle, ProNotice, Spinner } from "@/components/ui";
import { DOCUMENT_RULES, PARCOURS, PARCOURS_IDS, type ParcoursId } from "@/lib/parcours";
import { PIECE_TYPES, PIECE_TYPE_IDS, VAULT_CATEGORIES, type PieceType } from "@/lib/pieces";

type Usage = { plan: "free" | "plus"; used: { document: number; classement: number }; limits: { document: number; classement: number }; aiMode: "anthropic" | "demo" | "absent"; aiConsent: boolean; renewsOn: string };
type Page = { id: string; mime: string; pages: number; preview: string | null; name: string; warnings: string[] };

const STEPS_MSG = ["Lecture des pages…", "Repérage de l'organisme et de la demande…", "Recherche des dates écrites…", "Préparation des étapes et du brouillon…", "Vérification des passages cités…"];

export function NewDocument({ mode = "courrier", presetType = "", retour = "" }: { mode?: "courrier" | "piece"; presetType?: string; retour?: string }) {
  const isPiece = mode === "piece";
  const [pieceType, setPieceType] = useState<string>(presetType && presetType in PIECE_TYPES ? presetType : "");
  const [ranging, setRanging] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [parcours, setParcours] = useState<ParcoursId | null>(mode === "piece" ? "courrier" : null);
  const [docId, setDocId] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stepMsg, setStepMsg] = useState(0);
  const [consent, setConsent] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // Référence immédiate (et non l'état React) : toutes les pages d'un même import vont dans le MÊME document.
  const docRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    api<Usage>("/api/account/usage").then(setUsage).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible."));
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    const t = setInterval(() => setStepMsg((s) => (s + 1) % STEPS_MSG.length), 3500);
    return () => clearInterval(t);
  }, [analyzing]);

  const totalPages = pages.reduce((s, p) => s + p.pages, 0);
  const remaining = usage ? Math.max(0, usage.limits.document - usage.used.document) : 0;

  function ensureDoc(): Promise<string> {
    docRef.current ??= api<{ id: string }>("/api/documents", { method: "POST", json: { parcours, kind: isPiece ? "piece" : "courrier" } })
      .then((r) => {
        setDocId(r.id);
        return r.id;
      })
      .catch((e) => {
        docRef.current = null;
        throw e;
      });
    return docRef.current;
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const files = Array.from(list);
    let count = totalPages;
    for (const file of files) {
      if (count + 1 > DOCUMENT_RULES.maxPages) {
        setError(`Un document compte au maximum ${DOCUMENT_RULES.maxPages} pages.`);
        break;
      }
      setUploading((u) => u + 1);
      try {
        let blob: Blob = file;
        let warnings: string[] = [];
        let preview: string | null = null;
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          if (file.size > DOCUMENT_RULES.maxFileBytes) throw new ApiError(413, "trop_lourd", `« ${file.name} » dépasse 4 Mo. Prenez plutôt les pages en photo.`);
        } else if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
          const res = await checkAndCompress(file).catch(() => {
            throw new ApiError(415, "format", `« ${file.name} » ne peut pas être lue par ce navigateur. Essayez une photo JPEG ou un PDF.`);
          });
          blob = res.blob;
          warnings = res.report.warnings;
          preview = URL.createObjectURL(blob);
        } else {
          throw new ApiError(415, "format", `« ${file.name} » : format non accepté (photo ou PDF uniquement).`);
        }
        const id = await ensureDoc();
        const fd = new FormData();
        fd.append("file", blob, file.name);
        const r = await api<{ id: string; mime: string; pages: number }>(`/api/documents/${id}/files`, { method: "POST", body: fd });
        count += r.pages;
        setPages((p) => [...p, { id: r.id, mime: r.mime, pages: r.pages, preview, name: file.name, warnings }]);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Envoi impossible. Vérifiez votre connexion et réessayez.");
      } finally {
        setUploading((u) => u - 1);
      }
    }
    if (cameraRef.current) cameraRef.current.value = "";
    if (importRef.current) importRef.current.value = "";
  }

  async function remove(p: Page) {
    if (!docId) return;
    try {
      await api(`/api/documents/${docId}/files/${p.id}`, { method: "DELETE" });
      setPages((list) => list.filter((x) => x.id !== p.id));
      if (p.preview) URL.revokeObjectURL(p.preview);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  async function move(i: number, dir: -1 | 1) {
    if (!docId) return;
    const next = [...pages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setPages(next);
    await api(`/api/documents/${docId}/files`, { method: "PUT", json: { order: next.map((p) => p.id) } }).catch(() => {});
  }

  /** Ranger la pièce : IA si disponible (le type choisi sert d'indice), sinon classement à la main. */
  async function ranger() {
    if (!docId) return;
    setError(null);
    setRanging(true);
    const manual = () =>
      api(`/api/documents/${docId}/classify`, {
        method: "POST",
        json: { manual: { type_piece: pieceType, libelle: PIECE_TYPES[pieceType as PieceType].label } },
      });
    try {
      const canAi = usage && usage.aiMode !== "absent" && (usage.aiConsent || consent);
      if (canAi) {
        if (usage && !usage.aiConsent) await api("/api/account/consent-ai", { method: "POST", json: { accept: true } });
        try {
          await api(`/api/documents/${docId}/classify`, { method: "POST", json: { hint: pieceType || null } });
        } catch (e) {
          if (!pieceType) throw e;
          await manual(); // l'IA n'a pas abouti : on range avec le type choisi
        }
      } else {
        if (!pieceType) throw new ApiError(400, "type", "Choisissez le type de document pour le ranger.");
        await manual();
      }
      location.href = /^\/(?![\/\\])/.test(retour) ? retour : `/coffre-fort?range=${docId}`;
    } catch (e) {
      setRanging(false);
      setError(e instanceof ApiError ? e.message : "Rangement impossible. Réessayez.");
    }
  }

  async function analyze() {
    if (!docId) return;
    setError(null);
    setAnalyzing(true);
    try {
      if (usage && !usage.aiConsent) {
        await api("/api/account/consent-ai", { method: "POST", json: { accept: true } });
      }
      await api(`/api/documents/${docId}/analyze`, { method: "POST" });
      location.href = `/documents/${docId}`;
    } catch (e) {
      setAnalyzing(false);
      setError(e instanceof ApiError ? e.message : "L'analyse n'a pas abouti. Aucun crédit n'a été utilisé. Vous pouvez réessayer.");
    }
  }

  if (!usage && !error) return <div className="container-page py-16"><Spinner /></div>;

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Nouveau document" title={isPiece ? "Ranger un justificatif" : "Comprendre un document"}>
        {isPiece
          ? "Pièce d'identité, RIB, avis d'imposition, quittance… Photographiez-le : il est reconnu et rangé dans votre coffre, prêt à être joint à vos courriers."
          : `Un document = un même courrier, jusqu'à ${DOCUMENT_RULES.maxPages} pages. Les pages d'un même courrier comptent pour un seul document.`}
      </PageTitle>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-sand p-1.5" role="tablist" aria-label="Que voulez-vous faire ?">
        <Link href="/nouveau" role="tab" aria-selected={!isPiece} className={`rounded-xl px-3 py-3 text-center font-semibold ${!isPiece ? "bg-white shadow-sm" : "text-muted"}`}>Comprendre un courrier</Link>
        <Link href="/nouveau?mode=piece" role="tab" aria-selected={isPiece} className={`rounded-xl px-3 py-3 text-center font-semibold ${isPiece ? "bg-white shadow-sm" : "text-muted"}`}>Ranger un justificatif</Link>
      </div>

      {usage && isPiece && (
        <p className="mb-5 rounded-2xl border border-line bg-white/70 px-4 py-3 text-[0.98rem]">
          Rangement automatique : <strong>{Math.max(0, usage.limits.classement - usage.used.classement)}</strong> restant(s) ce mois-ci. Ranger en choisissant le type vous-même est toujours gratuit et illimité.
        </p>
      )}
      {usage && !isPiece && (
        <p className="mb-5 rounded-2xl border border-line bg-white/70 px-4 py-3 text-[0.98rem]">
          {usage.plan === "free" ? "Offre gratuite" : "Offre Plus"} : <strong>{remaining}</strong> document{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""} ce mois-ci
          {usage.aiMode === "demo" && <span className="text-muted"> (mode démonstration : aucun crédit utilisé)</span>}.
        </p>
      )}
      {usage?.aiMode === "absent" && !isPiece && (
        <Alert tone="warn" title="Analyse par IA pas encore activée" className="mb-5">
          Vous pouvez préparer vos pages, mais l'analyse automatique n'est pas encore branchée sur ce site. En attendant, la <Link href="/courriers" className="font-semibold underline">rédaction guidée de courriers</Link> fonctionne.
        </Alert>
      )}
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      {/* Étape 1 (justificatif) : type de pièce, facultatif */}
      {isPiece && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">1. De quel document s'agit-il&nbsp;?</h2>
          <label htmlFor="piece-type" className="field-label mt-3">Type de document</label>
          <select id="piece-type" className="input" value={pieceType} onChange={(e) => setPieceType(e.target.value)}>
            <option value="">{usage?.aiMode === "absent" ? "Choisir…" : "Je ne sais pas — l'IA le reconnaît"}</option>
            {Object.entries(VAULT_CATEGORIES).map(([cat, c]) => (
              <optgroup key={cat} label={c.label}>
                {PIECE_TYPE_IDS.filter((t) => PIECE_TYPES[t].category === cat).map((t) => <option key={t} value={t}>{PIECE_TYPES[t].label}</option>)}
              </optgroup>
            ))}
          </select>
          <span className="field-help">Vous pourrez toujours corriger le classement depuis votre coffre-fort.</span>
        </section>
      )}

      {/* Étape 1 : parcours */}
      {!isPiece && <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">1. Quel type de document&nbsp;?</h2>
        <div className="mt-4 grid gap-2.5">
          {PARCOURS_IDS.map((id) => {
            const p = PARCOURS[id];
            const locked = p.plus && usage?.plan !== "plus";
            const selected = parcours === id;
            return (
              <button
                key={id}
                type="button"
                disabled={Boolean(docId) && !selected}
                onClick={() => (locked ? (location.href = "/compte/abonnement") : setParcours(id))}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${selected ? "border-orange bg-orange-soft" : "border-line bg-white hover:border-navy/40"} disabled:opacity-50`}
                aria-pressed={selected}
              >
                <span>
                  <span className="block font-semibold">{p.label}</span>
                  <span className="block text-[0.93rem] text-muted">{p.hint}</span>
                </span>
                {locked ? <span className="chip shrink-0 bg-orange-soft text-orange-dark"><Lock className="h-4 w-4" aria-hidden /> Plus</span> : selected ? <span className="chip shrink-0 bg-orange text-white">Choisi</span> : null}
              </button>
            );
          })}
        </div>
      </section>}

      {/* Étape 2 : pages */}
      <section className={`card mt-5 p-5 sm:p-6 ${parcours ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!parcours}>
        <h2 className="text-xl font-semibold">2. Ajoutez les pages</h2>
        <p className="mt-1 text-[0.97rem] text-muted">Posez la feuille à plat, bien éclairée, sans reflet. Cadrez toute la page.</p>
        <p className="mt-3 flex items-start gap-2.5 rounded-2xl bg-navy/[0.04] p-3 text-[0.95rem] text-ink/85">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
          <span>
            Vos pages sont chiffrées et rangées dans votre espace privé. Ne photographiez jamais un mot de passe, un code de carte ou un code reçu par SMS&nbsp;: aucune démarche ne les demande.{" "}
            <Link href="/securite" className="font-semibold text-orange underline">Sécurité de vos documents</Link>
          </span>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn btn-primary w-full" onClick={() => cameraRef.current?.click()} disabled={!parcours || analyzing}>
            <Camera className="h-6 w-6" aria-hidden /> Prendre une photo
          </button>
          <button type="button" className="btn btn-outline w-full" onClick={() => importRef.current?.click()} disabled={!parcours || analyzing}>
            <ImagePlus className="h-6 w-6" aria-hidden /> Importer photos ou PDF
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addFiles(e.target.files)} aria-label="Prendre une photo" />
        <input ref={importRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} aria-label="Importer des fichiers" />

        {uploading > 0 && <p className="mt-4"><Spinner label="Vérification et envoi sécurisé…" /></p>}

        {pages.length > 0 && (
          <ol className="mt-5 grid gap-3">
            {pages.map((p, i) => (
              <li key={p.id} className="flex gap-3 rounded-2xl border border-line bg-white p-3">
                <div className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand">
                  {p.preview ? <img src={p.preview} alt={`Page ${i + 1}`} className="h-full w-full object-cover" /> : <FileText className="h-8 w-8 text-muted" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.mime === "application/pdf" ? `PDF · ${p.pages} page${p.pages > 1 ? "s" : ""}` : `Page ${i + 1}`}</p>
                  <p className="truncate text-sm text-muted">{p.name}</p>
                  {p.warnings.length > 0 ? (
                    <ul className="mt-1 grid gap-0.5 text-[0.9rem] text-warn">{p.warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>
                  ) : (
                    p.preview && <p className="mt-1 text-[0.9rem] text-ok">✓ Photo nette et lisible</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button className="btn btn-ghost !min-h-10 !px-2" onClick={() => move(i, -1)} disabled={i === 0 || analyzing} aria-label="Monter"><ArrowUp className="h-5 w-5" /></button>
                  <button className="btn btn-ghost !min-h-10 !px-2" onClick={() => move(i, 1)} disabled={i === pages.length - 1 || analyzing} aria-label="Descendre"><ArrowDown className="h-5 w-5" /></button>
                  <button className="btn btn-ghost !min-h-10 !px-2 text-danger" onClick={() => remove(p)} disabled={analyzing} aria-label="Supprimer cette page"><Trash2 className="h-5 w-5" /></button>
                </div>
              </li>
            ))}
          </ol>
        )}
        {pages.some((p) => p.warnings.length > 0) && (
          <p className="mt-3 flex items-center gap-2 text-[0.95rem] text-muted"><RotateCcw className="h-4 w-4" aria-hidden /> Conseil : supprimez la page signalée et reprenez la photo.</p>
        )}
        <p className="mt-3 text-sm text-muted">{totalPages}/{DOCUMENT_RULES.maxPages} pages · photo ou PDF (4 Mo max par fichier).</p>
      </section>

      {/* Étape 3 (justificatif) : ranger */}
      {isPiece && (
        <section className={`card mt-5 p-5 sm:p-6 ${pages.length ? "" : "opacity-50"}`}>
          <h2 className="text-xl font-semibold">3. Ranger dans mon coffre</h2>
          {usage && usage.aiMode !== "absent" && !usage.aiConsent && (
            <label className="mt-4 flex items-start gap-3 rounded-2xl bg-sand/60 p-4">
              <input type="checkbox" className="check" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="text-[0.97rem]">J'accepte que le document soit lu par notre fournisseur d'IA (Anthropic, hors Union européenne, sans entraînement, supprimé sous 30 jours) pour être reconnu. Sans cela, choisissez le type vous-même.</span>
            </label>
          )}
          <button className="btn btn-primary mt-5 w-full" onClick={ranger} disabled={!pages.length || uploading > 0 || ranging || (!pieceType && (usage?.aiMode === "absent" || (!usage?.aiConsent && !consent)))}>
            {ranging ? <Spinner label="Rangement…" /> : <><Sparkles className="h-6 w-6" aria-hidden /> Ranger dans mon coffre</>}
          </button>
          <p className="mt-3 text-sm text-muted">Les pièces sensibles (identité, banque, santé…) sont automatiquement protégées par une vérification à l'ouverture.</p>
        </section>
      )}

      {/* Étape 3 : analyse */}
      {!isPiece && <section className={`card mt-5 p-5 sm:p-6 ${pages.length ? "" : "opacity-50"}`}>
        <h2 className="text-xl font-semibold">3. Lancer l'analyse</h2>
        {usage && !usage.aiConsent && (
          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-sand/60 p-4">
            <input type="checkbox" className="check" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-[0.97rem]">
              J'accepte que mon document soit transmis à notre fournisseur d'intelligence artificielle (Anthropic) pour être analysé. Il est traité hors de l'Union européenne, n'est pas utilisé pour entraîner l'IA et est supprimé de ses systèmes sous 30 jours selon ses conditions.{" "}
              <Link href="/confidentialite" className="font-semibold text-orange underline">En savoir plus</Link>
            </span>
          </label>
        )}
        {analyzing ? (
          <div className="mt-5 rounded-2xl bg-orange-soft p-5" role="status" aria-live="polite">
            <Spinner label={STEPS_MSG[stepMsg]} />
            <p className="mt-2 text-[0.95rem] text-muted">Cela prend en général moins d'une minute. Gardez cette page ouverte.</p>
          </div>
        ) : (
          <button
            className="btn btn-primary mt-5 w-full"
            onClick={analyze}
            disabled={!pages.length || uploading > 0 || (usage ? !usage.aiConsent && !consent : true) || usage?.aiMode === "absent" || remaining <= 0}
          >
            <Sparkles className="h-6 w-6" aria-hidden /> Analyser ce document
          </button>
        )}
        {usage && remaining <= 0 && (
          <Alert tone="warn" className="mt-4">
            Vous avez utilisé vos documents de ce mois-ci. Ils se renouvellent le {new Date(usage.renewsOn).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
            {usage.plan === "free" && <> <Link href="/compte/abonnement" className="font-semibold underline">Découvrir l'offre Plus</Link>.</>}
          </Alert>
        )}
        <p className="mt-3 text-sm text-muted">Si l'analyse échoue, aucun crédit n'est utilisé et vous pouvez réessayer.</p>
      </section>}
      <ProNotice className="mt-6" />
    </div>
  );
}
