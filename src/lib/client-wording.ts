/**
 * CONSIGNES DE VOCABULAIRE DU CLIENT (mémoire du projet) — ex. « montre » et jamais « chronographe ».
 *
 * Une consigne donnée une fois est enregistrée dans la table `memory` (portée `client`, clé `wording.rules`,
 * versionnée : l'ancienne version passe au statut `rejected`) et appliquée AUTOMATIQUEMENT à chaque création : textes
 * des visuels (accroche, ligne, bouton) et consignes envoyées aux modèles d'images. Elle ne dépend plus de la
 * conversation : le studio la relit à chaque fois.
 */
import { id, now, one, run } from "./db";

/** `avoidGender` / `useGender` : genre des deux mots (« m » ou « f ») quand le studio ne le connaît pas tout seul. */
export type WordingRule = { avoid: string; use: string; note?: string; avoidGender?: Gender; useGender?: Gender };
export type Gender = "m" | "f";

const SCOPE = "client";
const KEY = "wording.rules";

export function loadWordingRules(projectId: string): WordingRule[] {
  const r = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId, SCOPE, KEY);
  try {
    return r ? (JSON.parse(r.value) as WordingRule[]) : [];
  } catch {
    return [];
  }
}

/** Ajoute (ou remplace) une consigne ; nouvelle version, l'ancienne gardée pour l'historique. */
export function addWordingRule(projectId: string, rule: WordingRule): WordingRule[] {
  const avoid = rule.avoid.trim();
  if (!avoid) return loadWordingRules(projectId);
  const next = [...loadWordingRules(projectId).filter((r) => r.avoid.toLowerCase() !== avoid.toLowerCase()), { avoid, use: rule.use.trim(), ...(rule.note ? { note: rule.note } : {}), ...(rule.avoidGender ? { avoidGender: rule.avoidGender } : {}), ...(rule.useGender ? { useGender: rule.useGender } : {}) }];
  run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected'", now(), projectId, SCOPE, KEY);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "preference", KEY, JSON.stringify(next), "confirmed", "user", SCOPE, now(), now());
  return next;
}

