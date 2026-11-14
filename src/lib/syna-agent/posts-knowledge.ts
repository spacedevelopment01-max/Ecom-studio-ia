/**
 * Le savoir des publications de SINA (14 novembre 2026, demande du propriétaire : « tu va aller alimenter ton savoir
 * sur internet, tu va regarder tout ce qui ce fait afin de comprendre quel model travailler pour chaque projet, open
 * ia pour les images sont obligatoires »). Onze cahiers de métier `docs/sina-savoir/publications-*.md` et une
 * bibliothèque de modèles de publication par secteur (`references/modeles-publications.json` : 29 secteurs, 250
 * modèles relevés chez les meilleurs comptes). Méthode : `docs/sina-savoir/methode-publications.md`.
 *
 * Chaque spécialiste du plan des publications lit SES cahiers, règles d'abord (la partie « Ce que SINA doit en tirer »
 * passe en tête, pour ne jamais être coupée), sans sources ni adresses. Les modèles du secteur du client arrivent dans
 * la demande, reconnus sans IA à partir de ce qu'il vend. Un cahier absent n'est jamais remplacé en silence : le plan
 * s'arrête avant tout appel payant et le dit.
 */
import fs from "node:fs";
import path from "node:path";
import { estimateTaskMicro } from "../ai/estimate";
import type { TaskId } from "../ai/config";
import { brandKnowledgeDir } from "./brand-knowledge";
import { forModel } from "./custom-theme/knowledge";

export const POSTS_BOOKS = {
  marche: { file: "publications-ce-qui-marche.md", title: "CE QUI MARCHE SUR LES RÉSEAUX, EN CHIFFRES" },
  droit: { file: "publications-regles-des-reseaux-et-du-droit.md", title: "LES RÈGLES DES RÉSEAUX ET DU DROIT" },
  da: { file: "publications-direction-artistique.md", title: "LA DIRECTION ARTISTIQUE D'UN COMPTE" },
  images: { file: "publications-images-par-ia.md", title: "CRÉER LES IMAGES AVEC LE MODÈLE D'IMAGES D'OPENAI" },
  textes: { file: "publications-textes-et-legendes.md", title: "LES MOTS D'UNE PUBLICATION" },
  ligne: { file: "publications-ligne-et-calendrier.md", title: "LA LIGNE ET LE CALENDRIER D'UN COMPTE" },
  atlas: { file: "publications-atlas-des-meilleurs.md", title: "L'ATLAS DES MEILLEURS COMPTES" },
} as const;
export type PostsBook = keyof typeof POSTS_BOOKS;

/** Les spécialistes du plan des publications, et ce que chacun lit. */
export const POSTS_READS = {
  /** Écrit (et reprend) le plan : la ligne, les mots, ce que font les meilleurs, la scène de chaque photo. */
  stratege: ["ligne", "textes", "atlas", "images"],
  /** Juge le plan avant qu'une seule image soit payée : ce qui marche, le droit, la direction artistique. */
  juge: ["marche", "droit", "da"],
} as const satisfies Record<string, readonly PostsBook[]>;
export type PostsSpecialist = keyof typeof POSTS_READS;

/** Plafond par cahier (caractères), règles comprises : un cahier qui grossit ne fait pas exploser le coût du plan. */
export const MAX_POSTS_BOOK_CHARS = 14_000;
/** Plafond du texte des modèles d'un secteur (caractères). */
export const MAX_MODELS_CHARS = 12_000;

/** La partie « Ce que SINA doit en tirer » d'un cahier passe en tête : coupé au plafond, il garde toujours ses règles. */
export function rulesFirst(md: string): string {
  const re = /\n##[^\n]*Ce que SINA doit en tirer[^\n]*\n[\s\S]*?(?=\n##\s|$)/i;
  const m = md.match(re);
  if (!m) return md;
  const rest = md.replace(re, ""), nl = rest.indexOf("\n");
  const rules = m[0].trim().replace(/\n-{3,}\s*$/, "");
  return nl < 0 ? `${rest}\n\n${rules}` : `${rest.slice(0, nl)}\n\n${rules}\n${rest.slice(nl)}`;
}

