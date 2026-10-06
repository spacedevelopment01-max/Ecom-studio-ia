/**
 * Qualité éditoriale des publications, comme la relirait un community manager de marque reconnue :
 *  1. normalisation déterministe (format accepté par le réseau, hashtags pertinents et en nombre raisonnable,
 *     emojis selon la ligne éditoriale, lien cliquable seulement là où il l'est, pas de tiret cadratin) ;
 *  2. grille mesurable par publication (accroche de la 1re ligne, appel à l'interaction, longueur native du réseau,
 *     remplissage) et sur l'ensemble du plan (angles qui se suivent, accroches ou légendes recopiées, un seul format,
 *     hashtags copiés-collés) ;
 *  3. relecture par un « directeur de création social media » (IA, grille notée, seuil 8/10), puis UNE reprise
 *     ciblée des publications faibles ; pour chacune, la meilleure version est gardée (jamais une version qui
 *     ajoute un défaut ou une allégation).
 */
import type { PostDraft } from "../ai/tasks";
import type { Project } from "../projects";
import type { SocialVoice } from "../project-types";
import { lintClaims, lintHollow } from "../ai/tasks";
import { C, contentLang } from "../i18n-server";

export type Network = PostDraft["network"];
export type Format = PostDraft["format"];

/** Règles natives de chaque réseau (pratiques 2026). */
export const NETWORK_RULES: Record<Network, { formats: Format[]; video: Format; tags: [number, number]; firstLine: number; min: number; max: number; cta: boolean; link: boolean; titleMax: number }> = {
  // Instagram limite à 5 hashtags ; la légende est coupée vers 125 caractères (« … plus »).
  instagram: { formats: ["image", "carousel", "reel", "story"], video: "reel", tags: [3, 5], firstLine: 125, min: 60, max: 2200, cta: true, link: false, titleMax: 80 },
  facebook: { formats: ["image", "carousel", "video", "reel", "story"], video: "video", tags: [0, 2], firstLine: 125, min: 40, max: 1500, cta: true, link: true, titleMax: 80 },
  tiktok: { formats: ["video"], video: "video", tags: [3, 5], firstLine: 150, min: 20, max: 400, cta: true, link: false, titleMax: 80 },
  youtube: { formats: ["short"], video: "short", tags: [1, 3], firstLine: 100, min: 20, max: 600, cta: false, link: true, titleMax: 100 },
  // Pinterest : une description de recherche d'un seul tenant (pas de coupure « plus » à soigner).
  pinterest: { formats: ["pin"], video: "pin", tags: [0, 3], firstLine: 500, min: 80, max: 500, cta: false, link: true, titleMax: 100 },
};

const VIDEO_FORMATS: Format[] = ["reel", "short", "video"];
export const isVideoFormat = (f: string) => VIDEO_FORMATS.includes(f as Format);

/** Hashtags vides de sens (portée nulle, aucune pertinence) : jamais proposés. */
const GENERIC_TAGS = /^(fyp|foryou|foryoupage|pourtoi|viral|trending|explore|explorepage|instagood|instadaily|photooftheday|love|like4like|likeforlike|follow|followme|follow4follow|reels|reel|reelsinstagram|tiktok|instagram|picoftheday|happy|cute|beautiful|bestoftheday|shorts|new|nouveau)$/i;

/** Emojis (pictogrammes) d'un texte. */
const EMOJI = /\p{Extended_Pictographic}️?/gu;

const PLACEHOLDER = /\[(?:À compléter|To complete)\s*:[^\]]*\]/gi;
const URL = /https?:\/\/\S+/gi;

/** Accroche faible : ouverture générique qui ne dit rien (« Découvrez… », « Voici… », « Nouveau ! »). */
const WEAK_OPENER = /^(découvrez|voici|voilà|nouveau|nouveauté|on vous présente|présentation|bonjour|coucou|hello|salut|discover|introducing|meet our|check out|here is|here's|say hello|new in|we're excited|nous sommes (ravis|heureux|fiers))\b/i;

