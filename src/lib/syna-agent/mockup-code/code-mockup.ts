/**
 * SINA (#492), étape 6 : MAQUETTES EN CODE (décision du propriétaire du 8 novembre 2026, après l'essai réel de
 * l'accueil de Brindi : construit directement en HTML et CSS par Claude dans le style choisi, les dix sections et tous
 * les textes exacts, les règles du téléphone respectées, pour 0,76 €). La maquette n'est plus une image à recopier : c'est
 * une vraie page, que le client voit en captures (ordinateur et téléphone) et que l'étape 7 transforme en thème.
 *
 * Ce fichier ne touche ni à la base ni à l'IA : consignes, lecture du fichier rendu par Claude, photos demandées,
 * retouches par remplacements exacts, captures et contrôle automatique (gratuit, sans IA : textes exacts, rien d'ajouté,
 * en-tête du téléphone, jamais trois éléments côte à côte sur téléphone, aucun débordement, images chargées).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PageCopy } from "./copy";
import { pageLayout, VIEWPORT_WIDTH, type MockupPage, type Viewport } from "./pages";

/** Photo nouvelle demandée par la maquette (créée ensuite par l'IA d'images, une fois, puis partagée). */
export type CodePhoto = { id: string; description: string; ratio: string; background?: string | null; product?: boolean; packaging?: boolean };
/** Photo déjà disponible (créée pour une autre maquette ou une autre page, ou photo réelle du client). */
export type LibraryPhoto = { id: string; description: string; ratio: string; real?: boolean };

/** Identifiant d'une photo nouvelle dans le fichier de Claude (« nouvelle-1 »…), remplacé ensuite par celui du fichier. */
export const NEW_PHOTO = /^nouvelle-\d{1,2}$/;

const FONT_ID = /^(.+?)_([ni])(\d)$/;
/** Police de la marque (« cormorant_garamond_n5 ») → famille et graisse. */
export function fontOf(id: string | null | undefined, files: Record<string, { family: string; fallback: string }>): { key: string; family: string; weight: number; italic: boolean; fallback: string } | null {
  if (!id) return null;
  const m = id.match(FONT_ID);
  const key = m ? m[1] : id;
  const f = files[key];
  if (!f) return null;
  return { key, family: f.family, weight: m ? Number(m[3]) * 100 : 400, italic: m?.[2] === "i", fallback: f.fallback };
}

/** Feuille des polices locales (aucune police chargée depuis Internet : rendu identique au thème, sans réseau). */
export function fontsCss(keys: string[], files: Record<string, { family: string; files: Record<number, string>; italic?: Record<number, string> }>): { css: string; files: string[] } {
  const css: string[] = [], used = new Set<string>();
  for (const k of [...new Set(keys)]) {
    const f = files[k];
    if (!f) continue;
    for (const [w, file] of Object.entries(f.files)) { css.push(`@font-face{font-family:"${f.family}";font-weight:${w};font-style:normal;font-display:block;src:url("fonts/${file}")}`); used.add(file); }
    for (const [w, file] of Object.entries(f.italic ?? {})) { css.push(`@font-face{font-family:"${f.family}";font-weight:${w};font-style:italic;font-display:block;src:url("fonts/${file}")}`); used.add(file); }
  }
  return { css: css.join("\n"), files: [...used] };
}

export const CODE_MOCKUP_SYSTEM = `Tu es directeur artistique et intégrateur web senior. Tu conçois des pages de site élégantes, au niveau d'une maquette de grande agence, directement en HTML et CSS propres, fidèles à une charte de marque. Tu ne rajoutes JAMAIS de texte qui ne t'est pas donné : ni mot, ni chiffre, ni avis, ni promesse, ni numéro décoratif. Réponses : uniquement le fichier demandé.`;

export type CodeMockupInput = {
  brand: { name: string; palette: Record<string, string>; personality?: string[] };
  fonts: { heading: { family: string; weight: number }; body: { family: string; weights: number[] } };
  logo: { file: string; width?: number; height?: number };
  direction: { name: string; style: string; ground?: string | null };
  page: MockupPage;
  copy: PageCopy;
  /** Lignes des textes (copyLines) : ordinateur, puis précisions du téléphone. */
  lines: string[];
  phoneLines: string[];
  photos: LibraryPhoto[];
  /** Photos déjà montrées par les autres pages de la maquette : jamais reprises (consigne du propriétaire). */
  usedElsewhere?: { id: string; page: string }[];
  /** Photos de produit déjà sur une carte produit ailleurs : reprises seulement sur la carte de CE produit. */
  productPhotos?: { id: string; product: string }[];
  maxNew: number;
  /** Feuille commune déjà écrite pour l'accueil de cette maquette (pages suivantes : réutilisée, jamais réécrite). */
  baseCss?: string | null;
  /** En-tête et pied de page de l'accueil, à reprendre à l'identique. */
  shell?: string | null;
};

