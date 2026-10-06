"use client";
/**
 * « Décrivez votre activité » avec une aide : repères de ce qui manque pendant la saisie, et un assistant de
 * quelques questions courtes qui rédige une description complète et structurée (sans IA, rien d'inventé).
 */
import { useEffect, useState } from "react";
import { Check, Circle, Sparkles, X } from "lucide-react";
import { Button, cx, Input, Textarea } from "../ui";
import { useLang, useT } from "../i18n";
import { briefChecklist, briefFromText, CLIENT_CHOICES, composeBrief, emptyBrief, STRENGTH_CHOICES, TONE_CHOICES, type BriefAnswers } from "@/lib/activity-brief";

function Chips({ options, value, onChange, label }: { options: { fr: string; en: string }[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
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

export function ActivityBrief({ invalid, area }: { invalid?: boolean; area?: string }) {
  const t = useT();
  const { lang } = useLang();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
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

  const start = () => {
    setA({ ...emptyBrief(), ...briefFromText(text), area: briefFromText(text).area || area || areaField || "" });
    setOpen(true);
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={start}><Sparkles className="size-4" aria-hidden /> {t("M'aider à le rédiger", "Help me write it")}</Button>
          {text.trim() && missing.length > 0 && <span className="text-xs text-muted">{t(`Il manque : ${missing.map((c) => c.fr.toLowerCase()).join(", ")}.`, `Missing: ${missing.map((c) => c.en.toLowerCase()).join(", ")}.`)}</span>}
        </div>
      ) : (
        <div className="grid gap-4 rounded-2xl border border-line bg-paper-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("Quelques questions courtes", "A few short questions")}</p>
              <p className="text-xs text-muted">{t("Répondez en quelques mots : le studio rédige une description complète et claire. Seules vos réponses sont reprises, rien n'est inventé.", "Answer in a few words: the studio writes a complete, clear description. Only your answers are used, nothing is made up.")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-card" aria-label={t("Fermer l'aide", "Close the helper")}><X className="size-4" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm"><span>{t("Votre métier", "Your trade")}</span><Input value={a.trade} onChange={(e) => set({ trade: e.target.value })} placeholder={t("Ex. Carrossier peintre", "E.g. Car body repairer")} maxLength={80} /></label>
            <label className="grid gap-1 text-sm"><span>{t("Ville ou zone", "Town or area")}</span><Input value={a.area} onChange={(e) => set({ area: e.target.value })} placeholder={t("Ex. Mâcon", "E.g. Leeds")} maxLength={80} /></label>
          </div>
          <label className="grid gap-1 text-sm">
            <span>{t("Vos prestations (une par ligne, ou séparées par des virgules)", "Your services (one per line, or separated by commas)")}</span>
            <Textarea autoGrow rows={3} value={a.services} onChange={(e) => set({ services: e.target.value })} placeholder={t("Ex. Débosselage, peinture, remplacement de pare-brise", "E.g. Dent repair, paintwork, windscreen replacement")} />
          </label>
          <div className="grid gap-1.5 text-sm"><span>{t("Vos clients", "Your customers")}</span><Chips label={t("Vos clients", "Your customers")} options={CLIENT_CHOICES} value={a.clients} onChange={(v) => set({ clients: v })} /></div>
          <div className="grid gap-1.5 text-sm">
            <span>{t("Ce qui vous distingue (cochez seulement ce qui est vrai)", "What sets you apart (only tick what is true)")}</span>
            <Chips label={t("Points forts", "Strengths")} options={STRENGTH_CHOICES} value={a.strengths} onChange={(v) => set({ strengths: v })} />
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <Input value={a.since} onChange={(e) => set({ since: e.target.value })} placeholder={t("Depuis (année)", "Since (year)")} maxLength={40} aria-label={t("Depuis quelle année", "Since which year")} />
              <Input value={a.extra} onChange={(e) => set({ extra: e.target.value })} placeholder={t("Autre (ex. véhicule de prêt, agréé assurances)", "Other (e.g. courtesy car, insurer-approved)")} maxLength={200} aria-label={t("Autre point fort", "Other strength")} />
            </div>
          </div>
          <div className="grid gap-1.5 text-sm"><span>{t("Le ton que vous voulez", "The tone you want")}</span><Chips label={t("Ton", "Tone")} options={TONE_CHOICES} value={a.tone} onChange={(v) => set({ tone: v })} /></div>
          <label className="grid gap-1 text-sm"><span>{t("À éviter (facultatif)", "To avoid (optional)")}</span><Input value={a.avoid} onChange={(e) => set({ avoid: e.target.value })} placeholder={t("Ex. promesses de prix, jargon technique", "E.g. price promises, technical jargon")} maxLength={200} /></label>
          {draft && (
            <div className="grid gap-1.5">
              <p className="text-xs font-medium text-muted">{t("Aperçu de la description", "Description preview")}</p>
              <pre className="whitespace-pre-wrap rounded-xl border border-line bg-card p-3 font-sans text-[13px] leading-relaxed">{draft}</pre>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={!draft} onClick={() => { setText(draft); setOpen(false); }}>{t("Utiliser cette description", "Use this description")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("Annuler", "Cancel")}</Button>
          </div>
          <p className="text-xs text-muted">{t("Vous pourrez encore la modifier avant de lancer la création.", "You can still edit it before starting.")}</p>
        </div>
      )}
    </div>
  );
}
