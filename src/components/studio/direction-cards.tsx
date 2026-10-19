"use client";
import type { DirectionSeries } from "@/lib/logo-v2/direction-series";
import { Button } from "../ui";
import { useT } from "../i18n";
import { PALETTE_ROLES, directionSeriesPaletteIssues, palettePresentation } from "@/lib/logo-v2/direction-palette";
/** Même présentation comparable dans Préparation et Marque ; choix d'un ensemble versionné. */
export function DirectionCards({ series, selected, disabled, onChoose }: { series: DirectionSeries; selected?: string | null; disabled?: boolean; onChoose: (logoId: string) => void }) {
  const t = useT();
  const issues = directionSeriesPaletteIssues(series.directions.map(d => d.identity));
  const fontLabel = (handle: string) => handle.replace(/_[ni]\d$/, "").split("_").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  return <section className="grid min-w-0 gap-4" data-direction-series={series.id}>
    <p role="status">{series.name} · {t("Série", "Series")} {series.ordinal} · {series.directions.length}/3 {series.status === "complete" ? t("directions complètes", "complete directions") : t("— série incomplète", "— incomplete series")}</p>
    {!!issues.length && <p role="alert">{t("Palettes à revoir : couleurs répétées ou associations illisibles. Les versions existantes sont conservées ; aucun choix d’ensemble incomplet.", "Palettes need review: repeated colours or unreadable combinations. Existing versions are preserved; an incomplete set cannot be selected.")}</p>}
    {!!series.integrityIssues?.length && <p role="alert">{series.integrityIssues.join(" ")}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      {series.directions.map(d => <article key={d.id} className="min-w-0 overflow-hidden rounded-xl border border-line p-4" data-direction={d.id}>
        <img src={`/api/files/${d.logoId}`} alt={`${series.name} — ${d.label}`} className="aspect-square w-full object-contain" />
        {d.previewId && <a href={`/api/files/${d.previewId}`} target="_blank" rel="noreferrer" className="my-2 block underline">{t("Voir et télécharger la planche complète", "View and download the complete board")}</a>}
        <h3 className="mt-3 text-lg font-semibold">{d.label}</h3><p>{d.concept}</p>
        <div className="my-4 overflow-hidden rounded-lg border border-black/10 p-4" data-palette-sample={d.id} style={{ background: d.identity.palette.light, color: d.identity.palette.dark }}>
          <p className="text-xs uppercase tracking-widest">{t("Aperçu de l’identité", "Identity sample")}</p>
          <h4 className="my-3 text-2xl font-semibold" data-palette-use="heading" style={{ color: d.identity.palette.primary }}>{series.name}</h4>
          <p className="mb-3 break-words rounded p-3 font-medium" data-palette-use="surface" style={{ background: d.identity.palette.secondary, color: palettePresentation(d.identity.palette).surfaceText }}>{d.identity.signature}</p>
          <p className="mb-4 break-words text-sm" data-palette-use="text">{d.identity.sampleText}</p>
          <span className="inline-block max-w-full rounded px-4 py-2 text-sm font-semibold" data-palette-use="button" style={{ background: d.identity.palette.accent, color: palettePresentation(d.identity.palette).buttonText }}>{t("Découvrir l’offre", "Explore the offer")}</span>
        </div>
        <dl className="mt-3 grid gap-2 text-sm">
          {PALETTE_ROLES.map(role => <div key={role} className="flex flex-wrap items-start gap-2" data-palette-role={role} data-palette-color={d.identity.palette[role]}><span className="mt-1 size-5 shrink-0 rounded-full border border-line" style={{ background: d.identity.palette[role] }} /><dt>{role} {d.identity.palette[role]}</dt><dd className="min-w-0 break-words">{d.identity.colorRoles[role]}</dd></div>)}
          <div><dt>{t("Typographies", "Typography")}</dt><dd>{fontLabel(d.identity.fonts.heading)} / {fontLabel(d.identity.fonts.body)}</dd></div>
          <div><dt>{t("Ton", "Voice")}</dt><dd>{d.identity.tone.voice}</dd></div>
          <div><dt>{t("Ambiance", "Mood")}</dt><dd>{d.identity.mood}</dd></div>
          <div><dt>{t("Langage graphique", "Graphic language")}</dt><dd>{d.identity.graphicLanguage}</dd></div>
        </dl>
        <ul className="mb-3 list-inside list-disc text-sm">{d.identity.rules.map((rule, i) => <li key={i}>{rule}</li>)}</ul>
        <Button disabled={disabled || series.status !== "complete" || !!issues.length} onClick={() => onChoose(d.logoId)} variant={selected === d.logoId ? "primary" : "secondary"}>{selected === d.logoId ? t("Proposition choisie", "Selected proposal") : t("Choisir cette direction complète", "Choose this complete direction")}</Button>
      </article>)}
    </div>
  </section>;
}