/** Un cahier des publications pour le modèle : sans sources ni adresses, sans renvois numérotés ni marques de lecture. */
export const postsForModel = (md: string) =>
  forModel(rulesFirst(md))
    .replace(/\s?(?:\[\d+(?:\s?[–-]\s?\d+)?(?:\s?,\s?\d+)*\])+/g, "")
    .replace(/\s?\((?:extrait|métier|lu)\)/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

const cache = new Map<string, string>();
/** Texte d'un cahier tel que le lit un spécialiste ; erreur claire s'il manque. */
export function postsBook(book: PostsBook): string {
  const file = path.join(brandKnowledgeDir(), POSTS_BOOKS[book].file);
  const hit = cache.get(file);
  if (hit) return hit;
  let md: string;
  try { md = fs.readFileSync(file, "utf8"); } catch { throw new Error(`Cahier de métier introuvable : ${file}. Le plan des publications ne se fait pas sans lui.`); }
  const all = postsForModel(md);
  // Coupé à la fin d'un paragraphe : jamais une phrase tronquée au milieu.
  const text = all.length <= MAX_POSTS_BOOK_CHARS ? all : all.slice(0, all.lastIndexOf("\n\n", MAX_POSTS_BOOK_CHARS)).trim();
  if (text.length < 2000) throw new Error(`Cahier de métier trop court ou vide : ${file}.`);
  cache.set(file, text);
  return text;
}

/** Tous les cahiers d'un spécialiste, annoncés pour ce qu'ils sont. */
export function postsKnowledge(who: PostsSpecialist): string {
  const books = POSTS_READS[who].map((b) => `══ CAHIER : ${POSTS_BOOKS[b].title} ══\n${postsBook(b)}`);
  return `TON SAVOIR DE MÉTIER (cahiers tirés de onze recherches sur ce que font les meilleurs comptes de marque, les études chiffrées de 2025 et 2026, les règles des réseaux et le droit français). Sers-t'en comme un professionnel se sert de son expérience : pour décider, jamais pour réciter. Tu ne cites aucune marque, aucun compte ni aucune étude de ces cahiers dans ce que tu écris pour le client, et tu ne recopies aucun de leurs exemples : tu en gardes les principes. Les règles données plus haut et les faits du client passent toujours avant.\n\n${books.join("\n\n")}`;
}
/** La consigne d'un spécialiste, suivie de ses cahiers. */
export const postsEducated = (system: string, who: PostsSpecialist) => `${system}\n\n${postsKnowledge(who)}`;

// ---------------------------------------------------------------- les modèles de publication par secteur

export type PublicationModel = { nom: string; role: string; format: string; ceQuOnVoit: string; ceQuOnLit: string; legende: string; donnees: string; vuChez: string[]; risque: string };
export type PublicationSector = { id: string; secteur: string; famille: "produit" | "service"; mots: string; ceQuiCompte: string; modeles: PublicationModel[]; aEviter: string[] };

export const publicationModelsFile = () => path.join(brandKnowledgeDir(), "references", "modeles-publications.json");
let sectorsCache: { file: string; sectors: PublicationSector[] } | null = null;
/** Les secteurs de la bibliothèque ; bibliothèque illisible : aucun (le plan se fait alors avec les seuls cahiers). */
export function publicationSectors(): PublicationSector[] {
  const file = publicationModelsFile();
  if (sectorsCache?.file === file) return sectorsCache.sectors;
  let sectors: PublicationSector[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { secteurs?: PublicationSector[] };
    sectors = (raw.secteurs ?? []).filter((s) => s && typeof s.id === "string" && Array.isArray(s.modeles) && s.modeles.length > 0 && typeof s.mots === "string");
  } catch { sectors = []; }
  sectorsCache = { file, sectors };
  return sectors;
}

/**
 * Le secteur reconnu dans ce que vend le client (ses mots, ses fiches) : celui qui a le plus de mots trouvés. Sans IA.
 * `core` (le nom, la catégorie, les produits ou prestations) compte double : il dit ce qu'il vend, le reste le décrit.
 */
export function publicationSectorOf(offer: string, business: "products" | "services", core = ""): PublicationSector | null {
  const t = ` ${offer.toLowerCase()} `, c = ` ${core.toLowerCase()} `, famille = business === "services" ? "service" : "produit";
  // Le plus de mots trouvés ; à égalité, les mots les plus longs (« tapis de yoga » l'emporte sur « tapis »).
  let best: PublicationSector | null = null, score = 0, length = 0;
  for (const s of publicationSectors()) {
    if (s.famille !== famille) continue;
    let re: RegExp;
    try { re = new RegExp(`(?<!\\p{L})(?:${s.mots})(?!\\p{L})`, "gu"); } catch { continue; }
    const found = new Set([...t.matchAll(re)].map((m) => m[0])), inCore = new Set([...c.matchAll(re)].map((m) => m[0]));
    const hits = found.size + inCore.size, len = [...found].reduce((n, w) => n + w.length, 0);
    if (hits > score || (hits === score && hits > 0 && len > length)) { best = s; score = hits; length = len; }
  }
  return best;
}

const cut = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n)).trim()}…`);

/**
 * Les modèles du secteur du client, tels que la stratège les lit : à adapter à SA marque, jamais à recopier ; sans les
 * comptes où ils ont été vus (aucun nom de marque ne doit passer dans ses textes).
 */
export function publicationModelsText(s: PublicationSector, max = MAX_MODELS_CHARS): string {
  const head = `MODÈLES DE PUBLICATION DU SECTEUR « ${s.secteur} » (relevés chez les meilleurs comptes de ce secteur ; c'est ta matière de départ : choisis ceux qui servent l'angle du client, adapte-les à SA marque, à SES produits et à SES faits ; ne les recopie jamais tels quels).\nCe qui distingue les meilleurs comptes de ce secteur : ${s.ceQuiCompte}`;
  const tail = `À ÉVITER DANS CE SECTEUR :\n${s.aEviter.map((x) => `- ${x}`).join("\n")}`;
  const lines: string[] = [];
  let size = head.length + tail.length + 4;
  for (const [i, m] of s.modeles.entries()) {
    const one = `${i + 1}. ${m.nom} (rôle : ${m.role} ; format : ${m.format})\n   On voit : ${cut(m.ceQuOnVoit, 700)}\n   On lit : ${cut(m.ceQuOnLit, 240)}\n   Légende : ${cut(m.legende, 220)}\n   Il faut savoir du client : ${cut(m.donnees, 260)}\n   Ce qui le fait rater : ${cut(m.risque, 260)}`;
    if (size + one.length > max) break;
    lines.push(one); size += one.length + 1;
  }
  return `${head}\n\n${lines.join("\n")}\n\n${tail}`;
}

/** Ce que le juge lit du secteur : ce qui compte, ce qui est à éviter, et les modèles qui exigent une vraie photo. */
export function publicationSectorForJudge(s: PublicationSector): string {
  const real = s.modeles.filter((m) => /vraie photo|vraie vidéo|photos? (?:réelles?|du client)/i.test(`${m.donnees} ${m.risque} ${m.ceQuOnVoit}`)).map((m) => m.nom);
  return [
    `SECTEUR DU CLIENT : « ${s.secteur} ». Ce qui distingue les meilleurs comptes : ${s.ceQuiCompte}`,
    `À ÉVITER DANS CE SECTEUR :\n${s.aEviter.map((x) => `- ${x}`).join("\n")}`,
    real.length ? `MODÈLES QUI EXIGENT UNE VRAIE PHOTO DU CLIENT (jamais une image créée à leur place) : ${real.join(" ; ")}.` : "",
  ].filter(Boolean).join("\n\n");
}

/** Les modèles du secteur du client (texte de la stratège, texte du juge), ou rien si aucun secteur n'est reconnu. */
export function publicationModelsFor(offer: string, business: "products" | "services", core = ""): { sector: { id: string; label: string } | null; forPlanner: string; forJudge: string } {
  const s = publicationSectorOf(offer, business, core);
  if (!s) return { sector: null, forPlanner: "AUCUN SECTEUR RECONNU dans la bibliothèque des modèles de publication : pars des principes de tes cahiers et des faits du client.", forJudge: "" };
  return { sector: { id: s.id, label: s.secteur }, forPlanner: publicationModelsText(s), forJudge: publicationSectorForJudge(s) };
}

/** Tous les cahiers des publications sont-ils lisibles ? (contrôle gratuit avant tout appel payant) */
export function postsKnowledgeReady(): { ok: true } | { ok: false; reason: string } {
  try { for (const b of Object.keys(POSTS_BOOKS) as PostsBook[]) postsBook(b); return { ok: true }; } catch (e) { return { ok: false, reason: (e as Error).message }; }
}

/** Jetons d'entrée ajoutés par les cahiers d'un spécialiste (estimation prudente : un jeton pour 3 caractères). */
export const postsKnowledgeTokens = (who: PostsSpecialist) => Math.ceil(postsKnowledge(who).length / 3);
/** Jetons d'entrée ajoutés par les modèles d'un secteur, au plus. */
export const MODELS_TOKENS_MAX = Math.ceil(MAX_MODELS_CHARS / 3);
/** Coût probable (micro-euros) des cahiers et des modèles sur `calls` appels : le premier au plein tarif, les suivants relus en mémoire. */
export function postsKnowledgeTypicalMicro(who: PostsSpecialist, task: TaskId, calls = 1): number {
  if (calls <= 0) return 0;
  return Math.round(estimateTaskMicro(task, { input: postsKnowledgeTokens(who) }) * (1 + 0.1 * (calls - 1)) + estimateTaskMicro(task, { input: MODELS_TOKENS_MAX }) * calls);
}
/** Coût au plus (micro-euros) d'UN appel : cahiers au tarif d'écriture en mémoire et modèles du secteur, avec une marge de change. */
export const postsKnowledgeCapMicro = (who: PostsSpecialist, task: TaskId) => Math.round(estimateTaskMicro(task, { input: postsKnowledgeTokens(who) + MODELS_TOKENS_MAX }) * 1.25 * 1.1);