/** Appel à l'interaction : question, commentaire, enregistrement, partage, lien. */
const CTA = /\?|en commentaire|commentez|dites[- ]?(le|nous)|racontez|répondez|votez|enregistre|sauvegarde|partage|envoyez|identifiez|taguez|lien en bio|lien dans la bio|bio\b|à découvrir|sur la boutique|prenez rendez-vous|réservez|appelez|écrivez-nous|demandez|tell us|let us know|comment below|drop a comment|vote|save (this|it|for)|share (this|it|with)|send (this|it) to|tag (a|someone|your)|link in bio|take a look|see more|shop (now|the)|book (now|your|an)|call us|write to us|request a quote|in the comments/i;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const firstLineOf = (caption: string) => (caption.split(/\n/).find((l) => l.trim()) ?? "").trim();
const lastLineOf = (caption: string) => ([...caption.split(/\n/)].reverse().find((l) => l.trim()) ?? "").trim();
const words = (s: string) => new Set(norm(s.replace(PLACEHOLDER, " ")).split(" ").filter((w) => w.length >= 4));
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Hashtag propre : sans « # », sans espace ni ponctuation, accents retirés, 2 à 30 caractères. */
export function cleanTag(t: string): string {
  return String(t ?? "")
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}_]+/gu, "")
    .slice(0, 30);
}

/** Format accepté par le réseau, au plus près de l'intention (vidéo reste vidéo, image reste image). */
export function nativeFormat(network: Network, format: string, kind?: string): Format {
  const rules = NETWORK_RULES[network] ?? NETWORK_RULES.instagram;
  if (rules.formats.includes(format as Format)) return format as Format;
  if (isVideoFormat(format) || kind === "video") return rules.video;
  if (format === "pin" || format === "image") return rules.formats.includes("image") ? "image" : rules.formats[0];
  if (format === "carousel" || format === "story") return rules.formats.includes("image") ? "image" : rules.formats[0];
  return rules.formats[0];
}

/**
 * Normalisation déterministe d'une publication (sans IA) : format natif, hashtags dédoublonnés et bornés,
 * hashtags écrits dans la légende déplacés dans la liste, emojis selon la ligne éditoriale, adresse web remplacée
 * par « lien en bio » là où elle n'est pas cliquable, tirets cadratins retirés, titres bornés.
 */
