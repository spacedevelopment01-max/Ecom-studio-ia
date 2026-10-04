"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ClipboardCopy, FileDown, Save, Send, Sparkles, Trash2 } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { OrientationPanel } from "@/components/orientation";
import { PiecesPanel } from "./pieces-panel";
import { Alert, ProNotice } from "@/components/ui";

type Addr = { name: string; line1: string; line2: string; postalCode: string; city: string };
type Letter = {
  id: string;
  title: string;
  body: string;
  sender: Addr & { place?: string; signature?: string };
  recipient: Addr & { source: "courrier" | "annuaire" | "saisie"; conflict: boolean; conflictResolved: boolean };
  reviewed_at: string | null;
  updated_at: string;
  document_id: string | null;
  attachments?: string[];
  needs?: { type: string; libelle: string }[];
};

const ORG_KIND: Record<string, string> = { caf: "caf", cpam: "cpam", impots: "impots", mairie: "mairie", urssaf: "urssaf", france_travail: "france_travail", prefecture: "prefecture", retraite: "carsat" };

function parseCourrierAddress(text: string): { postalCode: string; city: string; line1: string } {
  const lines = text.split(/\n|,/).map((l) => l.trim()).filter(Boolean);
  const cpLine = lines.find((l) => /\b\d{5}\b/.test(l)) ?? "";
  const m = cpLine.match(/\b(\d{5})\b\s*(.*)/);
  return { postalCode: m?.[1] ?? "", city: m?.[2] ?? "", line1: lines.filter((l) => l !== cpLine)[0] ?? "" };
}

function AddressFields({ value, onChange, prefix }: { value: Addr; onChange: (a: Addr) => void; prefix: string }) {
  return (
    <div className="grid gap-3">
      <input className="input" aria-label={`${prefix} – nom`} placeholder="Nom" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <input className="input" aria-label={`${prefix} – adresse`} placeholder="Adresse" value={value.line1} onChange={(e) => onChange({ ...value, line1: e.target.value })} />
      <input className="input" aria-label={`${prefix} – complément`} placeholder="Complément (facultatif)" value={value.line2} onChange={(e) => onChange({ ...value, line2: e.target.value })} />
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <input className="input" aria-label={`${prefix} – code postal`} placeholder="Code postal" inputMode="numeric" maxLength={5} value={value.postalCode} onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, "") })} />
        <input className="input" aria-label={`${prefix} – ville`} placeholder="Ville" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </div>
    </div>
  );
}

