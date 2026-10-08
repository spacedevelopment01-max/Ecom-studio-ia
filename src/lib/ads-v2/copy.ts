/**
 * Rédaction des annonces (Ads V2) : une accroche, un texte principal (accroche → bénéfice concret → preuve →
 * appel), un titre, une description, un bouton et une seconde accroche pour le test A/B, par angle.
 *
 *  - version locale (forfait sans IA, ou repli) : construite sur la MATIÈRE de l'angle (fait confirmé, usage,
 *    objection et sa réponse…), sans rien inventer ; naturelle, mais sobre ;
 *  - version IA (concepteur-rédacteur) : un seul appel pour toute la série, une seule reprise avec les défauts
 *    exacts relevés par le contrôle des affirmations ; ce qui reste fautif repasse à la version locale.
 */
import { z } from "zod";
import type { Lang } from "../i18n";
import { charter, langName } from "../ai/prompts";
import { CTAS } from "./platforms";
import type { AdCopy, AdInsight, AnglePlan, AngleType } from "./types";

const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/[\s,;:·-]+$/, "") : t);
const words = (t: string, n: number) => t.split(/\s+/).filter(Boolean).slice(0, n).join(" ");
const lowerFirst = (t: string) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
const noDot = (t: string) => t.trim().replace(/[.!?…]+$/, "");

/** Bouton adapté à l'angle et au mode de contact (choisi dans la liste des régies). */
export function ctaFor(i: AdInsight, a: AnglePlan, lang: Lang): string {
  const list = CTAS[i.business][lang];
  if (i.business === "services") return i.contactMode === "quote" ? list[1] : i.contactMode === "call" ? list[2] : i.contactMode === "booking" ? list[0] : list[3];
  const byType: Partial<Record<AngleType, number>> = { demonstration: 3, detail: 3, offer: 1, gift: 1, proof: 2, objection: 2 };
  return list[byType[a.type] ?? 0];
}

/** Version locale, honnête, construite uniquement sur la matière de l'angle. */
export function localCopy(i: AdInsight, a: AnglePlan, lang: Lang, limits: { hookWords: number; headline: number; description: number; primaryFirstLine: number }): AdCopy {
  const en = lang === "en";
  const t = (fr: string, e: string) => (en ? e : fr);
  const name = i.offerName;
  const [head, tail] = a.material.split(/\s*(?:→|:)\s*/, 2);
  const proof = i.facts.find((f) => !a.material.includes(f.value));
  const proofLine = proof ? `${proof.label} : ${proof.value}.` : "";
  let hook = "";
  let body = "";
  let headline = "";
  let hookB: string | null = null;
  switch (a.type) {
    case "demonstration":
      hook = i.business === "services" ? noDot(head) : t(`${name}, ${lowerFirst(noDot(a.material))}`, `${name}: ${lowerFirst(noDot(a.material))}`);
      body = tail ? `${noDot(tail)}.` : t(`Voyez ${name} à l'œuvre, sans filtre.`, `See ${name} at work, no filter.`);
      headline = i.business === "services" ? noDot(head) : t(`${name} en action`, `${name} in action`);
      hookB = t(`Regardez ${lowerFirst(noDot(head))}`, `Watch: ${lowerFirst(noDot(head))}`);
      break;
    case "detail":
      hook = tail ? t(`${noDot(head)} : ${lowerFirst(noDot(tail))}`, `${noDot(head)}: ${lowerFirst(noDot(tail))}`) : noDot(a.material);
      body = t(`Un détail qui change tout au quotidien.`, `A detail you notice every day.`);
      headline = t(`${name}, de près`, `${name}, up close`);
      hookB = t(`Regardez de près : ${lowerFirst(noDot(tail ?? head))}`, `Look closely: ${lowerFirst(noDot(tail ?? head))}`);
      break;
    case "use_case":
      hook = noDot(a.material);
      body = t(`${name}, pensé pour ce moment-là.`, `${name}, made for that moment.`);
      headline = t(`${name}, au quotidien`, `${name}, every day`);
      break;
    case "problem_solution":
      hook = noDot(a.material);
      body = i.difference ? `${noDot(i.difference)}.` : t(`${name} y répond simplement.`, `${name} answers it simply.`);
      headline = t(`La réponse : ${name}`, `The answer: ${name}`);
      hookB = i.difference ? noDot(i.difference) : null;
      break;
    case "objection":
      hook = noDot(head);
      body = `${noDot(tail ?? "")}.`;
      headline = cut(noDot(tail ?? name), limits.headline);
      break;
    case "proof":
      hook = noDot(a.material);
      body = t(`C'est vérifiable, et c'est ce qui compte.`, `It's verifiable, and that's what matters.`);
      headline = cut(noDot(a.material), limits.headline);
      break;
    case "origin_craft":
      hook = tail ? noDot(tail) : noDot(a.material);
      body = t(`${name} : ${lowerFirst(noDot(a.material))}.`, `${name}: ${lowerFirst(noDot(a.material))}.`);
      headline = t(`Le savoir-faire ${i.brand}`, `${i.brand} craftsmanship`);
      break;
    case "gift":
      hook = t(`Une idée à offrir : ${name}`, `A gift idea: ${name}`);
      body = proof ? `${proof.label} : ${proof.value}.` : t(`Simple à offrir, utile tous les jours.`, `Easy to give, useful every day.`);
      headline = t(`${name}, à offrir`, `${name}, to give`);
      break;
    case "local_trust":
      hook = t(`${i.category.label}, ${a.material}`, `${i.category.label}, ${a.material}`);
      body = t(`${i.brand} intervient ${a.material}.`, `${i.brand} works in ${a.material}.`);
      headline = cut(`${i.brand} · ${a.material}`, limits.headline);
      hookB = t(`Près de chez vous : ${a.material}`, `Near you: ${a.material}`);
      break;
    case "offer":
      hook = noDot(a.material);
      body = t(`Offre proposée par ${i.brand}, selon ses conditions.`, `Offer from ${i.brand}, subject to its terms.`);
      headline = cut(noDot(a.material), limits.headline);
      break;
  }
  const primaryFirst = cut(`${noDot(hook)}.`, limits.primaryFirstLine);
  const primary = [primaryFirst, body !== primaryFirst ? body : "", proofLine && !body.includes(proofLine) && a.type !== "gift" ? proofLine : ""].filter(Boolean).join("\n\n");
  return {
    hook: words(hook, limits.hookWords),
    primary,
    headline: cut(headline, limits.headline),
    description: cut(i.brand, limits.description),
    cta: ctaFor(i, a, lang),
    hookB: hookB ? words(hookB, limits.hookWords) : null,
  };
}

