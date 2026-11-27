/**
 * LES FAITS À MONTRER (27 novembre 2026). Les mots du propriétaire : « Et bien c'est le but de poser des questions au
 * client avant de démarrer le projet afin de savoir ce que peux être générer en image ce qui peux être générer en texte
 * sans que sa porte défaut ».
 *
 * Pendant « Faire connaissance », avant le résumé et avant la planche de marque, SINA demande les faits que le client seul
 * connaît et qui peuvent s'écrire sur les images et le site : le nom exact de chaque produit (ou prestation), puis pour
 * chacun ce que son métier demande (formats, origine, mentions, lieu de fabrication ; pour le café, le degré de
 * torréfaction et les notes de goût ; pour une prestation, sa durée et son lieu), l'année de création et la ville, s'il
 * veut la montrer. Le cahier `docs/sina-savoir/questions-avant-la-marque.md` dit quoi demander, par métier ; le code
 * choisit ses parties d'après l'activité et l'offre.
 *
 * Chaque fait a un état : « donne » (sa valeur, mot pour mot), « ne_sait_pas », « ne_montre_pas ». Seuls les faits donnés
 * peuvent s'écrire (planche de marque, planche en vrai, publications, site) et sont dits au relecteur comme permis ; un
 * fait que le client ne veut pas montrer est traité comme absent partout, et refusé s'il apparaît. Tout le reste reste sans
 * mot lisible (la règle des petits textes illisibles, MICRO_TEXTES_EN_VRAI, reste le filet).
 *
 * Les faits vivent dans la fiche du client (`agent_conversations.state_json.fiche.faits`), à côté de ses notes.
 */
import fs from "node:fs";
import path from "node:path";
import { brandKnowledgeDir } from "./brand-knowledge";
import { L } from "../i18n-server";
import { all } from "../db";
import { ficheOf, updateFiche, type Fiche } from "./fiche";
import type { Journey } from "./journey";

// ---------------------------------------------------------------- 1. le cahier

export const CAHIER_DES_FAITS = "questions-avant-la-marque.md";
export type Portee = "marque" | "chacun";
export type SujetDuCahier = { sujet: string; portee: Portee; mots: RegExp; question: string; partie: string };
export type PartieDuCahier = { nom: string; quand: "toujours" | "produits" | "services" | { mots: string[] }; sujets: SujetDuCahier[] };

/** Un texte sans accents ni capitales, apostrophes unifiées. */
export const plat = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’ʼ‘]/g, "'").toLowerCase();
/** Les plus longues clés de sujet (« fait:<sujet> » tient dans les 20 signes du sujet demandé). */
export const SUJET_MAX = 15;

