/** Deliberately synthetic responses. These are transport/contract fixtures, never proof of creative quality. */
import { QUALITY_CRITERIA } from "@/lib/social-v2/publication-quality";
export const campaignGrid = () =>
  Object.fromEntries(
    QUALITY_CRITERIA.map((k) => [
      k,
      {
        score: 9.2,
        evidence: `Observation SIMULÉE pour ${k}, non constatée par un fournisseur.`,
      },
    ]),
  ) as any;
export const campaignVerdict = () => ({
  logoFaithful: true,
  fixTarget: "none" as const,
  grid: campaignGrid(),
  fatal: [] as string[],
});
export const campaignConcept = () => ({
  idea: "Le sujet dans un environnement adapté à son usage",
  composition: "Diagonale documentée, texte sur zone calme et logo en retrait",
  framing: "Produit ou résultat du métier documenté, plan moyen",
  setting: "Lieu cohérent avec le projet et son usage",
  light: "Lumière naturelle latérale cohérente",
  materials: "Matières documentées sans texture inventée",
  typography: "Familles de la marque et hiérarchie contrastée",
  effects: "aucun",
  rationale:
    "La matière et la hiérarchie expliquent le message de cette publication.",
  diversity:
    "Cette composition est comparée aux visuels récents ; fixture de test uniquement.",
  ctaStyle: "button" as const,
});
export const campaignCopy = (_p: unknown, _post: unknown, fallback: any) =>
  Promise.resolve({
    ...fallback,
    scene:
      "Documented subject in a specific setting with coherent side lighting",
    concept: campaignConcept(),
  });
