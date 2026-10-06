/**
 * Exigence « agence » des publicités et des vidéos : grille du directeur de création, boucle de qualité
 * (une passe forte, au plus une reprise ciblée, meilleure version gardée), contrôles déterministes
 * (règles Meta / TikTok / Google, rythme du montage, structure UGC) et repères honnêtes de media buyer
 * (structure de campagne, budget de test). Serveur uniquement.
 */
import { z } from "zod";
import type { Lang } from "../i18n";
import { pick } from "../i18n";
import { contentLang, L } from "../i18n-server";
import { llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { langName } from "../ai/prompts";
import type { Project } from "../projects";
import type { VideoScene, VideoSpec } from "../media/video";

// ---------------------------------------------------------------- cohérence de marque

/**
 * Piste créative retenue et règles de ton, rappelées à chaque tâche publicitaire ou vidéo :
 * une annonce, un montage ou un script UGC parlent avec la même voix que le logo, le kit et la boutique.
 */
export function brandCraftBrief(p: Project): string {
  const b = p.brand;
  if (!b) return "";
  const r = b.logo.route;
  const out = [
    `<piste_creative>`,
    `Marque : ${b.name}${b.tagline ? ` · signature « ${b.tagline} »` : ""}`,
    r ? `Piste retenue : « ${r.name} » · titres en ${r.heading} (graisse ${r.headingWeight}), textes en ${r.body} · encre ${r.colors.ink}, accent ${r.colors.accent}, fond ${r.colors.ground}, teinte ${r.colors.tint}` : `Typographies : ${b.fonts.heading} / ${b.fonts.body}`,
    b.logo.concept ? `Concept du logo : ${b.logo.concept}` : "",
    `Palette : ${b.palette.primary} (principale), ${b.palette.accent} (accent), ${b.palette.light} / ${b.palette.dark}`,
    `Voix : ${b.tone.voice}${b.tone.do.length ? ` · à faire : ${b.tone.do.slice(0, 4).join(" ; ")}` : ""}${b.tone.dont.length ? ` · à éviter : ${b.tone.dont.slice(0, 4).join(" ; ")}` : ""}`,
    b.social ? `Ce qu'on dit : ${b.social.say.slice(0, 4).join(" ; ")} · ce qu'on ne dit jamais : ${b.social.dontSay.slice(0, 4).join(" ; ")}` : "",
    p.product.sector === "enfants" ? `Produit pour enfants : la publicité s'adresse aux PARENTS et à l'entourage adulte (ciblage 18 ans et plus, jamais d'audience d'enfants) ; aucune promesse de sécurité, de sommeil, d'apaisement ou de développement.` : "",
    `</piste_creative>`,
  ];
  return out.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------- grille du directeur de création

export type CraftKind = "ads" | "video" | "ugc";

/** Critères notés de 0 à 10, par métier. Les libellés guident le relecteur ; les clés restent fixes. */
export const RUBRICS: Record<CraftKind, Record<string, string>> = {
  ads: {
    hook: "Accroche : la première ligne et l'accroche visuelle arrêtent le défilement en moins de 3 s (concrètes, visuelles, propres au produit ; ni question vague, ni slogan creux)",
    specificity: "Spécificité : chaque annonce ne pourrait vendre que CE produit (forme, matière, usage, fait confirmé)",
    clarity: "Clarté : on comprend ce que c'est et pourquoi l'acheter en une lecture, phrases courtes, un message par annonce",
    variety: "Variété : leviers réellement différents d'une annonce à l'autre (démonstration, détail, situation d'usage, objection, curiosité), donc testables",
    compliance: "Conformité : règles Meta / TikTok / Google (pas d'attribut personnel, pas de majuscules ni ponctuation excessives, longueurs) et charte de véracité",
    fit: "Adéquation : bouton, ton et promesse cohérents avec l'objectif, l'audience et la piste de marque",
    strategy: "Stratégie : audiences testables, structure de campagne claire, budget de test honnête, variable testée explicite",
  },
  video: {
    hook: "Accroche : mouvement et texte lisibles dès la première image, le produit ou son usage à l'écran avant 1,5 s",
    rhythm: "Rythme : une rupture visuelle (coupe, changement de plan, de cadre ou de fond) toutes les 1,5 à 2,5 s, sans plan qui traîne",
    clarity: "Lisibilité sans le son : un message par plan, 2 à 6 mots, compréhensible au téléphone",
    product: "Produit : montré tôt, en usage ou en détail réel, jamais noyé dans le décor",
    proof: "Preuve : faits confirmés ou détails visibles, aucune promesse non fondée",
    cta: "Appel à l'action final clair, cohérent avec l'objectif",
    brand: "Cohérence de marque : ton, couleurs et typographies de la piste retenue",
  },
  ugc: {
    hook: "Accroche des 3 premières secondes : réplique et geste qui arrêtent le défilement (situation, question précise, geste inattendu)",
    authenticity: "Authenticité : oral naturel de créateur filmé au téléphone, jamais un texte publicitaire lu",
    structure: "Structure : problème ou situation → découverte → démonstration → preuve → appel, chaque plan a une fonction",
    demonstration: "Démonstration : gestes concrets et filmables qui montrent le produit (les mains, le détail, l'usage)",
    honesty: "Honnêteté : aucun témoignage, aucune durée d'usage, aucun résultat, aucun avis ; preuve = ce qu'on voit ou un fait confirmé",
    cta: "Appel à l'action simple et naturel à la fin",
  },
};

const num = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v), z.number().catch(0));
export const CraftReviewSchema = z.object({
  scores: z.preprocess((v) => (v && typeof v === "object" ? v : {}), z.record(z.string(), num)),
  strengths: z.preprocess((v) => (Array.isArray(v) ? v.slice(0, 4).map(String) : []), z.array(z.string())),
  fixes: z.preprocess((v) => (Array.isArray(v) ? v.slice(0, 8).map(String) : []), z.array(z.string())),
});
export type CraftReview = z.infer<typeof CraftReviewSchema>;

