"use client";
/**
 * Langue des contenus créés par une action (publicité, image, vidéo, publication, prompt, thème…).
 * Par défaut celle du projet ; la personne peut en choisir une autre pour cette action seulement.
 * Utilisation : const cl = useContentLang(); <ContentLangPicker {...cl} />; api(url, { body, lang: cl.lang })
 */
import { useState } from "react";
import { Languages } from "lucide-react";
import { LANGS, type Lang } from "@/lib/i18n";
import { useT } from "../i18n";
import { useProject } from "./project-context";
import { cx } from "../ui";

/** `base` : langue par défaut à la place de celle du projet (ex. la langue du thème pour le chat de la boutique). */
export function useContentLang(initial?: Lang, base?: Lang) {
  const { data } = useProject();
  const projectLang: Lang = base ?? data?.settings.language ?? "fr";
  const [chosen, setLang] = useState<Lang | null>(initial ?? null);
  return { lang: chosen ?? projectLang, setLang, projectLang };
}

export function ContentLangPicker({ lang, setLang, projectLang, className, compact }: { lang: Lang; setLang: (l: Lang) => void; projectLang?: Lang; className?: string; compact?: boolean }) {
  const t = useT();
  return (
    <label className={cx("inline-flex items-center gap-2 text-sm", className)}>
      <Languages className="size-4 shrink-0 text-muted" aria-hidden />
      {!compact && <span className="text-ink-2">{t("Langue du contenu", "Content language")}</span>}
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("Langue du contenu", "Content language")} className="h-9 rounded-full border border-line bg-card px-3 text-sm">
        {LANGS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
            {projectLang === l.id ? t(" (projet)", " (project)") : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
