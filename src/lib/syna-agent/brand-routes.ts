/**
 * Routes de marque de SINA (décisions du propriétaire du 12 novembre 2026 ; méthode : `docs/sina-savoir/`).
 *
 * Une « route » est une identité (nom, signature, promesse, couleurs, polices, ton) avec sa PLANCHE (`brand-board.ts`).
 * SINA en propose 2, 3 ou 4 selon le forfait du projet. Ce fichier tient ce qui se mesure sans IA : le nombre de
 * routes, les fonds de la série, et les contrôles gratuits.
 *
 * Les noms ne passent plus par une formule (« un mot + de + le produit » refusait 21 des 27 noms de référence du
 * propriétaire pour des produits et acceptait « Bidule de machin ») : le talent d'un nom se juge par le directeur de
 * création, avec les 50 noms du propriétaire comme mesure ; le Studio ne contrôle ici que ce qui se compte (longueur,
 * noms trop pareils dans une même série, nom recopié d'un exemple).
 */
import { z } from "zod";
import type { PlanId } from "../plans";
import { FONT_HANDLES } from "../theme/render";
import { BoardSchema, SERVICE_OBJECTS, type Board, type Wordmark } from "./brand-board";
import { NAME_EXAMPLES } from "./brand-references";
import { COLOR_RULES, IdentitySchema, bodyFontOk, fontFamily, fontKeyOf, hueGap, normText, oklch, paletteIssues, refusedColorIssues, wordCount, type Identity } from "./identities";
import { FIELD_LABEL, START_FIELDS, type Journey } from "./journey";

export const ROUTE_KEYS = ["A", "B", "C", "D"] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

/** Nombre d'identités proposées selon le forfait (décision du propriétaire du 12 novembre 2026). */
export const ROUTES_BY_PLAN: Record<PlanId, number> = { creer: 2, vendre: 3, dominer: 4 };
/** Sans forfait connu : le plus petit nombre (aucune création n'est de toute façon possible sans abonnement). */
export const routeCountFor = (plan: PlanId | null | undefined): number => (plan ? ROUTES_BY_PLAN[plan] : ROUTES_BY_PLAN.creer);
export const routeKeys = (count: number): RouteKey[] => ROUTE_KEYS.slice(0, Math.min(4, Math.max(2, Math.round(count))));

type Ground = Identity["ground"];
/** Fonds de la règle du propriétaire (6 et 7 novembre 2026) : un blanc, un dégradé de couleurs, un sombre. */
export const SERIES_GROUNDS: Ground[] = ["blanc", "degrade", "sombre"];
/**
 * Quatrième fond d'une série de quatre : le fond clair coloré (« uni »), présent dans les palettes d'exemple du
 * propriétaire. [À confirmer par le propriétaire : sa règle ne dit que trois fonds.]
 */
export const FOURTH_GROUND: Ground = "uni";

const GROUND_NAME: Record<Ground, string> = { blanc: "un fond blanc", degrade: "un fond en dégradé de couleurs", sombre: "un fond sombre", uni: "un fond clair coloré" };
const groundName = (g: Ground) => GROUND_NAME[g];

/** Fonds attendus d'une série : tous différents ; à trois, les trois de la règle ; à quatre, le fond « uni » en plus. */
export function groundsFor(count: number): { exact: Ground[] | null; among: Ground[] } {
  if (count >= 4) return { exact: [...SERIES_GROUNDS, FOURTH_GROUND], among: [...SERIES_GROUNDS, FOURTH_GROUND] };
  if (count === 3) return { exact: [...SERIES_GROUNDS], among: [...SERIES_GROUNDS] };
  return { exact: null, among: [...SERIES_GROUNDS] };
}

export const RouteSchema = IdentitySchema.extend({ board: BoardSchema });
export type Route = z.infer<typeof RouteSchema>;
export const routesSchema = (count: number) => z.object({ routes: z.array(RouteSchema).length(routeKeys(count).length) });
/** Une identité enregistrée est-elle une route (avec sa planche) ? Les identités d'avant le 12 novembre n'en ont pas. */
export const isRoute = (x: Identity): x is Route => !!x.board;

// ---------------------------------------------------------------- noms : ce qui se compte, sans formule

