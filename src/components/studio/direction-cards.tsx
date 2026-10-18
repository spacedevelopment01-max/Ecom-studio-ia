"use client";
import type { DirectionSeries } from "@/lib/logo-v2/direction-series";
import { Button } from "../ui";
import { useT } from "../i18n";
/** Même présentation comparable dans Préparation et Marque ; choix d'un ensemble versionné. */
export function DirectionCards({ series, selected, disabled, onChoose }: { series: DirectionSeries; selected?: string | null; disabled?: boolean; onChoose: (logoId: string) => void }) {
  const t = useT();
  const fontLabel = (handle: string) => handle.replace(/_[ni]\d$/, "").split("_").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  return <section className="grid min-w-0 gap-4" data-direction-series={series.id}>
    <p role="status">{series.name} · {t("Série", "Series")} {series.ordinal} · {series.directions.length}/3 {series.status === "complete" ? t("directions complètes", "complete directions") : t("— série incomplète", "— incomplete series")}</p>
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      {series.directions.map(d => <article key={d.id} className="min-w-0 overflow-hidden rounded-xl border border-line p-4" data-direction={d.id}>
        <img src={`/api/files/${d.logoId}`} alt={`${series.name} — ${d.label}`} className="aspect-square w-full object-contain" />
        {d.previewId && <a href={`/api/files/${d.previewId}`} target="_blank" rel="noreferrer" className="my-2 block underline">{t("Voir et télécharger la planche complète", "View and download the complete board")}</a>}
        <h3 className="mt-3 text-lg font-semibold">{d.label}</h3><p>{d.concept}</p>
        <p className="mt-3 font-medium">{d.identity.signature}</p>
        <dl className="mt-3 grid gap-2 text-sm">
          {Object.entries(d.identity.palette).map(([role, color]) => <div key={role} className="flex items-start gap-2"><span className="mt-1 size-5 shrink-0 rounded-full border border-line" style={{ background: color }} /><dt>{role} {color}</dt><dd className="min-w-0 break-words">{d.identity.colorRoles[role as keyof typeof d.identity.colorRoles]}</dd></div>)}
          <div><dt>{t("Typographies", "Typography")}</dt><dd>{fontLabel(d.identity.fonts.heading)} / {fontLabel(d.identity.fonts.body)}</dd></div>
          <div><dt>{t("Ton", "Voice")}</dt><dd>{d.identity.tone.voice}</dd></div>
          <div><dt>{t("Ambiance", "Mood")}</dt><dd>{d.identity.mood}</dd></div>
          <div><dt>{t("Langage graphique", "Graphic language")}</dt><dd>{d.identity.graphicLanguage}</dd></div>
        </dl>
        <blockquote className="my-3 border-l-2 border-line pl-3">{d.identity.sampleText}</blockquote>
        <ul className="mb-3 list-inside list-disc text-sm">{d.identity.rules.map((rule, i) => <li key={i}>{rule}</li>)}</ul>
        <Button disabled={disabled || series.status !== "complete"} onClick={() => onChoose(d.logoId)} variant={selected === d.logoId ? "primary" : "secondary"}>{selected === d.logoId ? t("Direction choisie", "Selected direction") : t("Choisir cette direction complète", "Choose this complete direction")}</Button>
      </article>)}
    </div>
  </section>;
}
