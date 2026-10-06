/**
 * Annonces publicitaires d'une campagne (angle, texte principal, titre, bouton) dans la langue des contenus
 * de l'action (`contentLang()`) : une campagne peut être en anglais pour une boutique en français.
 * Avec l'IA si elle est disponible pour le client, sinon modèles locaux honnêtes construits à partir
 * des faits produit confirmés, du nom de marque et des angles de la stratégie (aucun chiffre ni avis inventé).
 * Serveur uniquement.
 */
import { z } from "zod";
import { pick, type Lang } from "../i18n";
import { contentLang, L, uiLang, withContentLang } from "../i18n-server";
import { lintClaims, lintHollow, scrubClaims } from "../ai/tasks";
import { areaMentioned, howToBook, unknownText } from "./services-text";
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { charter, langName, placeholder } from "../ai/prompts";
import type { Project } from "../projects";
import { adPolicyIssues, aiCraftReview, audienceIssues, brandCraftBrief, craftLoop, honestTestBudget, type CraftQuality } from "./ad-craft";

export type AdDraft = {
  angle: string;
  primary: string;
  headline: string;
  cta: string;
  /** Accroche des 3 premières secondes : texte à l'écran et première ligne (10 mots au plus). */
  hook?: string;
  /** Description de lien (Meta, 30 caractères au plus). */
  description?: string;
  /** Création à utiliser (format, premier plan, texte à l'écran), dans la langue de l'interface. */
  visual?: string;
  /** Levier testé (démonstration, détail, situation d'usage, objection, curiosité, cadeau). */
  lever?: string;
};

/** Plan de test d'une campagne, rédigé pour le marchand (langue de l'interface). Aucun résultat n'est promis. */
export type AdStrategy = {
  summary: string;
  audiences: { name: string; who: string; signals: string; why: string }[];
  structure: string[];
  budget: { daily: string; duration: string; total: string; rule: string; note: string };
  tests: { variable: string; hypothesis: string }[];
  kpis: string[];
  hooks: { text: string; visual: string; lever: string }[];
  quality?: CraftQuality;
  by: "ai" | "local";
};

/** Boutons d'appel à l'action proposés par les gestionnaires de publicités (même ordre dans les deux langues). */
export const AD_CTAS: Record<Lang, string[]> = {
  fr: ["Découvrir", "Acheter", "En savoir plus", "Voir le produit", "S'inscrire"],
  en: ["Discover", "Shop now", "Learn more", "View product", "Sign up"],
};

/** Boutons des annonces d'une entreprise de services : prendre rendez-vous, demander un devis, appeler… */
export const SERVICE_AD_CTAS: Record<Lang, string[]> = {
  fr: ["Prendre rendez-vous", "Demander un devis", "Appeler", "En savoir plus", "Nous contacter"],
  en: ["Book now", "Get a quote", "Call now", "Learn more", "Contact us"],
};

/** Boutons proposés pour ce projet (produits ou services), dans la langue demandée. */
export const adCtas = (p: Pick<Project, "business">, lang: Lang) => (p.business === "services" ? SERVICE_AD_CTAS : AD_CTAS)[lang];

/** Bouton principal d'une entreprise de services selon son mode de contact. */
function serviceCta(p: Project, lang: Lang): string {
  const ctas = SERVICE_AD_CTAS[lang];
  const mode = p.services?.contactMode;
  return mode === "booking" ? ctas[0] : mode === "quote" ? ctas[1] : mode === "call" ? ctas[2] : ctas[4];
}