export function normalizePost(d: PostDraft, voice?: Pick<SocialVoice, "emoji"> | null): PostDraft {
  const net = (NETWORK_RULES[d.network] ? d.network : "instagram") as Network;
  const rules = NETWORK_RULES[net];
  let caption = String(d.caption ?? "").replace(/\r/g, "");
  // Hashtags écrits dans la légende : rangés dans la liste (le studio les ajoute à la publication).
  const inline = [...caption.matchAll(/(^|\s)#([\p{L}\p{N}_]{2,})/gu)].map((m) => m[2]);
  caption = caption.replace(/(^|[ \t])#[\p{L}\p{N}_]{2,}/gu, "$1").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // Tirets cadratins et demi-cadratins dans les phrases : virgule.
  const dash = (s: string) => s.replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");
  caption = dash(caption);
  if (!rules.link) caption = caption.replace(URL, C("(lien en bio)", "(link in bio)")).replace(/\(lien en bio\)\s*\(lien en bio\)/g, "(lien en bio)");
  if (voice?.emoji === "none") caption = caption.replace(EMOJI, "").replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").trim();
  else if (voice?.emoji === "sparing") {
    let n = 0;
    caption = caption.replace(EMOJI, (m) => (n++ === 0 ? m : "")).replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").trim();
  }
  const seen = new Set<string>();
  const hashtags: string[] = [];
  for (const raw of [...(d.hashtags ?? []), ...inline]) {
    const t = cleanTag(raw);
    const k = t.toLowerCase();
    if (t.length < 2 || GENERIC_TAGS.test(t) || seen.has(k)) continue;
    seen.add(k);
    hashtags.push(t);
  }
  const format = nativeFormat(net, d.format, d.visual?.kind);
  const kind = isVideoFormat(format) || (net === "pinterest" && d.visual?.kind === "video") ? "video" : d.visual?.kind === "video" ? "creative" : d.visual?.kind ?? "creative";
  const title = dash(String(d.title ?? "")).trim();
  const slides = (d.visual?.slides ?? []).map((s) => dash(String(s)).trim()).filter(Boolean).slice(0, 6);
  return {
    ...d,
    network: net,
    format,
    title: title.length > rules.titleMax ? cut(title, rules.titleMax) : title,
    caption,
    hashtags: hashtags.slice(0, rules.tags[1]),
    visual: { ...d.visual, kind, headline: dash(String(d.visual?.headline ?? "")).trim(), subline: dash(String(d.visual?.subline ?? "")).trim(), ...(slides.length && format === "carousel" ? { slides } : { slides: undefined }) },
  };
}

function cut(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max + 1).replace(/\s+\S*$/, "").replace(/[\s,;:.!?-]+$/, "") || t.slice(0, max);
}

export type PostIssue = { code: string; text: string };

/** Grille mesurable d'une publication (déjà normalisée). Textes en français : ils servent de consignes à l'IA. */
export function postIssues(d: PostDraft, p?: Pick<Project, "brand" | "product" | "name">): PostIssue[] {
  const rules = NETWORK_RULES[d.network] ?? NETWORK_RULES.instagram;
  const out: PostIssue[] = [];
  const caption = d.caption ?? "";
  const plain = caption.replace(PLACEHOLDER, "").trim();
  const first = firstLineOf(caption);
  const brand = (p?.brand?.name || p?.product?.name || p?.name || "").trim();
  if (d.format === "story") return storyIssues(d);
  if (!first) out.push({ code: "hook", text: "légende vide : écrire une accroche" });
  else {
    if (first.length > rules.firstLine) out.push({ code: "hook", text: `accroche trop longue (${first.length} caractères ; ${rules.firstLine} au plus avant la coupure « plus »)` });
    if (WEAK_OPENER.test(first)) out.push({ code: "hook", text: `accroche générique (« ${first.split(/\s+/).slice(0, 3).join(" ")} … ») : ouvrir sur un détail concret, une question ou une tension` });
    else if (brand && new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[,:]`, "i").test(first)) out.push({ code: "hook", text: "accroche qui commence par le nom de la marque : commencer par ce qui intéresse la personne (détail, question, situation)" });
  }
  if (rules.cta && !CTA.test(caption)) out.push({ code: "cta", text: "pas d'appel à l'interaction : finir par une question précise, « enregistrez », « partagez » ou le lien" });
  if (plain.length < rules.min) out.push({ code: "thin", text: `légende trop pauvre (${plain.length} caractères utiles ; ${rules.min} au moins pour ${d.network})` });
  if (caption.length > rules.max) out.push({ code: "long", text: `légende trop longue pour ${d.network} (${caption.length} caractères ; ${rules.max} au plus)` });
  if ((caption.match(PLACEHOLDER) ?? []).length > 1) out.push({ code: "filler", text: "remplissage : plusieurs « [À compléter : …] » dans une seule légende ; choisir un angle fondé sur les faits connus" });
  if (d.network === "instagram" && caption.length > 280 && !/\n/.test(caption)) out.push({ code: "wall", text: "pavé sans respiration : aérer en 2 ou 3 paragraphes courts" });
  if (d.hashtags.length < rules.tags[0]) out.push({ code: "tags", text: `hashtags insuffisants (${d.hashtags.length} ; ${rules.tags[0]} à ${rules.tags[1]} pour ${d.network}, précis et réellement utilisés)` });
  const head = d.visual?.headline ?? "";
  if (d.visual?.kind !== "video" && (!head.trim() || head.length > 32 || head.split(/\s+/).length > 6)) out.push({ code: "headline", text: "titre du visuel absent ou trop long (2 à 6 mots, 32 caractères au plus)" });
  if ((d.network === "youtube" || d.network === "pinterest") && (d.title ?? "").trim().length < 15) out.push({ code: "title", text: `titre trop court pour être trouvé sur ${d.network} : un titre descriptif avec les mots que l'on cherche` });
  if (d.format === "carousel" && (d.visual?.slides?.length ?? 0) < 3) out.push({ code: "slides", text: "carrousel sans diapositives : 3 à 6 diapositives (une idée par diapositive, la dernière invite à agir)" });
  if (p && lintHollow({ t: d.title, c: caption, h: head }).length) out.push({ code: "hollow", text: "formule creuse : remplacer par un détail propre au produit" });
  return out;
}

/** Story : pas de légende publiée, seul le visuel compte (titre lisible, une action : sondage, question, lien). */
function storyIssues(d: PostDraft): PostIssue[] {
  const head = d.visual?.headline ?? "";
  return !head.trim() || head.length > 32 ? [{ code: "headline", text: "story : titre du visuel absent ou trop long (32 caractères au plus)" }] : [];
}

/** Ordre chronologique (jour, créneau) des publications. */
const chrono = (posts: PostDraft[]) => posts.map((d, i) => ({ d, i })).sort((a, b) => a.d.day - b.d.day || a.d.slot - b.d.slot);

/** Grille de l'ensemble du plan : variété, répétitions d'un jour à l'autre, formats, hashtags. */
export function planIssues(posts: PostDraft[]): { byPost: Map<number, PostIssue[]>; global: PostIssue[] } {
  const byPost = new Map<number, PostIssue[]>();
  const add = (i: number, x: PostIssue) => byPost.set(i, [...(byPost.get(i) ?? []), x]);
  const order = chrono(posts);
  const openings = new Map<string, number>();
  const heads = new Map<string, number>();
  const bags: { i: number; day: number; w: Set<string> }[] = [];
  let prev: { angle: string; day: number } | null = null;
  for (const { d, i } of order) {
    const angle = norm(d.angle ?? "");
    if (prev && angle && angle === prev.angle && d.day - prev.day <= 1) add(i, { code: "repeat-angle", text: `même angle que la publication précédente (« ${d.angle} ») : alterner les piliers` });
    prev = { angle, day: d.day };
    const open = norm(firstLineOf(d.caption)).split(" ").slice(0, 5).join(" ");
    if (open.split(" ").length >= 3) {
      if (openings.has(open)) add(i, { code: "repeat-hook", text: `accroche déjà utilisée le jour ${posts[openings.get(open)!].day + 1} : en écrire une nouvelle` });
      else openings.set(open, i);
    }
    const h = norm(d.visual?.headline ?? "");
    if (h && d.visual?.kind !== "video") {
      if (heads.has(h)) add(i, { code: "repeat-headline", text: "titre de visuel identique à une autre publication" });
      else heads.set(h, i);
    }
    const w = words(d.caption);
    const twin = bags.find((b) => jaccard(b.w, w) >= 0.6);
    if (twin && w.size >= 4) add(i, { code: "repeat-caption", text: `légende presque identique à celle du jour ${twin.day + 1} : changer d'angle ou de fait mis en avant` });
    bags.push({ i, day: d.day, w });
  }
  const global: PostIssue[] = [];
  const feed = posts.filter((d) => d.format !== "story");
  if (feed.length >= 5 && new Set(feed.map((d) => d.format)).size === 1) global.push({ code: "one-format", text: `un seul format (${feed[0].format}) sur tout le plan : varier (carrousel, reel, photo, story)` });
  const lasts = posts.filter((d) => d.format !== "story").map((d) => norm(lastLineOf(d.caption))).filter((s) => s.length > 8);
  const top = Math.max(0, ...[...lasts.reduce((m, s) => m.set(s, (m.get(s) ?? 0) + 1), new Map<string, number>()).values()]);
  if (lasts.length >= 4 && top / lasts.length > 0.5) global.push({ code: "same-cta", text: "le même appel à l'action termine plus de la moitié des publications : varier (question, enregistrer, partager, lien)" });
  const sets = posts.filter((d) => d.hashtags.length >= 3).map((d) => d.hashtags.map((t) => t.toLowerCase()).sort().join(" "));
  if (sets.length >= 4 && new Set(sets).size === 1) global.push({ code: "same-tags", text: "exactement les mêmes hashtags partout : adapter au sujet de chaque publication" });
  return { byPost, global };
}

export type PlanQuality = { score: number; issues: Map<number, PostIssue[]>; global: PostIssue[]; weak: number };

/** Note sur 10 de la grille mesurable : part des publications sans défaut, moins les défauts d'ensemble. */
export function planQuality(posts: PostDraft[], p?: Pick<Project, "brand" | "product" | "name">): PlanQuality {
  const plan = planIssues(posts);
  const issues = new Map<number, PostIssue[]>();
  posts.forEach((d, i) => {
    const all = [...postIssues(d, p), ...(plan.byPost.get(i) ?? [])];
    if (all.length) issues.set(i, all);
  });
  const weak = issues.size;
  const ratio = posts.length ? weak / posts.length : 0;
  const score = Math.max(0, Math.round((10 - 6 * ratio - plan.global.length) * 10) / 10);
  return { score, issues, global: plan.global, weak };
}

// ---------------------------------------------------------------- relecture et reprise (IA injectée)

export type SocialReview = {
  scores: { hooks: number; variety: number; native: number; voice: number; engagement: number; honesty: number };
  posts: { index: number; problem: string; fix: string }[];
  verdict: string;
};
export type RepairItem = { index: number; post: PostDraft; issues: string[] };
export type RepairResult = { posts: { index: number; angle?: string; format?: Format; title: string; caption: string; hashtags: string[]; headline?: string; slides?: string[] }[] };
export type SocialQualityAi = {
  review(posts: PostDraft[]): Promise<SocialReview>;
  repair(items: RepairItem[], global: string[]): Promise<RepairResult>;
};

/** Seuil d'exigence : moyenne d'au moins 8/10, aucune note sous 6, honnêteté d'au moins 8. */
export const REVIEW_MIN_MEAN = 8;
export const REVIEW_MIN_SCORE = 6;
/** Publications reprises au plus en une passe (coût maîtrisé). */
export const MAX_REPAIRS = 12;

const clamp10 = (n: unknown) => {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(10, x)) : 0;
};
export function reviewMean(r: SocialReview): number {
  const s = Object.values(r.scores).map(clamp10);
  return s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : 0;
}
export function reviewPassed(r: SocialReview | null | undefined): boolean {
  if (!r) return false;
  const s = Object.values(r.scores).map(clamp10);
  return reviewMean(r) >= REVIEW_MIN_MEAN && Math.min(...s) >= REVIEW_MIN_SCORE && clamp10(r.scores.honesty) >= 8;
}

export type RefineReport = { scoreBefore: number; scoreAfter: number; review: number | null; passed: boolean; repaired: number; kept: number };

/**
 * Boucle de qualité d'un plan : normalisation, grille mesurable, relecture notée par l'IA, une reprise ciblée des
 * publications faibles. Une réécriture n'est gardée que si elle a moins de défauts mesurables (ou autant, quand le
 * relecteur l'avait signalée) et pas plus d'allégations que l'originale.
 */
export async function refinePlan(drafts: PostDraft[], p: Project, ai: SocialQualityAi | null, voice?: SocialVoice | null): Promise<{ posts: PostDraft[]; report: RefineReport }> {
  let posts = drafts.map((d) => normalizePost(d, voice ?? p.brand?.social));
  const before = planQuality(posts, p);
  let review: SocialReview | null = null;
  if (ai) {
    try {
      review = await ai.review(posts);
    } catch (e) {
      console.info(`[calendrier] relecture indisponible (${(e as Error).message})`);
    }
  }
  const flagged = new Map<number, string[]>();
  for (const [i, xs] of before.issues) flagged.set(i, xs.map((x) => x.text));
  for (const x of review?.posts ?? []) {
    if (!Number.isInteger(x.index) || x.index < 0 || x.index >= posts.length) continue;
    flagged.set(x.index, [...(flagged.get(x.index) ?? []), `relecture : ${x.problem}${x.fix ? ` → ${x.fix}` : ""}`]);
  }
  const needs = before.score < REVIEW_MIN_MEAN || before.global.length > 0 || (!!review && !reviewPassed(review));
  let repaired = 0;
  let kept = 0;
  if (ai && needs && flagged.size) {
    const reviewed = new Set((review?.posts ?? []).map((x) => x.index));
    const targets = [...flagged.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, MAX_REPAIRS).map(([index, issues]) => ({ index, post: posts[index], issues }));
    try {
      const r = await ai.repair(targets, before.global.map((g) => g.text));
      const next = [...posts];
      for (const x of r.posts ?? []) {
        const t = targets.find((y) => y.index === x.index);
        if (!t || typeof x.caption !== "string" || !x.caption.trim()) continue;
        repaired++;
        const cand = normalizePost({ ...t.post, angle: x.angle?.trim() || t.post.angle, format: x.format ?? t.post.format, title: x.title?.trim() || t.post.title, caption: x.caption, hashtags: Array.isArray(x.hashtags) ? x.hashtags : t.post.hashtags, visual: { ...t.post.visual, headline: x.headline?.trim() || t.post.visual.headline, slides: x.slides?.length ? x.slides : t.post.visual.slides } }, voice ?? p.brand?.social);
        const trial = [...next];
        trial[t.index] = cand;
        const was = issueCount(next, t.index, p);
        const now = issueCount(trial, t.index, p);
        const claimsBefore = lintClaims({ t: t.post.title, c: t.post.caption, h: t.post.visual.headline }, p).length;
        const claimsAfter = lintClaims({ t: cand.title, c: cand.caption, h: cand.visual.headline, s: cand.visual.slides ?? [] }, p).length;
        if (claimsAfter <= claimsBefore && (now < was || (now === was && reviewed.has(t.index)))) {
          next[t.index] = cand;
          kept++;
        }
      }
      posts = next;
    } catch (e) {
      console.info(`[calendrier] reprise indisponible (${(e as Error).message})`);
    }
  }
  const after = planQuality(posts, p);
  return { posts, report: { scoreBefore: before.score, scoreAfter: after.score, review: review ? reviewMean(review) : null, passed: review ? reviewPassed(review) && after.score >= REVIEW_MIN_MEAN : after.score >= REVIEW_MIN_MEAN, repaired, kept } };
}

function issueCount(posts: PostDraft[], i: number, p: Project) {
  return postIssues(posts[i], p).length + (planIssues(posts).byPost.get(i)?.length ?? 0);
}

// ---------------------------------------------------------------- temps forts honnêtes

export type KeyMoment = { id: string; day: number; label: string; date: string };

/** Dimanche n-ième (ou dernier si n < 0) d'un mois (UTC). */
function sunday(y: number, m: number, n: number): Date {
  if (n > 0) {
    const d = new Date(Date.UTC(y, m, 1));
    const first = (7 - d.getUTCDay()) % 7;
    return new Date(Date.UTC(y, m, 1 + first + (n - 1) * 7));
  }
  const d = new Date(Date.UTC(y, m + 1, 0));
  return new Date(Date.UTC(y, m, d.getUTCDate() - d.getUTCDay()));
}

/**
 * Temps forts réels compris dans la période (ou juste après), utiles au secteur : Noël, Saint-Valentin, fête des
 * mères et des pères, rentrée, Halloween. Jamais de promotion inventée : ce sont des occasions de parler du produit.
 */
export function keyMoments(startDate: string, days: number, sector?: string | null, lang = contentLang()): KeyMoment[] {
  const [y0, m0, d0] = startDate.split("-").map(Number);
  const start = Date.UTC(y0, m0 - 1, d0);
  const end = start + (days - 1) * 86400_000;
  const out: KeyMoment[] = [];
  const s = sector ?? "";
  const gifts = ["beaute", "mode", "bijoux", "maison", "alimentation", "artisanat", "hightech", "enfants", "sport", "animaux"].includes(s) || !s;
  for (const y of new Set([y0, y0 + 1])) {
    const list: { id: string; at: Date; lead: number; fr: string; en: string; ok: boolean }[] = [
      { id: "noel", at: new Date(Date.UTC(y, 11, 25)), lead: 24, fr: "Noël", en: "Christmas", ok: gifts },
      { id: "valentin", at: new Date(Date.UTC(y, 1, 14)), lead: 12, fr: "la Saint-Valentin", en: "Valentine's Day", ok: ["beaute", "mode", "bijoux", "alimentation", "maison", "artisanat"].includes(s) },
      { id: "meres", at: lang === "en" ? sunday(y, 4, 2) : sunday(y, 4, -1), lead: 14, fr: "la fête des mères", en: "Mother's Day", ok: ["beaute", "mode", "bijoux", "maison", "alimentation", "artisanat"].includes(s) },
      { id: "peres", at: sunday(y, 5, 3), lead: 14, fr: "la fête des pères", en: "Father's Day", ok: ["mode", "hightech", "sport", "alimentation", "bijoux"].includes(s) },
      { id: "rentree", at: lang === "en" ? new Date(Date.UTC(y, 7, 25)) : new Date(Date.UTC(y, 8, 1)), lead: 14, fr: "la rentrée", en: "back to school", ok: ["enfants", "artisanat", "mode", "hightech"].includes(s) },
      { id: "halloween", at: new Date(Date.UTC(y, 9, 31)), lead: 12, fr: "Halloween", en: "Halloween", ok: ["enfants", "alimentation", "maison"].includes(s) },
    ];
    for (const m of list) {
      if (!m.ok) continue;
      const at = m.at.getTime();
      if (at < start) continue;
      // Une seule publication par temps fort : dans sa fenêtre, au plus tôt le 3e jour du plan, au plus tard la veille.
      let day = Math.max(at - m.lead * 86400_000, start + 2 * 86400_000);
      if (day >= at) day = Math.max(start, at - 86400_000);
      if (day > end) continue;
      out.push({ id: m.id, day: Math.round((day - start) / 86400_000), label: lang === "en" ? m.en : m.fr, date: m.at.toISOString().slice(0, 10) });
    }
  }
  return out.sort((a, b) => a.day - b.day);
}

// ---------------------------------------------------------------- ligne éditoriale

export const GENERIC_PILLAR = /^(inspiration|lifestyle|produit|product|divers|misc|actualit[ée]s?|news|promo(tion)?s?|engagement|contenu|content)$/i;

/** Grille de la ligne éditoriale : piliers distincts et propres à la marque, légendes d'exemple qui accrochent et engagent. */
export function voiceIssues(v: Pick<SocialVoice, "pillars" | "captions"> & { series?: SocialVoice["series"] }, p?: Pick<Project, "brand" | "product" | "name">): string[] {
  const out: string[] = [];
  const titles = v.pillars.map((x) => norm(x.title));
  if (new Set(titles).size < titles.length) out.push("piliers en double : 3 piliers vraiment différents");
  v.pillars.forEach((x, i) => {
    if (GENERIC_PILLAR.test(x.title.trim())) out.push(`pilier ${i + 1} générique (« ${x.title} ») : un titre propre à cette marque`);
  });
  const brand = (p?.brand?.name || p?.product?.name || "").trim();
  v.captions.forEach((c, i) => {
    const first = firstLineOf(c.text);
    if (first.length > 90) out.push(`légende ${i + 1} : accroche trop longue (${first.length} caractères, 90 au plus)`);
    if (WEAK_OPENER.test(first)) out.push(`légende ${i + 1} : accroche générique (« ${first.split(/\s+/).slice(0, 3).join(" ")} … »)`);
    else if (brand && new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[,:]`, "i").test(first)) out.push(`légende ${i + 1} : commence par le nom de la marque`);
    if (!CTA.test(c.text)) out.push(`légende ${i + 1} : pas d'appel à l'interaction`);
    if ((c.text.match(PLACEHOLDER) ?? []).length > 1) out.push(`légende ${i + 1} : plusieurs « [À compléter : …] »`);
  });
  const bags = v.captions.map((c) => words(c.text));
  for (let i = 1; i < bags.length; i++) for (let j = 0; j < i; j++) if (jaccard(bags[i], bags[j]) >= 0.6) out.push(`légendes ${j + 1} et ${i + 1} presque identiques`);
  if (v.series && v.series.length && new Set(v.series.map((s) => norm(s.name))).size < v.series.length) out.push("séries récurrentes en double");
  return out;
}

const ADVICE: Record<string, [string, string]> = {
  hook: ["Accroche de la 1re ligne à renforcer (détail concret ou question précise, moins de 125 caractères).", "Strengthen the first-line hook (a concrete detail or a precise question, under 125 characters)."],
  cta: ["Ajouter un appel à l'interaction (question, enregistrer, partager, lien).", "Add a call to interact (question, save, share, link)."],
  thin: ["Légende un peu courte pour ce réseau.", "Caption is a bit short for this network."],
  long: ["Légende trop longue pour ce réseau.", "Caption is too long for this network."],
  filler: ["Plusieurs « [À compléter : …] » : remplacer par des faits réels ou changer d'angle.", "Several \"[To complete: …]\": replace with real facts or change the angle."],
  wall: ["Aérer la légende en 2 ou 3 paragraphes courts.", "Break the caption into 2 or 3 short paragraphs."],
  tags: ["Hashtags insuffisants pour ce réseau.", "Not enough hashtags for this network."],
  headline: ["Titre du visuel à raccourcir (2 à 6 mots).", "Shorten the visual's headline (2 to 6 words)."],
  title: ["Titre trop court pour la recherche (YouTube, Pinterest).", "Title too short for search (YouTube, Pinterest)."],
  slides: ["Carrousel : prévoir 3 à 6 diapositives.", "Carousel: plan 3 to 6 slides."],
  hollow: ["Formule creuse à remplacer par un détail propre au produit.", "Replace the empty phrase with a product-specific detail."],
};

/** Conseils de relecture d'une publication enregistrée (éditeur), dans la langue de l'interface. */
export function postAdvice(row: { network: string; format: string; title?: string | null; caption?: string | null; hashtags?: string | null; angle?: string | null; brief?: string | null }, ui: "fr" | "en"): string[] {
  if (!NETWORK_RULES[row.network as Network]) return [];
  let visual: PostDraft["visual"] = { kind: "creative", headline: "", subline: "", layout: "editorial" };
  try {
    visual = { ...visual, ...JSON.parse(row.brief || "{}") };
  } catch {
    // brief illisible : visuel par défaut
  }
  const d: PostDraft = { day: 0, slot: 0, network: row.network as Network, format: row.format as Format, angle: row.angle ?? "", title: row.title ?? "", caption: row.caption ?? "", hashtags: (row.hashtags ?? "").split(/\s+/).filter(Boolean), visual };
  const codes = [...new Set(postIssues(d).map((x) => x.code))];
  return codes.filter((c) => ADVICE[c]).map((c) => ADVICE[c][ui === "en" ? 1 : 0]);
}
