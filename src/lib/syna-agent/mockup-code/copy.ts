/**
 * SINA (#492), étape 6 : TEXTES DU SITE écrits AVANT la maquette (consigne du propriétaire du 8 novembre : « même le
 * copywriting doit être sur la maquette », il garde l'angle marketing et se travaille sur l'émotion).
 *
 * Claude écrit les textes de la page, section par section, à partir de l'angle choisi à l'étape 4 (accroche, émotion,
 * récit, scènes, appel à l'action, messages clés, objections) et des SEULS faits du client (produits, prix,
 * compositions, livraison, retours). L'accroche, le slogan et l'appel à l'action sont repris mot pour mot. Les textes
 * sont gardés dans la mémoire du projet (artefact `syna.mockup_copy`) : la maquette les écrit lettre pour lettre et
 * le site codé (étape 7) les reprendra. Payant (un appel), plafonné.
 */
import { z } from "zod";
import { all } from "../../db";
import { llmJson } from "../../ai/llm";
import { remember } from "../../projects";
import type { Journey } from "../journey";
import type { ActivityPlan } from "../activity";
import type { MockupPage } from "./pages";

/** Plafond d'un appel de rédaction (une page). */
export const COPY_CAP_MICRO = 400_000;
export const COPY_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "medium" };

const line = (max: number) => z.string().min(1).max(max);
export const PageCopySchema = z.object({
  seo: z.object({ title: line(70), description: line(170) }),
  sections: z.array(z.object({
    /** Section de la page, dans l'ordre de l'inventaire (« ouverture (titre, photo, bouton) »…). */
    section: line(80),
    title: z.string().max(90).nullable(),
    text: z.string().max(260).nullable(),
    button: z.string().max(40).nullable(),
    items: z.array(z.object({ title: line(70), text: z.string().max(160).nullable() })).max(8),
  })).min(1).max(14),
});
export type PageCopy = z.infer<typeof PageCopySchema>;
export type SiteCopy = { version: 1; angleId: string | null; pages: Record<string, PageCopy>; at: number };

export const COPY_KEY = "syna.mockup_copy";

export function loadSiteCopy(projectId: string): SiteCopy | null {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' ORDER BY updated_at DESC LIMIT 1", projectId, COPY_KEY)[0];
  if (!row) return null;
  try { const c = JSON.parse(row.value) as SiteCopy; return c?.version === 1 ? c : null; } catch { return null; }
}
export function saveSiteCopy(projectId: string, copy: SiteCopy): SiteCopy {
  const value = { ...copy, at: Date.now() };
  remember(projectId, { kind: "artifact", key: COPY_KEY, value: JSON.stringify(value), source: "ai", origin: "system" as any });
  return value;
}

export const COPY_SYSTEM = `Tu es concepteur-rédacteur web senior. Tu écris les textes d'UNE page de site pour une petite marque, en français, à partir de son angle marketing : la raison ÉMOTIONNELLE pour laquelle le client achète. Chaque texte fait ressentir cette émotion (situation vécue, désir, soulagement), les faits ne servent que de preuves.
Règles absolues :
- L'accroche, le slogan et l'appel à l'action fournis sont repris MOT POUR MOT (titre d'ouverture = accroche ; bouton principal = appel à l'action).
- Même voix que l'accroche (tutoiement si elle tutoie), phrases courtes et concrètes, aucun jargon, aucun superlatif creux (« le meilleur », « unique », « révolutionnaire »).
- RIEN d'inventé : aucun avis, note, chiffre, label, certification, promesse de santé ou de bienfait, délai, prix ou ingrédient qui ne soit pas dans les faits fournis. Un fait inconnu n'est pas écrit.
- Textes COURTS (ils seront écrits sur une maquette) : titres de 2 à 7 mots, paragraphes de 25 mots au plus, éléments de liste de 15 mots au plus, boutons de 2 à 5 mots commençant par un verbe.
- Une section par élément de la liste des sections, dans l'ordre ; chaque section reçoit les textes qui lui conviennent (titre, texte, bouton, éléments), null quand elle n'en a pas besoin. Les questions fréquentes répondent aux objections fournies et aux faits (livraison, retours) ; les produits reprennent leurs noms et prix exacts.
- seo.title (60 caractères au plus) et seo.description (155 au plus) contiennent le nom de la marque et ce qu'elle vend, avec les mots qu'un client chercherait.
Réponds selon le schéma JSON demandé.`;