const str = z.preprocess((v) => (v == null ? "" : typeof v === "string" ? v : String(v)), z.string());
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.preprocess((v) => (Array.isArray(v) ? v.slice(0, max) : []), z.array(item));
const AdSchema = z.object({ angle: str, lever: str.optional(), hook: str.optional(), primary: str, headline: str, description: str.optional(), cta: str, visual: str.optional() });
const AdPlanSchema = z.object({
  strategy: z.preprocess((v) => v ?? {}, z.object({
    summary: str,
    audiences: list(z.object({ name: str, who: str, signals: str, why: str }), 3),
    structure: list(str, 6),
    tests: list(z.object({ variable: str, hypothesis: str }), 4),
    kpis: list(str, 5),
  })),
  hooks: list(z.object({ text: str, visual: str, lever: str }), 5),
  ads: z.array(AdSchema).min(1),
});
type AdPlan = z.infer<typeof AdPlanSchema>;

/** Consignes du media buyer et concepteur-rédacteur (produits) ; les entreprises de services gardent leurs règles propres. */
function adSystem(p: Project, lang: Lang, ctas: string[]): string {
  const services = p.business === "services";
  const ui = langName(uiLang());
  return `${charter(lang)}

Rôle : media buyer senior et concepteur-rédacteur d'une agence à la performance (Meta, TikTok, Google, Pinterest). Tu prépares une campagne de TEST prête à monter dans les gestionnaires de publicités : audiences, accroches, annonces et plan de test. ${services ? `ENTREPRISE DE SERVICES (pas de produit, pas de panier, pas de livraison) : l'objectif est de faire prendre rendez-vous, demander un devis ou appeler. Appuie-toi sur les prestations, la zone, les horaires et le mode de contact du contexte ; jamais de tarif, de diplôme, de certification, d'assurance, d'expérience, d'avis ni de délai d'intervention qui n'y figure pas. Le bouton le plus adapté au mode de contact est « ${serviceCta(p, lang)} ».` : "Tu t'appuies sur les angles de la stratégie, les faits confirmés et les observations visuelles du produit."}
Méthode, dans cet ordre :
1. Audiences : 2 ou 3 hypothèses testables ; « who » (des adultes : pour un produit d'enfant, les parents ou l'entourage, jamais des enfants), « signals » (ciblage large Advantage+, centres d'intérêt, comportements, audience similaire quand des acheteurs existent), « why » ; aucune donnée chiffrée inventée sur la cible.
2. Leviers : un levier différent par annonce (démonstration, détail qui intrigue, situation d'usage, objection levée, curiosité, idée cadeau), chacun fondé sur un fait confirmé ou un détail visible.
3. Accroches des 3 premières secondes (« hooks », 3 à 5) : « text » = texte à l'écran, 10 mots au plus, concret et propre au produit ; « visual » = ce qu'on voit dès la première seconde (mouvement, gros plan, geste). Pas de question vague (« Vous cherchez le cadeau idéal ? »), pas de slogan.
4. Annonces (accroche → bénéfice concret → preuve → appel) : « hook » (l'accroche retenue) ; « primary » : PREMIÈRE LIGNE de 125 caractères au plus qui porte l'accroche écrite, puis 1 ou 2 phrases courtes (bénéfice concret, puis preuve : fait confirmé ou détail visible) ; « headline » 3 à 6 mots, 40 caractères au plus, sans « ! » ni « ? » ; « description » 30 caractères au plus ; « cta » choisi exactement dans : ${ctas.join(" | ")} ; « visual » : la création à utiliser (format 9:16 ou 1:1, premier plan, texte à l'écran) ; « lever » ; « angle » 2 à 5 mots.
5. Plan de test : « structure » (campagne, ensembles d'annonces, nombre d'annonces par ensemble, placements ; une seule variable testée à la fois, l'accroche d'abord), « tests » (variable + hypothèse), « kpis » (taux d'arrêt sur 3 s, taux de clic, coût par clic, coût par achat ou par contact) ; aucun résultat promis. Le budget de test est calculé par le studio (donné dans la demande) : ne propose pas d'autre montant.
Règles des régies : Meta : aucun attribut personnel affirmé ou sous-entendu (« Vous êtes stressé ? », « votre acné »), pas d'avant / après corporel ; TikTok : texte de 100 caractères au plus, ton natif ; Google : pas de mots en MAJUSCULES, pas de ponctuation répétée (« !! »), pas de « cliquez ici ». Aucune promotion, aucun avis, aucune note, aucun prix barré, aucun chiffre ni délai absent du contexte.
Exemple (gourde fictive, faits supposés confirmés) : excellent : hook « Le bouchon se visse d'un quart de tour », visuel « gros plan, la main visse le bouchon dès la 1re seconde » ; médiocre : « Découvrez notre gourde révolutionnaire ! ».
Langues : « hooks.text », « hook », « angle », « primary », « headline », « description » en ${langName(lang)}, même si le contexte est dans une autre langue (traduis et adapte les faits, sans en ajouter) ; « strategy », « hooks.visual », « hooks.lever », « visual » et « lever » en ${ui} (ils s'adressent au marchand).`;
}

