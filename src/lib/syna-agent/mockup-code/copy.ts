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
  seo: z.object({ title: line(120), description: line(260) }),
  sections: z.array(z.object({
    /** Section de la page, dans l'ordre de l'inventaire (« ouverture (titre, photo, bouton) »…). */
    section: line(80),
    title: z.string().max(140).nullable(),
    text: z.string().max(500).nullable(),
    button: z.string().max(60).nullable(),
    items: z.array(z.object({ title: line(140), text: z.string().max(300).nullable() })).max(10),
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

/**
 * Ce que chaque section doit contenir (essai réel du 8 novembre : ouverture, univers et inscription absents ; détails,
 * produits et questions sans contenu). Reconnu aux mots de la section de l'inventaire.
 */
export const SECTION_NEEDS: { match: RegExp; need: string; minItems?: number }[] = [
  // Fiche produit (essai réel du 8 novembre : l'accroche du site en grand titre, le nom du produit relégué plus bas).
  { match: /galerie/, need: "title = le nom exact du produit (le grand titre de la fiche, pour le référencement) ; items = 3 ou 4 légendes de photos courtes" },
  { match: /en-tête/, need: "items = 3 à 5 liens courts du menu (title seul) ; button = l'appel à l'action" },
  { match: /ouverture|promesse/, need: "title = l'accroche mot pour mot ; text = le slogan mot pour mot ; button = l'appel à l'action mot pour mot" },
  { match: /produit|offre|prestations/, need: "title et text courts ; items = CHAQUE produit ou prestation (title = son nom exact, text = son prix exact puis sa composition en quelques mots)", minItems: 1 },
  { match: /détails/, need: "title ; items = 3 ou 4 gros plans (title court + text d'une phrase, d'après les faits)", minItems: 3 },
  { match: /scènes|usage/, need: "title ; text (la situation vécue, l'émotion) ; items = 2 ou 3 moments de la journée (title court + text d'une phrase)", minItems: 2 },
  { match: /univers|histoire|méthode/, need: "title ; text (ce que la marque fait et pourquoi, d'après les faits)" },
  { match: /journal/, need: "title ; items = 2 ou 3 idées d'articles (title seul, sans fait inventé) ; button", minItems: 2 },
  { match: /questions/, need: "title ; items = 3 à 5 questions (title = la question, text = la réponse, d'après les objections et les faits)", minItems: 3 },
  { match: /inscription|contact/, need: "title ; text (une phrase) ; button" },
  { match: /pied de page/, need: "items = liens courts (title seul) ; text = coordonnées fournies (e-mail, adresse) et mentions, sans trou à compléter" },
];
export const needOf = (section: string) => SECTION_NEEDS.find((n) => n.match.test(section));

/** Consigne de rédaction d'une page, avec les seuls faits du client et l'angle choisi. */
export function copyPrompt(page: MockupPage, input: { brand: { name: string; tagline?: string | null }; plan: ActivityPlan; emotion?: string; story?: string; show?: string; toConfirm?: string[] }): string {
  const a = input.plan.angle;
  return [
    `Marque : « ${input.brand.name} »${input.brand.tagline ? `, slogan (mot pour mot) « ${input.brand.tagline} »` : ""}.`,
    a ? `Angle marketing choisi : « ${a.title} »${a.goal ? ` (objectif : ${a.goal})` : ""}${input.emotion ? `, émotion visée : ${input.emotion}` : ""}.` : "",
    // Essai réel du 8 novembre : l'accroche reprise comme titre du catalogue, du panier et de « Notre histoire » (même
    // titre principal sur toutes les pages, mauvais pour le référencement).
    a?.message ? (page.key === "home" ? `Accroche (titre d'ouverture, mot pour mot) : « ${a.message} ».` : `L'accroche « ${a.message} » est le titre de l'ACCUEIL seulement : ne la reprends sur cette page ni comme titre ni comme texte. Le titre principal de cette page lui est propre (son rôle, dans l'émotion de l'angle), unique sur le site pour le référencement.`) : "",
    a?.cta ? `Appel à l'action (bouton principal, mot pour mot) : « ${a.cta} ».` : "",
    input.story ? `Ce qu'on raconte : ${input.story}` : "",
    input.show ? `Ce qu'on montre : ${input.show}` : "",
    input.plan.keyMessages.length ? `Messages clés : ${input.plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    input.plan.objections.length ? `Objections et réponses : ${input.plan.objections.map((o) => `« ${o.objection} » → ${o.answer}`).join(" ; ")}.` : "",
    input.plan.products.length ? `Produits (noms et prix exacts) : ${input.plan.products.map((x) => `${x.title}${x.price != null ? ` (${x.price.toFixed(2).replace(".", ",")} €)` : ""}`).join(" ; ")}.` : "",
    input.plan.offer.facts.length ? `Faits confirmés par le client : ${input.plan.offer.facts.join(" ; ")}.` : "",
    // Essai réel du 8 novembre : « Conseils sur chaque fiche » écrit alors que ces conseils restaient à confirmer.
    input.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer ni promettre (même dans une réponse aux objections), ni dire qu'ils figurent quelque part (essai réel : « les conseils sont sur chaque fiche ») : ${input.toConfirm.join(" ; ")}.` : "",
    page.key === "cart" ? "Le panier d'exemple (lignes, quantités et montants) et le menu sont posés par le Studio : n'écris aucun montant ni aucune ligne de produit." : page.key !== "home" ? "Le menu de l'en-tête et les liens du pied de page sont ceux de l'accueil, posés par le Studio." : "",
    input.plan.company.shipping ? `Livraison : ${input.plan.company.shipping}.` : "",
    input.plan.company.returns ? `Retours : ${input.plan.company.returns}.` : "",
    ((c) => (c.length ? `Coordonnées : ${c.join(" · ")}.` : ""))([input.plan.company.legalName, input.plan.company.email, input.plan.company.address, input.plan.company.phone].filter((x): x is string => !!x)),
    `Page à écrire : « ${page.fr} ». Écris EXACTEMENT ${page.sections.length} sections, une par ligne ci-dessous, dans cet ordre, chacune avec ce qu'elle doit contenir :`,
    ...page.sections.map((s, i) => `${i + 1}. « ${s} » : ${needOf(s)?.need ?? "les textes qui lui conviennent"}.`),
  ].filter(Boolean).join("\n");
}

/**
 * Réponse imposée au modèle (sortie structurée stricte) : UNE clé obligatoire par section de la page (essai réel du
 * 8 novembre : 7 sections écrites sur 10 malgré la consigne, deux fois). Les longueurs sont dites dans la consigne et
 * contrôlées après.
 */
const StrictSection = z.object({ title: z.string().nullable(), text: z.string().nullable(), button: z.string().nullable(), items: z.array(z.object({ title: z.string(), text: z.string().nullable() })) });
export const strictPageSchema = (page: MockupPage) => z.object({
  seo: z.object({ title: z.string(), description: z.string() }),
  sections: z.object(Object.fromEntries(page.sections.map((_, i) => [`section_${i + 1}`, StrictSection])) as Record<string, typeof StrictSection>),
});

/** Réponse (clés par section, ou liste) → textes de la page, dans l'ordre de l'inventaire. */
export function toPageCopy(raw: any, page: MockupPage): PageCopy {
  const list = Array.isArray(raw?.sections) ? raw.sections : page.sections.map((_, i) => raw?.sections?.[`section_${i + 1}`]).filter(Boolean);
  return PageCopySchema.parse({ seo: raw?.seo, sections: list.map((x: any, i: number) => ({ section: x.section ?? page.sections[i] ?? "", title: x.title ?? null, text: x.text ?? null, button: x.button ?? null, items: x.items ?? [] })) });
}

/** Écrit les textes d'une page (un appel, plafonné, sortie stricte). `generate` : remplaçable par les tests. */
export async function writePageCopy(call: Parameters<typeof llmJson>[0], page: MockupPage, generate?: (c: Parameters<typeof llmJson>[0]) => Promise<unknown>): Promise<PageCopy> {
  return toPageCopy(generate ? await generate(call) : await llmJson(call, strictPageSchema(page), { strict: true }), page);
}

/**
 * Textes imposés posés par le Studio, mot pour mot (jamais confiés au modèle) : accroche, slogan et appel à l'action
 * dans l'ouverture, noms et prix exacts des produits. Puis contrôle : chaque section présente, dans l'ordre, avec son
 * contenu ; aucun trou « [À compléter] ». Renvoie les problèmes (vide = textes complets).
 */
/** Produit affiché sur une fiche : le titre de la section « prix » (sinon rien). */
function sections_title(c: PageCopy, page: MockupPage): string | null {
  const i = page.sections.findIndex((x) => /prix/.test(x));
  const t = i >= 0 ? c.sections[i]?.title : null;
  return t ? t.toLocaleLowerCase("fr-FR") : null;
}

/** Frais de livraison et seuil de gratuité lus dans la phrase du client (« 4,90 € … offerte dès 35 € »), en centimes. */
export function shippingRule(text?: string | null): { fee: number; freeFrom: number | null } | null {
  if (!text) return null;
  const cents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
  const fee = text.match(/(\d+(?:[,.]\d{1,2})?)\s*€/);
  if (!fee) return null;
  const free = text.match(/(?:offerte?|gratuite?)\s+(?:dès|à partir de|au-delà de)\s+(\d+(?:[,.]\d{1,2})?)\s*€/i);
  return { fee: cents(fee[1]), freeFrom: free ? cents(free[1]) : null };
}

type Item = { title: string; text: string | null };
export function fixAndCheckCopy(c: PageCopy, page: MockupPage, fixed: { headline?: string; tagline?: string | null; cta?: string; products: { title: string; price: number | null }[]; nav?: { header: Item[]; button?: string | null; footer: Item[] }; shipping?: string | null }): { copy: PageCopy; problems: string[] } {
  const problems: string[] = [];
  if (c.sections.length !== page.sections.length) problems.push(`${c.sections.length} sections écrites pour ${page.sections.length} attendues`);
  const euros = (n: number) => `${(n / 100).toFixed(2).replace(".", ",").replace(",00", "")} €`;
  const sections = page.sections.map((name, i) => {
    const s = { ...(c.sections[i] ?? { section: name, title: null, text: null, button: null, items: [] }), section: name };
    if (page.key === "home" && /ouverture|promesse/.test(name)) {
      if (fixed.headline) s.title = fixed.headline;
      if (fixed.tagline) s.text = fixed.tagline;
      if (fixed.cta) s.button = fixed.cta;
    }
    // Section des produits de l'ACCUEIL seulement (essai réel du 8 novembre : les « produits complémentaires » de la
    // fiche produit remplacés par les six, produit affiché compris).
    if (page.key === "home" && /^(produit ou offre|offre)/.test(name) && fixed.products.length) {
      const byName = new Map(s.items.map((x) => [x.title.toLocaleLowerCase("fr-FR"), x.text]));
      s.items = fixed.products.map((p) => {
        const said = byName.get(p.title.toLocaleLowerCase("fr-FR")) ?? "";
        const rest = said.replace(/^\s*\d+[,.]?\d*\s*€\s*[—–:,·-]?\s*/, "");
        return { title: p.title, text: [p.price != null ? euros(p.price) : "", rest].filter(Boolean).join(" · ") || null };
      });
    }
    if (/complémentaires/.test(name) && page.key !== "home") {
      const shown = sections_title(c, page);
      if (shown) s.items = s.items.filter((x) => x.title.toLocaleLowerCase("fr-FR") !== shown);
    }
    // Même menu et mêmes liens de pied de page que l'accueil sur toutes les pages (essai réel : menu différent sur
    // chaque page, avec des « Thés » et « Infusions » qui ne sont pas des pages du site).
    if (page.key !== "home" && fixed.nav) {
      if (/en-t[êe]te/i.test(name)) { s.items = fixed.nav.header; s.title = null; if (fixed.nav.button) s.button = fixed.nav.button; }
      if (/pied de page/i.test(name) && fixed.nav.footer.length) s.items = fixed.nav.footer;
    }
    // Panier d'exemple posé par le Studio, montants calculés (essai réel : sous-total faux et livraison facturée
    // au-delà du seuil de gratuité).
    if (page.key === "cart" && fixed.products.some((x) => x.price != null)) {
      const lines = fixed.products.filter((x) => x.price != null).slice(0, 2);
      if (/lignes du panier/.test(name)) s.items = lines.map((x) => ({ title: x.title, text: `1 sachet · ${euros(x.price!)}` }));
      if (/^sous-total/.test(name)) {
        const sub = lines.reduce((n, x) => n + x.price!, 0), rule = shippingRule(fixed.shipping);
        const ship = rule ? (rule.freeFrom != null && sub >= rule.freeFrom ? 0 : rule.fee) : null;
        s.items = [{ title: "Sous-total", text: euros(sub) }, ...(ship != null ? [{ title: "Livraison", text: ship ? euros(ship) : "offerte" }, { title: "Total", text: euros(sub + ship) }] : [])];
      }
    }
    if (page.key !== "home" && fixed.headline && s.title && norm2(s.title) === norm2(fixed.headline)) problems.push(`« ${name} » : l'accroche de l'accueil reprise comme titre (titre propre à la page attendu)`);
    const need = needOf(name);
    if (need?.minItems && s.items.length < need.minItems) problems.push(`« ${name} » : ${s.items.length} élément(s) pour ${need.minItems} au moins`);
    if (!s.title && !s.text && !s.items.length && !s.button) problems.push(`« ${name} » vide`);
    return s;
  });
  const holes = JSON.stringify(sections).match(/\[À compléter[^\]]*\]/g);
  if (holes) problems.push(`trous à compléter : ${[...new Set(holes)].join(", ")}`);
  return { copy: { ...c, sections }, problems };
}

const norm2 = (t: string) => t.toLocaleLowerCase("fr-FR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

/** Angle tel que lu à l'étape 4 (émotion, récit, scènes) pour la rédaction. */
export function angleDetails(j: Journey): { emotion?: string; story?: string; show?: string; toConfirm?: string[] } {
  const id = j.angleChoice?.id;
  const a = id ? j.angles?.list.find((x) => x.id === id) : undefined;
  return a ? { emotion: a.emotion || undefined, story: a.story || undefined, show: a.show || undefined, toConfirm: a.proofsToConfirm?.length ? a.proofsToConfirm : undefined } : {};
}

/** Textes d'une page, tels qu'écrits sur la maquette : une ligne par section, textes entre guillemets. */
export function copyLines(c: PageCopy, opts: { phone?: boolean } = {}): string[] {
  return c.sections.map((s) => {
    // Téléphone (essai réel du 8 novembre) : les liens du menu cités dans l'en-tête faisaient dessiner un menu
    // d'ordinateur ; en téléphone, l'en-tête n'a que le logo et l'icône du menu (les liens restent au pied de page).
    const header = opts.phone && /en-t[êe]te/i.test(s.section);
    const parts = [
      s.title ? `titre « ${s.title} »` : "",
      s.text ? `texte « ${s.text} »` : "",
      ...(header ? [] : s.items.map((i) => `élément « ${i.title} »${i.text ? ` avec « ${i.text} »` : ""}`)),
      s.button ? `bouton « ${s.button} »` : "",
    ].filter(Boolean);
    // Téléphone : la disposition est dite DANS chaque partie (essai réel du 8 novembre : avec une seule règle générale,
    // le journal était bien empilé mais les gros plans passaient à quatre de front et les moments à trois).
    const layout = opts.phone && s.items.length >= 3 && !header
      ? /produit|offre|collection|catalogue/i.test(s.section) ? " (en cartes, deux par rangée au plus)" : " (disposés l'un sous l'autre, chacun sur toute la largeur, jamais côte à côte)"
      : "";
    // Nom de la section sans guillemets : une indication de place, jamais un texte à écrire.
    return parts.length ? `Dans la partie ${s.section}${layout} : ${parts.join(" ; ")}.` : "";
  }).filter(Boolean);
}

/**
 * Correction mot pour mot d'un texte de page (gratuit, sans IA) : remplace un passage EXACT par les mots du client, ou
 * le retire (replace vide). Renvoie le nombre de remplacements (0 = passage introuvable, rien n'est changé).
 */
export function editPageCopy(c: PageCopy, find: string, replace: string): { copy: PageCopy; count: number } {
  let count = 0;
  const fix = (t: string | null) => {
    if (t == null || !t.includes(find)) return t;
    count += t.split(find).length - 1;
    const out = t.split(find).join(replace).replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
    return out || null;
  };
  const sections = c.sections.map((s) => ({ ...s, title: fix(s.title), text: fix(s.text), button: fix(s.button), items: s.items.map((i) => ({ title: fix(i.title) ?? i.title, text: fix(i.text) })) }));
  return { copy: { seo: { title: fix(c.seo.title) ?? c.seo.title, description: fix(c.seo.description) ?? c.seo.description }, sections }, count };
}
