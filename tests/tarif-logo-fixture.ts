/**
 * Le tarif par image du modèle imposé des logos (logo-policy.ts) : sans lui, le devis d'un dessin de logo refuse (son coût
 * maximal n'est pas borné) et rien ne part. Les essais prennent celui vérifié pour le Studio privé de recette
 * (`scripts/syna-recette/tarifs-verifies.ts`, relevé du 6 novembre 2026), jamais un prix inventé. Aucun appel payant.
 */
import { TARIFS_VERIFIES } from "../scripts/syna-recette/tarifs-verifies";

export async function tarifDuModeleDesLogos(): Promise<void> {
  const { getJsonSetting, setJsonSetting } = await import("@/lib/settings");
  const { LOGO_ROUTE } = await import("@/lib/ai/media-providers");
  const cle = `${LOGO_ROUTE.provider}:${LOGO_ROUTE.model}`;
  setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [cle]: TARIFS_VERIFIES[cle] });
}