/** Propose `count` annonces et leur plan de test dans la langue des contenus de l'exécution en cours. */
export async function draftAds(p: Project, opts: { userId: string; count?: number; objective?: string; audience?: string; networks?: string[] }): Promise<{ ads: AdDraft[]; by: "ai" | "local"; strategy: AdStrategy }> {
  const lang = contentLang();
  const count = Math.max(1, Math.min(6, opts.count ?? 3));
  if (llmConfigured()) {
    const services = p.business === "services";
    const ctas = adCtas(p, lang);
    const budget = honestTestBudget(p, uiLang());
    const b = { userId: opts.userId, projectId: p.id };
    const brief = `${opts.objective ? `Objectif de la campagne : ${opts.objective}.\n` : ""}${opts.audience ? `Audience indiquée par le marchand : ${opts.audience}.\n` : ""}${opts.networks?.length ? `Réseaux : ${opts.networks.join(", ")}.\n` : ""}Budget de test calculé par le studio : ${budget.daily} ; ${budget.duration} ; ${budget.total}. Règle de décision : ${budget.rule}`;
    const ask = (feedback?: string) => llmJson(
      {
        task: "ad_creative",
        ...b,
        system: adSystem(p, lang, ctas),
        context: `${projectContext(p, "social")}\n${brandCraftBrief(p)}`,
        prompt: `Prépare la campagne de test : ${count} annonce(s).\n${brief}${feedback ? `\nCorrections exigées par le directeur de création et le contrôle qualité sur la proposition précédente (à appliquer toutes, sans rien inventer) :\n${feedback}` : ""}
Réponds { "strategy": { "summary": "…", "audiences": [ { "name": "…", "who": "…", "signals": "…", "why": "…" } ], "structure": ["…"], "tests": [ { "variable": "…", "hypothesis": "…" } ], "kpis": ["…"] }, "hooks": [ { "text": "…", "visual": "…", "lever": "…" } ], "ads": [ { "angle": "…", "lever": "…", "hook": "…", "primary": "…", "headline": "…", "description": "…", "cta": "…", "visual": "…" } ] }.`,
        maxTokens: 9000,
      },
      AdPlanSchema,
    );
    const lint = (r: AdPlan) => [...adProblems(r.ads.slice(0, count), p), ...adPolicyIssues(r.ads.slice(0, count), p), ...audienceIssues(r.strategy.audiences, p)];
    const { best: r, quality } = await craftLoop<AdPlan>("ads", {
      draft: ask,
      lint,
      review: (r) => aiCraftReview({ ...b, usageKey: undefined }, p, "ads", { strategy: r.strategy, hooks: r.hooks, ads: r.ads.slice(0, count) }, `Objectif : ${opts.objective ?? "non précisé"}. Boutons autorisés : ${ctas.join(" | ")}.`),
    });
    const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/[\s,;:·-]+$/, "") : t);
    const ads = r.ads.slice(0, count).map((a) => {
      const clean = scrubClaims({ primary: a.primary, headline: a.headline, angle: a.angle, hook: a.hook ?? "", description: a.description ?? "" }, p).content;
      return { ...a, ...clean, headline: cut(clean.headline, 40), description: cut(clean.description, 30), cta: ctas.includes(a.cta) ? a.cta : services ? serviceCta(p, lang) : ctas[0] };
    });
    const hooks = r.hooks.map((h) => ({ ...h, text: scrubClaims({ text: h.text }, p).content.text }));
    return { ads, by: "ai", strategy: { ...r.strategy, budget, hooks, quality, by: "ai" } };
  }
  return { ads: localAds(p, lang, count), by: "local", strategy: localAdStrategy(p, lang, opts) };
}

