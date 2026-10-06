"use client";
/**
 * « Décrivez votre activité » avec une aide : repères de ce qui manque pendant la saisie, et un assistant en
 * 5 étapes courtes (suggestions selon le métier, à cocher) qui rédige une description complète et structurée :
 * prestations, clientèle, déroulé, délais, devis, questions fréquentes, points forts, objectif et style du site.
 * Sans IA, rien d'inventé : seules les réponses et les suggestions cochées par le client sont reprises.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Circle, Plus, Sparkles, X } from "lucide-react";
import { Button, cx, Input, Textarea } from "../ui";
import { useLang, useT } from "../i18n";
import { briefChecklist, briefFromText, CLIENT_CHOICES, composeBrief, emptyBrief, GOAL_CHOICES, LOOK_CHOICES, STRENGTH_CHOICES, TONE_CHOICES, type BriefAnswers } from "@/lib/activity-brief";
import { packFor } from "@/lib/activity-packs";

type Bi = { fr: string; en: string };

function Chips({ options, value, onChange, label }: { options: Bi[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  const { lang } = useLang();
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const text = lang === "en" ? o.en : o.fr;
        const on = value.includes(text);
        return (
          <button key={o.fr} type="button" role="checkbox" aria-checked={on} onClick={() => onChange(on ? value.filter((x) => x !== text) : [...value, text])} className={cx("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] transition", on ? "border-signal bg-signal-soft font-medium" : "border-line bg-card hover:border-ink")}>
            {on && <Check className="size-3.5" aria-hidden />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Suggestions à ajouter d'un clic dans une liste (une ligne chacune) ; un second clic les retire. */
