"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, ProNotice } from "@/components/ui";
import type { Question } from "@/lib/letters/types";

type Tpl = { id: string; title: string; description: string; domain: string; warning: string | null; professionalNotice: boolean; sending: { mode: string; note: string }; questions: Question[]; plus: boolean };

function visible(qs: Question[], a: Record<string, string>) {
  return qs.filter((q) => {
    if (!q.showIf) return true;
    const v = a[q.showIf.id] ?? "";
    return Array.isArray(q.showIf.equals) ? q.showIf.equals.includes(v) : q.showIf.equals === v;
  });
}

const PER_STEP = 3;

export function Field({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const id = `q-${q.id}`;
  const label = (
    <label htmlFor={id} className="field-label">
      {q.label} {!q.required && <span className="font-normal text-muted">(facultatif)</span>}
    </label>
  );
  if (q.type === "radio" && q.options)
    return (
      <fieldset>
        <legend className="field-label">{q.label}</legend>
        <div className="grid gap-2">
          {q.options.map((o) => (
            <label key={o.value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 ${value === o.value ? "border-orange bg-orange-soft" : "border-line bg-white"}`}>
              <input type="radio" name={id} className="check" checked={value === o.value} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
        {q.help && <span className="field-help">{q.help}</span>}
      </fieldset>
    );
  return (
    <div>
      {label}
      {q.type === "textarea" ? (
        <textarea id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} maxLength={3000} />
      ) : q.type === "select" && q.options ? (
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choisir…</option>
          {q.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input
            id={id}
            className={`input ${q.type === "money" ? "!pr-10" : ""}`}
            type={q.type === "date" ? "date" : "text"}
            inputMode={q.type === "money" || q.type === "number" ? "decimal" : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            maxLength={300}
          />
          {q.type === "money" && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">€</span>}
        </div>
      )}
      {q.help && <span className="field-help">{q.help}</span>}
    </div>
  );
}

export function Wizard({ template: t, plan, defaultName }: { template: Tpl; plan: string; defaultName: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sender, setSender] = useState({ name: defaultName, line1: "", line2: "", postalCode: "", city: "" });
  const [recipient, setRecipient] = useState({ name: "", line1: "", line2: "", postalCode: "", city: "" });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => visible(t.questions, answers), [t.questions, answers]);
  const qSteps = Math.max(1, Math.ceil(qs.length / PER_STEP));
  const totalSteps = qSteps + 1; // + adresses
  const isAddress = step === qSteps;
  const current = qs.slice(step * PER_STEP, step * PER_STEP + PER_STEP);
  const missing = current.filter((q) => q.required && !(answers[q.id] ?? "").trim());

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const clean = Object.fromEntries(Object.entries(answers).filter(([k]) => qs.some((q) => q.id === k)));
      const r = await api<{ id: string }>("/api/letters", { method: "POST", json: { template_id: t.id, answers: clean, sender, recipient: { ...recipient, source: "saisie" } } });
      location.href = `/courriers/${r.id}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Création impossible.");
      setBusy(false);
    }
  }

  if (t.plus && plan !== "plus")
    return (
      <div className="container-page max-w-2xl py-10">
        <Alert tone="info" title="Modèle de l'offre Plus">Ce modèle fait partie de l'offre Plus. <Link href="/compte/abonnement" className="font-semibold underline">Voir l'offre</Link></Alert>
      </div>
    );

  return (
    <div className="container-page max-w-2xl pb-10">
      <div className="mb-6 mt-6 md:mt-10">
        <Link href="/courriers" className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Toutes les démarches</Link>
        <p className="eyebrow mt-4">{t.domain}</p>
        <h1 className="font-display mt-2 text-[1.9rem] font-semibold leading-tight md:text-[2.3rem]">{t.title}</h1>
        <p className="mt-2 text-muted">{t.description}</p>
      </div>
      {t.warning && step === 0 && <Alert tone="warn" title="Avant de commencer" className="mb-4">{t.warning}</Alert>}
      {t.professionalNotice && step === 0 && <ProNotice className="mb-4" />}

      <div className="mb-4 flex items-center gap-3" aria-label={`Étape ${step + 1} sur ${totalSteps}`}>
        <div className="h-2 flex-1 rounded-full bg-sand"><div className="h-2 rounded-full bg-orange transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} /></div>
        <span className="text-sm font-semibold text-muted">{step + 1}/{totalSteps}</span>
      </div>

      <form
        className="card grid gap-5 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddress) void create();
          else if (missing.length === 0) setStep((s) => s + 1);
        }}
      >
        {!isAddress ? (
          current.map((q) => <Field key={q.id} q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />)
        ) : (
          <>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-lg font-semibold">Vos coordonnées (expéditeur)</legend>
              <input className="input" placeholder="Nom et prénom" autoComplete="name" value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} aria-label="Nom et prénom" />
              <input className="input" placeholder="Adresse" autoComplete="address-line1" value={sender.line1} onChange={(e) => setSender({ ...sender, line1: e.target.value })} aria-label="Adresse" />
              <input className="input" placeholder="Complément (facultatif)" autoComplete="address-line2" value={sender.line2} onChange={(e) => setSender({ ...sender, line2: e.target.value })} aria-label="Complément d'adresse" />
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <input className="input" placeholder="Code postal" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={sender.postalCode} onChange={(e) => setSender({ ...sender, postalCode: e.target.value.replace(/\D/g, "") })} aria-label="Code postal" />
                <input className="input" placeholder="Ville" autoComplete="address-level2" value={sender.city} onChange={(e) => setSender({ ...sender, city: e.target.value })} aria-label="Ville" />
              </div>
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-lg font-semibold">Destinataire</legend>
              <input className="input" placeholder="Nom (entreprise, organisme, personne)" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} aria-label="Nom du destinataire" />
              <input className="input" placeholder="Adresse" value={recipient.line1} onChange={(e) => setRecipient({ ...recipient, line1: e.target.value })} aria-label="Adresse du destinataire" />
              <input className="input" placeholder="Complément (facultatif)" value={recipient.line2} onChange={(e) => setRecipient({ ...recipient, line2: e.target.value })} aria-label="Complément d'adresse du destinataire" />
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <input className="input" placeholder="Code postal" inputMode="numeric" maxLength={5} value={recipient.postalCode} onChange={(e) => setRecipient({ ...recipient, postalCode: e.target.value.replace(/\D/g, "") })} aria-label="Code postal du destinataire" />
                <input className="input" placeholder="Ville" value={recipient.city} onChange={(e) => setRecipient({ ...recipient, city: e.target.value })} aria-label="Ville du destinataire" />
              </div>
              <span className="field-help">Vous pourrez compléter ces adresses plus tard. Utilisez l'adresse indiquée sur vos documents (contrat, courrier reçu) ou sur le site officiel du destinataire.</span>
            </fieldset>
            <p className="rounded-xl bg-sand/60 p-3 text-[0.95rem]"><strong>Envoi conseillé :</strong> {t.sending.note}</p>
          </>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="h-5 w-5" aria-hidden /> Retour</button> : <span />}
          {isAddress ? (
            <button className="btn btn-primary" disabled={busy}><Check className="h-5 w-5" aria-hidden /> Préparer mon courrier</button>
          ) : (
            <button className="btn btn-primary" disabled={missing.length > 0}>Continuer <ArrowRight className="h-5 w-5" aria-hidden /></button>
          )}
        </div>
        {!isAddress && missing.length > 0 && <p className="text-sm text-muted">Répondez aux questions obligatoires pour continuer.</p>}
      </form>
    </div>
  );
}