/** Défauts d'annonces rédigées par l'IA, formulés comme consignes de correction. */
export function adProblems(ads: AdDraft[], p: Project): string[] {
  const out: string[] = [];
  ads.forEach((a, i) => {
    for (const c of lintClaims({ primary: a.primary, headline: a.headline }, p)) out.push(L(`Annonce ${i + 1}, ${c.path} : « ${c.term} » (${c.label}) n'est pas confirmé, retire-le.`, `Ad ${i + 1}, ${c.path}: "${c.term}" (${c.label}) is not confirmed, remove it.`));
    for (const h of lintHollow({ primary: a.primary, headline: a.headline })) out.push(L(`Annonce ${i + 1}, ${h.path} : formule creuse « ${h.term} », remplace-la par un fait concret.`, `Ad ${i + 1}, ${h.path}: empty phrase "${h.term}", replace it with a concrete fact.`));
    if (a.headline.length > 40) out.push(L(`Annonce ${i + 1} : titre de ${a.headline.length} caractères, 40 au plus.`, `Ad ${i + 1}: headline is ${a.headline.length} characters, 40 at most.`));
  });
  return out;
}

/**
 * Modèles locaux FR/EN, construits comme ceux d'un concepteur-rédacteur : accroche des 3 premières secondes en
 * première ligne, bénéfice ou détail concret, preuve (fait confirmé), bouton ; un levier différent par annonce.
 * Les angles et faits de la stratégie sont rédigés dans la langue du projet : ils ne sont repris tels quels que si
 * la campagne est dans cette langue ; sinon le texte reste générique, avec des espaces réservés à compléter.
 */
