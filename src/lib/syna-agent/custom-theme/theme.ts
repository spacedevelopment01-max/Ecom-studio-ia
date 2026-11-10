/**
 * Thème sur mesure d'un projet (SINA, étape 6) : les pages et leurs sections, prises dans la bibliothèque de la
 * famille choisie par le client, avec les retouches de chaque section. Données pures + enregistrement (mémoire du
 * projet, avec l'historique pour annuler). Règles de montage du propriétaire : docs/montage-themes-sina.md.
 */
import crypto from "node:crypto";
import { all } from "../../db";
import { remember } from "../../projects";
import type { FamilyId } from "../section-families";
import { authenticSection, FAKE_OFFER_SECTIONS, RETIRED_SECTIONS, inlineBackgrounds, isCardSection, FEATURED_ROLE, libSection, SCRIPT_DEMO_SECTIONS, SHELL_ROLES, sectionPhotos, type LibSection } from "./library";

export type CtSection = {
  /** Identifiant de CETTE section dans le thème (une même section de la bibliothèque peut servir sur deux pages). */
  uid: string;
  /** Section de la bibliothèque. */
  id: string;
  /** HTML retouché (textes du client, photos, mise en page) ; absent : celui de la bibliothèque. */
  html?: string;
  /** Règles CSS propres à cette section (toutes préfixées par [data-ct="uid"]). */
  css?: string;
  /** Textes déjà écrits pour le client (sinon : textes d'exemple de la bibliothèque, annoncés comme tels). */
  clientTexts?: boolean;
  /** Conception (custom.design) : pourquoi cette section est là, à ce moment du parcours, et ce qu'elle doit dire. */
  intent?: string;
  /** Où mène chaque bouton ou lien écrit pour la marque (texte → clé de page, « legal:cgv », « shop:Famille ») : un texte
   *  émotionnel (« Retrouver l'été ») ne correspond à aucun mot connu du Studio et laissait le bouton mort. */
  links?: Record<string, string>;
  /** Photos décrites par le rédacteur au montage (repère de la photo d'exemple, scène, format, produit) : gardées pour
   *  créer les photos plus tard, quand le montage se fait en deux fois (textes d'abord, photos ensuite). */
  photoBriefs?: { find: string; description: string; ratio: string; product: string | null }[];
};
/**
 * Réglages du site cochés par le client (revue du propriétaire du 10 novembre 2026, points 30, 37 et 38) : les options du
 * bloc d'achat « Produit vedette », les boutons de l'en-tête, le panier sur le côté ou en page. Une option cochée ne
 * s'affiche que si le produit l'a vraiment (vraies données du client) ; décochée, elle ne s'affiche jamais.
 */
export const BUY_OPTIONS = {
  quantite: "Offre par quantité", abonnement: "Abonnement", gamme: "Choix dans la gamme", ajouts: "Produits à ajouter",
  barre: "Barre d'achat fixe", livraison: "Livraison estimée", livraisonOfferte: "Livraison offerte", fidelite: "Points de fidélité",
  cadeaux: "Cadeaux", promotion: "Promotion", couleur: "Couleurs", format: "Formats",
} as const;
export type BuyOption = keyof typeof BUY_OPTIONS;
export type SiteSettings = {
  buy?: Partial<Record<BuyOption, boolean>>;
  header?: { search?: boolean; account?: boolean; cart?: boolean };
  /** « drawer » : le panier s'ouvre sur le côté ; « page » (par défaut) : la page panier. */
  cart?: "page" | "drawer";
};
export type CtPage = { key: string; label: string; sections: CtSection[]; /** Le parcours du visiteur sur la page (conception). */ journey?: string; /** Référencement : titre et description de la page pour Google. */ seo?: { title: string; description: string } };
export type CustomTheme = {
  version: 1;
  family: FamilyId;
  style: string;
  header: CtSection | null;
  footer: CtSection | null;
  /** Recherche plein écran, ouverte par la loupe de l'en-tête sur toutes les pages (jamais une section de page). */
  search: CtSection | null;
  pages: CtPage[];
  /** Idée directrice du site (conception). */
  concept?: string;
  /** Choisi par le client (jamais à sa place). */
  chosen?: boolean;
  /** Réglages du site cochés par le client (bloc d'achat, en-tête, panier). */
  settings?: SiteSettings;
  rev: number;
  at: number;
};