const cache = new Map<string, PartieDuCahier[]>();
/** Les parties du cahier, lues dans le fichier (une erreur claire s'il manque ou s'il est mal formé). */
export function cahierDesFaits(): PartieDuCahier[] {
  const file = path.join(brandKnowledgeDir(), CAHIER_DES_FAITS);
  const hit = cache.get(file);
  if (hit) return hit;
  let md: string;
  try { md = fs.readFileSync(file, "utf8"); } catch { throw new Error(`Cahier de métier introuvable : ${file}.`); }
  const parties = lireLeCahier(md);
  cache.set(file, parties);
  return parties;
}
/** Lit le texte du cahier (exposé pour les tests). */
export function lireLeCahier(md: string): PartieDuCahier[] {
  const parties: PartieDuCahier[] = [];
  let cur: PartieDuCahier | null = null;
  for (const l of md.split("\n")) {
    const h = /^##\s+Partie\s*:\s*(.+?)\s*\(quand\s*:\s*(.+)\)\s*$/u.exec(l);
    if (h) {
      const q = h[2].trim();
      const quand: PartieDuCahier["quand"] = q === "toujours" || q === "produits" || q === "services" ? q
        : /^mots\s+/u.test(q) ? { mots: q.replace(/^mots\s+/u, "").split(",").map((x) => plat(x.trim())).filter(Boolean) } : (() => { throw new Error(`Cahier des faits : partie « ${h[1]} » sans « quand » lisible.`); })();
      cur = { nom: h[1].trim(), quand, sujets: [] };
      parties.push(cur);
      continue;
    }
    if (/^##\s/u.test(l)) { cur = null; continue; }
    if (!cur || !/^-\s/u.test(l)) continue;
    const p = l.replace(/^-\s+/u, "").split(" | ").map((x) => x.trim());
    if (p.length !== 4 || !/^[a-z_]+$/u.test(p[0]) || p[0].length > SUJET_MAX || (p[1] !== "marque" && p[1] !== "chacun")) throw new Error(`Cahier des faits : ligne illisible « ${l.slice(0, 80)} ».`);
    cur.sujets.push({ sujet: p[0], portee: p[1], mots: new RegExp(p[2], "iu"), question: p[3], partie: cur.nom });
  }
  if (!parties.length) throw new Error("Cahier des faits : aucune partie.");
  return parties;
}

/** Un mot du métier est-il dans ce texte ? Le mot entier, au singulier ou au pluriel ; suivi de « * », le début d'un mot. */
export const ditLeMot = (texte: string, mot: string) => {
  const debut = mot.endsWith("*"), w = mot.replace(/\*$/u, "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!w) return false;
  return new RegExp(debut ? `(?<![\\p{L}])${w}` : `(?<![\\p{L}])${w}(?:s|x)?(?![\\p{L}])`, "u").test(texte);
};
/** Les parties qui valent pour ce client : toujours, son activité, et celles dont un mot est dans ce qu'il a dit de son offre. */
export function partiesPour(o: { business?: string | null; offre?: string | null }, cahier = cahierDesFaits()): PartieDuCahier[] {
  const t = plat(o.offre ?? "");
  return cahier.filter((p) => p.quand === "toujours" ? true : p.quand === "produits" ? o.business === "products" : p.quand === "services" ? o.business === "services" : p.quand.mots.some((m) => ditLeMot(t, m)));
}
/** Les sujets de ce client, dans l'ordre du cahier, sans doublon (le premier gagne). */
export function sujetsPour(o: { business?: string | null; offre?: string | null }, cahier = cahierDesFaits()): SujetDuCahier[] {
  const out: SujetDuCahier[] = [];
  for (const p of partiesPour(o, cahier)) for (const s of p.sujets) if (!out.some((x) => x.sujet === s.sujet)) out.push(s);
  return out;
}
/** Les sujets d'un parcours : rien tant que son activité et son offre ne sont pas connues. */
export function sujetsDuParcours(j: Pick<Journey, "start">): SujetDuCahier[] {
  const business = j.start.business?.status === "answered" ? j.start.business.value : null, offre = j.start.offer?.status === "answered" ? j.start.offer.value : null;
  if (!business || !offre) return [];
  try { return sujetsPour({ business, offre }); } catch { return []; }
}

// ---------------------------------------------------------------- 2. les faits de la fiche

export const ETATS_DU_FAIT = ["donne", "ne_sait_pas", "ne_montre_pas"] as const;
export type EtatDuFait = (typeof ETATS_DU_FAIT)[number];
export type FaitAMontrer = {
  sujet: string;
  /** Le produit ou la prestation (sujets « chacun ») ; absent pour la marque. */
  produit?: string;
  /** Sa réponse, mot pour mot (état « donne ») ; pour « ne_montre_pas », ce qu'il a dit, jamais écrit ni envoyé. */
  valeur?: string;
  /** Sujet « noms » : les noms exacts, un par produit ou par prestation. */
  noms?: string[];
  etat: EtatDuFait;
  at: number;
  /** Corrigé par le client lui-même, sur sa fiche. */
  corrigeLe?: number;
};
export const ETAT_LABEL: Record<EtatDuFait, { fr: string; en: string }> = {
  donne: { fr: "à montrer", en: "to show" }, ne_sait_pas: { fr: "tu ne sais pas", en: "you don't know" }, ne_montre_pas: { fr: "à ne pas montrer", en: "not to show" },
};
export const LIBELLE_DU_SUJET: Record<string, { fr: string; en: string }> = {
  noms: { fr: "Noms exacts", en: "Exact names" }, formats: { fr: "Formats ou poids", en: "Sizes or weights" }, origine: { fr: "Origine", en: "Origin" },
  mentions: { fr: "Mentions et labels", en: "Mentions and labels" }, fabrication: { fr: "Lieu de fabrication", en: "Where it is made" },
  durees: { fr: "Durée", en: "Duration" }, lieu: { fr: "Lieu", en: "Place" }, composition: { fr: "Composition", en: "Composition" },
  torrefaction: { fr: "Degré de torréfaction", en: "Roast level" }, notes_de_gout: { fr: "Notes de goût", en: "Tasting notes" },
  matieres: { fr: "Matières", en: "Materials" }, tannage: { fr: "Tannage", en: "Tanning" }, coutures: { fr: "Coutures", en: "Stitching" },
  finitions: { fr: "Finitions et teintes", en: "Finishes and colours" }, annee: { fr: "Année de création", en: "Year founded" }, ville: { fr: "Ville", en: "City" },
};
export const libelleDuSujet = (s: string, lang: "fr" | "en" = "fr") => LIBELLE_DU_SUJET[s]?.[lang] ?? s.replace(/_/g, " ");

const memeTexte = (a: string | undefined, b: string | undefined) => plat((a ?? "").trim()) === plat((b ?? "").trim());
const cle = (f: Pick<FaitAMontrer, "sujet" | "produit">) => `${f.sujet}\u0000${plat(f.produit ?? "")}`;

/** Les faits d'une fiche (un ancien fil n'en a pas). */
export const faitsDeLaFiche = (f: Fiche): FaitAMontrer[] => (Array.isArray((f as Fiche & { faits?: unknown }).faits) ? ((f as Fiche & { faits: FaitAMontrer[] }).faits) : []).filter((x) => x && typeof x.sujet === "string" && (ETATS_DU_FAIT as readonly string[]).includes(x.etat));
export const faitsDuFil = (cid: string): FaitAMontrer[] => faitsDeLaFiche(ficheOf(cid));

/** Enregistre des faits : un fait du même sujet (et du même produit) remplace le précédent ; il a changé d'avis. */
export function enregistrerLesFaits(cid: string, faits: Omit<FaitAMontrer, "at">[]): FaitAMontrer[] {
  return faitsDeLaFiche(updateFiche(cid, (f) => {
    const at = Date.now();
    let list = faitsDeLaFiche(f);
    for (const x of faits) {
      // Les noms changent : les faits des produits qui n'existent plus sont retirés.
      if (x.sujet === "noms") list = list.filter((y) => !y.produit || (x.etat === "donne" && (x.noms ?? []).some((n) => memeTexte(n, y.produit))));
      list = [...list.filter((y) => cle(y) !== cle(x)), { ...x, at, ...(x.valeur != null ? { valeur: x.valeur.trim() } : {}) }];
    }
    (f as Fiche & { faits: FaitAMontrer[] }).faits = list;
  }));
}

/** Les produits ou les prestations donnés (sujet « noms »). */
export function nomsDonnes(faits: readonly FaitAMontrer[]): string[] {
  const n = faits.find((x) => x.sujet === "noms" && !x.produit);
  return n?.etat === "donne" ? (n.noms ?? []).map((x) => x.trim()).filter(Boolean) : [];
}
/** Le fait d'un sujet pour un produit (ou pour la marque) : celui du produit, sinon celui qui vaut pour tous. */
export function faitDe(faits: readonly FaitAMontrer[], sujet: string, produit?: string): FaitAMontrer | undefined {
  return faits.find((x) => x.sujet === sujet && (produit ? memeTexte(x.produit, produit) : !x.produit)) ?? (produit ? faits.find((x) => x.sujet === sujet && !x.produit) : undefined);
}

/** Un sujet encore à demander, avec les produits qui n'ont pas de réponse (sujets « chacun »). */
export type FaitAAborder = { sujet: string; libelle: string; question: string; portee: Portee; produits?: string[] };
/**
 * LES FAITS ENCORE À DEMANDER, dans l'ordre du cahier : un sujet de la marque sans réponse ; un sujet « chacun » dont un
 * produit n'a pas de réponse (tant que les noms ne sont pas donnés, ces sujets attendent ; s'il ne sait pas les noms, ou
 * ne veut pas les montrer, ils ne se demandent pas). Rien avant que son activité et son offre soient connues.
 */
export function faitsAAborder(j: Pick<Journey, "start">, faits: readonly FaitAMontrer[]): FaitAAborder[] {
  const sujets = sujetsDuParcours(j), noms = nomsDonnes(faits), nomsRepondus = !!faits.find((x) => x.sujet === "noms" && !x.produit);
  const out: FaitAAborder[] = [];
  for (const s of sujets) {
    const base = { sujet: s.sujet, libelle: libelleDuSujet(s.sujet), question: s.question, portee: s.portee };
    if (s.portee === "marque") { if (!faitDe(faits, s.sujet)) out.push(base); continue; }
    if (!nomsRepondus || !noms.length) continue;
    const manquent = noms.filter((n) => !faitDe(faits, s.sujet, n));
    if (manquent.length) out.push({ ...base, produits: manquent });
  }
  // Le sujet « noms » d'abord : les sujets « chacun » en dépendent.
  return out;
}
/** Un sujet est-il entièrement répondu (pour tous ses produits) ? */
export function sujetComplet(j: Pick<Journey, "start">, faits: readonly FaitAMontrer[], sujet: string): boolean {
  const s = sujetsDuParcours(j).find((x) => x.sujet === sujet);
  if (!s) return false;
  return !faitsAAborder(j, faits).some((x) => x.sujet === sujet) && (s.portee === "marque" ? !!faitDe(faits, sujet) : !!faits.find((x) => x.sujet === "noms" && !x.produit));
}

// ---------------------------------------------------------------- 3. ce qui peut s'écrire, ce qui ne s'écrit jamais

/** Une mention vraie, donnée par le client et qu'il accepte de montrer, mot pour mot. */
export type MentionVraie = { sujet: string; libelle: string; produit?: string; valeur: string };
/**
 * Ce que les images et les textes peuvent écrire : les mentions vraies (faits donnés), et les valeurs qu'il ne veut pas
 * montrer (jamais envoyées à un modèle, seulement comparées par le code). Vide pour un ancien projet : rien ne change.
 */
export type FaitsPermis = { mentions: MentionVraie[]; interdits: string[];
  /**
   * LES NOMS EXACTS DE SES PRODUITS (27 novembre 2026), tels qu'il les a donnés (sujet « noms », état « donne ») : un nom de
   * produit lisible sur une étiquette, une boîte ou un emballage leur est comparé (`nomsDeProduitsNonDonnes`, planche en
   * vrai). Absent quand il n'en a pas donné : rien ne change.
   */
  noms?: string[] };
export const AUCUN_FAIT: FaitsPermis = { mentions: [], interdits: [] };
/** Le client a-t-il donné quelque chose qui compte (une mention, ce qu'il ne veut pas montrer, ses noms exacts) ? */
export const aDesFaits = (f: FaitsPermis | null | undefined): f is FaitsPermis => !!f && (f.mentions.length > 0 || f.interdits.length > 0 || (f.noms?.length ?? 0) > 0);
/**
 * UN NOM DE PRODUIT ÉCRIT EXACTEMENT ? La casse ne compte pas (les étiquettes sont souvent en capitales) ; les espaces
 * (plusieurs espaces, un retour à la ligne), les apostrophes et les tirets sont unifiés ; chaque lettre et chaque accent
 * comptent (« CAFÉ MOULUS » n'est pas « Café moulu », « CAFE MOULU » non plus).
 */
export const nomEnCapitales = (t: string) => t.normalize("NFC").replace(/[’ʼ‘`´]/g, "'").replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").trim().toLocaleUpperCase("fr");
export const memeNomExact = (a: string, b: string) => !!nomEnCapitales(a) && nomEnCapitales(a) === nomEnCapitales(b);

export function faitsPermis(faits: readonly FaitAMontrer[]): FaitsPermis {
  const mentions: MentionVraie[] = [], interdits: string[] = [];
  const noms = nomsDonnes(faits);
  for (const f of faits) {
    if (f.sujet === "noms") { if (f.etat === "ne_montre_pas") interdits.push(...(f.noms ?? []), ...(f.valeur ? [f.valeur] : [])); continue; }
    // Un fait d'un produit qui n'est plus dans les noms donnés ne compte plus.
    if (f.produit && !noms.some((n) => memeTexte(n, f.produit))) continue;
    if (f.etat === "donne" && f.valeur?.trim()) mentions.push({ sujet: f.sujet, libelle: libelleDuSujet(f.sujet), ...(f.produit ? { produit: f.produit } : {}), valeur: f.valeur.trim() });
    if (f.etat === "ne_montre_pas" && f.valeur?.trim()) interdits.push(f.valeur.trim());
  }
  return { mentions, interdits: [...new Set(interdits.map((x) => x.trim()).filter((x) => x.length >= 2))], ...(noms.length ? { noms } : {}) };
}

/** Les fils d'un projet, du plus récent au plus ancien. */
const filsDuProjet = (projectId: string) => all<{ id: string }>("SELECT id FROM agent_conversations WHERE project_id=? ORDER BY updated_at DESC", projectId).map((r) => r.id);
/** Tous les faits d'un projet (tous ses fils), le plus récent de chaque sujet et produit. */
export function faitsDuProjet(projectId: string): FaitAMontrer[] {
  const out = new Map<string, FaitAMontrer>();
  for (const cid of filsDuProjet(projectId)) { try { for (const f of faitsDuFil(cid)) { const k = cle(f), d = out.get(k); if (!d || f.at > d.at) out.set(k, f); } } catch { /* fil illisible */ } }
  return [...out.values()].sort((a, b) => a.at - b.at);
}
export function faitsPermisDuProjet(projectId: string | null | undefined): FaitsPermis {
  if (!projectId) return AUCUN_FAIT;
  try { return faitsPermis(faitsDuProjet(projectId)); } catch { return AUCUN_FAIT; }
}

/** Une mention dite : « Café en grains » — formats : « 250 g, 1 kg ». */
const mentionDite = (m: MentionVraie) => `${m.produit ? `« ${m.produit.trim()} », ` : ""}${m.libelle.toLocaleLowerCase("fr")} : « ${m.valeur} »`;
/** La taille gardée pour la liste des mentions dans un texte envoyé (octets), jamais au milieu d'une mention. */
export const MENTIONS_MAX_OCTETS = 1200;
export function mentionsDites(f: FaitsPermis, max = MENTIONS_MAX_OCTETS): string {
  const out: string[] = [];
  for (const m of f.mentions) { const t = [...out, mentionDite(m)].join(" ; "); if (Buffer.byteLength(t, "utf8") > max) break; out.push(mentionDite(m)); }
  return out.join(" ; ");
}

/**
 * LA LIGNE DES MENTIONS VRAIES de la planche de marque (dans la partie « produits », comme la ligne des noms des produits) :
 * dite en positif, seulement quand le client a donné au moins un fait ; sans fait donné, le texte reste celui d'avant, à
 * la lettre près (une image déjà reçue est reconnue sans être repayée).
 */
export function ligneDesMentionsVraies(f: FaitsPermis | undefined): string {
  if (!f?.mentions.length) return "";
  return `Les étiquettes, les emballages, les fiches et le site peuvent porter ces mentions vraies, données par le client, écrites exactement : ${mentionsDites(f)}. Aucune autre origine, aucun autre poids, label, lieu ou date n'est écrit : les autres petits textes restent de simples traits, sans mot lisible.`;
}
/** Ce que la demande au relecteur dit des mentions vraies (vide sans mention). */
export function demandeDesMentionsVraies(f: FaitsPermis | undefined): string[] {
  if (!f?.mentions.length) return [];
  return [`Les mentions vraies données par le client, permises telles quelles là où elles sont écrites : ${mentionsDites(f)}. Écrites exactement, elles ne sont ni des promesses, ni des chiffres inventés, ni des produits inventés ; toute autre origine, tout autre poids, label, lieu, date ou chiffre lisible reste inventé.`];
}

/** Les morceaux d'un texte : les mots d'au moins trois lettres et les nombres (sans accents ni capitales). */
const morceaux = (t: string) => plat(t).split(/[^a-z0-9]+/u).filter((w) => w && (/\d/.test(w) || w.length >= 3));
const racine = (w: string) => (/\d/.test(w) ? w : w.replace(/(aux|eaux|s|x)$/u, (m) => (m === "aux" ? "al" : m === "eaux" ? "eau" : "")));
/** Les petits mots qui accompagnent une mention sans rien dire de plus. */
const LIAISON = new Set(["depuis", "dans", "pour", "avec", "les", "des", "une", "aux", "sur", "par", "notre", "nos", "fait", "faits", "faite", "faites", "fabrique", "fabriques", "fabriquee", "fabriquees", "torrefie", "torrefies", "torrefiee", "torrefiees", "origine", "provenance", "notes", "note", "format", "formats", "poids", "label", "labels", "mention", "mentions", "cree", "creee", "fonde", "fondee", "since", "made"]);
/**
 * UN TEXTE LU EST-IL UNE MENTION VRAIE ? Chacun de ses mots et de ses nombres est dans les mentions données (ou dans les
 * `autres` textes permis : le nom, la phrase du logo, les noms des produits), ou est un petit mot de liaison ; et au moins
 * un vient des mentions. « 250 g » pour « 250 g, 1 kg », « Origine Éthiopie » pour « Éthiopie », « Depuis 2019 » pour
 * « 2019 » sont permis ; « 100 % arabica » sans cette mention ne l'est pas.
 */
export function mentionPermise(texte: string, f: FaitsPermis | undefined, autres: readonly string[] = []): boolean {
  if (!f?.mentions.length) return false;
  const m = morceaux(texte).filter((w) => !LIAISON.has(w)).map(racine);
  if (!m.length) return false;
  const deMentions = new Set(f.mentions.flatMap((x) => morceaux(x.valeur)).map(racine)), deAutres = new Set(autres.flatMap(morceaux).map(racine));
  return m.every((w) => deMentions.has(w) || deAutres.has(w)) && m.some((w) => deMentions.has(w));
}
/** Les nombres d'un texte sont-ils tous dans les mentions vraies ? (un texte sans nombre : oui) */
export function chiffresPermis(texte: string, f: FaitsPermis | undefined): boolean {
  const n = plat(texte).match(/\d+/g) ?? [];
  if (!n.length) return true;
  const permis = new Set((f?.mentions ?? []).flatMap((x) => plat(x.valeur).match(/\d+/g) ?? []));
  return n.every((x) => permis.has(x));
}
/** Les valeurs qu'il ne veut pas montrer, trouvées dans un texte (mot entier, sans accents ni capitales). */
export function interditsDans(texte: string, f: FaitsPermis | undefined): string[] {
  if (!f?.interdits.length) return [];
  const t = ` ${plat(texte).replace(/[^a-z0-9]+/gu, " ")} `;
  return f.interdits.filter((v) => { const w = plat(v).replace(/[^a-z0-9]+/gu, " ").trim(); return w.length >= 2 && t.includes(` ${w} `); });
}
/** La raison d'un refus pour un fait qu'il ne veut pas montrer (la valeur n'est jamais recopiée pour un modèle). */
export const RAISON_FAIT_NON_MONTRE = "une information que le client ne veut pas montrer est écrite : retire-la";

/**
 * LES FAITS POUR LE CONTRÔLE DES PROMESSES (`lintClaims`, extra.facts) : chaque mention vraie, avec ses tournures
 * ordinaires (« depuis 2019 », « fabriqué en France », « origine Éthiopie »), pour qu'une publication ou un texte du site
 * qui l'écrit ne soit jamais pris pour une invention.
 */
export function faitsPourLeControle(f: FaitsPermis | undefined): string[] {
  const out: string[] = [];
  for (const m of f?.mentions ?? []) {
    out.push(`${m.produit ? `${m.produit} ` : ""}${m.libelle} ${m.valeur}`, m.valeur);
    if (m.sujet === "annee") out.push(`depuis ${m.valeur}`, `créée en ${m.valeur}`, `fondée en ${m.valeur}`, `since ${m.valeur}`);
    if (m.sujet === "fabrication" || m.sujet === "ville") out.push(`fabriqué en ${m.valeur}`, `fabriqué à ${m.valeur}`, `made in ${m.valeur}`);
    if (m.sujet === "origine") out.push(`origine ${m.valeur}`);
  }
  return out;
}
/** La ligne des mentions vraies pour les textes (publications, site) : seulement quand il y en a. */
export function ligneDesFaitsPourLesTextes(f: FaitsPermis | undefined): string {
  if (!f?.mentions.length) return "";
  return `Mentions vraies données par le client (faits confirmés, à écrire exactement s'ils servent ; aucune autre origine, aucun autre poids, label, lieu ou date) : ${mentionsDites(f)}.`;
}

// ---------------------------------------------------------------- 4. ce que SINA lit et ce que le Studio contrôle

/** Les deux réponses toujours permises, posées en boutons sous chaque question d'un fait. */
export const CHOIX_DES_FAITS = { ne_sait_pas: "Je ne sais pas", ne_montre_pas: "Je préfère ne pas le montrer" } as const;
/** Le sujet demandé, dit dans « askField » : « fait:<sujet> ». */
export const sujetDemande = (askField: string | undefined | null): string | null => (askField && askField.startsWith("fait:") ? askField.slice(5).trim() || null : null);

/** Ce que le client a dit pour ne pas savoir, ou pour ne pas montrer. */
export const DIT_NE_SAIT_PAS = /je ne sais pas|je sais pas|sais pas|aucune id[ée]e|pas s[ûu]r|je ne connais pas|je ne me souviens|j'ignore|no idea|i don't know|not sure/iu;
export const DIT_NE_MONTRE_PAS = /pas (le |la |les |l'|ça |cela )?(montrer|afficher|mettre|écrire|indiquer|voir)|pr[ée]f[èe]re (ne )?pas|ne veux pas|veux pas|non merci|garde[rz]? (ça )?pour moi|discr[eè]t|rather not|don't (want to )?show|keep it private/iu;

/** Les lignes du parcours pour « faire connaissance » : les faits déjà demandés (jamais redemandés) et ceux qui restent. */
export function lignesDesFaits(j: Pick<Journey, "start">, faits: readonly FaitAMontrer[]): { connus: string; restent: FaitAAborder[] } {
  const sujets = sujetsDuParcours(j);
  const dit = (x: FaitAMontrer) => `${libelleDuSujet(x.sujet)}${x.produit ? ` de « ${x.produit} »` : ""} (${x.etat === "donne" ? (x.sujet === "noms" ? `donnés : ${(x.noms ?? []).map((n) => `« ${n} »`).join(", ")}` : `donné : « ${x.valeur ?? ""} »`) : x.etat === "ne_sait_pas" ? "il ne sait pas" : "il ne veut pas le montrer"})`;
  const connus = faits.filter((x) => sujets.some((s) => s.sujet === x.sujet)).map(dit).join(" ; ");
  return { connus, restent: faitsAAborder(j, faits) };
}

/**
 * LE STUDIO EMPÊCHE DE REDEMANDER UN FAIT (contrôle gratuit d'un message, `defautsDuMessage`) : la question dit son sujet
 * (« fait:<sujet> ») et ce sujet est déjà répondu pour tous ses produits, ou sa question en reconnaît un déjà répondu.
 * Rend les sujets redemandés.
 */
export function faitsRedemandes(m: { message?: string; question?: { text: string } | null; askField?: string }, j: Pick<Journey, "start">, faits: readonly FaitAMontrer[]): string[] {
  const out = new Set<string>();
  const s = sujetDemande(m.askField);
  if (s && sujetComplet(j, faits, s)) out.add(s);
  const q = m.question?.text ?? "";
  if (q) for (const x of sujetsDuParcours(j)) if (sujetComplet(j, faits, x.sujet) && x.mots.test(q)) out.add(x.sujet);
  return [...out];
}
export const defautDesFaitsRedemandes = (sujets: readonly string[]) =>
  `Le client a déjà répondu pour ${sujets.map((s) => `« ${libelleDuSujet(s)} »`).join(", ")} (réponse donnée, « je ne sais pas » ou « je préfère ne pas le montrer ») : ne lui redemande jamais un fait déjà répondu. Passe au fait suivant qui reste, ou au résumé s'il n'en reste aucun.`;

/** Ajoute, sous la question d'un fait, les deux réponses toujours permises (sans doublon). */
export function avecLesChoixDesFaits<T extends { question?: { text: string; choices?: string[] } | null; askField?: string }>(out: T): T & { question?: { text: string; choices?: string[] } | null } {
  if (!sujetDemande(out.askField) || !out.question) return out;
  const choix = [...(out.question.choices ?? [])];
  for (const c of [L(CHOIX_DES_FAITS.ne_sait_pas, "I don't know"), L(CHOIX_DES_FAITS.ne_montre_pas, "I'd rather not show it")]) if (!choix.some((x) => plat(x) === plat(c))) choix.push(c);
  return { ...out, question: { ...out.question, choices: choix.slice(0, 8) } };
}

/**
 * CE QUE LE CONTRÔLE DES PROMESSES D'UN PROJET REÇOIT EN PLUS (`lintClaims`, extra) : ses mentions vraies comme faits
 * confirmés, et ce qu'il ne veut pas montrer, jamais écrit. Vide pour un ancien projet.
 */
export function extraDesFaits(projectId: string | null | undefined): { facts: string[]; interdits: string[] } {
  const f = faitsPermisDuProjet(projectId);
  return { facts: faitsPourLeControle(f), interdits: f.interdits };
}