export function localAds(p: Project, lang: Lang, count = 3): AdDraft[] {
  if (p.business === "services") return withContentLang(lang, () => localServiceAds(p, lang, count));
  const sameLang = (p.settings.language ?? "fr") === lang;
  const en = lang === "en";
  const brand = p.brand?.name?.trim() || "";
  const product = p.product.name?.trim() || (en ? "our product" : "notre produit");
  const who = brand && brand.toLowerCase() !== product.toLowerCase() ? `${brand} · ${product}` : product;
  const ph = (what: string) => placeholder(lang, what);
  const tagline = sameLang ? p.brand?.tagline?.trim() : "";
  const confirmed = sameLang ? p.product.facts.filter((f) => f.status === "confirmed" && f.value.trim()) : [];
  const facts = confirmed.map((f) => (en ? `${f.label}: ${f.value}` : `${f.label} : ${f.value}`));
  const angles = sameLang ? (p.strategy?.angles ?? []).filter((a) => a.title.trim()) : [];
  const ctas = AD_CTAS[lang];
  const words = (t: string, n: number) => t.split(/\s+/).filter(Boolean).slice(0, n).join(" ");
  const firstSentence = (t: string) => t.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, "").trim();
  const short = (t: string, n: number) => (t.length > n ? t.slice(0, n + 1).replace(/\s+\S*$/, "") : t);
  const description = short(brand || product, 30);
  const visuals = [
    L("9:16 : le produit en main en gros plan dès la première image, texte de l'accroche en haut ; coupe sur un détail à 2 s.", "9:16: close-up of the product in hand from the very first frame, hook text at the top; cut to a detail at 2 s."),
    L("1:1 : photo en situation plein cadre, accroche en bas ; deuxième image : le détail cité dans le texte.", "1:1: full-frame lifestyle photo, hook at the bottom; second frame: the detail quoted in the copy."),
    L("9:16 : le produit seul sous une lumière franche, rotation lente, accroche en 6 mots au plus.", "9:16: the product alone under crisp light, slow turn, hook in 6 words max."),
    L("4:5 : carrousel, une carte par fait confirmé, le produit sur chaque carte.", "4:5: carousel, one card per confirmed fact, the product on every card."),
  ];
  const out: AdDraft[] = [];

  angles.slice(0, count).forEach((a, i) => {
    const fact = facts[i % Math.max(1, facts.length)];
    const idea = a.idea.trim();
    const hook = words(idea ? firstSentence(idea) : en ? `${product}: ${a.title.toLowerCase()}` : `${product} : ${a.title.toLowerCase()}`, 10);
    out.push({
      angle: a.title,
      lever: a.title,
      hook,
      primary: [idea || (en ? `Meet ${product}.` : `Découvrez ${product}.`), fact ? `${fact}.` : ""].filter(Boolean).join("\n\n"),
      headline: short(tagline || (en ? `Meet ${product}` : `Découvrez ${product}`), 40),
      description,
      cta: ctas[i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 3],
      visual: visuals[i % visuals.length],
    });
  });

  const v0 = confirmed[0]?.value.trim();
  const v1 = confirmed[1]?.value.trim();
  const lower = (t: string) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  const generic: AdDraft[] = en
    ? [
        { angle: "The detail", lever: L("Détail qui intrigue", "Intriguing detail"), hook: v0 && v0.split(/\s+/).length <= 7 ? `Look closely: ${lower(v0)}` : `${product}, up close`, primary: `${v0 && v0.split(/\s+/).length <= 7 ? `Look closely: ${lower(v0)}.` : `${product}, up close.`}\n\n${(v0 && v0.split(/\s+/).length <= 7 ? facts.slice(1, 3) : facts.slice(0, 1)).map((f) => `${f}.`).join("\n") || ph("key benefit, confirmed")}\n\n${who}.`, headline: short(`${product}, up close`, 40), description, cta: ctas[3], visual: visuals[0] },
        { angle: "Everyday use", lever: L("Situation d'usage", "Use case"), hook: short(`${product}, in real life`, 60), primary: `${product}, in real life.\n\n${ph("how and when it is used")}${facts[1] ? `\n\n${facts[1]}.` : ""}`, headline: short(brand ? `${brand}, every day` : "Made for every day", 40), description, cta: ctas[2], visual: visuals[1] },
        { angle: "Meet it", lever: L("Découverte", "Discovery"), hook: short(tagline || `Meet ${product}`, 60), primary: `${tagline ? `${tagline.replace(/[.!]+$/, "")}.` : `Meet ${who}.`}\n\n${v1 ? `${facts[1]}.` : ph("what sets it apart, confirmed")}`, headline: short(`Meet ${product}`, 40), description, cta: ctas[0], visual: visuals[2] },
        { angle: "Why choose it", lever: L("Objection levée", "Objection handled"), hook: `${product}: the essentials`, primary: `${product}: the essentials.\n\n${facts.slice(0, 3).map((f) => `• ${f}`).join("\n") || ph("what sets it apart, confirmed")}\n\nAvailable now${brand ? ` from ${brand}` : ""}.`, headline: short(`${product}, the essentials`, 40), description, cta: ctas[1], visual: visuals[3] },
      ]
    : [
        { angle: "Le détail", lever: L("Détail qui intrigue", "Intriguing detail"), hook: v0 && v0.split(/\s+/).length <= 7 ? `Regardez de près : ${lower(v0)}` : `${product}, de près`, primary: `${v0 && v0.split(/\s+/).length <= 7 ? `Regardez de près : ${lower(v0)}.` : `${product}, de près.`}\n\n${(v0 && v0.split(/\s+/).length <= 7 ? facts.slice(1, 3) : facts.slice(0, 1)).map((f) => `${f}.`).join("\n") || ph("bénéfice principal, confirmé")}\n\n${who}.`, headline: short(`${product}, de près`, 40), description, cta: ctas[3], visual: visuals[0] },
        { angle: "Au quotidien", lever: L("Situation d'usage", "Use case"), hook: short(`${product}, dans la vraie vie`, 60), primary: `${product}, dans la vraie vie.\n\n${ph("comment et quand il s'utilise")}${facts[1] ? `\n\n${facts[1]}.` : ""}`, headline: short(brand ? `${brand}, au quotidien` : "Pensé pour tous les jours", 40), description, cta: ctas[2], visual: visuals[1] },
        { angle: "La découverte", lever: L("Découverte", "Discovery"), hook: short(tagline || `Voici ${product}`, 60), primary: `${tagline ? `${tagline.replace(/[.!]+$/, "")}.` : `Voici ${who}.`}\n\n${v1 ? `${facts[1]}.` : ph("ce qui le distingue, confirmé")}`, headline: short(`Voici ${product}`, 40), description, cta: ctas[0], visual: visuals[2] },
        { angle: "L'essentiel", lever: L("Objection levée", "Objection handled"), hook: `${product} : l'essentiel`, primary: `${product} : l'essentiel.\n\n${facts.slice(0, 3).map((f) => `• ${f}`).join("\n") || ph("ce qui le distingue, confirmé")}\n\nDisponible dès maintenant${brand ? ` chez ${brand}` : ""}.`, headline: short(`${product}, l'essentiel`, 40), description, cta: ctas[1], visual: visuals[3] },
      ];
  for (const g of generic) if (out.length < count) out.push(g);
  return out.slice(0, count);
}