export const THEME_KEY = "syna.custom_theme";
const HISTORY_KEY = "syna.custom_theme.history";
const HISTORY_MAX = 15;

export const newUid = () => "s" + crypto.randomBytes(4).toString("hex");
export const sectionHtml = (s: CtSection): string => { const h = inlineBackgrounds(s.html ?? libSection(s.id)?.html ?? ""); return s.id === "scene-achetable" ? sceneGrid(h) : h; };

/**
 * Scène achetable : la grande photo laisse la place à la grille des vraies photos des produits de la liste (décision du
 * propriétaire du 10 novembre 2026, après une scène qui demandait quatre sachets à l'IA d'images : 4 cochés = 2 + 2,
 * 3 = 2 + 1, 2 = l'un au-dessus de l'autre, 1 = seul, en carré ; le script de la section suit les cases cochées).
 * Aucune photo à créer, toujours fidèle ; refaite à chaque lecture depuis la liste, donc à jour si la liste change.
 */
export function sceneGrid(html: string): string {
  const items = [...html.matchAll(/<label class="p8-it"[^>]*>([\s\S]*?)<\/label>/g)].map((m) => {
    const img = m[1].match(/<img\b[^>]*\bsrc="([^"]+)"/), name = m[1].match(/<b>([\s\S]*?)<\/b>/);
    return { src: img?.[1] ?? null, name: (name?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/"/g, "&quot;") };
  });
  const tiles = items.map((x, i) => (x.src ? `<img data-gi="${i}" src="${x.src}" alt="${x.name}">` : "")).join("");
  if (!tiles) return html;
  const grid = `<div class="p8-ph p8-grid" data-p8g data-n="${items.filter((x) => x.src).length}">${tiles}</div>`;
  if (/<div class="p8-ph p8-grid" data-p8g[^>]*>[\s\S]*?<\/div>/.test(html)) return html.replace(/<div class="p8-ph p8-grid" data-p8g[^>]*>[\s\S]*?<\/div>/, grid);
  return html.replace(/<div class="p8-ph">[\s\S]*?<\/div>/, grid);
}

function readArtifact<T>(projectId: string, key: string): T | null {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' LIMIT 1", projectId, key)[0];
  try { return row ? JSON.parse(row.value) as T : null; } catch { return null; }
}
export function loadCustomTheme(projectId: string): CustomTheme | null {
  const t = readArtifact<CustomTheme>(projectId, THEME_KEY);
  return t && t.version === 1 && Array.isArray(t.pages) ? t : null;
}
/**
 * Enregistre le thème ; la version d'avant part dans l'historique (annuler une modification). history:false pour les
 * étapes intermédiaires d'un montage : un seul point d'annulation par montage (pushCustomThemeHistory au début),
 * sinon « Annuler » ne défaisait que la dernière photo (audit du 10 novembre 2026).
 */
/**
 * Coordonnées changées après le montage (essai Éclat de thé du 10 novembre 2026 : l'ancienne adresse e-mail restait dans
 * le pied de page, l'aide et les mentions) : chaque ancienne valeur écrite dans le thème est remplacée par la nouvelle.
 */
export function replaceInCustomTheme(projectId: string, pairs: [string, string][]): number {
  const t = loadCustomTheme(projectId);
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const todo = pairs.filter(([a, b]) => a.trim().length >= 5 && a !== b);
  if (!t || !todo.length) return 0;
  let n = 0;
  for (const x of allSections(t)) {
    if (!x.s.html) continue;
    let h = x.s.html;
    for (const [a, b] of todo) for (const v of new Set([a, esc(a)])) if (h.includes(v)) { n += h.split(v).length - 1; h = h.split(v).join(esc(b)); }
    x.s.html = h;
  }
  if (n) saveCustomTheme(projectId, t, { history: false });
  return n;
}

/** Les deux concepts proposés au client (thème sur mesure) et son choix. */
export const CONCEPTS_KEY = "syna.custom_concepts";
export type ConceptSet = { A: { design: unknown; theme: CustomTheme }; B: { design: unknown; theme: CustomTheme }; at: number; chosen?: "A" | "B" };
export function loadConcepts(projectId: string): (ConceptSet & { A: { design: import("./design").Design }; B: { design: import("./design").Design } }) | null {
  const c = readArtifact<ConceptSet>(projectId, CONCEPTS_KEY);
  return c && c.A?.theme && c.B?.theme ? c as never : null;
}
export function saveConcepts<T extends ConceptSet>(projectId: string, c: T): T {
  remember(projectId, { kind: "artifact", key: CONCEPTS_KEY, value: JSON.stringify(c), source: "local", origin: "system" });
  return c;
}

export function saveCustomTheme(projectId: string, theme: CustomTheme, opts: { history?: boolean } = {}): CustomTheme {
  const before = loadCustomTheme(projectId);
  if (before && opts.history !== false) pushHistory(projectId, before);
  const next = { ...theme, rev: (before?.rev ?? 0) + 1, at: Date.now() };
  remember(projectId, { kind: "artifact", key: THEME_KEY, value: JSON.stringify(next), source: "local", origin: "system" });
  return next;
}
function pushHistory(projectId: string, version: CustomTheme) {
  const hist = (readArtifact<CustomTheme[]>(projectId, HISTORY_KEY) ?? []).slice(-(HISTORY_MAX - 1));
  remember(projectId, { kind: "artifact", key: HISTORY_KEY, value: JSON.stringify([...hist, version]), source: "local", origin: "system" });
}
/** Point d'annulation : la version actuelle part dans l'historique (début d'un montage). */
export function pushCustomThemeHistory(projectId: string): void {
  const cur = loadCustomTheme(projectId);
  if (cur) pushHistory(projectId, cur);
}
/** Revient à la version d'avant (la dernière modification est annulée). */
export function undoCustomTheme(projectId: string): CustomTheme | null {
  const hist = readArtifact<CustomTheme[]>(projectId, HISTORY_KEY) ?? [];
  const prev = hist.pop();
  if (!prev) return null;
  remember(projectId, { kind: "artifact", key: HISTORY_KEY, value: JSON.stringify(hist), source: "local", origin: "system" });
  const cur = loadCustomTheme(projectId);
  const back = { ...prev, rev: (cur?.rev ?? prev.rev) + 1, at: Date.now() };
  remember(projectId, { kind: "artifact", key: THEME_KEY, value: JSON.stringify(back), source: "local", origin: "system" });
  return back;
}

/** Toutes les sections du thème, avec leur place (page ou structure). */
export function allSections(t: CustomTheme): { place: string; page?: CtPage; index: number; s: CtSection }[] {
  const out: { place: string; page?: CtPage; index: number; s: CtSection }[] = [];
  if (t.header) out.push({ place: "en-tête", index: 0, s: t.header });
  for (const page of t.pages) page.sections.forEach((s, index) => out.push({ place: page.key, page, index, s }));
  if (t.footer) out.push({ place: "pied de page", index: 0, s: t.footer });
  if (t.search) out.push({ place: "recherche", index: 0, s: t.search });
  return out;
}
export const findSection = (t: CustomTheme, uid: string) => allSections(t).find((x) => x.s.uid === uid) ?? null;

export type ThemeProblem = { level: "bloquant" | "à revoir"; text: string };

/**
 * Pages d'un thème sur mesure (décision du propriétaire du 9 novembre 2026 : « pour les thèmes sur mesure il faut créer
 * toutes les pages » ; aucun thème de départ, SINA monte le site de A à Z avec les meilleures sections pour le produit
 * ou le service). Chaque entrée : clés de page acceptées (la première est celle à employer) et ce que la page contient.
 */
export type SiteKind = {
  business: "products" | "services"; products: number; platform?: string;
  /** Genre de produit (sections « seulement pour ») : mode, thé, ou autre ; inconnu = aucune section réservée. */
  genre?: "mode" | "the" | null;
  /** Photos des produits (Fichiers) : seules à pouvoir revenir, sur la carte et la fiche de leur produit. */
  productPhotos?: string[];
  /** Images envoyées par le client (hors photos des fiches produits) : seules à pouvoir remplir une section de photos
   *  impossibles à inventer (photos de ses clients, ses biens). */
  clientImages?: number;
};
/** Pages que la plateforme tient elle-même (Shopify : paiement et confirmation de commande), jamais dans le thème. */
export const platformOwnedPages = (k: SiteKind) => (k.platform ?? "shopify") === "shopify" ? [{ keys: ["commande", "checkout"], label: "Commande" }, { keys: ["merci", "confirmation"], label: "Commande confirmée" }] : [];
export function requiredPages(k: SiteKind): { keys: string[]; label: string }[] {
  const common = [
    { keys: ["home"], label: "Accueil" },
    { keys: ["about", "journal"], label: "À propos (l'histoire, la personne derrière)" },
    { keys: ["contact"], label: "Contact" },
    { keys: ["aide", "faq"], label: "Aide (questions, livraison, retours, suivi)" },
    { keys: ["legal"], label: "Informations légales (mentions, conditions, confidentialité, cookies)" },
    { keys: ["404"], label: "Page introuvable (404)" },
  ];
  if (k.business === "services") return [...common.slice(0, 1), { keys: ["prestations"], label: "Prestations (et leurs tarifs)" }, { keys: ["reservation", "devis"], label: "Prise de rendez-vous ou demande de devis" }, ...common.slice(1)];
  return [
    common[0],
    ...(k.products > 1 ? [{ keys: ["shop"], label: "Boutique (tous les produits)" }] : []),
    { keys: ["product"], label: "Fiche produit" },
    { keys: ["cart"], label: "Panier" },
    // Shopify : le bouton du panier mène au paiement de Shopify, qui tient aussi la confirmation (remarque du propriétaire).
    ...(platformOwnedPages(k).length ? [] : [{ keys: ["commande"], label: "Commande" }, { keys: ["merci"], label: "Commande confirmée" }]),
    { keys: ["compte"], label: "Mon compte" },
    ...common.slice(1),
  ];
}
export const missingPages = (t: CustomTheme, k: SiteKind) => requiredPages(k).filter((r) => !t.pages.some((p) => r.keys.includes(p.key) || r.keys.some((x) => p.key.startsWith(`${x}-`))));

/**
 * Contrôle des règles de montage du propriétaire (gratuit, sans IA). « bloquant » : le thème n'est pas enregistré.
 * Avec le genre de site (produits ou services), une page obligatoire absente est bloquante.
 */
/** Nombre minimal de sections (hors en-tête et pied de page) : accueil 8, fiche produit 7 (docs/montage-themes-sina.md). */
export const MIN_SECTIONS = { home: 8, product: 7 } as const;

export function checkCustomTheme(t: CustomTheme, site?: SiteKind): ThemeProblem[] {
  const out: ThemeProblem[] = [];
  if (site) for (const m of missingPages(t, site)) out.push({ level: "bloquant", text: `page « ${m.label} » absente (clé ${m.keys[0]}) : un thème sur mesure a toutes ses pages` });
  if (site) for (const o of platformOwnedPages(site)) if (t.pages.some((p) => o.keys.includes(p.key))) out.push({ level: "bloquant", text: `page « ${o.label} » en trop : sur Shopify, le paiement et la confirmation de commande sont des pages de Shopify (le bouton du panier y mène), jamais des pages du thème` });
  const bad = (text: string) => out.push({ level: "bloquant", text });
  const warn = (text: string) => out.push({ level: "à revoir", text });
  // Pages pleines (méthode de montage, rappel du propriétaire du 9 novembre 2026 : « 8 sections sur la page d'accueil et
  // minimum 7 sur la page produit » ; Heure Dorée était passé avec 4 et 3).
  if (site) for (const pg of t.pages) {
    const min = pg.key === "home" ? MIN_SECTIONS.home : site.business === "products" && /^product/.test(pg.key) ? MIN_SECTIONS.product : 0;
    if (pg.sections.length < min) bad(`« ${pg.label} » n'a que ${pg.sections.length} section(s) : au moins ${min} (${pg.key === "home" ? "accueil" : "fiche produit"})`);
  }
  const lib = (s: CtSection): LibSection | null => libSection(s.id);
  for (const x of allSections(t)) {
    const l = lib(x.s);
    if (!l) { bad(`section inconnue « ${x.s.id} » (${x.place})`); continue; }
    if (l.demoFrame) bad(`« ${l.title} » est une démonstration du catalogue (fausse fenêtre) : elle ne se pose pas dans un thème`);
    if (SCRIPT_DEMO_SECTIONS.has(l.id)) bad(`« ${l.title} » affiche des contenus fabriqués par le script de démonstration (produits ou questions de la démo), impossibles à réécrire pour la marque : choisis une autre section`);
    if (l.family !== t.family) bad(`« ${l.title} » est de la famille ${l.family} : jamais de mélange de familles dans un thème (famille du thème : ${t.family})`);
    const fake = FAKE_OFFER_SECTIONS[l.id];
    if (fake) bad(fake === "compte à rebours"
      ? `« ${l.title} » affiche un compte à rebours d'exemple (calculé depuis l'heure du visiteur) : jamais de fausse urgence, choisis une autre section`
      : `« ${l.title} » est une offre d'exemple en section à part : les vraies offres du client sont des fonctions du bloc d'achat « Produit vedette »`);
    // Shopify : le panier mène au paiement de Shopify ; aucune section de commande ni de confirmation dans le thème.
    if (site && platformOwnedPages(site).length && l.role === "commande") bad(`« ${l.title} » (${x.place}) : sur Shopify, la commande et sa confirmation sont des pages de Shopify, jamais des sections du thème`);
    // Sections « seulement pour » un genre de produit : jamais ailleurs (CLAUDE.md).
    const only = (l.tags ?? []).find((g) => g === "pour-mode" || g === "pour-the");
    if (site && only && (site.business === "services" || site.genre !== (only === "pour-mode" ? "mode" : "the"))) bad(`« ${l.title} » est réservée ${only === "pour-mode" ? "aux vêtements et accessoires de mode" : "aux thés et infusions"} : jamais sur un autre site`);
    // Photos impossibles à inventer honnêtement (photos de ses clients, ses biens) : jamais posée sans ses vraies photos
    // (décision du 10 novembre 2026 : aucune image ne reste vide ni avec la photo de démonstration).
    const authentic = site ? authenticSection(l.id, site.business) : null;
    if (site && authentic && (site.clientImages ?? 0) < sectionPhotos(l.html).length) bad(`« ${l.title} » demande ${authentic} (photos impossibles à inventer) : jamais posée sans ses vraies photos`);
  }
  const shell = (s: CtSection | null, role: string, label: string, required: boolean) => {
    if (!s) { if (required) bad(`il manque ${label}`); return; }
    const l = lib(s);
    if (l && l.role !== role) bad(`« ${l.title} » n'est pas ${label}`);
  };
  shell(t.header, SHELL_ROLES.header, "un en-tête", true);
  shell(t.footer, SHELL_ROLES.footer, "un pied de page", true);
  shell(t.search, SHELL_ROLES.search, "une recherche plein écran", false);
  if (!t.pages.length) bad("aucune page");
  const keys = new Set<string>();
  let featuredHome = 0;
  for (const page of t.pages) {
    if (keys.has(page.key)) bad(`page « ${page.label} » en double`);
    keys.add(page.key);
    if (!page.sections.length) bad(`la page « ${page.label} » est vide`);
    const libs = page.sections.map(lib);
    libs.forEach((l, i) => {
      if (!l) return;
      if (([SHELL_ROLES.header, SHELL_ROLES.footer] as string[]).includes(l.role)) bad(`« ${l.title} » (${l.role}) ne se pose pas dans une page : il sert à tout le site`);
      const prev = libs[i - 1];
      if (prev && prev.id === l.id) bad(`« ${l.title} » deux fois à la suite sur « ${page.label} »`);
      else if (prev && prev.role === l.role && l.role !== "mise en avant") warn(`deux sections « ${l.role} » à la suite sur « ${page.label} » (${prev.title}, ${l.title}) : jamais deux parties de même disposition à la suite`);
    });
    const ids = libs.filter(Boolean).map((l) => l!.id);
    for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) bad(`« ${libSection(id)?.title} » deux fois sur « ${page.label} »`);
    const cards = libs.filter((l) => l && isCardSection(l));
    if (cards.length > 1) bad(`${cards.length} sections de cartes sur « ${page.label} » (${cards.map((l) => l!.title).join(", ")}) : une seule par page`);
    const featured = libs.map((l, i) => (l?.role === FEATURED_ROLE ? i : -1)).filter((i) => i >= 0);
    if (featured.length > 1) bad(`deux sections « Produit vedette » sur « ${page.label} »`);
    if (featured.length) {
      if (page.key === "home") featuredHome++;
      else if (/^product/.test(page.key)) { if (featured[0] !== 0) bad(`« Produit vedette » doit ouvrir la fiche produit « ${page.label} » (tout en haut)`); }
      else bad(`« Produit vedette » seulement en haut de la fiche produit, ou une fois sur l'accueil (pas sur « ${page.label} »)`);
    }
    const first = libs[0];
    if (page.key === "home" && first && first.role !== "ouverture") warn(`l'accueil commence par « ${first.title} » : l'ouverture de l'accueil est une grande photo pleine avec le titre dessus`);
  }
  if (featuredHome > 1) bad("plus d'une section « Produit vedette » sur l'accueil");
  // Essai Heure Dorée (9 novembre 2026) : pour atteindre 8 et 7 sections, SINA avait ajouté des sections « pour en
  // ajouter » : une offre par quantité (le client n'en a pas) et la même histoire du produit sur deux pages.
  const where = new Map<string, string>();
  for (const page of t.pages) for (const sec of page.sections) {
    const l = lib(sec);
    if (!l) continue;
    // Offres (lots, quantités, coffret) : fonctions du bloc d'achat « Produit vedette », jamais une section à part.
    if (l.role === "lot" && l.title !== "Complète ta commande") bad(`« ${l.title} » sur « ${page.label} » : les offres (lots, quantités, coffret) sont des fonctions du bloc d'achat « Produit vedette », jamais une section à part`);
    // Sections retirées de la banque par le propriétaire (revue du 10 novembre 2026) : à remplacer avant le montage.
    else if (RETIRED_SECTIONS[l.id]) bad(`« ${l.title} » sur « ${page.label} » : retirée de la banque, ${RETIRED_SECTIONS[l.id]}`);
    if (where.has(l.id) && where.get(l.id) !== page.label) bad(`« ${l.title} » sur « ${where.get(l.id)} » et « ${page.label} » : une même section sur deux pages répète ses textes et ses photos`);
    else where.set(l.id, page.label);
  }
  // Photos (exigence 6.13) : jamais deux fois la même, ni dans une page (deux sections) ni d'une page à l'autre ; seule
  // la photo d'un produit revient, sur sa carte et sa fiche. Une vraie photo (Fichiers) en double est bloquante ; une
  // photo d'exemple en double est à revoir (chaque emplacement reçoit sa propre photo au montage).
  const products = new Set((site?.productPhotos ?? []).map((id) => `fichier:${id}`));
  const seen = new Map<string, { page: string; uid: string }>();
  for (const page of t.pages) for (const sec of page.sections) {
    for (const ph of sectionPhotos(sectionHtml(sec))) {
      const before = seen.get(ph);
      if (!before) { seen.set(ph, { page: page.label, uid: sec.uid }); continue; }
      if (products.has(ph)) continue;
      const where = before.page === page.label ? `deux fois sur « ${page.label} »` : `sur « ${before.page} » et « ${page.label} »`;
      if (ph.startsWith("fichier:")) bad(`la même photo ${where} : jamais une photo en double (sauf la photo d'un produit sur sa carte et sa fiche)`);
      else warn(`photo d'exemple ${ph} ${where} : chaque emplacement doit recevoir sa propre photo`);
    }
  }
  return out;
}

