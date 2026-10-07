/**
 * Choix de mise en page de l'en-tête et du pied de page proposés dans le studio (panneau « Disposition ») :
 * les réglages à liste du schéma de la section, avec leurs libellés traduits et la valeur actuelle.
 * Appliqués ensuite par l'opération set_setting (sans IA, version restaurable).
 */
import type { Lang } from "@/lib/i18n";
import { sectionSchema, type SectionInstance, type ThemeSpec } from "./spec";

export type LayoutChoice = {
  key: string;
  label: string;
  value: string | boolean;
  /** Liste de choix ; absent pour une case à cocher (oui / non). */
  options?: { value: string; label: string }[];
};

/** Réglages proposés, dans l'ordre d'affichage. Seuls ceux présents dans le schéma de la section sont gardés. */
const KEYS: Record<string, string[]> = {
  header: ["layout", "mega_menu", "mobile_menu", "mobile_submenu", "mobile_promo", "shape", "icons", "desktop_icons", "sticky"],
  footer: ["style", "show_wordmark"],
};

export function layoutChoices(spec: ThemeSpec, section: SectionInstance, lang: Lang): LayoutChoice[] | undefined {
  const keys = KEYS[section.type];
  if (!keys || spec.imported) return undefined;
  const schema = sectionSchema(spec, section.type, lang);
  if (!schema) return undefined;
  const out: LayoutChoice[] = [];
  for (const key of keys) {
    const def = schema.settings.find((s) => s.id === key);
    if (!def || (def.type !== "select" && def.type !== "checkbox")) continue;
    const raw = section.settings?.[key] ?? def.default;
    if (def.type === "checkbox") out.push({ key, label: String(def.label ?? key), value: raw === true || raw === "true" });
    else
      out.push({
        key,
        label: String(def.label ?? key),
        value: String(raw ?? (def.options as { value: string }[] | undefined)?.[0]?.value ?? ""),
        options: ((def.options ?? []) as { value: string; label: string }[]).map((o) => ({ value: String(o.value), label: String(o.label) })),
      });
  }
  return out.length ? out : undefined;
}