/**
 * Plan de test sans IA (version du studio) : audiences de départ honnêtes, structure de campagne, budget de test,
 * variable testée, indicateurs et accroches reprises des annonces. Rédigé pour le marchand (langue de l'interface).
 */
export function localAdStrategy(p: Project, lang: Lang, opts: { count?: number; objective?: string; audience?: string; networks?: string[] } = {}): AdStrategy {
  const ui = uiLang();
  const t = (fr: string, en: string) => pick(ui, fr, en);
  const services = p.business === "services";
  const kids = p.product.sector === "enfants";
  const declared = (opts.audience || p.brand?.audience || "").trim();
  const n = Math.max(1, Math.min(6, opts.count ?? 3));
  const nets = opts.networks?.length ? opts.networks : ["instagram", "facebook"];
  const meta = nets.some((x) => x === "instagram" || x === "facebook");
  const tiktok = nets.includes("tiktok");
  const ads = localAds(p, lang, n);
  const audiences: AdStrategy["audiences"] = [
    { name: t("Audience décrite", "Described audience"), who: declared || t("[À compléter : qui achète, âge, situation, centres d'intérêt]", "[To complete: who buys, age, situation, interests]"), signals: t("Centres d'intérêt et comportements correspondant à cette description", "Interests and behaviors matching this description"), why: t("Point de départ issu de votre plateforme de marque : à confirmer par les chiffres.", "Starting point from your brand platform: to be confirmed by the numbers.") },
    { name: t("Ciblage large", "Broad targeting"), who: kids ? t("Adultes de 18 ans et plus (parents, entourage), sans autre critère", "Adults 18+ (parents, family circle), no other criteria") : t("Adultes du pays de livraison, sans autre critère", "Adults in the shipping country, no other criteria"), signals: t("Advantage+ / ciblage automatique : l'algorithme cherche lui-même les acheteurs à partir de la création", "Advantage+ / automatic targeting: the algorithm finds buyers from the creative itself"), why: t("Souvent le plus efficace quand la création est forte ; sert de témoin face à l'audience décrite.", "Often the most efficient when the creative is strong; acts as a control against the described audience.") },
  ];
  if (services && p.services?.area?.trim()) audiences[1] = { ...audiences[1], who: t(`Adultes dans la zone : ${p.services.area.trim()}`, `Adults in the area: ${p.services.area.trim()}`) };
  const structure = [
    meta ? t(`Meta : une campagne « ${opts.objective || (services ? "Prospects" : "Ventes")} » ; budget fixé par ensemble d'annonces pendant le test`, `Meta: one "${opts.objective || (services ? "Leads" : "Sales")}" campaign; budget set per ad set during the test`) : "",
    t(`${audiences.length} ensembles d'annonces (un par audience), les ${n} mêmes annonces dans chacun : seule l'audience change`, `${audiences.length} ad sets (one per audience), the same ${n} ads in each: only the audience changes`),
    t("Placements automatiques ; créations 9:16 pour Reels et Stories, 1:1 ou 4:5 pour le fil", "Automatic placements; 9:16 creatives for Reels and Stories, 1:1 or 4:5 for the feed"),
    tiktok ? t("TikTok : un groupe d'annonces en ciblage large, 3 vidéos 9:16 au ton natif (pas de visuel fixe)", "TikTok: one broad ad group, 3 native-style 9:16 videos (no static image)") : "",
    t("Après 7 jours : on garde la meilleure accroche, on coupe le reste, puis on augmente le budget de 20 % tous les 2 à 3 jours", "After 7 days: keep the best hook, pause the rest, then raise the budget by 20% every 2 to 3 days"),
  ].filter(Boolean);
  return {
    summary: t("Plan de test de départ préparé par le studio (version sans IA) : les hypothèses sont à valider par vos propres chiffres.", "Starter test plan prepared by the studio (no-AI version): the hypotheses must be validated by your own numbers."),
    audiences,
    structure,
    budget: honestTestBudget(p, ui, audiences.length),
    tests: [
      { variable: t("Accroche (3 premières secondes)", "Hook (first 3 seconds)"), hypothesis: t("L'accroche fait l'essentiel de l'écart entre deux annonces : on la teste en premier, le reste identique.", "The hook drives most of the gap between two ads: test it first, everything else equal.") },
      { variable: t("Audience", "Audience"), hypothesis: t("L'audience décrite fait-elle mieux que le ciblage large ?", "Does the described audience beat broad targeting?") },
    ],
    kpis: services
      ? [t("Taux d'arrêt sur 3 s (vidéo)", "3-second hold rate (video)"), t("Taux de clic", "Click-through rate"), t("Coût par contact", "Cost per lead"), t("Demandes reçues", "Requests received")]
      : [t("Taux d'arrêt sur 3 s (vidéo)", "3-second hold rate (video)"), t("Taux de clic (lien)", "Link click-through rate"), t("Coût par clic", "Cost per click"), t("Coût par achat", "Cost per purchase")],
    hooks: ads.map((a) => ({ text: a.hook ?? a.primary.split("\n")[0], visual: a.visual ?? "", lever: a.lever ?? a.angle })),
    by: "local",
  };
}

