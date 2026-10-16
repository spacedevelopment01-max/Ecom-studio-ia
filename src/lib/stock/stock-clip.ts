/**
 * LE plan vidéo libre de droits (Pixabay d'abord, puis Pexels) d'un moment d'une vidéo : cherché pour ce moment
 * (accroche, geste du métier, démonstration, résultat), en rapport direct avec le métier, la prestation ou le produit,
 * jamais déjà utilisé dans le projet ni dans la même vidéo, assez long pour le plan, à la bonne orientation, et
 * contrôlé (une image du milieu du plan regardée par l'IA quand elle est active ; sinon seule une description qui
 * cite le métier ou le produit est acceptée). Le plan retenu est gardé dans la bibliothèque avec son crédit.
 * Boutique : l'univers du produit (lieu, matière, usage), jamais le produit lui-même — le vrai produit est montré
 * par les plans de photos du projet, intercalés. Gratuit (aucune génération) ; le contrôle IA est léger.
 */
import fs from "node:fs";
import path from "node:path";
import { all } from "../db";
import { saveAsset } from "../library";
import type { Project } from "../projects";
import { C } from "../i18n-server";
import { JobCancelled, JobPaused } from "../jobs";
import { llmConfigured } from "../ai/llm";
import { decide } from "../quality/gate";
import { gateSave } from "../quality/store";
import { mentionsPerson, peopleAllowedFor, queriesFor } from "../people-policy";
import { tmpDir } from "../storage";
import { execTool } from "../exec-tool";
import { downloadStockVideo, emptyVideoReport, searchStockVideos, stockVideoCredit, type StockVideo, type StockVideoReport, type VideoQuery } from "./photos";
import { rankStock, tradeStock } from "./trade-queries";

type Ictx = { userId: string; projectId: string; jobId?: string | null };

export type StockClipRequest = {
  /** Sujet du plan (ce que l'image doit montrer). */
  topic: string;
  /** Moment de la vidéo (accroche, développement, démonstration…), pour varier les recherches. */
  part: string;
  aspect: "9:16" | "16:9" | "1:1" | "4:5";
  /** Durée voulue du plan (s) : les plans plus courts passent après. */
  durationS: number;
  /** Rang du plan dans la vidéo (rotation des recherches). */
  index: number;
  key: string;
  /**
   * Guide créatif (services) : l'ÉTAPE de la prestation montrée par ce plan (« protection de la pièce », « application
   * de la peinture »…) avec ses mots-clés de recherche et les mots que la description doit citer.
   */
  step?: { queries: string[]; must: string[]; need?: string[][] };
  /**
   * Texte tapé par le client (recherche de la banque de vidéos) : envoyé TEL QUEL à la banque, en premier, en anglais
   * et en français ; un plan dont les mots-clés citent tous ses mots est retenu même sans IA (c'est le sujet demandé).
   */
  typed?: string;
  /** Recherche élargie (demandée par le client) : chaque mot tapé est aussi cherché seul, et un seul mot cité suffit. */
  broad?: boolean;
};

/** Ce que la recherche a trouvé ou écarté : dit au client pourquoi aucun plan n'a été retenu. */
export type StockClipDiag = { report: StockVideoReport; people: number; offTopic: number; rejected: number };
export const emptyClipDiag = (): StockClipDiag => ({ report: emptyVideoReport(), people: 0, offTopic: 0, rejected: 0 });