/** Ajoute, retire, déplace ou remplace une section (opérations de structure, sans IA). */
export type StructureOp =
  | { op: "add"; page: string; section: string; at?: number }
  | { op: "remove"; uid: string }
  | { op: "move"; uid: string; page?: string; at: number }
  | { op: "replace"; uid: string; section: string }
  | { op: "shell"; slot: "header" | "footer" | "search"; section: string | null }
  | { op: "page"; key: string; label: string; at?: number }
  | { op: "drop_page"; key: string }
  | { op: "rename_page"; key: string; label: string }
  | { op: "settings"; buy?: Partial<Record<BuyOption, boolean>>; header?: { search?: boolean; account?: boolean; cart?: boolean }; cart?: "page" | "drawer" };

export function applyStructure(t: CustomTheme, ops: StructureOp[]): CustomTheme {
  const next: CustomTheme = JSON.parse(JSON.stringify(t));
  const pageOf = (key: string) => {
    const p = next.pages.find((x) => x.key === key);
    if (!p) throw new Error(`page « ${key} » introuvable (pages : ${next.pages.map((x) => x.key).join(", ")})`);
    return p;
  };
  const known = (id: string) => { if (!libSection(id)) throw new Error(`section « ${id} » absente de la bibliothèque`); return id; };
  const locate = (uid: string) => {
    for (const p of next.pages) { const i = p.sections.findIndex((s) => s.uid === uid); if (i >= 0) return { p, i }; }
    throw new Error(`section ${uid} introuvable dans les pages`);
  };
  for (const o of ops) {
    if (o.op === "add") { const p = pageOf(o.page); p.sections.splice(o.at ?? p.sections.length, 0, { uid: newUid(), id: known(o.section) }); }
    else if (o.op === "remove") { const { p, i } = locate(o.uid); p.sections.splice(i, 1); }
    else if (o.op === "move") { const { p, i } = locate(o.uid); const [s] = p.sections.splice(i, 1); const to = o.page ? pageOf(o.page) : p; to.sections.splice(Math.min(o.at, to.sections.length), 0, s); }
    else if (o.op === "replace") {
      const shell = (["header", "footer", "search"] as const).find((k) => next[k]?.uid === o.uid);
      if (shell) next[shell] = { uid: newUid(), id: known(o.section) };
      else { const { p, i } = locate(o.uid); p.sections[i] = { uid: newUid(), id: known(o.section) }; }
    }
    else if (o.op === "shell") next[o.slot] = o.section ? { uid: newUid(), id: known(o.section) } : null;
    else if (o.op === "page") { if (next.pages.some((p) => p.key === o.key)) throw new Error(`la page « ${o.key} » existe déjà`); next.pages.splice(o.at ?? next.pages.length, 0, { key: o.key, label: o.label, sections: [] }); }
    else if (o.op === "drop_page") { pageOf(o.key); next.pages = next.pages.filter((p) => p.key !== o.key); }
    else if (o.op === "rename_page") pageOf(o.key).label = o.label;
    else if (o.op === "settings") {
      const cur = next.settings ?? {};
      next.settings = { ...cur, ...(o.buy ? { buy: { ...cur.buy, ...o.buy } } : {}), ...(o.header ? { header: { ...cur.header, ...o.header } } : {}), ...(o.cart ? { cart: o.cart } : {}) };
    }
  }
  return next;
}