/** Consigne de rédaction d'une page, avec les seuls faits du client et l'angle choisi. */
export function copyPrompt(page: MockupPage, input: { brand: { name: string; tagline?: string | null }; plan: ActivityPlan; emotion?: string; story?: string; show?: string }): string {
  const a = input.plan.angle;
  return [
    `Marque : « ${input.brand.name} »${input.brand.tagline ? `, slogan (mot pour mot) « ${input.brand.tagline} »` : ""}.`,
    a ? `Angle marketing choisi : « ${a.title} »${a.goal ? ` (objectif : ${a.goal})` : ""}${input.emotion ? `, émotion visée : ${input.emotion}` : ""}.` : "",
    a?.message ? `Accroche (titre d'ouverture, mot pour mot) : « ${a.message} ».` : "",
    a?.cta ? `Appel à l'action (bouton principal, mot pour mot) : « ${a.cta} ».` : "",
    input.story ? `Ce qu'on raconte : ${input.story}` : "",
    input.show ? `Ce qu'on montre : ${input.show}` : "",
    input.plan.keyMessages.length ? `Messages clés : ${input.plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    input.plan.objections.length ? `Objections et réponses : ${input.plan.objections.map((o) => `« ${o.objection} » → ${o.answer}`).join(" ; ")}.` : "",
    input.plan.products.length ? `Produits (noms et prix exacts) : ${input.plan.products.map((x) => `${x.title}${x.price != null ? ` (${x.price.toFixed(2).replace(".", ",")} €)` : ""}`).join(" ; ")}.` : "",
    input.plan.offer.facts.length ? `Faits confirmés par le client : ${input.plan.offer.facts.join(" ; ")}.` : "",
    input.plan.company.shipping ? `Livraison : ${input.plan.company.shipping}.` : "",
    input.plan.company.returns ? `Retours : ${input.plan.company.returns}.` : "",
    `Page à écrire : « ${page.fr} ». Sections, dans l'ordre : ${page.sections.map((s) => `« ${s} »`).join(" ; ")}.`,
  ].filter(Boolean).join("\n");
}

/** Écrit les textes d'une page (un appel, plafonné). `generate` : remplaçable par les tests. */
export async function writePageCopy(call: Parameters<typeof llmJson>[0], generate?: (c: Parameters<typeof llmJson>[0]) => Promise<unknown>): Promise<PageCopy> {
  return generate ? PageCopySchema.parse(await generate(call)) : llmJson(call, PageCopySchema);
}

/** Angle tel que lu à l'étape 4 (émotion, récit, scènes) pour la rédaction. */
export function angleDetails(j: Journey): { emotion?: string; story?: string; show?: string } {
  const id = j.angleChoice?.id;
  const a = id ? j.angles?.list.find((x) => x.id === id) : undefined;
  return a ? { emotion: a.emotion || undefined, story: a.story || undefined, show: a.show || undefined } : {};
}

/** Textes d'une page, tels qu'écrits sur la maquette : une ligne par section, textes entre guillemets. */
export function copyLines(c: PageCopy): string[] {
  return c.sections.map((s) => {
    const parts = [
      s.title ? `titre « ${s.title} »` : "",
      s.text ? `texte « ${s.text} »` : "",
      ...s.items.map((i) => `élément « ${i.title} »${i.text ? ` avec « ${i.text} »` : ""}`),
      s.button ? `bouton « ${s.button} »` : "",
    ].filter(Boolean);
    // Nom de la section sans guillemets : une indication de place, jamais un texte à écrire.
    return parts.length ? `Dans la partie ${s.section} : ${parts.join(" ; ")}.` : "";
  }).filter(Boolean);
}