export function removeWordingRule(projectId: string, avoid: string): WordingRule[] {
  const next = loadWordingRules(projectId).filter((r) => r.avoid.toLowerCase() !== avoid.trim().toLowerCase());
  run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected'", now(), projectId, SCOPE, KEY);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "preference", KEY, JSON.stringify(next), "confirmed", "user", SCOPE, now(), now());
  return next;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Garde la casse du mot remplacé (Chronographe → Montre, CHRONOGRAPHE → MONTRE). */
const matchCase = (src: string, rep: string) => (src === src.toUpperCase() && src.length > 1 ? rep.toUpperCase() : src[0] === src[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep);

// ---------------------------------------------------------------- accord (genre)

/**
 * Genre des noms courants des boutiques et des services. Inconnu : aucun accord n'est touché (jamais de faute
 * ajoutée par le studio) ; le genre peut alors être donné avec la consigne (`avoidGender`, `useGender`).
 */
const NOUN_GENDER: Record<string, Gender> = Object.fromEntries([
  ..."chronographe casque sérum soin produit flacon parfum bracelet maillot t-shirt tee-shirt sweat pull bouquet sac coffret objet modèle article accessoire écouteur gobelet thermos bidon savon baume gel shampooing jardin chantier devis service atelier vase pot vêtement bijou collier cadran boîtier mouvement cuir acier tissu".split(" ").map((w) => [w, "m"] as const),
  ..."montre gourde bouteille crème lotion huile fleur rose plante composition création pièce boîte tenue chemise robe veste casquette housse enceinte gamme collection marque boutique prestation intervention entreprise équipe tasse bougie trousse pochette coque".split(" ").map((w) => [w, "f"] as const),
]);

/** Genre d'un nom (lexique, puis terminaisons sûres) ; undefined si le studio ne le sait pas. */
export function nounGender(word: string): Gender | undefined {
  const w = word.toLocaleLowerCase("fr-FR").trim().replace(/s$/, "");
  if (NOUN_GENDER[w]) return NOUN_GENDER[w];
  const head = w.split(/[\s-]/)[0];
  if (NOUN_GENDER[head]) return NOUN_GENDER[head];
  if (/(tion|sion|ette|ance|ence|ure|ude|ise)$/.test(head)) return "f";
  if (/(ment|age|isme|eau|oir)$/.test(head)) return "m";
  return undefined;
}

/** Déterminants et adjectifs placés AVANT le nom : masculin → féminin (singulier). */
const BEFORE: Record<string, string> = { un: "une", le: "la", du: "de la", au: "à la", ce: "cette", cet: "cette", mon: "ma", ton: "ta", son: "sa", quel: "quelle", aucun: "aucune", chaque: "chaque", notre: "notre", votre: "votre", leur: "leur", nouveau: "nouvelle", nouvel: "nouvelle", beau: "belle", bel: "belle", vieux: "vieille", vieil: "vieille", petit: "petite", grand: "grande", premier: "première", dernier: "dernière", seul: "seule", bon: "bonne", joli: "jolie", vrai: "vraie", parfait: "parfaite", tout: "toute", certain: "certaine", même: "même", autre: "autre" };
/** Adjectifs courants placés APRÈS le nom (masculin → féminin) ; les participes en -é s'accordent aussi. */
const AFTER: Record<string, string> = { blanc: "blanche", noir: "noire", gris: "grise", brun: "brune", bleu: "bleue", vert: "verte", doré: "dorée", argenté: "argentée", neuf: "neuve", léger: "légère", fier: "fière", cher: "chère", élégant: "élégante", robuste: "robuste", précis: "précise", français: "française", anglais: "anglaise", intemporel: "intemporelle", naturel: "naturelle", artisanal: "artisanale", idéal: "idéale", original: "originale", unique: "unique", luxueux: "luxueuse", précieux: "précieuse", sportif: "sportive", discret: "discrète", complet: "complète", parfait: "parfaite", fin: "fine", plein: "pleine", petit: "petite", grand: "grande", haut: "haute", lourd: "lourde", solide: "solide", étanche: "étanche", automatique: "automatique", classique: "classique", moderne: "moderne", garanti: "garantie", fini: "finie", poli: "polie", choisi: "choisie", conçu: "conçue", reçu: "reçue", vendu: "vendue", fait: "faite", offert: "offerte", ouvert: "ouverte", inclus: "incluse", assorti: "assortie", nouveau: "nouvelle", beau: "belle", seul: "seule", prêt: "prête", disponible: "disponible" };
/** Verbes qui relient le nom à un attribut (« la montre est garantie »). */
const LINK = new Set(["est", "reste", "semble", "sera", "était", "devient", "sont", "restent", "seront"]);

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([a, b]) => a !== b).map(([a, b]) => [b, a]));
const BEFORE_F: Record<string, string> = { ...invert(BEFORE), cette: "ce", nouvelle: "nouveau", belle: "beau", vieille: "vieux" };
const AFTER_F = invert(AFTER);
/** Mots en -ant ou -eux qui ne sont pas des adjectifs (« casque enfant », « deux ans ») : jamais accordés. */
const NOT_ADJ = new Set(["enfant", "argent", "diamant", "volant", "aimant", "brillant", "pendant", "restaurant", "client", "instant", "deux", "mieux", "yeux", "jeux", "lieux", "feux", "cheveux", "if"]);
const vowel = (w: string) => /^[aeiouyàâäéèêëîïôöùûüh]/i.test(w);