/** Seuil de publication : moyenne d'au moins 8/10 et aucun critère sous 6. */
export const CRAFT_MIN_MEAN = 8;
export const CRAFT_MIN_EACH = 6;

/** Note d'une relecture : critères de la grille seulement (un critère absent compte 0 : relecture incomplète). */
export function craftScore(r: CraftReview | null | undefined, kind: CraftKind): { mean: number; min: number } {
  if (!r) return { mean: 0, min: 0 };
  const keys = Object.keys(RUBRICS[kind]);
  const s = keys.map((k) => Math.max(0, Math.min(10, Number(r.scores[k]) || 0)));
  return { mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10, min: Math.min(...s) };
}

export function craftPassed(r: CraftReview | null | undefined, kind: CraftKind): boolean {
  const s = craftScore(r, kind);
  return s.mean >= CRAFT_MIN_MEAN && s.min >= CRAFT_MIN_EACH;
}

const ROLE: Record<CraftKind, string> = {
  ads: "directeur de création d'une agence de publicité à la performance (Meta, TikTok, Google), ancien media buyer",
  video: "directeur de création et réalisateur de publicités pour les réseaux sociaux (formats verticaux, lecture sans le son)",
  ugc: "directeur de création spécialisé dans les vidéos de créateurs (UGC) pour TikTok et Instagram",
};

type Base = { userId: string; projectId: string; jobId?: string | null; usageKey?: string };

/** Relecture notée par un directeur de création du métier : notes par critère, points forts, consignes de reprise. */
export async function aiCraftReview(b: Base, p: Project, kind: CraftKind, content: unknown, extra = ""): Promise<CraftReview> {
  const rubric = RUBRICS[kind];
  const ui = L("français", "anglais");
  return llmJson(
    {
      task: "quality_control",
      userId: b.userId,
      projectId: b.projectId,
      jobId: b.jobId,
      usageKey: b.usageKey,
      system: `Rôle : ${ROLE[kind]}. Tu relis sans complaisance une proposition avant qu'elle parte chez le client.
Note chaque critère de 0 à 10 : 9-10 = une grande agence la publierait telle quelle ; 7-8 = correcte mais générique ou perfectible ; 0-6 = à refaire.
Critères (clés JSON exactes) :
${Object.entries(rubric).map(([k, v]) => `- ${k} : ${v}`).join("\n")}
« fixes » : au plus 6 consignes de reprise précises et actionnables (quoi changer, où, comment), du plus important au moins important ; jamais d'ajout d'information absente du contexte (prix, avis, résultat, certification, délai) : un fait manquant reste « [À compléter : …] ».
« strengths » : au plus 3 points forts à garder.
Langue : « fixes » et « strengths » en ${ui}.`,
      context: `${projectContext(p, kind === "ads" ? "social" : "video")}\n${brandCraftBrief(p)}`,
      prompt: `${extra ? `${extra}\n` : ""}Proposition à relire (langue des contenus : ${langName(contentLang())}) :\n<proposition>\n${JSON.stringify(content, null, 1).slice(0, 20000)}\n</proposition>\nRéponds { "scores": { ${Object.keys(rubric).map((k) => `"${k}": 0`).join(", ")} }, "strengths": ["…"], "fixes": ["…"] }.`,
      maxTokens: 3000,
    },
    CraftReviewSchema,
  );
}

