/**
 * Étape 6 du parcours SINA (#492) : THÈME OU MAQUETTES — volet « un de nos thèmes ».
 *
 * Gratuit, sans IA. Le catalogue proposé (thèmes refaits d'après les maquettes de Thomas, `ACTIVE_THEMES`) sert à tout
 * projet ; l'usage prévu de chaque thème sert seulement à recommander (`themeRecommendation`). Chaque carte montre le
 * site DU CLIENT composé dans ce thème (vignette du Studio), le lien vers la démonstration complète, et dit si le
 * forfait l'inclut. Le choix se fait par le client, jamais à sa place ; il compose la boutique (tâche du Studio).
 */
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { DIRECTIONS } from "../theme/directions";
import { ACTIVE_THEMES, themeDesignedFor, themeKinds } from "../theme/theme-fit";
import { themeRecommendation } from "../theme/theme-recommendation";
import { storeKindLabel, type StoreKind } from "../theme/store-kind";
import { themeDemoStatus } from "../theme/theme-demos";
import { assertThemeAllowed } from "../plan-gates";

export type ThemeCard = {
  id: string; name: string; tagline: string; description: string;
  /** Pourquoi ce thème est proposé pour CE projet (usage prévu, recommandation). */
  why: string;
  recommended: boolean;
  /** Inclus dans le forfait du projet ; sinon le motif (forfait nécessaire). */
  allowed: boolean; blocked?: string;
  /** Démonstration complète consultable (exports préparés). */
  demo: boolean;
};
export type SinaThemes = { list: ThemeCard[]; recommendedId: string | null; all: boolean; kind: string | null; at: number };

const kindText = (kinds: StoreKind[]) => kinds.map((k) => storeKindLabel(k, "fr").toLocaleLowerCase("fr-FR")).join(", ");

/**
 * Thèmes à montrer : le recommandé et ses alternatives d'abord, puis ceux conçus pour ce type de projet, puis les
 * autres. Trois par défaut ; tout le catalogue proposé quand le client veut tout voir.
 */
export function themeChoices(projectId: string, all = false): SinaThemes {
  const p = loadProject(projectId);
  const rec = themeRecommendation(p, "fr");
  const kind = rec.category.kind;
  const active = ACTIVE_THEMES as readonly string[];
  const order = [rec.recommended, ...rec.alternatives.map((a) => a.id), ...active.filter((id) => kind && themeDesignedFor(id, kind)), ...active]
    .filter((x): x is string => !!x && active.includes(x));
  const ids = [...new Set(order)].slice(0, all ? active.length : 3);
  const list = ids.map((id): ThemeCard => {
    const d = DIRECTIONS.find((x) => x.id === id);
    let allowed = true, blocked: string | undefined;
    try { assertThemeAllowed(projectId, id, null); } catch (e) { allowed = false; blocked = (e as Error).message; }
    const designed = kind ? themeDesignedFor(id, kind) : false;
    const kinds = themeKinds(id);
    const why = id === rec.recommended
      ? L(`Recommandé pour ton projet (${kind ? storeKindLabel(kind, "fr").toLocaleLowerCase("fr-FR") : "ton type de boutique"}).`, "Recommended for your project.")
      : designed
        ? L(`Conçu d'abord pour ce type de projet (${storeKindLabel(kind!, "fr").toLocaleLowerCase("fr-FR")}).`, "Designed first for this kind of project.")
        : L(`Conçu d'abord pour : ${kindText(kinds) || "tout type de projet"} ; il s'adapte aussi au tien.`, "Also fits your project.");
    let demo = false;
    try { demo = themeDemoStatus(id).ready; } catch { demo = false; }
    return { id, name: d?.name ?? id, tagline: d?.tagline ?? "", description: d?.description ?? "", why, recommended: id === rec.recommended, allowed, ...(blocked ? { blocked } : {}), demo };
  });
  return { list, recommendedId: rec.recommended, all, kind: kind ? storeKindLabel(kind, "fr") : null, at: Date.now() };
}