/** Remplace UN passage exact du HTML d'une section (texte désigné, photo) : il doit y être une seule fois. */
export function replaceOnce(html: string, find: string, replace: string): string {
  const i = html.indexOf(find);
  if (i < 0) throw new Error(`passage introuvable dans la section : « ${find.slice(0, 80)} »`);
  if (html.indexOf(find, i + find.length) >= 0) throw new Error(`passage présent plusieurs fois dans la section : « ${find.slice(0, 80)} » (préciser l'élément)`);
  return html.slice(0, i) + replace + html.slice(i + find.length);
}

/** Règles CSS d'une section : chaque sélecteur doit commencer par [data-ct="uid"] (rien ne déborde sur le reste). */
export function scopedCss(uid: string, css: string): string {
  const scope = `[data-ct="${uid}"]`;
  const clean = css.replace(/:scope\b/g, scope).replace(/<\/?style[^>]*>/gi, "");
  if (/@import|url\(\s*["']?(?:https?:|\/\/|javascript:)/i.test(clean)) throw new Error("feuille refusée : aucune ressource extérieure");
  if (/</.test(clean)) throw new Error("feuille refusée : balise dans le CSS");
  const rules = clean.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  for (const r of rules) {
    const sel = r.slice(0, r.indexOf("{")).trim();
    if (sel.startsWith("@")) continue;
    for (const part of sel.split(",")) {
      if (!part.trim().startsWith(scope)) throw new Error(`règle hors de la section : « ${part.trim().slice(0, 80)} » (chaque sélecteur commence par ${scope} ou :scope)`);
      // Jamais vers les sections voisines (« :scope ~ section », « :scope + section ») ni par :has (audit du 10 novembre 2026).
      const rest = part.trim().slice(scope.length);
      if (/^\s*[~+]/.test(rest) || /:has\(/i.test(rest)) throw new Error(`règle hors de la section : « ${part.trim().slice(0, 80)} » (une section ne touche jamais ses voisines)`);
    }
    if (/position\s*:\s*fixed/i.test(r)) throw new Error("feuille refusée : position:fixed sortirait l'élément de sa section");
  }
  return clean.trim();
}