export type CraftQuality = { score: number; min: number; rounds: number; passed: boolean; remaining: string[]; strengths: string[] };

/**
 * Boucle de qualité : proposition → contrôles déterministes + relecture notée → si sous le seuil, UNE reprise
 * ciblée (consignes du contrôle et du directeur de création) → la meilleure des deux versions est gardée.
 * Coût borné : au plus 2 rédactions et 2 relectures (chacune avec sa propre clé de facturation : `round`). Une relecture impossible (fournisseur, crédits)
 * n'empêche jamais de livrer : la proposition est gardée, contrôlée par les seules règles déterministes.
 */
export async function craftLoop<T>(kind: CraftKind, opts: { draft: (feedback?: string) => Promise<T>; lint: (t: T) => string[]; review: (t: T, round: number) => Promise<CraftReview> }): Promise<{ best: T; quality: CraftQuality }> {
  const judge = async (t: T, round: number) => {
    const lint = opts.lint(t);
    const review = await opts.review(t, round).catch(() => null);
    const s = craftScore(review, kind);
    // Rang : note du directeur de création (5 si la relecture a échoué), moins chaque défaut déterministe.
    return { t, lint, review, s, rank: (review ? s.mean : 5) - 0.75 * lint.length, passed: !lint.length && (review ? craftPassed(review, kind) : true) };
  };
  const first = await judge(await opts.draft(), 1);
  if (first.passed) return { best: first.t, quality: quality(first, 1) };
  const feedback = [...first.lint, ...(first.review?.fixes ?? [])].map((x) => `- ${x}`).join("\n");
  let second: Awaited<ReturnType<typeof judge>> | null = null;
  try {
    second = await judge(await opts.draft(feedback), 2);
  } catch {
    // Reprise impossible : la première version est gardée.
  }
  const best = second && second.rank >= first.rank ? second : first;
  return { best: best.t, quality: quality(best, second ? 2 : 1) };

  function quality(j: { lint: string[]; review: CraftReview | null; s: { mean: number; min: number }; passed: boolean }, rounds: number): CraftQuality {
    return { score: j.review ? j.s.mean : 0, min: j.review ? j.s.min : 0, rounds, passed: j.passed, remaining: [...j.lint, ...(j.passed ? [] : j.review?.fixes ?? [])].slice(0, 6), strengths: j.review?.strengths ?? [] };
  }
}

// ---------------------------------------------------------------- règles des régies publicitaires

/** Longueurs recommandées par les régies (texte visible sans « Plus », titres, descriptions). */
export const AD_LIMITS = { primaryFirstLine: 125, headline: 40, description: 30, hookWords: 10, tiktokText: 100 } as const;