/** Consigne de construction d'une page en code (une seule par page : ordinateur ET téléphone dans le même fichier). */
export function codeMockupPrompt(i: CodeMockupInput): string {
  const p = i.brand.palette;
  const layout = pageLayout(i.page);
  const first = !i.baseCss;
  const taken = new Set((i.usedElsewhere ?? []).map((x) => x.id));
  const forProduct = new Map((i.productPhotos ?? []).map((x) => [x.id, x.product]));
  const free = i.photos.filter((x) => !taken.has(x.id) && !forProduct.has(x.id));
  const photoList = free.length
    ? free.map((x) => `- ${x.id} (${x.ratio})${x.real ? " — PHOTO RÉELLE du client" : ""} : ${x.description}`).join("\n")
    : "(aucune pour l'instant)";
  const productList = [...forProduct].map(([id, product]) => `- ${id} : photo du produit « ${product} », seulement sur la carte ou la fiche de ce produit (data-product="${product}")`).join("\n");
  return [
    `Construis la page « ${i.page.fr} » du site de la marque « ${i.brand.name} », directement en HTML et CSS, comme une maquette de grande agence prête à être montrée au client.`,
    "",
    `STYLE CHOISI — « ${i.direction.name} » : ${i.direction.style}${i.direction.ground ? ` (fond dominant : ${i.direction.ground})` : ""}`,
    `Couleurs de la marque, et aucune autre : ancrage sombre ${p.dark}, couleur de marque ${p.primary}, neutre clair ${p.secondary}, accent ${p.accent}, blanc ${p.light}. Cinq couleurs au plus, en variables CSS sur :root.`,
    `Polices, déjà chargées par fonts.css (n'en charge aucune autre, aucun lien vers Internet) : titres « ${i.fonts.heading.family} » (${i.fonts.heading.weight}), textes « ${i.fonts.body.family} » (${i.fonts.body.weights.join(", ")}).`,
    `Logo : ${i.logo.file}${i.logo.width ? ` (${i.logo.width}×${i.logo.height})` : ""}, balise <img data-logo src="${i.logo.file}" alt="${i.brand.name}">, dans l'en-tête et le pied de page ; sur fond sombre, rends-le lisible par un filtre CSS (jamais redessiné, jamais remplacé par du texte).`,
    i.brand.personality?.length ? `Personnalité : ${i.brand.personality.join(", ")}. Ligne de marque : de l'air, ombres douces, icônes d'un seul style au trait, le symbole de la marque comme signature.` : "",
    layout ? `\nSTRUCTURE IMPOSÉE DE CETTE PAGE : ${layout}.` : "",
    "",
    "TEXTES (à reprendre MOT POUR MOT, dans cet ordre de parties ; n'ajoute AUCUN autre texte, aucun chiffre, aucun avis, aucune promesse, aucun numéro décoratif ; le nom d'une partie n'est jamais écrit sur la page) :",
    ...i.lines,
    "",
    "PRÉCISIONS POUR LE TÉLÉPHONE (390 px) :",
    ...i.phoneLines.filter((l) => /en-t[êe]te|deux par rang|l'un sous l'autre/i.test(l)).map((l) => `- ${l}`),
    "- En-tête du téléphone : le logo et le bouton du menu (icône, avec aria-label) SEULEMENT ; AUCUN bouton d'action ni lien visible dans l'en-tête. Les liens du menu s'ouvrent dans un panneau au toucher de l'icône.",
    "- Produits : deux par rangée au plus. Tout le reste : l'un sous l'autre. Jamais trois éléments côte à côte.",
    "- Seule exception : les vignettes de la galerie d'une fiche produit, en une rangée de petites images sous la grande photo (conteneur marqué data-gallery), jamais empilées en grand.",
    "",
    "PHOTOS :",
    `Photos disponibles (à utiliser en priorité, par leur identifiant) :\n${photoList}`,
    productList ? `Photos de produit (déjà sur les cartes de produit d'une autre page) :\n${productList}` : "",
    "JAMAIS UNE PHOTO EN DOUBLE (consigne du propriétaire) : chaque photo apparaît UNE seule fois dans la page et n'est jamais une photo déjà montrée par une autre page du site. Seule exception : la photo d'un produit sur la carte ou la fiche de CE produit (attribut data-product=\"Nom du produit\" sur l'image), jamais deux fois dans la même page. CHAQUE photo d'une carte de produit porte data-product avec le nom exact du produit. Un bandeau ou un carrousel décoratif n'est pas une carte de produit : il prend d'autres photos. Jamais de bandeau de photos qui défile en boucle (il répète les photos) : le bandeau défilant ne porte que du texte (le slogan).",
    i.maxNew > 0
      ? `Si une photo manque vraiment, demande-la : identifiant nouvelle-1, nouvelle-2… (${i.maxNew} au plus), déclarée à la fin du <body> dans <script type="application/json" id="photos-nouvelles">[{"id":"nouvelle-1","ratio":"4:3","background":null,"product":false,"packaging":false,"description":"…"}]</script>. La description d'une photo nouvelle décrit UNE photo en phrases complètes, dans cet ordre : 1) type de photo, point de vue, cadrage ; 2) surface et fond ; 3) chaque objet dans sa phrase : place exacte, forme, matière, couleur, état, et ce qu'il ne contient pas ; 4) « La scène contient exactement N objets : … » ; 5) ce qui est coupé par le cadre ou laissé dégagé ; 6) lumière, ombres, mise au point, ambiance. Jamais de personne, de main, de texte ni de logo dans une photo ; product: true si le vrai produit du client y figure, packaging: true si c'est son emballage. background : la couleur exacte du fond de la section quand la photo doit s'y fondre (sinon null).`
      : "Aucune photo nouvelle : utilise seulement les photos disponibles.",
    "Chaque photo : <img data-photo=\"IDENTIFIANT\" src=\"photos/IDENTIFIANT.jpg\" alt=\"description courte\">, en object-fit: cover, jamais déformée. Aucune autre image matricielle ; décor (feuilles, vagues, formes, icônes) uniquement en SVG en ligne, dans les couleurs de la marque.",
    "",
    "RÈGLES DE MISE EN PAGE :",
    ...(i.page.key === "home" ? ["- OUVERTURE (consigne du propriétaire) : une GRANDE PHOTO PLEINE, bord à bord sur toute la largeur et presque toute la hauteur de l'écran, le titre, la phrase et le bouton posés DESSUS (voile dégradé pour la lisibilité) ; jamais une photo posée en carte à côté du titre, jamais une ouverture sans photo. Sur téléphone aussi : la photo remplit l'écran derrière le texte."] : []),
    "- JAMAIS deux parties de même disposition à la suite (deux grilles de cartes, deux bandes de questions, deux écrans partagés identiques) : alterne les mises en page d'une partie à l'autre (photo pleine largeur, écran partagé photo et texte, grille, carrousel, bandeau, citation en grand, cartes qui se chevauchent).",
    "- AUCUN VIDE : chaque partie est remplie et vivante ; marge verticale entre parties de 64 à 96 px sur ordinateur, 48 à 64 px sur téléphone ; jamais une colonne vide à côté d'un titre (sinon une photo ou une illustration y prend place, ou le bloc est centré) ; jamais une bande colorée sans contenu.",
    "- UN THÈME VIVANT : photos en grand et bord à bord dans plusieurs parties, éléments qui débordent d'une bande sur l'autre, bandeau défilant avec le slogan (texte seulement), formes et motifs de la marque en décor, effets au survol des cartes et des boutons, apparition douce (sans jamais cacher le contenu sans JavaScript).",
    "- Une seule page responsive, parfaite à 1440 px ET à 390 px de large, sans aucun débordement horizontal.",
    "- Chaque partie dans sa balise : <header data-part=\"en-tête\">, puis une <section data-part=\"NOM DE LA PARTIE\"> par partie de la liste des textes (nom repris de la liste), puis <footer data-part=\"pied de page\">.",
    "- Textes d'accessibilité seulement en attributs aria-label ou alt, jamais en texte caché dans la page.",
    "- Questions fréquentes en <details>. Formulaires sans envoi (action=\"#\") ; un champ porte son libellé seulement s'il figure dans les textes (sinon aria-label).",
    "- ANIMATIONS (consigne du propriétaire du 8 novembre : « faire vivre le thème »), élégantes, jamais agressives :",
    "  · apparition au défilement : chaque partie, puis ses cartes l'une après l'autre (décalage d'environ 80 ms), glissent doucement en fondu (20 px) quand elles entrent à l'écran (IntersectionObserver) ;",
    "  · ouverture : la photo avance très lentement (zoom lent), le titre apparaît mot par mot, le bouton arrive en dernier ;",
    "  · bouton principal vivant : halo doux qui pulse toutes les 3 secondes et reflet qui traverse le bouton au survol (jamais un clignotement brutal) ;",
    "  · survol : cartes qui se soulèvent (ombre plus forte), photos qui zooment doucement dans leur cadre, liens dont le soulignement se dessine ;",
    "  · décor : vagues ou traits de la marque qui se dessinent à l'apparition, symbole qui flotte doucement, bandeau du slogan qui défile en continu ;",
    "  · en-tête qui passe d'un fond transparent sur la photo d'ouverture à un fond plein au défilement ;",
    "  · tout en CSS et UN petit script sans bibliothèque ; le contenu reste TOUJOURS visible sans JavaScript (l'état caché n'existe que si le script a ajouté la classe js sur <html>) et TOUT est désactivé sous prefers-reduced-motion (contenu visible immédiatement).",
    "- Qualité d'une vraie maquette de designer : hiérarchie nette, alignements rigoureux, rythme des fonds (bandes alternées), beaucoup d'air, aucune zone vide, aucun texte qui déborde ou se superpose à une photo.",
    "",
    first
      ? "FORMAT : réponds UNIQUEMENT avec le fichier HTML complet (de <!doctype html> à </html>). Dans le <head> : <link rel=\"stylesheet\" href=\"fonts.css\"> puis UNE balise <style id=\"base\"> qui contient TOUT le CSS : variables, en-tête, pied de page, boutons, cartes, titres, bandes, grilles et règles du téléphone, écrit pour resservir aux autres pages du site, animations comprises. À la fin du <body>, UN petit script sans bibliothèque (menu du téléphone, apparitions au défilement, en-tête au défilement), écrit pour resservir aux autres pages."
      : `FORMAT : cette page fait partie d'un site déjà commencé. La feuille commune base.css est déjà écrite (ci-dessous) : réutilise ses variables et ses classes, ne la recopie pas. Réponds UNIQUEMENT avec le fichier HTML complet (de <!doctype html> à </html>) : dans le <head>, <link rel="stylesheet" href="fonts.css">, <link rel="stylesheet" href="base.css"> puis une balise <style id="page"> avec SEULEMENT les règles nouvelles propres à cette page. L'en-tête et le pied de page sont repris À L'IDENTIQUE de l'accueil (ci-dessous), avec les mêmes classes d'animation et le même petit script à la fin du <body>.\n<base_css>\n${i.baseCss}\n</base_css>${i.shell ? `\n<entete_et_pied_de_l_accueil>\n${i.shell}\n</entete_et_pied_de_l_accueil>` : ""}`,
  ].filter((l) => l !== "").join("\n");
}