function Suggest({ options, value, onChange, label }: { options: Bi[]; value: string; onChange: (v: string) => void; label: string }) {
  const { lang } = useLang();
  const t = useT();
  if (!options.length) return null;
  const rows = value.split("\n").map((l) => l.trim()).filter(Boolean);
  const has = (x: string) => rows.some((r) => r.toLowerCase().startsWith(x.toLowerCase()));
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-muted">{t("Suggestions (cochez seulement ce qui est vrai pour vous) :", "Suggestions (only tick what is true for you):")}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const x = lang === "en" ? o.en : o.fr;
          const on = has(x);
          return (
            <button key={o.fr} type="button" role="checkbox" aria-checked={on} onClick={() => onChange(on ? rows.filter((r) => !r.toLowerCase().startsWith(x.toLowerCase())).join("\n") : [...rows, x].join("\n"))} className={cx("inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs transition", on ? "border-signal bg-signal-soft font-medium" : "border-dashed border-line bg-card hover:border-ink")}>
              {on ? <Check className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
              {x}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Q({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
      {children}
    </div>
  );
}

export function ActivityBrief({ invalid, area }: { invalid?: boolean; area?: string }) {
  const t = useT();
  const { lang } = useLang();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<BriefAnswers>(emptyBrief);
  const set = (patch: Partial<BriefAnswers>) => setA((x) => ({ ...x, ...patch }));
  // Champ « Zone d'intervention » du formulaire : une zone saisie là compte aussi.
  const [areaField, setAreaField] = useState("");
  useEffect(() => {
    const el = document.getElementById("area") as HTMLInputElement | null;
    if (!el) return;
    const sync = () => setAreaField(el.value);
    sync();
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, []);
  const checks = briefChecklist(text, { area: area || areaField });
  const missing = checks.filter((c) => !c.ok);
  const draft = composeBrief(a, lang);
  const pack = useMemo(() => packFor(a.trade), [a.trade]);
  // Richesse de la description : rubriques remplies sur celles qui comptent pour le site.
  const filled = [a.trade, a.area, a.services, a.clients.length, a.needs, a.steps, a.delay, a.quote || a.cancel, a.faq, a.strengths.length || a.extra || a.since, a.proofs, a.goals.length, a.look.length, a.tone.length].filter(Boolean).length;
  const richness = Math.round((filled / 14) * 100);

  const start = () => {
    const from = briefFromText(text);
    setA({ ...emptyBrief(), ...from, area: from.area || area || areaField || "" });
    setStep(0);
    setOpen(true);
  };

  const STEPS = [t("Votre activité", "Your business"), t("Vos clients", "Your customers"), t("Comment ça se passe", "How it works"), t("Rassurer", "Reassure"), t("Votre site", "Your website")];

  return (
    <div className="grid gap-2">
      <Textarea id="description" name="description" rows={5} autoGrow value={text} onChange={(e) => setText(e.target.value)} aria-required="true" aria-invalid={invalid || undefined} placeholder={t("Ex. : Plombier chauffagiste à Lyon, dépannage 7j/7, installation de chaudières, devis gratuit.", "E.g.: Plumber and heating engineer in Leeds, emergency call-outs 7 days a week, boiler installation, free quotes.")} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs" aria-live="polite">
        {checks.map((c) => (
          <span key={c.key} className={cx("inline-flex items-center gap-1", c.ok ? "text-ok" : "text-muted")}>
            {c.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
            {t(c.fr, c.en)}
          </span>
        ))}
      </div>
      {!open ? (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="signal" onClick={start}><Sparkles className="size-4" aria-hidden /> {t("M'aider à le rédiger (recommandé)", "Help me write it (recommended)")}</Button>
            {text.trim() && missing.length > 0 && <span className="text-xs text-muted">{t(`Il manque : ${missing.map((c) => c.fr.toLowerCase()).join(", ")}.`, `Missing: ${missing.map((c) => c.en.toLowerCase()).join(", ")}.`)}</span>}
          </div>
          <p className="text-xs text-muted">{t("Plus vous en dites, plus le site est complet : 5 petites étapes avec des suggestions selon votre métier remplissent le déroulé, les questions fréquentes, les délais et le style du site.", "The more you say, the more complete the site: 5 short steps with suggestions for your trade fill in the process, FAQ, lead times and site style.")}</p>
        </div>
      ) : (
        <div className="grid gap-4 rounded-2xl border border-line bg-paper-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(`Étape ${step + 1} sur 5 · ${STEPS[step]}`, `Step ${step + 1} of 5 · ${STEPS[step]}`)}</p>
              <p className="text-xs text-muted">{t("Répondez en quelques mots, cochez les suggestions qui sont vraies. Seules vos réponses sont reprises, rien n'est inventé.", "Answer in a few words and tick the suggestions that are true. Only your answers are used, nothing is made up.")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-card" aria-label={t("Fermer l'aide", "Close the helper")}><X className="size-4" /></button>
          </div>
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((_, i) => <button key={i} type="button" tabIndex={-1} onClick={() => setStep(i)} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-signal" : "bg-line")} />)}
          </div>

          {step === 0 && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Q label={t("Votre métier", "Your trade")}><Input value={a.trade} onChange={(e) => set({ trade: e.target.value })} placeholder={t("Ex. Carrossier peintre, psychologue…", "E.g. Car body repairer, therapist…")} maxLength={80} /></Q>
                <Q label={t("Ville ou zone", "Town or area")}><Input value={a.area} onChange={(e) => set({ area: e.target.value })} placeholder={t("Ex. Mâcon et 30 km autour", "E.g. Leeds and 20 miles around")} maxLength={80} /></Q>
              </div>
              <Q label={t("Vos prestations", "Your services")} hint={t("Une par ligne. Ajoutez durée ou prix si vous voulez : « Débosselage — 1 h — à partir de 80 € ».", "One per line. Add a duration or price if you like: \"Dent repair — 1 h — from £70\".")}>
                <Suggest label={t("Prestations courantes", "Common services")} options={pack.services} value={a.services} onChange={(v) => set({ services: v })} />
                <Textarea autoGrow rows={3} value={a.services} onChange={(e) => set({ services: e.target.value })} />
              </Q>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <Q label={t("Vos clients", "Your customers")}><Chips label={t("Vos clients", "Your customers")} options={CLIENT_CHOICES} value={a.clients} onChange={(v) => set({ clients: v })} /></Q>
              <Q label={t("Pourquoi vous contactent-ils ?", "Why do they contact you?")} hint={t("Leur situation ou leur besoin au moment où ils vous cherchent. Une raison par ligne.", "Their situation or need when they look for you. One reason per line.")}>
                <Suggest label={t("Raisons courantes", "Common reasons")} options={pack.needs} value={a.needs} onChange={(v) => set({ needs: v })} />
                <Textarea autoGrow rows={2} value={a.needs} onChange={(e) => set({ needs: e.target.value })} />
              </Q>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <Q label={t("Comment se passe une prestation, étape par étape ?", "How does a job work, step by step?")} hint={t("Une étape par ligne. Elles deviennent la section « Comment ça se passe » du site.", "One step per line. They become the site's \"How it works\" section.")}>
                <Suggest label={t("Étapes habituelles", "Usual steps")} options={pack.steps} value={a.steps} onChange={(v) => set({ steps: v })} />
                <Textarea autoGrow rows={3} value={a.steps} onChange={(e) => set({ steps: e.target.value })} />
              </Q>
              <div className="grid gap-3 sm:grid-cols-3">
                <Q label={t("Délai habituel", "Usual lead time")}><Input value={a.delay} onChange={(e) => set({ delay: e.target.value })} placeholder={t("Ex. rendez-vous sous 48 h", "E.g. appointment within 48 h")} maxLength={160} /></Q>
                <Q label={t("Devis et tarifs", "Quotes and rates")}><Input value={a.quote} onChange={(e) => set({ quote: e.target.value })} placeholder={t("Ex. devis gratuit sous 24 h", "E.g. free quote within 24 h")} maxLength={200} /></Q>
                <Q label={t("Annulation ou report", "Cancellation")}><Input value={a.cancel} onChange={(e) => set({ cancel: e.target.value })} placeholder={t("Ex. gratuit jusqu'à 24 h avant", "E.g. free up to 24 h before")} maxLength={200} /></Q>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <Q label={t("Ce qui vous distingue", "What sets you apart")}>
                <Chips label={t("Points forts", "Strengths")} options={STRENGTH_CHOICES} value={a.strengths} onChange={(v) => set({ strengths: v })} />
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                  <Input value={a.since} onChange={(e) => set({ since: e.target.value })} placeholder={t("Depuis (année)", "Since (year)")} maxLength={40} aria-label={t("Depuis quelle année", "Since which year")} />
                  <Input value={a.extra} onChange={(e) => set({ extra: e.target.value })} placeholder={t("Autre (ex. véhicule de prêt, agréé assurances)", "Other (e.g. courtesy car, insurer-approved)")} maxLength={200} aria-label={t("Autre point fort", "Other strength")} />
                </div>
              </Q>
              <Q label={t("Diplômes, labels, assurances, garanties", "Qualifications, labels, insurance, guarantees")} hint={t("Seulement ce que vous pouvez prouver. Une ligne chacun.", "Only what you can prove. One per line.")}>
                <Textarea autoGrow rows={2} value={a.proofs} onChange={(e) => set({ proofs: e.target.value })} />
              </Q>
              <Q label={t("Les questions que vos clients posent souvent", "Questions your customers often ask")} hint={t("Une par ligne. Ajoutez votre réponse après le « ? » : « Travaillez-vous avec les assurances ? Oui, toutes. »", "One per line. Add your answer after the \"?\": \"Do you work with insurers? Yes, all of them.\"")}>
                <Suggest label={t("Questions courantes", "Common questions")} options={pack.questions} value={a.faq} onChange={(v) => set({ faq: v })} />
                <Textarea autoGrow rows={3} value={a.faq} onChange={(e) => set({ faq: e.target.value })} />
              </Q>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4">
              <Q label={t("À quoi doit servir le site ?", "What is the website for?")}><Chips label={t("Objectif du site", "Website goal")} options={GOAL_CHOICES} value={a.goals} onChange={(v) => set({ goals: v })} /></Q>
              <Q label={t("L'ambiance que vous voulez", "The look you want")}><Chips label={t("Ambiance", "Look")} options={LOOK_CHOICES} value={a.look} onChange={(v) => set({ look: v })} /></Q>
              <Q label={t("Le ton des textes", "The tone of the copy")}><Chips label={t("Ton", "Tone")} options={TONE_CHOICES} value={a.tone} onChange={(v) => set({ tone: v })} /></Q>
              <Q label={t("À éviter (facultatif)", "To avoid (optional)")}><Input value={a.avoid} onChange={(e) => set({ avoid: e.target.value })} placeholder={t("Ex. promesses de prix, jargon technique, couleurs criardes", "E.g. price promises, technical jargon, garish colours")} maxLength={200} /></Q>
            </div>
          )}

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-muted">{t("Aperçu de la description", "Description preview")}</span>
              <span className={cx(richness >= 70 ? "text-ok" : richness >= 40 ? "text-ink-2" : "text-warn")}>{t(`Complète à ${richness} %`, `${richness}% complete`)}</span>
            </div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-card p-3 font-sans text-[13px] leading-relaxed">{draft || t("Répondez aux questions : la description se construit ici.", "Answer the questions: the description builds up here.")}</pre>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {step > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" aria-hidden /> {t("Précédent", "Back")}</Button>}
            {step < 4 && <Button type="button" size="sm" variant="secondary" onClick={() => setStep(step + 1)}>{t("Suivant", "Next")} <ArrowRight className="size-4" aria-hidden /></Button>}
            <Button type="button" size="sm" variant={step === 4 ? "signal" : "ghost"} disabled={!draft} onClick={() => { setText(draft); setOpen(false); }}>{t("Utiliser cette description", "Use this description")}</Button>
          </div>
          <p className="text-xs text-muted">{t("Vous pourrez encore la modifier avant de lancer la création. Avec un forfait, l'IA s'en sert pour écrire tout le site.", "You can still edit it before starting. With a plan, AI uses it to write the whole site.")}</p>
        </div>
      )}
    </div>
  );
}