/** Attributs personnels (règle Meta « Personal attributes », Google « Personalized advertising ») : jamais affirmés ou sous-entendus. */
const PERSONAL: RegExp[] = [
  /\b(vous êtes|êtes-vous|tu es|es-tu)\s+(\p{L}+\s)?(gros|grosse|en surpoids|obèses?|déprimée?s?|stressée?s?|épuisée?s?|anxieu(x|se)|malades?|endettée?s?|célibataires?|divorcée?s?|enceintes?|chauves?|diabétiques?|fauchée?s?|seule?s?)\b/iu,
  /\b(votre|ta|ton|vos|tes)\s+(acné|cellulite|calvitie|dette|dettes|dépression|diabète|surpoids|kilos en trop|rides|vergetures|insomnie|anxiété)\b/iu,
  /\b(are you|you('re| are))\s+(\p{L}+\s)?(fat|overweight|obese|depressed|anxious|stressed|exhausted|sick|in debt|single|divorced|pregnant|bald|diabetic|broke|lonely)\b/iu,
  /\byour\s+(acne|cellulite|baldness|debt|depression|diabetes|extra weight|wrinkles|stretch marks|insomnia|anxiety)\b/iu,
];

export type AdLike = { angle?: string; hook?: string; primary: string; headline: string; description?: string; cta?: string };

/** Défauts de conformité et d'efficacité d'une série d'annonces, formulés comme consignes de correction. */
export function adPolicyIssues(ads: AdLike[], p: Pick<Project, "brand" | "product">): string[] {
  const out: string[] = [];
  const brand = (p.brand?.name ?? "").toUpperCase();
  ads.forEach((a, i) => {
    const n = i + 1;
    const first = a.primary.split(/\n/)[0] ?? "";
    if (first.length > AD_LIMITS.primaryFirstLine) out.push(L(`Annonce ${n} : la première ligne du texte principal fait ${first.length} caractères ; elle doit porter l'accroche en ${AD_LIMITS.primaryFirstLine} au plus (texte visible avant « Plus »).`, `Ad ${n}: the first line of the primary text is ${first.length} characters; it must carry the hook in ${AD_LIMITS.primaryFirstLine} or fewer (visible before "More").`));
    if (a.description && a.description.length > AD_LIMITS.description) out.push(L(`Annonce ${n} : description de ${a.description.length} caractères, ${AD_LIMITS.description} au plus.`, `Ad ${n}: description is ${a.description.length} characters, ${AD_LIMITS.description} max.`));
    if (a.hook !== undefined) {
      const w = a.hook.trim().split(/\s+/).filter(Boolean).length;
      if (!w) out.push(L(`Annonce ${n} : accroche des 3 premières secondes absente.`, `Ad ${n}: the 3-second hook is missing.`));
      else if (w > AD_LIMITS.hookWords) out.push(L(`Annonce ${n} : accroche de ${w} mots, ${AD_LIMITS.hookWords} au plus pour être lue en 3 secondes.`, `Ad ${n}: hook is ${w} words, ${AD_LIMITS.hookWords} max to be read in 3 seconds.`));
    }
    const all = [a.hook ?? "", a.primary, a.headline, a.description ?? ""].join("\n");
    const shout = all.match(/\b\p{Lu}{4,}\b/gu)?.filter((w) => w !== brand && !brand.includes(w)) ?? [];
    if (shout.length) out.push(L(`Annonce ${n} : mots en capitales (« ${shout[0]} ») refusés par Google et mal vus sur Meta ; écris-les normalement.`, `Ad ${n}: words in all caps ("${shout[0]}") are rejected by Google and frowned upon on Meta; write them normally.`));
    if (/([!?])\1|!\?|\?!/.test(all)) out.push(L(`Annonce ${n} : ponctuation répétée (« !! », « ?! ») refusée par Google ; une seule marque de ponctuation.`, `Ad ${n}: repeated punctuation ("!!", "?!") is rejected by Google; use a single mark.`));
    if (/[!?]/.test(a.headline)) out.push(L(`Annonce ${n} : pas de point d'exclamation ni d'interrogation dans le titre (règle Google).`, `Ad ${n}: no exclamation or question mark in the headline (Google rule).`));
    if (/\p{Extended_Pictographic}/u.test(a.headline)) out.push(L(`Annonce ${n} : pas d'emoji dans le titre.`, `Ad ${n}: no emoji in the headline.`));
    if (/cliquez ici|click here|clique ici/i.test(all)) out.push(L(`Annonce ${n} : « cliquez ici » est refusé (appel à l'action générique) ; dis ce que la personne va voir.`, `Ad ${n}: "click here" is rejected (generic call to action); say what the person will see.`));
    if (PERSONAL.some((r) => r.test(all))) out.push(L(`Annonce ${n} : attribut personnel affirmé ou sous-entendu (« vous êtes… », « votre acné… ») : interdit par Meta ; décris la situation ou le produit, pas la personne.`, `Ad ${n}: personal attribute asserted or implied ("are you…", "your acne…"): banned by Meta; describe the situation or the product, not the person.`));
  });
  // Variété : deux annonces avec la même accroche ne testent rien.
  const seen = new Map<string, number>();
  ads.forEach((a, i) => {
    const k = (a.hook || a.primary.split(/\n/)[0] || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").slice(0, 5).join(" ");
    if (!k) return;
    if (seen.has(k)) out.push(L(`Annonces ${seen.get(k)! + 1} et ${i + 1} : même accroche ; chaque annonce doit tester un levier différent.`, `Ads ${seen.get(k)! + 1} and ${i + 1}: same hook; each ad must test a different lever.`));
    else seen.set(k, i);
  });
  return out;
}

/** Audiences : un produit pour enfants se vend aux parents ; jamais d'audience d'enfants (règles Meta, TikTok, Google). */
export function audienceIssues(audiences: { name: string; who: string }[], p: Pick<Project, "product">): string[] {
  const kid = /\b(enfants?|b[ée]b[ée]s?|tout-petits|ados?|adolescents?|kids?|children|babies|toddlers|teens?)\b/i;
  const adult = /\b(parents?|mères?|pères?|mamans?|papas?|grands-parents|famille|entourage|adultes?|offrir|cadeau|mothers?|fathers?|moms?|dads?|grandparents|family|adults?|gift)\b/i;
  return audiences.flatMap((a, i) => (kid.test(a.who) && !adult.test(a.who) ? [L(`Audience ${i + 1} : on ne cible jamais des enfants ; vise les parents ou l'entourage adulte${p.product.sector === "enfants" ? " (18 ans et plus)" : ""}.`, `Audience ${i + 1}: never target children; target parents or the adult circle${p.product.sector === "enfants" ? " (18+)" : ""}.`)] : []));
}

/**
 * Budget de test honnête (repères de media buyer, sans promesse de résultat) : par ensemble d'annonces et par jour,
 * durée minimale d'apprentissage, règle de décision par annonce. Le prix, s'il est connu, fixe la règle d'arrêt.
 */
export function honestTestBudget(p: Pick<Project, "product" | "business">, lang: Lang, adSets = 2): { daily: string; duration: string; total: string; rule: string; note: string } {
  const price = p.product.price.amount !== null ? p.product.price.amount / 100 : null;
  const cur = p.product.price.currency || "EUR";
  const money = (v: number) => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);
  const perDay = 10;
  const days = 7;
  const services = p.business === "services";
  return {
    daily: pick(lang, `${money(perDay)} à ${money(perDay * 2)} par jour et par ensemble d'annonces (${adSets} ensembles)`, `${money(perDay)} to ${money(perDay * 2)} per day per ad set (${adSets} ad sets)`),
    duration: pick(lang, `${days} jours sans toucher aux réglages (phase d'apprentissage des régies)`, `${days} days without touching the settings (the platforms' learning phase)`),
    total: pick(lang, `${money(perDay * adSets * days)} à ${money(perDay * 2 * adSets * days)} pour l'ensemble du test`, `${money(perDay * adSets * days)} to ${money(perDay * 2 * adSets * days)} for the whole test`),
    rule: services
      ? pick(lang, "Coupez une annonce qui a dépensé l'équivalent de deux contacts que vous jugez rentables sans en obtenir aucun ; gardez celles qui génèrent des demandes au coût que vous acceptez.", "Pause an ad that has spent the equivalent of two leads you'd consider profitable without getting any; keep the ones bringing requests at a cost you accept.")
      : price
        ? pick(lang, `Coupez une annonce qui a dépensé ${money(price)} à ${money(price * 2)} (une à deux fois le prix de vente) sans aucune vente ; dupliquez celle qui vend sous votre coût d'acquisition cible.`, `Pause an ad that has spent ${money(price)} to ${money(price * 2)} (one to two times the selling price) without a sale; duplicate the one selling under your target acquisition cost.`)
        : pick(lang, "Coupez une annonce qui a dépensé une à deux fois le prix de vente sans aucune vente [À compléter : prix de vente et marge] ; dupliquez celle qui vend sous votre coût d'acquisition cible.", "Pause an ad that has spent one to two times the selling price without a sale [To complete: selling price and margin]; duplicate the one selling under your target acquisition cost."),
    note: pick(lang, "Repères courants des media buyers, pas une garantie : aucun résultat (clics, ventes, coût) n'est promis. Le budget se règle et se dépense dans le gestionnaire de publicités de chaque réseau, jamais depuis le studio.", "Common media-buyer benchmarks, not a guarantee: no result (clicks, sales, cost) is promised. Budget is set and spent in each network's ads manager, never from the studio."),
  };
}

// ---------------------------------------------------------------- montage vidéo

const TEXT_SCENES = new Set<VideoScene["kind"]>(["words", "callouts", "list", "info"]);
/** Durée de lecture d'un plan à texte : 1,2 s par élément environ (lecture au téléphone). */
const readTime = (s: VideoScene) => ("items" in s ? s.items.length : "rows" in s ? s.rows.length : 1) * 1.2 + 0.4;
const sceneWords = (s: VideoScene) => {
  const t = "headline" in s ? s.headline : "text" in s ? s.text : "caption" in s ? s.caption : "";
  return (t ?? "").trim().split(/\s+/).filter(Boolean).length;
};
const imageOf = (s: VideoScene) => ("image" in s ? s.image : null);

/** Durée visée par format (publicité courte) : au-delà, la vidéo perd l'attention ; en deçà, elle n'installe rien. */
export const VIDEO_TARGETS: Record<VideoSpec["format"], [number, number]> = { "9:16": [10, 20], "4:5": [10, 18], "1:1": [10, 15], "16:9": [12, 20] };

/**
 * Règles de montage d'une publicité sociale, en consignes de correction : accroche immédiate, rupture toutes les
 * 1,5 à 2,5 s, textes courts, pas deux plans identiques d'affilée, même image jamais répétée, fin avec appel à l'action.
 */
export function videoPlanIssues(spec: Pick<VideoSpec, "scenes" | "format">): string[] {
  const out: string[] = [];
  const s = spec.scenes;
  if (!s.length) return [L("Découpage vide.", "Empty shot list.")];
  const first = s[0];
  if (first.kind === "title" || first.kind === "end") out.push(L("Plan 1 : une carte de titre sur fond uni n'arrête pas le défilement ; ouvre sur le produit en situation (hook), un plan filmé (clip), le produit sous projecteur (spotlight) ou une phrase choc (words).", "Shot 1: a title card on a plain background won't stop the scroll; open on the product in use (hook), a filmed shot (clip), the product under a spotlight (spotlight) or a punchy line (words)."));
  if (first.duration > 2.6) out.push(L(`Plan 1 : ${first.duration} s, trop long pour une accroche ; 2,5 s au plus.`, `Shot 1: ${first.duration} s, too long for a hook; 2.5 s max.`));
  s.forEach((x, i) => {
    const n = i + 1;
    if (x.kind === "end") return;
    const max = TEXT_SCENES.has(x.kind) ? readTime(x) + 0.6 : 3;
    if (x.duration > max) out.push(L(`Plan ${n} (${x.kind}) : ${x.duration} s sans rupture ; ${Math.round(max * 10) / 10} s au plus (une coupe toutes les 1,5 à 2,5 s).`, `Shot ${n} (${x.kind}): ${x.duration} s without a break; ${Math.round(max * 10) / 10} s max (a cut every 1.5 to 2.5 s).`));
    if (sceneWords(x) > 7) out.push(L(`Plan ${n} : ${sceneWords(x)} mots à l'écran ; 2 à 6 mots pour être lus sans le son.`, `Shot ${n}: ${sceneWords(x)} words on screen; 2 to 6 words to be read with the sound off.`));
    if (x.kind === "words" && x.items.some((it) => it.split(/\s+/).length > 6)) out.push(L(`Plan ${n} : éléments trop longs ; 1 à 5 mots chacun.`, `Shot ${n}: items too long; 1 to 5 words each.`));
    if (i > 0 && s[i - 1].kind === x.kind && x.kind !== "scene" && x.kind !== "detail") out.push(L(`Plans ${i} et ${n} : deux plans « ${x.kind} » d'affilée ; alterne les mises en scène.`, `Shots ${i} and ${n}: two "${x.kind}" shots in a row; alternate the staging.`));
  });
  const imgs = s.map(imageOf).filter((v): v is number => v !== null);
  if (new Set(imgs).size < imgs.length) out.push(L("La même photo revient deux fois ; chaque plan photo montre une image différente.", "The same photo appears twice; each photo shot shows a different image."));
  const last = s[s.length - 1];
  if (last.kind !== "end") out.push(L("La vidéo doit finir sur l'écran d'appel à l'action (end).", "The video must end on the call-to-action screen (end)."));
  const total = s.reduce((a, x) => a + x.duration, 0);
  const [lo, hi] = VIDEO_TARGETS[spec.format];
  if (total < lo - 0.05 || total > hi + 0.05) out.push(L(`Durée totale ${total.toFixed(1)} s ; viser ${lo} à ${hi} s en ${spec.format}.`, `Total length ${total.toFixed(1)} s; aim for ${lo} to ${hi} s in ${spec.format}.`));
  return out;
}

/**
 * Rythme de publicité sociale appliqué à tout découpage (IA ou studio) : accroche de 2,2 s au plus, plans photo et
 * produit de 1,6 à 2,6 s (le moteur ajoute une coupe « punch-in » au milieu d'un plan plus long), plans à texte au
 * temps de lecture, fin de 2,5 à 3 s ; avec une musique rythmée, les coupes tombent sur le temps (multiples de 0,5 s).
 */
export function paceVideoPlan<T extends Pick<VideoSpec, "scenes" | "music">>(spec: T): T {
  const onBeat = spec.music === "pulse";
  // Calage sur le temps sans jamais dépasser la borne haute du plan (arrondi inférieur si besoin).
  const snap = (d: number, hi: number) => {
    if (!onBeat) return Math.round(d * 10) / 10;
    const r = Math.max(1.5, Math.round(d * 2) / 2);
    return r > hi + 1e-9 ? Math.max(1.5, Math.floor(hi * 2) / 2) : r;
  };
  const scenes = spec.scenes.map((x, i) => {
    if (x.kind === "end") return { ...x, duration: Math.min(3, Math.max(2.5, x.duration)) } as VideoScene;
    const [lo, hi] = TEXT_SCENES.has(x.kind) ? [readTime(x) - 0.2, readTime(x) + 0.6] : x.kind === "clip" ? [1.6, 3.5] : [1.6, i === 0 ? 2.2 : 2.6];
    return { ...x, duration: snap(Math.min(Math.max(x.duration, lo), hi), hi) } as VideoScene;
  });
  return { ...spec, scenes };
}

// ---------------------------------------------------------------- vidéos UGC

export type UgcRole = "problem" | "discovery" | "demo" | "proof" | "cta";
/** Structure problème → découverte → démonstration → preuve → appel, condensée selon le nombre de plans de 8 s. */
export const UGC_STRUCTURE: Record<number, UgcRole[][]> = {
  1: [["problem", "demo", "cta"]],
  2: [["problem", "discovery"], ["demo", "cta"]],
  3: [["problem"], ["discovery", "demo"], ["proof", "cta"]],
  4: [["problem"], ["discovery"], ["demo", "proof"], ["cta"]],
  5: [["problem"], ["discovery"], ["demo"], ["proof"], ["cta"]],
};
export const ugcStructure = (n: number) => UGC_STRUCTURE[Math.max(1, Math.min(5, n))];

const GENERIC_OPEN = /^(salut|coucou|hello|hey|hi|bonjour|bonsoir)\b|aujourd'hui,? je (vais )?vous (présente|montre)|today i('m| am)? (going to )?(show|present)|je vais vous présenter|let me introduce/i;
const CTA_CUE = /\blien\b|\blink\b|découvr|check (it )?out|\bshop\b|commande|\border\b|\bbio\b|en dessous|\bbelow\b|\bsite\b|rendez-vous|\bbook\b|devis|\bquote\b|appel|\bcall\b|\S+\.(com|fr|shop|store|co)\b/i;

/** Défauts de métier d'un script UGC (accroche, ouverture générique, appel final), en consignes de correction. */
export function ugcCraftIssues(script: { beats: { line: string; caption: string }[] }): string[] {
  const out: string[] = [];
  const b = script.beats;
  if (!b.length) return out;
  const opener = b[0].line.split(/(?<=[.!?…])\s/)[0] ?? "";
  const w = opener.split(/\s+/).filter(Boolean).length;
  if (GENERIC_OPEN.test(b[0].line.trim())) out.push(L("Plan 1 : ouverture générique (« Salut », « Aujourd'hui je vous présente ») : on perd les 3 premières secondes ; ouvre sur une situation, une question précise ou un geste.", "Shot 1: generic opener (\"Hey guys\", \"Today I'm showing you\"): the first 3 seconds are wasted; open on a situation, a precise question or a gesture."));
  if (w > 12) out.push(L(`Plan 1 : la première phrase fait ${w} mots ; l'accroche doit se dire en moins de 3 secondes (9 mots au plus).`, `Shot 1: the first sentence is ${w} words; the hook must be said in under 3 seconds (9 words max).`));
  if (b.length > 1 && !CTA_CUE.test(b[b.length - 1].line)) out.push(L("Dernier plan : appel à l'action absent (lien, site, rendez-vous…).", "Last shot: no call to action (link, website, booking…)."));
  return out;
}