const STOP = new Set(["les", "des", "une", "est", "avec", "pour", "dans", "sur", "par", "aux", "the", "and", "with", "for", "from", "into", "dun", "dune", "video", "videos", "plan", "plans"]);
/** Mots significatifs d'un texte tapé (« escape game » → escape, game ; « porte d'entrée » → porte, entree). */
export function typedWords(text: string): string[] {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b[dlj]'/g, " ");
  return [...new Set(t.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);
}

/** Les mots-clés d'un plan citent-ils les mots tapés (tous, ou un seul en recherche élargie) ? Pluriels acceptés. */
export function citesTyped(alt: string, words: string[], any = false): boolean {
  if (!words.length) return false;
  const a = ` ${alt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ")} `;
  const one = (w: string) => a.includes(` ${w} `) || a.includes(` ${w}s `) || a.includes(` ${w}es `) || a.includes(` ${w}x `);
  // Féminin français : « secrète » cite aussi « secret ».
  const has = (w: string) => one(w) || (w.length > 4 && w.endsWith("e") && one(w.slice(0, -1)));
  return any ? words.some(has) : words.every(has);
}

/** Mots entiers (« tape » ne valide pas « magnetic tape cassette » pour « masking tape »). */
export function citesAll(alt: string, groups: string[][]): boolean {
  const t = ` ${alt.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ")} `;
  return groups.every((g) => g.some((w) => t.includes(` ${w.toLowerCase()} `)));
}

/** Plans libres déjà pris dans le projet (jamais repris d'une vidéo à l'autre). */
export function takenStockVideos(projectId: string): Set<string> {
  return new Set(all<{ k: string }>("SELECT json_extract(meta, '$.stock.source') || ':' || json_extract(meta, '$.stock.id') k FROM assets WHERE project_id = ? AND kind = 'video' AND json_extract(meta, '$.stock') IS NOT NULL", projectId).map((x) => x.k));
}

/** Recherches d'un plan : le métier (ou l'univers du produit) d'abord, nuancé par le sujet du plan, en rotation. */
async function clipQueries(ictx: Ictx, p: Project, r: StockClipRequest): Promise<{ lang: "fr" | "en"; queries: string[]; must: string[]; negative?: string[] }> {
  const services = p.business === "services";
  const trade = [p.product.category, p.product.name].filter(Boolean)[0] ?? "";
  if (services) {
    const items = (p.services?.services ?? []).filter((s) => s.name?.trim());
    const svc = items.length ? items[r.index % items.length] : null;
    // La prestation de ce moment d'abord (« Peinture intérieure » → peintre), pour que chaque plan montre un geste
    // différent du métier ; puis le métier entier (« plâtrier peintre » = les deux).
    const own = svc ? tradeStock(svc.name) : null;
    const whole = tradeStock(`${trade} ${svc?.name ?? ""}`) ?? tradeStock(`${r.topic} ${trade}`) ?? tradeStock(trade);
    const known = own ?? whole;
    // Étape de la prestation (storyboard) : ses recherches passent EN PREMIER ; les mots du métier restent un repli.
    if (r.step?.queries.length) {
      const trades = [known, ...(whole && whole !== known ? [whole] : [])].filter(Boolean) as NonNullable<typeof known>[];
      return {
        lang: "en",
        queries: [...new Set([...r.step.queries, ...trades.flatMap((t) => shortQueries(t.must))])],
        must: [...new Set([...r.step.must, ...trades.flatMap((t) => t.must)])],
        negative: [...new Set(trades.flatMap((t) => t.negative))],
      };
    }
    if (known) {
      // La banque de vidéos répond aux mots-clés courts (« paint roller ») bien mieux qu'aux phrases ; ceux de la
      // prestation d'abord, puis ceux de tout le métier (un plâtrier peintre sans plan de plâtrerie garde un plan de
      // peinture), puis les phrases. Un plan déjà pris n'est jamais repris.
      const both = [known, ...(whole && whole !== known ? [whole] : [])];
      const q = known.queries;
      const k = Math.floor(r.index / Math.max(1, items.length)) % Math.max(1, q.length);
      const queries = [...new Set([...both.flatMap((t) => shortQueries(t.must)), ...q.slice(k), ...q.slice(0, k)])];
      return { lang: "en", queries, must: [...new Set(both.flatMap((t) => t.must))], negative: [...new Set(both.flatMap((t) => t.negative))] };
    }
    return { lang: "fr", queries: [svc?.name ?? "", trade, `${trade} ${r.topic}`].filter(Boolean), must: [], negative: undefined };
  }
  const { universeQueries } = await import("../engine/stock-universe");
  const u = await universeQueries(ictx, p);
  const k = r.index % Math.max(1, u.queries.length);
  const known = tradeStock(`${p.product.category ?? ""} ${p.product.sector ?? ""} ${p.product.name ?? ""}`);
  // Mots-clés courts de la catégorie (« cosmetics / skincare » → « skincare », « cosmetics ») : la banque de vidéos
  // y répond bien mieux qu'aux phrases ; ils valent aussi contrôle de la description sans IA.
  const { resolveProductCategory } = await import("../image-v2/categories");
  const cat = resolveProductCategory(p.product);
  // Le produit lui-même d'abord (« Casque audio sans fil » → headphones) : la catégorie seule (« consumer
  // electronics ») ramène des cartes mères ; puis les mots de la catégorie et l'univers.
  const nouns = productNouns(`${p.product.category ?? ""} ${p.product.name ?? ""}`);
  const words: string[] = cat.source === "core" ? [...new Set(cat.labels.en.toLowerCase().split(/[^a-z]+/).filter((x) => x.length > 3 && !GENERIC_WORDS.has(x)))] : [];
  const rotated = [...u.queries.slice(k), ...u.queries.slice(0, k)];
  const short = [...nouns.flatMap((n) => [n, ...(NOUN_CONTEXT[n] ?? []).map((c) => `${c} ${n}`)]), ...words, ...rotated.map((q) => q.split(/\s+/).slice(0, 2).join(" "))];
  return { lang: nouns.length || words.length ? "en" : u.lang, queries: [...new Set([...short, ...rotated])], must: [...new Set([...nouns, ...words, ...(known?.must ?? [])])] };
}

/** Mots trop larges pour une recherche de vidéo (« consumer electronics » → cartes mères). */
const GENERIC_WORDS = new Set(["consumer", "products", "product", "goods", "items", "accessories", "electronics", "general"]);

/** Produits courants : mot français → nom anglais des banques (le produit lui-même, pas sa catégorie). */
const PRODUCT_NOUNS: [RegExp, string][] = [
  [/casque|ecouteur/, "headphones"], [/enceinte|haut-parleur/, "speaker"], [/montre/, "watch"], [/smartphone|telephone/, "smartphone"],
  [/ordinateur|portable pc|laptop/, "laptop"], [/tablette/, "tablet"], [/camera|appareil photo/, "camera"], [/drone/, "drone"], [/console|manette/, "gaming"],
  [/sac a dos/, "backpack"], [/sac/, "bag"], [/chaussure|basket|sneaker/, "sneakers"], [/lunette/, "sunglasses"], [/bijou|collier|bague|bracelet/, "jewelry"],
  [/robe/, "dress"], [/t-shirt|tee-shirt/, "t-shirt"], [/veste|manteau/, "jacket"], [/lampe|luminaire/, "lamp"], [/bougie/, "candle"], [/canape/, "sofa"],
  [/serum/, "serum"], [/creme/, "cream"], [/parfum/, "perfume"], [/savon/, "soap"], [/shampo/, "shampoo"], [/maquillage|rouge a levres/, "makeup"],
  [/cafe/, "coffee"], [/the\b|infusion/, "tea"], [/chocolat/, "chocolate"], [/vin\b/, "wine"], [/biere/, "beer"], [/miel/, "honey"],
  [/velo/, "bicycle"], [/trottinette/, "scooter"], [/tapis de yoga|yoga/, "yoga"], [/jouet|peluche/, "toys"], [/croquette|chien/, "dog"], [/chat\b/, "cat"],
  [/plante/, "plants"], [/gourde|bouteille isotherme/, "water bottle"], [/valise/, "suitcase"], [/poussette/, "stroller"],
];
/** Contexte d'usage du produit pour varier les plans (« music headphones », « wearing headphones »). */
const NOUN_CONTEXT: Record<string, string[]> = { headphones: ["music", "wearing"], speaker: ["music"], watch: ["wrist"], sneakers: ["running"], coffee: ["cafe"], perfume: ["luxury"], bicycle: ["city"] };

export function productNouns(text: string): string[] {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return [...new Set(PRODUCT_NOUNS.filter(([re]) => re.test(t)).map(([, n]) => n))].slice(0, 2);
}

/** Mots-clés courts d'un métier (les expressions d'abord, puis trois mots simples). */
export function shortQueries(must: string[]): string[] {
  return [...must.filter((m) => m.includes(" ")), ...must.filter((m) => !m.includes(" ")).slice(0, 3)];
}

/** Ordre d'essai : pertinence (rankStock) d'abord, puis un plan assez long et bien défini avant un plan court. */
export function clipOrder<T extends Pick<StockVideo, "duration" | "width" | "height">>(found: T[], wantS: number): T[] {
  const score = (v: T, i: number) => -i * 0.6 + (v.duration >= wantS + 0.5 ? 2 : v.duration >= wantS ? 1 : 0) + Math.min(1, Math.min(v.width, v.height) / 1080);
  return found.map((v, i) => ({ v, s: score(v, i) })).sort((a, b) => b.s - a.s).map((x) => x.v);
}

export async function findStockClip(ictx: Ictx, p: Project, r: StockClipRequest, exclude: Set<string>, diag: StockClipDiag = emptyClipDiag()): Promise<{ assetId: string; durationS: number } | null> {
  const services = p.business === "services";
  const people = peopleAllowedFor(p);
  const ai = llmConfigured();
  const q = await clipQueries(ictx, p, r);
  const typed = r.typed?.trim() ?? "";
  const words = typed ? typedWords(typed) : [];
  // Sans IA pour regarder le plan : seule une description de la banque qui cite le métier (ou le texte tapé) vaut contrôle.
  if (!ai && !q.must.length && !words.length) return null;
  const orientation = r.aspect === "16:9" ? "landscape" : "portrait";
  const taken = new Set([...takenStockVideos(p.id), ...exclude]);
  // Texte du client d'abord, tel quel, en anglais ET en français (les mots-clés reviennent dans la langue demandée :
  // « porte secrète » ne se retrouve que dans les mots-clés français) ; en recherche élargie, chacun de ses mots seul.
  const typedQueries: VideoQuery[] = typed ? [{ q: typed, lang: "en" }, { q: typed, lang: "fr" }, ...(r.broad && words.length > 1 ? words.map((w) => ({ q: w, lang: "en" as const })) : [])] : [];
  // Règle des marques : un plan dont la description cite une marque tierce est écarté avant tout téléchargement.
  const { allowedBrands, stockMentionsBrand } = await import("../video-v2/brand-guard");
  const own = allowedBrands(p);
  // Sans IA pour regarder le plan : la description doit citer l'étape ET le métier (groupes du storyboard).
  const need = !ai ? r.step?.need : undefined;
  // Sans regard visuel : jamais de peinture d'art, de dessin animé, de texture seule ni de rendu 3D présenté comme réel.
  const ART = /\b(canvas|watercolor|watercolour|acrylic|artist|abstract|crayon|cassette|fog|wallpaper|texture|background|pattern|cartoon|fantasy|moon|night|chroma|green screen|mock-up|mockup|television|tv)\b/i;
  const search = (list: VideoQuery[], enough: number, skip: Set<string>) => searchStockVideos(list, orientation, q.lang, skip, enough, diag.report).catch((e) => (diag.report.errors.push((e as Error).message), [] as StockVideo[]));
  // Toutes les recherches du texte tapé sont faites (aucun arrêt anticipé), puis celles du métier.
  const fromTyped = typedQueries.length ? await search(typedQueries, Number.POSITIVE_INFINITY, taken) : [];
  const fromTrade = await search(queriesFor(q.queries, people), 16, new Set([...taken, ...fromTyped.map((v) => `${v.source}:${v.id}`)]));
  const raw = [...fromTyped, ...fromTrade].filter((v) => !stockMentionsBrand(v.alt, own) && (!need || (citesAll(v.alt, need) && !ART.test(v.alt))));
  if (!people) diag.people += raw.filter((v) => mentionsPerson(v.alt)).length;
  // Plans qui citent le texte tapé d'abord (le sujet demandé par le client), puis ceux du métier.
  const asked = words.length ? rankStock(raw.filter((v) => citesTyped(v.alt, words, r.broad)), [], true, [], { people, allowAiMade: true }) : [];
  const onTrade = rankStock(raw, q.must, ai, q.negative, { people, allowAiMade: true }).filter((v) => !asked.includes(v));
  const found = [...asked, ...onTrade];
  diag.offTopic += Math.max(0, raw.length - found.length - (people ? 0 : raw.filter((v) => mentionsPerson(v.alt)).length));
  const trade = [p.product.category, p.product.name].filter(Boolean)[0] ?? "";
  const subject = services ? `${trade} — ${r.topic}` : C(`univers du produit « ${p.product.name} » (${p.product.category ?? ""}) — ${r.topic} ; sans le produit lui-même`, `world of the product "${p.product.name}" (${p.product.category ?? ""}) — ${r.topic}; without the product itself`);
  const { checkAmbiance } = await import("../engine/service-media");
  for (const v of clipOrder(found, r.durationS).slice(0, 3)) {
    try {
      const buf = await downloadStockVideo(v);
      let d = decide("stock_video", { checker: "metadata", score: 7 });
      if (ai) {
        const dir = tmpDir("stockclip");
        try {
          fs.writeFileSync(path.join(dir, "in.mp4"), buf);
          await execTool("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0.5, Math.min(3, (v.duration || 4) / 2))), "-i", path.join(dir, "in.mp4"), "-frames:v", "1", "-q:v", "3", path.join(dir, "f.jpg")]);
          const frame = fs.readFileSync(path.join(dir, "f.jpg"));
          d = (await checkAmbiance({ ...ictx, usageKey: `${r.key}:stockclipqc:${v.source}:${v.id}` }, frame, subject, services)).decision;
          if (d.deliverable !== "stock_video") d = decide("stock_video", d.checked ? { checker: "ai", score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], issues: d.feedback ? [d.feedback] : [] } : { checker: "ai", score: null, error: d.reason });
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          d = decide("stock_video", { checker: "ai", score: null, error: (e as Error).message });
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      if (d.verdict !== "FINAL") {
        diag.rejected++;
        continue;
      }
      const keep = gateSave(ictx, d);
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: buf, name: `${C("plan-libre", "stock-shot")}-${r.part}-${v.source}-${v.id}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", meta: { provider: v.source, recipe: stockVideoCredit(v), stock: { source: v.source, id: v.id, page: v.page, author: v.author, license: v.license, ...(v.aiGenerated ? { aiGenerated: true } : {}) }, subject: r.topic, part: r.part, durationS: v.duration, ...keep.meta }, status: "review" });
      exclude.add(`${v.source}:${v.id}`);
      return { assetId: a.id, durationS: v.duration };
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      diag.rejected++;
    }
  }
  return null;
}