// ---------------------------------------------------------------- version IA (un appel pour la série)

const str = z.preprocess((v) => (v == null ? "" : String(v)), z.string());
export const CopySetSchema = z.object({
  ads: z.array(z.object({ angle: str, hook: str, hookB: str.optional(), primary: str, headline: str, description: str, cta: str, visual: str.optional() })).min(1),
});
export type CopySet = z.infer<typeof CopySetSchema>;

export function copySystem(lang: Lang, i: AdInsight, ctas: string[], limits: { hookWords: number; primaryFirstLine: number; headline: number; description: number }): string {
  return `${charter(lang)}

Rôle : concepteur-rédacteur senior d'une agence de publicité (niveau 2026). Tu écris des annonces qui arrêtent le défilement et vendent, sans jamais mentir.
Pour CHAQUE angle donné (dans l'ordre), une annonce qui exploite SA matière et rien d'autre :
- « hook » : accroche des 3 premières secondes, ${limits.hookWords} mots au plus, concrète, propre à ${i.offerName} (pas de question vague, pas de slogan creux) ;
- « hookB » : une seconde accroche du même angle pour un test A/B, vraiment différente ;
- « primary » : PREMIÈRE LIGNE de ${limits.primaryFirstLine} caractères au plus qui porte l'accroche, puis 1 ou 2 phrases courtes : bénéfice concret, puis preuve (fait confirmé du contexte) ;
- « headline » : ${limits.headline} caractères au plus, sans « ! » ni « ? » ; « description » : ${limits.description} caractères au plus ;
- « cta » : exactement l'un de : ${ctas.join(" | ")} ;
- « visual » : l'image idéale en une phrase (premier plan, geste, lumière).
Interdits absolus : chiffre, durée, garantie, certification, avis, note, promotion, urgence ou superlatif absents du contexte ; allégation de santé ; attribut personnel (« vous êtes… », « votre acné ») ; MAJUSCULES ; « !! ». Une matière manquante se signale par « [À compléter : …] », jamais inventée.
Ton de la marque : ${i.tone.join(", ") || "naturel"}${i.premium ? " — marque premium : sobriété, précision, aucune exagération" : ""}.
Langue des annonces : ${langName(lang)}.`;
}

export function copyPrompt(i: AdInsight, angles: AnglePlan[], feedback?: string): string {
  return `Produit / activité : ${i.offerName} (${i.category.label}). Marque : ${i.brand}.
Audience : ${i.audience.declared ?? i.audience.persona ?? "large (adultes)"}.${i.audience.adultsOnly ? " Produit pour enfants : on parle aux parents et à l'entourage adulte." : ""}
Faits confirmés : ${i.facts.map((f) => `${f.label} : ${f.value}`).join(" ; ") || "aucun"}.
${i.offer ? `Offre réelle configurée : ${i.offer}.\n` : "Aucune offre ni promotion configurée.\n"}Angles (un par annonce, dans l'ordre) :
${angles.map((a, k) => `${k + 1}. ${a.type} — matière : ${a.material} — levier : ${a.lever}`).join("\n")}
${feedback ? `\nCORRECTIONS EXIGÉES sur la version précédente (toutes, sans rien inventer) :\n${feedback}\n` : ""}Réponds { "ads": [ { "angle": "…", "hook": "…", "hookB": "…", "primary": "…", "headline": "…", "description": "…", "cta": "…", "visual": "…" } ] }.`;
}