/** Adjectif (ou participe) accordé au genre voulu ; null : le mot n'est pas un adjectif connu (rien n'est touché). */
function agreeAfter(word: string, to: Gender): string | null {
  const lw = word.toLocaleLowerCase("fr-FR");
  if (NOT_ADJ.has(lw) || NOT_ADJ.has(lw.replace(/s$/, ""))) return null;
  const plural = /s$/.test(lw) && !AFTER[lw] && !AFTER_F[lw];
  const base = plural ? lw.slice(0, -1) : lw;
  const known = AFTER[base] !== undefined || AFTER_F[base] !== undefined || Object.values(AFTER).includes(base);
  let out: string | null = null;
  if (to === "f") {
    if (AFTER[base]) out = AFTER[base];
    else if (known) out = base;
    else if (/(é|ant|eux|if)$/.test(base)) out = base.replace(/eux$/, "euse").replace(/if$/, "ive").replace(/(é|ant)$/, "$1e");
    else if (/(ée|ante|euse|ive|ique|able|ible)$/.test(base)) out = base;
  } else {
    if (AFTER_F[base]) out = AFTER_F[base];
    else if (known) out = base;
    else if (/(ée|ante|euse|ive)$/.test(base)) out = base.replace(/euse$/, "eux").replace(/ive$/, "if").replace(/(é|ant)e$/, "$1");
    else if (/(é|ant|eux|if|ique|able|ible)$/.test(base)) out = base;
  }
  return out === null ? null : matchCase(word, out + (plural ? "s" : ""));
}

/** Déterminant ou adjectif avant le nom, accordé (et élidé : « la » / « l' », « ce » / « cet ») ; null : inconnu. */
function agreeBefore(word: string, to: Gender, next: string): string | null {
  const lw = word.toLocaleLowerCase("fr-FR");
  if (lw === "l'" || lw === "l’") return vowel(next) ? null : to === "f" ? matchCase(word, "la") : matchCase(word, "le");
  let out = to === "f" ? (BEFORE[lw] ?? (BEFORE_F[lw] ? lw : null)) : (BEFORE_F[lw] ?? (BEFORE[lw] ? lw : null));
  if (out === null) return null;
  if (vowel(next)) out = to === "m" ? ({ ce: "cet", nouveau: "nouvel", beau: "bel", vieux: "vieil" } as Record<string, string>)[out] ?? out : ({ ma: "mon", ta: "ton", sa: "son" } as Record<string, string>)[out] ?? out;
  return matchCase(word, out);
}

/**
 * Accorde les mots autour du nom remplacé quand son genre change (« un chronographe posé » → « une montre posée ») :
 * déterminant et adjectif avant le nom, adjectifs et participes après lui (« et » entre deux adjectifs), attribut
 * après « est », « reste »… Seuls les mots connus sont touchés.
 */