/**
 * Annonces locales d'une entreprise de services : appel à prendre rendez-vous, demander un devis ou appeler.
 * Prestations, zone et horaires repris tels que saisis (traduits seulement s'ils l'ont été) ; sinon espaces réservés.
 */
function localServiceAds(p: Project, lang: Lang, count: number): AdDraft[] {
  const sameLang = (p.settings.language ?? "fr") === lang;
  const en = lang === "en";
  const ctas = SERVICE_AD_CTAS[lang];
  const main = serviceCta(p, lang);
  const brand = p.brand?.name?.trim() || p.product.name?.trim() || "";
  const activity = (sameLang ? p.product.category?.trim() || p.product.name?.trim() : "") || brand || (en ? "our services" : "nos prestations");
  const tagline = sameLang ? p.brand?.tagline?.trim() : "";
  const offer = sameLang ? (p.services?.services ?? []).filter((x) => x.name.trim()) : [];
  const where = p.services?.area?.trim() || p.services?.address?.trim() || "";
  const book = howToBook(p.services);
  const out: AdDraft[] = [];
  const noDot = (t?: string) => (t ?? "").trim().replace(/[.!]+$/, "");
  // Une annonce par prestation décrite (au plus count - 2), puis les modèles génériques.
  offer.filter((x) => x.description?.trim()).slice(0, Math.max(0, count - 2)).forEach((x, i) => {
    out.push({ angle: x.name, primary: [`${noDot(x.description)}.`, where ? (en ? `Where: ${where}.` : `Où : ${where}.`) : "", book].filter(Boolean).join("\n\n"), headline: x.name.slice(0, 40), cta: i % 2 ? ctas[3] : main });
  });
  const svc = offer[0];
  const lead = (sep: string) => {
    const who = brand && brand !== activity ? `${brand}${sep}${activity}` : activity;
    return `${who}${svc && svc.name !== activity ? `, ${svc.name.toLowerCase()}` : ""}${where && !areaMentioned(who, where) ? `, ${where}` : ""}.`;
  };
  const generic: AdDraft[] = en
    ? [
        { angle: "Book an appointment", primary: `${lead(": ")}\n\n${book}`, headline: (tagline || (where ? `${activity}, ${where}` : activity)).slice(0, 40), cta: main },
        { angle: "Our services", primary: offer.length ? `What we offer:\n${offer.slice(0, 4).map((x) => `• ${x.name}`).join("\n")}` : unknownText("liste des prestations", "list of services"), headline: brand ? `${brand}'s services`.slice(0, 40) : "Our services", cta: ctas[3] },
        { angle: "Close to you", primary: `${where ? `We work in ${where}.` : unknownText("zone d'intervention", "service area")}${p.services?.hours?.trim() ? `\nHours: ${p.services.hours.trim()}.` : ""}\n\n${book}`, headline: where ? `In ${where}`.slice(0, 40) : `Near you`, cta: p.services?.phone?.trim() ? ctas[2] : main },
        { angle: "Why choose us", primary: `${unknownText("ce qui vous distingue, confirmé", "what sets you apart, confirmed")}\n\n${book}`, headline: brand ? `Why ${brand}?`.slice(0, 40) : "Why choose us?", cta: ctas[1] },
      ]
    : [
        { angle: "Prendre rendez-vous", primary: `${lead(" · ")}\n\n${book}`, headline: (tagline || (where ? `${activity}, ${where}` : activity)).slice(0, 40), cta: main },
        { angle: "Nos prestations", primary: offer.length ? `Ce que nous proposons :\n${offer.slice(0, 4).map((x) => `• ${x.name}`).join("\n")}` : unknownText("liste des prestations", "list of services"), headline: brand ? `Les prestations ${brand}`.slice(0, 40) : "Nos prestations", cta: ctas[3] },
        { angle: "Près de chez vous", primary: `${where ? `Nous intervenons : ${where}.` : unknownText("zone d'intervention", "service area")}${p.services?.hours?.trim() ? `\nHoraires : ${p.services.hours.trim()}.` : ""}\n\n${book}`, headline: where ? `${where}`.slice(0, 40) : "Près de chez vous", cta: p.services?.phone?.trim() ? ctas[2] : main },
        { angle: "Pourquoi nous choisir", primary: `${unknownText("ce qui vous distingue, confirmé", "what sets you apart, confirmed")}\n\n${book}`, headline: brand ? `Pourquoi ${brand} ?`.slice(0, 40) : "Pourquoi nous choisir ?", cta: ctas[1] },
      ];
  for (const g of generic) if (out.length < count) out.push(g);
  // Un projet sur devis garde « Demander un devis » ; sinon le bouton de devis cède la place au bouton principal.
  return out.slice(0, count).map((a) => (a.cta === ctas[1] && p.services?.contactMode !== "quote" ? { ...a, cta: main } : a));
}