/** Petits mots de liaison : ils ne comptent pas comme « le mot » d'un nom, mais dessinent son moule. */
const LINKS = new Set(["de", "d", "du", "des", "la", "le", "les", "l", "a", "au", "aux", "en", "et", "sans", "sur", "sous", "entre", "pour", "par", "un", "une", "on", "est"]);
const LINK_FAMILY: Record<string, string> = { d: "de", du: "de", des: "de", l: "le", la: "le", les: "le", au: "a", aux: "a", une: "un" };

/** Mots d'un nom, sans accents ni casse (« L'Eau Est Bonne » → l, eau, est, bonne). */
export function nameTokens(name: string): string[] {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
const strongTokens = (name: string) => nameTokens(name).filter((t) => !LINKS.has(t));
/** Moule d'un nom : ses mots de liaison gardés, les autres remplacés par « X » (« Éclat de thé » → « X de X »). */
export function nameMould(name: string): string {
  return nameTokens(name).map((t) => (LINKS.has(t) ? LINK_FAMILY[t] ?? t : "X")).join(" ");
}

/** Contrôle d'UN nom : seulement ce qui se compte. Le talent se juge ailleurs (directeur de création). */
export function nameIssues(name: string): string[] {
  const n = name.trim(), issues: string[] = [];
  if (!n) return ["nom vide."];
  if (n.split(/\s+/).length > 4 || n.length > 40) issues.push(`« ${n} » : nom trop long (4 mots et 40 caractères au plus).`);
  if (!strongTokens(n).length) issues.push(`« ${n} » : aucun mot fort (seulement des mots de liaison).`);
  if (/[0-9]/.test(n)) issues.push(`« ${n} » : pas de chiffre dans un nom de marque.`);
  if (/[.!?;:,«»"()]/.test(n)) issues.push(`« ${n} » : une marque n'est pas une phrase (pas de ponctuation).`);
  return issues;
}
/** Le nom reprend-il un des exemples du propriétaire ? (Jamais recopiés : ce sont des repères de niveau.) */
export const isReferenceName = (name: string) => NAME_EXAMPLES.some((e) => normText(e.name) === normText(name));

/** Contrôle d'une SÉRIE de noms : trois idées différentes, jamais deux noms du même moule. */
export function nameSeriesIssues(names: string[]): string[] {
  const issues: string[] = [];
  const pairs = names.flatMap((a, i) => names.slice(i + 1).map((b) => [a, b] as const));
  for (const [a, b] of pairs) {
    const sa = strongTokens(a), sb = strongTokens(b);
    if (normText(a) === normText(b)) { issues.push(`« ${a} » : deux identités ont le même nom.`); continue; }
    if (sa[0] && sa[0] === sb[0]) issues.push(`« ${a} » et « ${b} » commencent par le même mot : deux idées différentes sont attendues.`);
    else if (sa.length > 1 && sb.length > 1 && sa[sa.length - 1] === sb[sb.length - 1]) issues.push(`« ${a} » et « ${b} » finissent par le même mot : deux idées différentes sont attendues.`);
    else {
      const ma = nameMould(a);
      if (ma === nameMould(b) && /[a-z]/.test(ma)) issues.push(`« ${a} » et « ${b} » sortent du même moule (${ma.replace(/X/g, "…")}) : jamais deux noms construits pareil dans une série.`);
    }
  }
  return issues;
}

// ---------------------------------------------------------------- honnêteté : ce qui reste à prouver

/** Ce que le client a dit lui-même (fiche de départ) : seule source de faits sur son produit. */
export function clientFacts(j: Journey): string {
  return START_FIELDS.map((f) => (j.start[f]?.status === "answered" ? `${FIELD_LABEL[f].fr} : ${j.start[f]!.value}` : "")).filter(Boolean).join("\n");
}

/** Textes d'une route que le client lira comme des affirmations de SA marque. */
export function routeTexts(x: Route): string[] {
  const b = x.board;
  return [
    x.slogan, x.promise, ...b.lines, ...b.object.front, ...b.object.back, b.site.headline, b.site.text, b.site.button,
    ...b.posts.map((p) => p.text), ...b.signs.map((s) => `${s.title} ${s.text}`), b.idea.proof,
    // Textes ajoutés avec la planche illustrée : métier sous le nom, mots à la main, ruban du colis, voix en situation.
    ...(b.descriptor ? [b.descriptor] : []), ...(b.wordmark.note ? [b.wordmark.note] : []), ...(b.parcel ? [b.parcel.tape] : []),
    ...(b.voice.micro ?? []).map((m) => m.text), ...b.signs.flatMap((s) => (s.sample ? [s.sample] : [])), ...b.posts.flatMap((q) => (q.note ? [q.note] : [])),
    ...(b.object.note ? [b.object.note] : []),
  ];
}

const CLAIM_WORDS = /\b(garanti[es]?|certifi[ée]e?s?|labellis[ée]e?s?|prouv[ée]e?s?|cliniquement|test[ée]e?s? (?:par|en|sous)|recommand[ée]e?s? par|[ée]lue?s?\b.{0,24}\bann[ée]e|(?:n[°o] ?1|num[ée]ro (?:1|un))(?= (?:des?|du|de la|en|au|aux|sur|mondial|fran[çc]ais))|meilleure?s? (?:du|de la|des|au)\b|approuv[ée]e?s?|brevet[ée]e?s?|primée?s?|médaill[ée]e?s?)/giu;
const NUMBERS = /\d+(?:[.,]\d+)?(?:\s?(?:%|€|h\b|min\b|g\b|kg\b|ml\b|cl\b|l\b|jours?|heures?|minutes?|ans?|fois|étoiles?))?/giu;
const digits = (s: string) => s.replace(/[^0-9]/g, "");

/**
 * Chiffres et mots de garantie écrits sur une planche que le client n'a PAS donnés (règle du propriétaire : ne rien
 * inventer, ni chiffre, ni avis, ni délai, ni certification). Permis seulement s'ils figurent dans sa fiche de
 * départ, ou s'ils sont annoncés dans « ce qui reste à prouver ».
 */
export function unprovenClaims(x: Route, facts: string): string[] {
  const known = facts.toLowerCase(), knownDigits = new Set((facts.match(NUMBERS) ?? []).map(digits));
  const owned = x.board.toProve.join(" ").toLowerCase(), ownedDigits = new Set((owned.match(NUMBERS) ?? []).map(digits));
  const out = new Set<string>();
  for (const t of routeTexts(x)) {
    for (const m of t.match(NUMBERS) ?? []) { const d = digits(m); if (d && !knownDigits.has(d) && !ownedDigits.has(d)) out.add(m.trim()); }
    for (const m of t.match(CLAIM_WORDS) ?? []) { const w = m.toLowerCase(); if (!known.includes(w) && !owned.includes(w)) out.add(m.trim()); }
  }
  return [...out];
}

const INPI_LINE = "Le nom : je l'ai seulement cherché sur le web. Il reste à le vérifier à l'INPI avant de le déposer.";
const UNCHECKED_LINE = "Le nom : je n'ai pas pu le vérifier sur le web. À vérifier (web et INPI) avant de s'engager.";
const NOTHING_LINE = "Rien de plus à prouver à ce stade : tout ce qui est écrit vient de ta fiche.";
const HYPOTHESIS_LINE = "L'aveu du client est une hypothèse : je n'ai pas trouvé assez de vraies paroles de clients pour l'appuyer.";

/**
 * Lignes d'honnêteté que le Studio écrit lui-même, quoi que le modèle ait rendu : le nom n'est jamais vérifié à
 * l'INPI ; un aveu sans parole réelle de client est une hypothèse.
 */
export function withHonestProofs(board: Board, opts: { ownName?: boolean } = {}): Board {
  const lines = board.toProve.filter((l) => !/\bINPI\b/i.test(l) && l !== HYPOTHESIS_LINE && l !== UNCHECKED_LINE);
  // Nom gardé par le client (refonte) : c'est le sien, SINA n'a rien à en dire.
  const own = [...(opts.ownName ? [] : [board.nameCheck === "rien_trouve" ? INPI_LINE : UNCHECKED_LINE]), ...(board.idea.confessionSupport > 0 ? [] : [HYPOTHESIS_LINE])];
  const all = [...own, ...lines].slice(0, 8);
  return { ...board, toProve: all.length ? all : [NOTHING_LINE] };
}

// ---------------------------------------------------------------- nom dessiné : lettres exactes

const letters = (s: string) => s.normalize("NFC").replace(/[\s ]+/g, "").toLocaleLowerCase("fr-FR");
/**
 * Recette du nom dessiné rendue sûre : la mise en lignes n'est gardée que si elle reprend les lettres EXACTES du nom
 * (accents compris) ; un geste de lettrage qui vise une ligne, un mot ou une lettre absents du nom est retiré (jamais
 * deviné), pour que le dessin reste toujours le nom du client, lisible.
 */
export function safeWordmark(w: Wordmark, name: string): Wordmark {
  let out: Wordmark = w;
  if (out.lines && letters(out.lines.join("")) !== letters(name)) { const { lines: _dropped, ...rest } = out; out = rest; }
  const lines = out.lines?.length ? out.lines : [name.trim()];
  const words = lines.reduce((n, l) => n + l.trim().split(/\s+/).filter(Boolean).length, 0), count = letters(name).length;
  const { scale, tilt, accentWords, swap, ...base } = out;
  const kept = accentWords?.filter((i, k, all) => i < words && all.indexOf(i) === k);
  return {
    ...base,
    ...(scale?.length ? { scale: scale.slice(0, lines.length) } : {}),
    ...(tilt?.length ? { tilt: tilt.slice(0, lines.length) } : {}),
    // Tous les mots en couleur d'accent : plus aucun contraste, le geste ne dit plus rien.
    ...(kept?.length && kept.length < words ? { accentWords: kept } : {}),
    ...(swap && swap.letter < count ? { swap } : {}),
  };
}

// ---------------------------------------------------------------- contrôle gratuit d'une série de routes

/**
 * Contrôles gratuits (sans IA) d'une série de routes : ce qui se mesure. Le reste (talent du nom, justesse de l'idée,
 * force des phrases) appartient au directeur de création de la chaîne.
 */
export function routeIssues(list: Route[], j: Journey, count: number): string[] {
  const issues: string[] = [];
  const keys = routeKeys(count);
  const keptName = j.keep.includes("nom") ? (j.keptValues?.name || j.imported[0]?.name || "") : "";
  const keptSlogan = j.keep.includes("slogan") ? (j.keptValues?.slogan || j.imported[0]?.tagline || "") : "";
  const services = j.start.business?.status === "answered" && j.start.business.value === "services";
  const facts = clientFacts(j);
  if (list.map((x) => x.key).join("") !== keys.join("")) issues.push(`Les identités doivent avoir les clés ${keys.join(", ")}, dans l'ordre.`);
  for (const x of list) {
    const tag = `Identité ${x.key}`;
    if (keptName && x.name.trim() !== keptName.trim()) issues.push(`${tag} : le nom gardé « ${keptName} » doit être repris mot pour mot.`);
    if (keptSlogan && x.slogan.trim() !== keptSlogan.trim()) issues.push(`${tag} : le slogan gardé « ${keptSlogan} » doit être repris mot pour mot.`);
    if (!keptName) {
      for (const p of nameIssues(x.name)) issues.push(`${tag} — ${p}`);
      if (isReferenceName(x.name)) issues.push(`${tag} : « ${x.name} » est un des noms d'exemple du propriétaire ; ils ne sont jamais recopiés.`);
      if (!x.nameAnchor.trim()) issues.push(`${tag} : dis de quel détail réel du produit ou du métier part le nom « ${x.name} » (nameAnchor).`);
      if (!x.nameWhy.trim()) issues.push(`${tag} : explique la logique du nom en une ou deux phrases simples pour le client (nameWhy).`);
    }
    if (!keptSlogan && wordCount(x.slogan) > 9) issues.push(`${tag} : signature de ${wordCount(x.slogan)} mots (9 au plus).`);
    if (!FONT_HANDLES.includes(x.fonts.heading)) issues.push(`${tag} : police de titres « ${x.fonts.heading} » hors liste (clé_nN d'une graisse disponible).`);
    if (!FONT_HANDLES.includes(x.fonts.body)) issues.push(`${tag} : police de textes « ${x.fonts.body} » hors liste.`);
    else if (!bodyFontOk(x.fonts.body)) issues.push(`${tag} : « ${fontFamily(x.fonts.body)} » est une police de titres, manuscrite ou à chasse fixe : elle ne sert jamais pour les textes.`);
    for (const p of paletteIssues(x.palette, x.ground, x.gradient)) issues.push(`${tag} — ${p}`);
    for (const p of refusedColorIssues(x, j)) issues.push(`${tag} : ${p}`);
    const b = x.board;
    if (b.wordmark.lines && safeWordmark(b.wordmark, x.name).lines === undefined) issues.push(`${tag} : la mise en lignes du nom dessiné (${b.wordmark.lines.join(" / ")}) ne reprend pas les lettres exactes de « ${x.name} ».`);
    if (services && !SERVICE_OBJECTS.includes(b.object.kind)) issues.push(`${tag} : une entreprise de services ne se montre pas sur un emballage (« ${b.object.kind} ») ; prends la carte de visite, l'enseigne, le véhicule ou la tenue.`);
    if (b.lines.some((l) => normText(l) === normText(x.slogan))) issues.push(`${tag} : une des phrases de la marque répète la signature.`);
    if (new Set(b.posts.map((p) => normText(p.text))).size < b.posts.length) issues.push(`${tag} : deux publications disent la même chose.`);
    const claims = unprovenClaims(x, facts);
    if (claims.length) issues.push(`${tag} : ${claims.map((c) => `« ${c} »`).join(", ")} ${claims.length > 1 ? "ne viennent pas" : "ne vient pas"} de la fiche du client ; retire-${claims.length > 1 ? "les" : "le"}, ou annonce-${claims.length > 1 ? "les" : "le"} dans « ce qui reste à prouver ».`);
  }
  if (!keptName) issues.push(...nameSeriesIssues(list.map((x) => x.name)));
  if (!keptSlogan && new Set(list.map((x) => normText(x.slogan))).size < list.length) issues.push("Deux identités ont la même signature.");
  if (new Set(list.map((x) => normText(x.board.idea.belief))).size < list.length) issues.push("Deux identités partent de la même idée de marque : des idées différentes sont attendues.");
  if (new Set(list.map((x) => normText(x.territory))).size < list.length) issues.push("Deux identités ont le même territoire émotionnel.");
  if (!j.keep.includes("polices") && new Set(list.map((x) => fontKeyOf(x.fonts.heading))).size < list.length) issues.push("Deux identités ont la même police de titres : des familles différentes sont attendues.");
  if (!j.keep.includes("couleurs")) {
    const grounds = list.map((x) => x.ground), want = groundsFor(keys.length);
    if (new Set(grounds).size < grounds.length || grounds.some((g) => !want.among.includes(g)) || (want.exact && [...grounds].sort().join() !== [...want.exact].sort().join())) {
      issues.push(`Fonds de page : ${list.map((x) => `${x.key} ${x.ground}`).join(", ")} ; ${want.exact ? `il faut ${want.exact.map(groundName).join(", ")}` : `il faut deux fonds différents parmi ${want.among.map(groundName).join(", ")}`}.`);
    }
    for (const x of list.filter((y) => y.ground === "degrade" && y.gradient)) {
      const a = oklch(x.gradient!.from), c = oklch(x.gradient!.to);
      if (Math.max(a.c, c.c) < 0.08 || (a.l + c.l) / 2 < 0.55) issues.push(`Identité ${x.key} — fond « dégradé » ${x.gradient!.from} → ${x.gradient!.to} : trop sombre ou trop terne ; un dégradé lumineux de deux couleurs vives est attendu.`);
    }
    for (const [i, a] of list.entries()) for (const c of list.slice(i + 1)) {
      if (hueGap(oklch(a.palette.primary).h, oklch(c.palette.primary).h) < COLOR_RULES.hueGap) issues.push(`Identités ${a.key}/${c.key} : boutons (couleur de marque) de la même famille (${a.palette.primary} / ${c.palette.primary}) ; des teintes nettement différentes sont attendues.`);
    }
  }
  return [...new Set(issues)];
}