/** Consigne de suite quand la réponse s'est arrêtée avant la fin du fichier (limite de longueur). */
export function continuationPrompt(sofar: string, original: string): string {
  const lines = sofar.split("\n");
  // Consigne d'origine redonnée (essai réel du 8 novembre : la suite écrite sans les textes ni les photos avait inventé
  // un accueil entier, avec des « [À compléter] »).
  return `${original}\n\n---\nTu as déjà écrit le début de ce fichier, mais il s'est arrêté avant la fin. Voici ses dernières lignes :\n<fin_du_fichier>\n${lines.slice(-40).join("\n")}\n</fin_du_fichier>\nÉcris UNIQUEMENT la suite, en commençant exactement à la ligne qui suit la dernière ligne ci-dessus, jusqu'à </html>. Ne répète rien.`;
}

/** Retire les clôtures de code éventuelles d'une réponse. */
export function stripFences(s: string): string {
  return s.replace(/^\s*```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
}

/** Assemble une suite au texte déjà reçu : on repart de la dernière ligne complète. */
export function joinContinuation(sofar: string, more: string): string {
  const cut = sofar.lastIndexOf("\n");
  return (cut > 0 ? sofar.slice(0, cut + 1) : sofar) + stripFences(more).replace(/^\n+/, "");
}

export const isComplete = (html: string) => /<\/html>\s*$/i.test(html.trim());

export type ParsedMockup = { html: string; newPhotos: CodePhoto[]; photoIds: string[]; problems: string[] };

const NEW_SCRIPT = /<script[^>]*id=["']photos-nouvelles["'][^>]*>([\s\S]*?)<\/script>/i;

/**
 * Lecture du fichier rendu par Claude : photos utilisées, photos nouvelles demandées (au plus `maxNew`), ressources
 * extérieures retirées (aucune police ni image chargée depuis Internet).
 */
export function parseCodeMockup(raw: string, known: Set<string>, maxNew: number): ParsedMockup {
  const problems: string[] = [];
  let html = stripFences(raw).trim();
  if (!isComplete(html)) problems.push("fichier incomplet (il s'arrête avant </html>)");
  let newPhotos: CodePhoto[] = [];
  const m = html.match(NEW_SCRIPT);
  if (m) {
    try {
      const list = JSON.parse(m[1]);
      if (Array.isArray(list)) newPhotos = list.filter((x) => x && typeof x.id === "string" && NEW_PHOTO.test(x.id) && typeof x.description === "string" && x.description.trim().length > 20)
        .map((x) => ({ id: x.id, description: String(x.description).trim().slice(0, 2400), ratio: typeof x.ratio === "string" ? x.ratio.slice(0, 12) : "4:3", background: typeof x.background === "string" && /^#[0-9a-f]{3,8}$/i.test(x.background) ? x.background : null, product: !!x.product, packaging: !!x.packaging }));
    } catch { problems.push("liste des photos nouvelles illisible"); }
    html = html.replace(NEW_SCRIPT, "").replace(/\n{3,}/g, "\n\n");
  }
  // Ressources extérieures (polices Google, images en ligne) : retirées, la page reste autonome.
  html = html.replace(/<link[^>]+href=["']https?:\/\/[^"']+["'][^>]*>\s*/gi, "").replace(/@import\s+url\(["']?https?:[^)]+\)\s*;?/gi, "");
  const photoIds = [...new Set([...html.matchAll(/data-photo=["']([^"']+)["']/g)].map((x) => x[1]))];
  const used = photoIds.filter((id) => NEW_PHOTO.test(id));
  newPhotos = newPhotos.filter((x) => used.includes(x.id));
  if (newPhotos.length > maxNew) { problems.push(`${newPhotos.length} photos nouvelles demandées pour ${maxNew} au plus`); newPhotos = newPhotos.slice(0, maxNew); }
  for (const id of photoIds) {
    if (NEW_PHOTO.test(id) ? !newPhotos.some((x) => x.id === id) : !known.has(id)) problems.push(`photo « ${id} » inconnue`);
  }
  if (/src=["']https?:/i.test(html)) problems.push("image chargée depuis Internet");
  // Sans balise viewport, un téléphone affiche la page d'ordinateur réduite : ajoutée si elle manque.
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1">');
  return { html, newPhotos, photoIds, problems };
}

/** Remplace les identifiants des photos nouvelles par ceux des fichiers créés. */
export function resolvePhotos(html: string, ids: Record<string, string>): string {
  return html.replace(/(data-photo=["'])([^"']+)(["'])/g, (all, a, id, b) => (ids[id] ? `${a}${ids[id]}${b}` : all))
    .replace(/(src=["']photos\/)([^"'.]+)(\.jpg["'])/g, (all, a, id, b) => (ids[id] ? `${a}${ids[id]}${b}` : all));
}

/** Sépare la feuille commune (<style id="base">) du fichier de l'accueil : elle devient base.css. */
export function splitBaseCss(html: string): { html: string; css: string | null } {
  const m = html.match(/<style[^>]*id=["']base["'][^>]*>([\s\S]*?)<\/style>/i);
  if (!m) return { html, css: null };
  return { html: html.replace(m[0], '<link rel="stylesheet" href="base.css">'), css: m[1].trim() };
}

/** En-tête et pied de page d'une page (repris à l'identique sur les pages suivantes). */
export function shellOf(html: string): string | null {
  const h = html.match(/<header[^>]*data-part[\s\S]*?<\/header>/i)?.[0];
  const f = html.match(/<footer[^>]*data-part[\s\S]*?<\/footer>/i)?.[0];
  return h || f ? [h, f].filter(Boolean).join("\n\n") : null;
}

export type CodeEdit = { find: string; replace: string };
/** Retouche par remplacements EXACTS (chaque passage doit exister une seule fois) ; rien n'est changé en cas d'échec. */
export function applyEdits(html: string, edits: CodeEdit[]): { html: string; failed: string[] } {
  let out = html;
  const failed: string[] = [];
  for (const e of edits) {
    if (!e.find) { failed.push("passage vide"); continue; }
    const n = out.split(e.find).length - 1;
    if (n !== 1) { failed.push(`${n ? "passage présent plusieurs fois" : "passage introuvable"} : « ${e.find.slice(0, 80)} »`); continue; }
    out = out.replace(e.find, () => e.replace);
  }
  return failed.length ? { html, failed } : { html: out, failed };
}

/** Consigne d'une photo nouvelle pour l'IA d'images (photo du site en haute définition, sans maquette en référence). */
export function codePhotoPrompt(photo: CodePhoto, f: { name: string; logo: boolean; product: boolean }): string {
  return [
    `Photographie en haute définition pour le site « ${f.name} », au format ${photo.ratio}, nette et détaillée, de qualité professionnelle.`,
    photo.background ? `Le fond de la photo est la couleur unie exacte ${photo.background} sur tout le pourtour (aucun dégradé, aucun cadre, aucune vignette), pour que la photo se fonde dans la section du site qui a ce fond.` : "",
    photo.description.replace(/\s+$/, ""),
    f.product ? "La photo du produit réel est jointe : le produit est reproduit exactement (forme, couleurs, étiquette), entier, rien n'est coupé." : "",
    f.logo ? "Le logo de la marque est joint : il est reproduit exactement sur l'emballage, sans autre mot." : "Aucun logo, aucun nom de marque : ni sur un objet, ni sur une tasse, ni posé sur le fond.",
    "Aucun autre texte, aucune lettre, aucun chiffre, aucun filigrane, aucune personne, aucun visage, aucune main. Aucun objet supplémentaire.",
  ].filter(Boolean).join("\n");
}

/** Textes attendus sur la page (contrôle local) : tous les textes de la page, mot pour mot. */
export function expectedTexts(c: PageCopy): string[] {
  return c.sections.flatMap((s) => [s.title, s.text, s.button, ...s.items.flatMap((i) => [i.title, i.text])]).filter((t): t is string => !!t && !!t.trim());
}

export type InspectResult = { shots: Record<Viewport, Buffer> | null; problems: string[]; toVerify: string[] };
export type MockupFiles = { html: string; baseCss?: string | null; fontsCss: string; fontFiles: { name: string; data: Buffer }[]; logo: { name: string; data: Buffer }; photos: Record<string, Buffer> };

/**
 * Captures (ordinateur 1440 px, téléphone 390 px) et contrôle automatique d'une maquette en code, dans le Chromium
 * local (gratuit). Le contrôle est fait sur la page réelle, pas sur une image : textes exacts et rien d'ajouté, logo
 * présent, en-tête du téléphone sans bouton, jamais trois éléments côte à côte sur téléphone, aucun débordement,
 * toutes les photos chargées.
 */
export async function inspectCodeMockup(files: MockupFiles, expect: { texts: string[]; allowed: string[] }, chromium: string | null): Promise<InspectResult> {
  if (!chromium) return { shots: null, problems: [], toVerify: ["captures impossibles : aucun navigateur de captures sur ce serveur"] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maquette-code-"));
  try {
    fs.mkdirSync(path.join(dir, "photos"));
    fs.mkdirSync(path.join(dir, "fonts"));
    fs.writeFileSync(path.join(dir, "index.html"), files.html);
    fs.writeFileSync(path.join(dir, "base.css"), files.baseCss ?? "");
    fs.writeFileSync(path.join(dir, "fonts.css"), files.fontsCss);
    for (const f of files.fontFiles) fs.writeFileSync(path.join(dir, "fonts", f.name), f.data);
    fs.writeFileSync(path.join(dir, files.logo.name), files.logo.data);
    for (const [id, data] of Object.entries(files.photos)) fs.writeFileSync(path.join(dir, "photos", `${id}.jpg`), data);
    const { chromium: pw } = await import("playwright");
    const browser = await pw.launch({ executablePath: chromium, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const problems = new Set<string>(), toVerify = new Set<string>();
    const shots = {} as Record<Viewport, Buffer>;
    try {
      for (const v of ["desktop", "phone"] as Viewport[]) {
        const width = VIEWPORT_WIDTH[v];
        const context = await browser.newContext({ viewport: { width, height: v === "phone" ? 844 : 900 }, deviceScaleFactor: 1, isMobile: v === "phone", hasTouch: v === "phone" });
        // Aucune requête vers Internet : la maquette est autonome (polices et photos locales).
        await context.route(/^https?:\/\//, (r) => r.abort());
        // Fonctions sérialisées vers la page : l'aide « __name » ajoutée par certains compilateurs doit y exister.
        await context.addInitScript("window.__name = window.__name || ((f) => f);");
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`file://${dir}/index.html`, { waitUntil: "load", timeout: 60_000 });
        await page.evaluate(async () => {
          for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 30000); y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
          scrollTo(0, 0);
          await document.fonts.ready;
        });
        await page.waitForTimeout(400);
        const r = await page.evaluate(pageChecks, { texts: expect.texts, allowed: expect.allowed, phone: v === "phone", width });
        const label = v === "phone" ? "téléphone" : "ordinateur";
        for (const x of r.problems) problems.add(`${label} : ${x}`);
        for (const x of r.toVerify) toVerify.add(`${label} : ${x}`);
        shots[v] = await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 });
        await context.close();
      }
    } finally { await browser.close().catch(() => {}); }
    // Textes manquants ou ajoutés : identiques sur les deux largeurs, dits une seule fois.
    const dedup = (s: Set<string>) => {
      const out: string[] = [];
      for (const x of s) {
        const bare = x.replace(/^(ordinateur|téléphone) : /, "");
        if (/^(texte|chiffre)/.test(bare) && out.some((o) => o.endsWith(bare))) continue;
        out.push(/^(texte|chiffre)/.test(bare) ? bare : x);
      }
      return [...new Set(out)];
    };
    return { shots, problems: dedup(problems), toVerify: dedup(toVerify) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** Contrôles exécutés DANS la page (aucune dépendance : sérialisés tels quels par Playwright). */
function pageChecks(a: { texts: string[]; allowed: string[]; phone: boolean; width: number }): { problems: string[]; toVerify: string[] } {
  const problems: string[] = [], toVerify: string[] = [];
  const flat = (s: string) => s.replace(/[’‘ʼ]/g, "'").replace(/[   ]/g, " ").replace(/\s+/g, "").toLowerCase();
  const norm = (s: string) => s.replace(/[   ]/g, " ").replace(/\s+/g, " ").trim();
  const W = innerWidth;
  // Un téléphone élargit la page qui déborde (et la réduit) : la largeur lue dépasse alors celle de l'écran.
  const sw = Math.max(W, document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > a.width + 1) problems.push(`la page déborde sur le côté (${sw} px pour ${a.width} px)`);
  const shown = (el: Element) => {
    for (let e: Element | null = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Textes : tous présents (dans le fichier), aucun ajouté (visible ou non).
  const nodes: { text: string; el: Element }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const t = norm(n.textContent ?? "");
    if (t) nodes.push({ text: t, el });
  }
  const all = flat(nodes.map((x) => x.text).join(""));
  for (const t of a.texts) if (!all.includes(flat(t))) problems.push(`texte manquant : « ${t.slice(0, 90)} »`);
  const ok = flat([...a.texts, ...a.allowed].join("|"));
  for (const x of nodes) {
    if (!/[\p{L}\p{N}]/u.test(x.text)) continue;
    if (ok.includes(flat(x.text))) continue;
    if (/^[\d\s.,:/%–-]+$/.test(x.text)) toVerify.push(`chiffre ajouté : « ${x.text.slice(0, 40)} »`);
    else problems.push(`texte ajouté : « ${x.text.slice(0, 90)} »`);
  }
  // Logo dans l'en-tête.
  const header = document.querySelector("header[data-part], header");
  if (!header || !header.querySelector("img[data-logo]")) problems.push("logo absent de l'en-tête");
  // Grands vides (consigne du propriétaire du 8 novembre : « trop d'espace où il n'y a rien, ça fait vide »).
  const maxGap = a.phone ? 90 : 130;
  for (const part of Array.from(document.querySelectorAll("section[data-part]"))) {
    if (!shown(part)) continue;
    const pr = part.getBoundingClientRect();
    let top = Infinity, bottom = -Infinity;
    for (const el of Array.from(part.querySelectorAll("h1,h2,h3,h4,p,li,a,button,img,svg,input,summary,figure,blockquote,span"))) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
    }
    if (top === Infinity) { problems.push(`partie vide : « ${part.getAttribute("data-part")} »`); continue; }
    const gap = Math.max(top - pr.top, pr.bottom - bottom);
    if (gap > maxGap) problems.push(`trop d'espace vide dans la partie « ${part.getAttribute("data-part")} » (${Math.round(gap)} px sans rien)`);
  }
  // Colonne vide à côté d'une autre (ordinateur) : un titre seul face à une longue liste (essai réel : « Tes questions »).
  if (!a.phone) {
    const contentHeight = (el: Element) => {
      let t = Infinity, b = -Infinity;
      for (const x of [el, ...Array.from(el.querySelectorAll("h1,h2,h3,h4,p,li,a,button,img,svg,summary,figure,blockquote"))]) {
        if (!shown(x)) continue;
        const r = x.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || x === el) continue;
        t = Math.min(t, r.top); b = Math.max(b, r.bottom);
      }
      return t === Infinity ? 0 : b - t;
    };
    const flagged = new Set<string>();
    for (const box of Array.from(document.querySelectorAll("section[data-part] *"))) {
      const kids = Array.from(box.children).filter(shown);
      if (kids.length !== 2) continue;
      const [r1, r2] = kids.map((k) => k.getBoundingClientRect());
      if (Math.abs(r1.top - r2.top) > 40 || r1.width < 200 || r2.width < 200) continue;
      const [h1, h2] = kids.map(contentHeight);
      const part = box.closest("[data-part]")!.getAttribute("data-part")!;
      if (Math.max(h1, h2) - Math.min(h1, h2) > 280 && Math.min(h1, h2) < 0.4 * Math.max(h1, h2) && !flagged.has(part)) {
        flagged.add(part);
        problems.push(`colonne presque vide dans la partie « ${part} » (${Math.round(Math.min(h1, h2))} px de contenu face à ${Math.round(Math.max(h1, h2))} px)`);
      }
    }
  }
  // Logo jamais déformé (essai réel du 8 novembre : logo du pied de page étiré en largeur, non relevé).
  const logos = Array.from(document.querySelectorAll("img[data-logo]")) as HTMLImageElement[];
  for (const img of logos) {
    if (!img.naturalWidth || !img.naturalHeight || !shown(img)) continue;
    const r = img.getBoundingClientRect();
    const fit = getComputedStyle(img).objectFit;
    if (fit === "contain" || fit === "scale-down") continue;
    const ratio = (r.width / r.height) / (img.naturalWidth / img.naturalHeight);
    if (ratio > 1.06 || ratio < 0.94) {
      const part = img.closest("[data-part]")?.getAttribute("data-part") ?? "page";
      problems.push(`logo déformé dans la partie « ${part} » (${Math.round(r.width)}×${Math.round(r.height)} px pour des proportions de ${img.naturalWidth}×${img.naturalHeight})`);
    }
  }
  // Photos et logo chargés.
  for (const img of Array.from(document.images)) {
    if (!img.complete || img.naturalWidth === 0) problems.push(`image non chargée : ${(img.getAttribute("data-photo") ?? img.getAttribute("src") ?? "").slice(0, 60)}`);
  }
  if (a.phone) {
    // En-tête du téléphone : logo et icône du menu seulement (règle du propriétaire du 8 novembre).
    if (header) for (const el of Array.from(header.querySelectorAll("a, button"))) {
      const t = norm(el.textContent ?? "");
      if (t && /[\p{L}]{2}/u.test(t) && shown(el) && !el.querySelector("img[data-logo]")) problems.push(`bouton ou lien visible dans l'en-tête : « ${t.slice(0, 50)} »`);
    }
    // Jamais trois éléments côte à côte (cartes, photos, blocs d'au moins 60 px).
    const seen = new Set<string>();
    for (const box of Array.from(document.querySelectorAll("body *"))) {
      // Vignettes de la galerie d'une fiche produit : une rangée permise (essai réel du 8 novembre : quatre grandes photos
      // empilées avant le nom et le prix).
      if (box.children.length < 3 || box.closest("[aria-hidden='true'], [data-gallery]") || !shown(box)) continue;
      const rows = new Map<number, number>();
      for (const c of Array.from(box.children)) {
        if (!shown(c)) continue;
        const r = c.getBoundingClientRect();
        if (r.width < 60 || r.height < 60 || r.left < -1 || r.right > W + 1) continue;
        const k = Math.round(r.top / 12);
        rows.set(k, (rows.get(k) ?? 0) + 1);
      }
      const most = Math.max(0, ...rows.values());
      if (most >= 3) {
        const part = box.closest("[data-part]")?.getAttribute("data-part") ?? box.tagName.toLowerCase();
        if (!seen.has(part)) { seen.add(part); problems.push(`${most} éléments côte à côte dans la partie « ${part} »`); }
      }
    }
  }
  return { problems: [...new Set(problems)], toVerify: [...new Set(toVerify)] };
}