function agreeAround(before: string, noun: string, after: string, to: Gender): { before: string; after: string } {
  // Avant : jusqu'à deux mots (« le petit chronographe »), du plus proche au plus éloigné.
  let head = before;
  let done = "";
  let next = noun;
  for (let k = 0; k < 2; k++) {
    const m = head.match(/(^|[\s(«“"])([\p{L}]+['’]?)(\s*)$/u);
    if (!m || (!m[3] && !/['’]$/.test(m[2]))) break;
    const fixed = agreeBefore(m[2], to, next);
    if (fixed === null) break;
    head = head.slice(0, head.length - m[2].length - m[3].length);
    done = fixed + (/['’]$/.test(fixed) ? "" : " ") + done;
    next = fixed;
  }
  // Élision : « la » ou « le » devant une voyelle → « l' » ; « de » → « d' ».
  const b = (head + done).replace(/(^|[\s(«“"])(l[ae]|de) $/iu, (all, pre: string, art: string) => (vowel(noun) ? `${pre}${art[0]}'` : all));
  // Après : adjectifs consécutifs, « et » entre deux, ou un attribut après un verbe de liaison.
  let a = after;
  let pos = 0;
  let out = "";
  let agreed = 0;
  while (agreed < 4) {
    const m = a.slice(pos).match(/^(\s*,?\s+)([\p{L}]+)/u);
    if (!m) break;
    const word = m[2];
    const lw = word.toLocaleLowerCase("fr-FR");
    if ((lw === "et" || LINK.has(lw)) && agreed < 4) {
      const n = a.slice(pos + m[0].length).match(/^(\s+)([\p{L}]+)/u);
      if (!n || agreeAfter(n[2], to) === null) break;
      out += m[0];
      pos += m[0].length;
      continue;
    }
    const fixed = agreeAfter(word, to);
    if (fixed === null) break;
    out += m[1] + fixed;
    pos += m[0].length;
    agreed++;
  }
  return { before: b, after: out + a.slice(pos) };
}

/** Applique les consignes à un texte (mots entiers, accents, pluriels simples et accord en genre compris). */
export function applyWording(text: string, rules: WordingRule[]): string {
  let out = text;
  for (const r of rules) {
    const from = r.avoidGender ?? nounGender(r.avoid);
    const to = r.useGender ?? (r.use ? nounGender(r.use) : undefined);
    const change = !!(r.use && from && to && from !== to);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${esc(r.avoid)})(s?)(?![\\p{L}\\p{N}])`, "giu");
    let res = "";
    let last = 0;
    for (const m of out.matchAll(re)) {
      const at = m.index ?? 0;
      const w = m[1], plural = m[2];
      const noun = r.use ? matchCase(w, r.use) + (plural && !/s$/i.test(r.use) ? plural : "") : "";
      let before = out.slice(last, at);
      if (change || (r.use && vowel(r.use) !== vowel(r.avoid))) {
        // Genre ou élision changés : déterminant et adjectifs voisins accordés au nouveau nom.
        const end = at + m[0].length;
        const sentenceEnd = out.slice(end).search(/[.;:!?\n<]/);
        const tail = out.slice(end, sentenceEnd < 0 ? undefined : end + sentenceEnd);
        const g = agreeAround(before, noun, change ? tail : "", (change ? to : from ?? to ?? "m") as Gender);
        res += g.before + noun + (change ? g.after : tail);
        last = end + tail.length;
        continue;
      }
      res += before + noun;
      last = at + m[0].length;
    }
    out = res + out.slice(last);
    // « Montre chronographe » → « Montre montre » : le mot de remplacement répété est fusionné (seulement lui :
    // « nous nous » reste intact).
    if (r.use) out = out.replace(new RegExp(`(?<![\\p{L}])(${esc(r.use)})([ -])\\1(?![\\p{L}])`, "giu"), "$1");
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/** Clés et valeurs jamais réécrites : identifiants, types et références de fichiers (photos, vidéos). */
const KEEP_KEY = /^(id|type|key|src|url|image|images|video|videos|poster|asset|assetId|assets|file|files|font|fonts)$|(_image|_video|_asset|_id|Id|_url|Url)$/;
const KEEP_VALUE = /^(https?:|\/api\/|shopify:\/\/|data:)/;

/**
 * Applique les consignes à tous les textes d'un objet (ex. le thème : titres, textes, fiche produit, liens et
 * identifiant du produit réécrits ensemble pour rester cohérents). Renvoie une copie ; l'objet reçu n'est pas modifié.
 */
export function applyWordingDeep<T>(value: T, rules: WordingRule[]): T {
  if (!rules.length) return value;
  const walk = (v: unknown, key = ""): unknown => {
    if (typeof v === "string") return KEEP_KEY.test(key) || KEEP_VALUE.test(v) || !rules.some((r) => v.toLowerCase().includes(r.avoid.toLowerCase())) ? v : applyWording(v, rules);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

/** Ligne ajoutée aux consignes des modèles : le vocabulaire du client, à respecter dans ce qui est écrit. */
export function wordingPromptLine(rules: WordingRule[]): string {
  // En français (consignes aux modèles d'images en français) et sans guillemets : seuls les textes à écrire sur
  // l'image sont entre guillemets, pour que le modèle n'écrive pas ces mots-là sur le visuel.
  return rules.length ? `Vocabulaire du client, obligatoire dans tout mot écrit : ${rules.map((r) => (r.use ? `écrire ${r.use}, jamais ${r.avoid}` : `jamais ${r.avoid}`)).join(" ; ")}.` : "";
}