export function LetterEditor({
  letter: initial,
  template,
  courrierAddress,
  organismType,
  vaultDocs,
  autoAttached,
  plan,
}: {
  letter: Letter;
  template: { title: string; warning: string | null; professionalNotice: boolean; sendingNote: string; checks: string[] } | null;
  courrierAddress: { name: string; text: string; page: number } | null;
  organismType: string | null;
  vaultDocs: { id: string; label: string; type: string | null; pages: number }[];
  autoAttached?: number | null;
  plan: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [sender, setSender] = useState<Letter["sender"]>({ place: "", signature: "", ...initial.sender, name: initial.sender.name ?? "", line1: initial.sender.line1 ?? "", line2: initial.sender.line2 ?? "", postalCode: initial.sender.postalCode ?? "", city: initial.sender.city ?? "" });
  const [recipient, setRecipient] = useState<Letter["recipient"]>(() => Object.assign({ name: "", line1: "", line2: "", postalCode: "", city: "", source: "saisie" as const, conflict: false, conflictResolved: false }, initial.recipient));
  const [reviewed, setReviewed] = useState(Boolean(initial.reviewed_at && initial.reviewed_at >= initial.updated_at));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ texte: string; changements: string[]; points_a_verifier: string[] } | null>(null);
  const [instruction, setInstruction] = useState("");
  const first = useRef(true);
  const dirtyRef = useRef(false);
  const saving$ = useRef<Promise<void> | null>(null);

  const parsed = courrierAddress ? parseCourrierAddress(courrierAddress.text) : null;
  const conflict = Boolean(parsed?.postalCode && recipient.postalCode && parsed.postalCode !== recipient.postalCode);

  // Enregistrement automatique (les modifications de l'utilisateur sont toujours conservées)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setDirty(true);
    dirtyRef.current = true;
    setReviewed(false);
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, sender, recipient]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save(): Promise<void> {
    // Un seul enregistrement à la fois : la relecture attend toujours la fin de l'enregistrement en cours.
    const run = (saving$.current ?? Promise.resolve()).catch(() => {}).then(() => doSave());
    saving$.current = run.finally(() => {
      if (saving$.current === run) saving$.current = null;
    });
    return run;
  }

  async function doSave() {
    if (!dirtyRef.current) return; // rien à enregistrer (évite d'annuler une relecture déjà confirmée)
    dirtyRef.current = false;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/letters/${initial.id}`, { method: "PATCH", json: { title, body, sender, recipient: { ...recipient, conflict } } });
      setDirty(false);
    } catch (e) {
      dirtyRef.current = true;
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible. Vos modifications restent affichées : réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed(v: boolean) {
    if (!v) return setReviewed(false);
    setReviewed(true);
    try {
      await save(); // termine tout enregistrement en cours ou en attente avant de marquer la relecture
      await api(`/api/letters/${initial.id}/review`, { method: "POST" });
    } catch (e) {
      setReviewed(false);
      setError(e instanceof ApiError ? e.message : "Impossible d'enregistrer la relecture.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setMsg("Texte copié.");
    } catch {
      setError("Copie automatique impossible : sélectionnez le texte puis copiez-le.");
    }
  }

  async function rewrite() {
    setError(null);
    try {
      const r = await api<{ proposal: { texte: string; changements: string[]; points_a_verifier: string[] } }>(`/api/letters/${initial.id}/rewrite`, { method: "POST", json: { instruction } });
      setProposal(r.proposal);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Reformulation impossible.");
    }
  }

  async function prepareSend() {
    setError(null);
    try {
      if (dirty) await save();
      const r = await withStepUp(() => api<{ id: string }>("/api/sends", { method: "POST", json: { letter_id: initial.id } }));
      location.href = `/envois/${r.id}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Préparation de l'envoi impossible.");
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce courrier ?")) return;
    await api(`/api/letters/${initial.id}`, { method: "DELETE" });
    location.href = "/courriers";
  }

  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-5 mt-6 md:mt-10">
        <Link href="/courriers" className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Mes courriers</Link>
        <input className="font-display mt-3 w-full bg-transparent text-[1.8rem] font-semibold leading-tight outline-none focus:underline md:text-[2.2rem]" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titre du courrier" />
        <p className="text-sm text-muted" aria-live="polite">{saving ? "Enregistrement…" : dirty ? "Modifications non enregistrées" : "Enregistré"}</p>
      </div>
      {template?.warning && <Alert tone="warn" className="mb-4">{template.warning}</Alert>}
      {template?.professionalNotice && <ProNotice className="mb-4" />}
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {msg && <Alert tone="ok" className="mb-4">{msg}</Alert>}

      <section className="card p-5 sm:p-6">
        <label htmlFor="body" className="text-xl font-semibold">Votre courrier</label>
        <p className="mt-1 text-[0.95rem] text-muted">Modifiez librement. Remplacez chaque [à compléter]. La formule de politesse et la signature sont ajoutées automatiquement au PDF.</p>
        <textarea id="body" className="input prose-letter mt-3 !min-h-[24rem]" value={body} onChange={(e) => setBody(e.target.value)} />
        {/\[[^\]]*compl[ée]ter[^\]]*\]|\[Votre/i.test(body) && <p className="mt-2 font-semibold text-warn">Il reste des éléments entre crochets à compléter.</p>}
        {plan === "plus" ? (
          <details className="mt-4 rounded-2xl border border-line p-4">
            <summary className="cursor-pointer font-semibold"><Sparkles className="mr-1 inline h-5 w-5 text-orange" aria-hidden /> Améliorer la formulation avec l'IA</summary>
            <input className="input mt-3" placeholder="Ex. plus court, plus ferme mais poli…" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            <button className="btn btn-outline mt-3" onClick={rewrite}>Proposer une reformulation</button>
            {proposal && (
              <div className="mt-4">
                <p className="text-sm font-bold uppercase text-muted">Proposition (non appliquée)</p>
                <div className="prose-letter mt-2 rounded-xl bg-sand/60 p-3 text-[0.97rem]">{proposal.texte}</div>
                {proposal.changements.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-muted">{proposal.changements.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                {proposal.points_a_verifier.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-warn">{proposal.points_a_verifier.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-primary !min-h-11" onClick={() => { setBody(proposal.texte); setProposal(null); }}>Utiliser cette version</button>
                  <button className="btn btn-ghost" onClick={() => setProposal(null)}>Garder mon texte</button>
                </div>
              </div>
            )}
          </details>
        ) : (
          <p className="mt-3 text-sm text-muted">Reformulation par IA : offre Plus.</p>
        )}
      </section>

      <section className="card mt-5 grid gap-6 p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">Expéditeur</h2>
          <div className="mt-3"><AddressFields prefix="Expéditeur" value={sender} onChange={(a) => setSender({ ...sender, ...a })} /></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Fait à (ville)" aria-label="Fait à" value={sender.place ?? ""} onChange={(e) => setSender({ ...sender, place: e.target.value })} />
            <input className="input" placeholder="Signature (nom)" aria-label="Signature" value={sender.signature ?? ""} onChange={(e) => setSender({ ...sender, signature: e.target.value })} />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Destinataire</h2>
          {courrierAddress && (
            <div className="mt-3 rounded-2xl border border-line bg-sand/50 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-muted">Adresse écrite dans le courrier reçu (page {courrierAddress.page})</p>
              <p className="mt-1 whitespace-pre-line">{[courrierAddress.name, courrierAddress.text].filter(Boolean).join("\n")}</p>
              <button
                className="btn btn-outline mt-3 !min-h-11"
                onClick={() => setRecipient({ ...recipient, name: courrierAddress.name || recipient.name, line1: parsed?.line1 ?? "", line2: "", postalCode: parsed?.postalCode ?? "", city: parsed?.city ?? "", source: "courrier", conflictResolved: false })}
              >
                Utiliser cette adresse
              </button>
            </div>
          )}
          <div className="mt-3"><AddressFields prefix="Destinataire" value={recipient} onChange={(a) => setRecipient({ ...recipient, ...a, source: recipient.source === "courrier" ? "saisie" : recipient.source, conflictResolved: false })} /></div>
          <p className="mt-2 text-sm text-muted">Origine : {recipient.source === "courrier" ? "adresse extraite du courrier" : recipient.source === "annuaire" ? "annuaire officiel" : "saisie par vous"}</p>
          {conflict && (
            <Alert tone="warn" title="Adresses différentes" className="mt-3">
              Le code postal saisi ne correspond pas à l'adresse écrite dans le courrier. Vérifiez auprès de l'organisme avant tout envoi.
              <label className="mt-2 flex items-start gap-3">
                <input type="checkbox" className="check" checked={recipient.conflictResolved} onChange={(e) => setRecipient({ ...recipient, conflictResolved: e.target.checked })} />
                <span>J'ai vérifié : cette adresse est la bonne.</span>
              </label>
            </Alert>
          )}
          {organismType && ORG_KIND[organismType] && (
            <details className="mt-4 rounded-2xl border border-line p-4">
              <summary className="cursor-pointer font-semibold">Consulter l'annuaire officiel pour comparer</summary>
              <div className="mt-3"><OrientationPanel initialKind={ORG_KIND[organismType]} lockKind /></div>
            </details>
          )}
        </div>
      </section>

      {template && template.checks.length > 0 && (
        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">À vérifier avant d'envoyer</h2>
          <ul className="mt-3 grid list-disc gap-1.5 pl-6">{template.checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
          <p className="mt-3 rounded-xl bg-sand/60 p-3 text-[0.95rem]"><strong>Envoi conseillé :</strong> {template.sendingNote}</p>
        </section>
      )}

      <PiecesPanel letterId={initial.id} needs={initial.needs ?? []} initialAttachments={initial.attachments ?? []} docs={vaultDocs} excludeId={initial.document_id} reviewed={reviewed} autoAttached={autoAttached ?? null} />

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Relecture</h2>
        <label className="mt-3 flex items-start gap-3 rounded-2xl bg-orange-soft/70 p-4">
          <input type="checkbox" className="check" checked={reviewed} onChange={(e) => void markReviewed(e.target.checked)} />
          <span className="font-semibold">J'ai relu ce courrier en entier et je l'ai complété.</span>
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button className="btn btn-outline" onClick={copy}><ClipboardCopy className="h-5 w-5" aria-hidden /> Copier</button>
          <a className={`btn btn-primary ${reviewed ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!reviewed} href={reviewed ? `/api/letters/${initial.id}/pdf` : undefined}><FileDown className="h-5 w-5" aria-hidden /> PDF</a>
          <button className="btn btn-outline" onClick={() => { dirtyRef.current = true; void save(); }} disabled={saving}><Save className="h-5 w-5" aria-hidden /> Enregistrer</button>
        </div>
        {!reviewed && <p className="mt-2 text-sm text-muted">Le PDF et l'envoi sont disponibles après relecture.</p>}
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Envoyer en recommandé (facultatif)</h2>
        <p className="mt-1 text-[0.97rem] text-muted">Vous verrez un récapitulatif complet (texte, adresse, pièces, prix) et devrez valider explicitement. Rien ne part sans votre accord.</p>
        <p className="mt-2 text-[0.95rem] text-muted">Les pièces jointes ci-dessus seront ajoutées à l'envoi.</p>
        <button className="btn btn-navy mt-4 w-full sm:w-auto" onClick={prepareSend} disabled={!reviewed}><Send className="h-5 w-5" aria-hidden /> Préparer l'envoi recommandé</button>
      </section>

      <button className="btn btn-danger mt-6" onClick={remove}><Trash2 className="h-5 w-5" aria-hidden /> Supprimer ce courrier</button>
    </div>
  );
}