/** Photos d'une page : identifiant et produit de la carte qui la porte (data-product), dans l'ordre de la page. */
export function photoUses(html: string): { id: string; product: string | null }[] {
  return [...html.matchAll(/<img\b[^>]*>/gi)].flatMap((m) => {
    const id = m[0].match(/data-photo=["']([^"']+)["']/)?.[1];
    if (!id) return [];
    return [{ id, product: m[0].match(/data-product=["']([^"']+)["']/)?.[1]?.trim() || null }];
  });
}

/**
 * Doublons de photos (consigne du propriétaire du 8 novembre : « jamais une photo en doublon ») : une photo deux fois
 * dans la page, ou déjà montrée par une autre page de la maquette. Seule exception : la photo d'un produit sur la
 * carte ou la fiche de ce même produit, une fois par page.
 */
export function duplicatePhotos(html: string, others: { page: string; html: string }[]): string[] {
  const problems: string[] = [];
  const uses = photoUses(html);
  const seen = new Map<string, number>();
  for (const u of uses) seen.set(u.id, (seen.get(u.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) problems.push(`photo en double dans la page : ${id} (${n} fois)`);
  for (const o of others) {
    const there = photoUses(o.html);
    for (const u of uses) {
      const t = there.find((x) => x.id === u.id);
      if (!t) continue;
      if (u.product && t.product && u.product.toLowerCase() === t.product.toLowerCase()) continue;
      problems.push(`photo déjà montrée sur la page « ${o.page} » : ${u.id}`);
    }
  }
  return [...new Set(problems)];
}

const normName = (t: string) => t.replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Étiquette les photos de cartes de produit oubliées (essai réel du 8 novembre : 4 cartes sur 6 sans data-product, leurs
 * photos interdites ensuite sur la fiche produit, remplacées par des icônes). Une photo est celle d'un produit quand,
 * avant l'image suivante, un élément porte EXACTEMENT le nom de ce produit (titre de la carte) et aucun autre.
 */
export function autoTagProducts(html: string, names: string[]): string {
  if (!names.length) return html;
  const wanted = new Map(names.map((n) => [normName(n), n]));
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  let out = "", last = 0;
  tags.forEach((m, i) => {
    const tag = m[0], start = m.index!, end = start + tag.length;
    out += html.slice(last, start);
    last = end;
    if (!/data-photo=/.test(tag) || /data-product=/.test(tag)) { out += tag; return; }
    const until = i + 1 < tags.length ? tags[i + 1].index! : html.length;
    const after = html.slice(end, Math.min(until, end + 1500));
    const found = new Set([...after.matchAll(/>([^<>]{2,80})</g)].map((x) => wanted.get(normName(x[1]))).filter((x): x is string => !!x));
    out += found.size === 1 ? tag.replace(/<img\b/i, `<img data-product="${[...found][0].replace(/"/g, "&quot;")}"`) : tag;
  });
  return out + html.slice(last);
}
