/**
 * La marque du client telle que SINA l'a créée, pour l'écran « Marque » (lot 2) : un écran pour VOIR, télécharger et
 * demander un changement à SINA. Rien n'y est créé ni payé : toute création passe par SINA. Lecture seule ; rien
 * d'inventé (ce qui n'existe pas encore n'est pas rendu).
 */
import { assetUrl } from "../library";
import { loadProject } from "../projects";
import { journeyOfProject } from "./construction";
import { fontFace } from "./identities";
import { chosenRoute } from "./logos";
import { vueDesEsquisses, type VueDesEsquisses } from "./logo-graphistes";
import { planchesMontrees } from "./journey";
import { caseDuDomaine } from "./planche-de-marque";
import { L } from "../i18n-server";
import { ETIQUETTE_AMBIANCE, LIBELLE_DU_SITE, imagesMontrees, type EtatPlancheEnVrai } from "./planche-en-vrai";
import { LIBELLE_DES_VERSIONS } from "./planche-en-vrai-code";
import { libelleDeLElement, sansIdentifiantsDeCase } from "./planche-en-vrai-libelles";

type Shot = { url: string; w: number; h: number };
export type BrandSheet = {
  /** Où en est l'étape « La marque » : rien, identités proposées, identité choisie (marque en cours), marque finie, validée. */
  stage: "none" | "proposed" | "chosen" | "finished" | "validated";
  name: string | null; slogan: string | null; promise: string | null; descriptor: string | null;
  logo: string | null;
  colors: { role: "light" | "dark" | "primary" | "secondary" | "accent"; hex: string }[];
  fonts: { heading: { family: string; file: string; weight: number } | null; body: { family: string; file: string; weight: number } | null };
  tone: string[]; houseWords: string[]; bannedWords: string[]; lines: string[]; toProve: string[];
  images: { hero: Shot | null; object: Shot | null; signs: Shot | null; posts: Shot[] };
  kit: { items: { key: string; label: string; href: string; downloadHref: string | null; dark: boolean }[]; board: string | null; book: string | null; pages: number } | null;
  issues: string[];
  /** Les esquisses de logo (méthode des graphistes), montrées tant qu'aucune n'est choisie ; sinon null. */
  esquisses: VueDesEsquisses | null;
  /**
   * Les planches de marque (nouveaux projets) : montrées seules, en entier, avec le téléchargement et la case du domaine ;
   * jamais une planche non montrée (refusée deux fois). Après le choix : seulement celle de l'identité choisie.
   */
  planches: { key: string; name: string; url: string; download: string; w: number; h: number; caseDuDomaine: string }[];
  /**
   * La planche en vrai (25 novembre 2026) : les dix versions du logo en PNG haute définition sur fond transparent, chaque
   * couleur avec son code à copier, les deux polices avec leur nom à copier et leur fichier, chaque image en haute
   * définition, la planche entière, et « Tout télécharger » (zip). Null sans planche en vrai.
   */
  enVrai: VueEnVrai | null;
};
export type VueEnVrai = {
  planche: { url: string; download: string; w: number; h: number } | null;
  logos: { version: string; label: string; url: string; download: string }[];
  /**
   * Chaque couleur mesurée, son code et son nom ; `roles` : ce qu'elle fait dans la marque (fond, texte, bouton…), dit sous
   * sa pastille (25 novembre 2026 : avec la planche en vrai, une seule section des couleurs, celle-ci, qui fait foi).
   */
  couleurs: { hex: string; nom: string; roles: BrandSheet["colors"][number]["role"][] }[];
  polices: { role: "titres" | "textes"; famille: string; fichier: string; url: string; lue: string; remplacee: boolean }[];
  images: { element: string; label: string; url: string; download: string; w: number; h: number; ambiance: boolean }[];
  /** Les images refusées deux fois : l'aperçu agrandi garde leur case, sans fichier en haute définition. */
  sansFichier: string[];
  zip: string;
};
/** La vue de la planche en vrai pour l'onglet Marque (sans base : les adresses sont faites par `url`). */
export function vueEnVrai(ev: EtatPlancheEnVrai | undefined, projectId: string, url: (id: string, download?: boolean) => string): VueEnVrai | null {
  if (!ev?.planche) return null;
  const libelle = libelleDeLElement;
  return {
    planche: { url: url(ev.planche.id), download: url(ev.planche.id, true), w: ev.planche.w, h: ev.planche.h },
    logos: ev.logos.map((x) => ({ version: x.version, label: L(LIBELLE_DES_VERSIONS[x.version].fr, LIBELLE_DES_VERSIONS[x.version].en), url: url(x.id), download: url(x.id, true) })),
    couleurs: ev.palette.map((c) => ({ hex: c.hex, nom: c.nom, roles: [] })),
    polices: ev.polices ? (["titres", "textes"] as const).map((role) => { const p = ev.polices![role]; return { role, famille: p.famille, fichier: p.fichier, url: `/api/syna/fonts/${p.fichier}`, lue: p.lue, remplacee: p.remplacee }; }) : [],
    images: imagesMontrees(ev).map((e) => ({ element: e.element, label: e.ambiance ? `${libelle(e.element)} — ${L(ETIQUETTE_AMBIANCE.fr, ETIQUETTE_AMBIANCE.en)}` : e.element === "site" ? L(LIBELLE_DU_SITE.fr, LIBELLE_DU_SITE.en) : libelle(e.element as never), url: url(e.id!), download: url(e.id!, true), w: e.w ?? 0, h: e.h ?? 0, ambiance: !!e.ambiance })),
    sansFichier: ev.elements.filter((e) => !e.id && !(ev.siteEntier && e.element.startsWith("site-"))).map((e) => libelle(e.element)),
    zip: `/api/projects/${projectId}/brand/zip`,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

export function brandSheetOf(projectId: string): BrandSheet {
  const p = loadProject(projectId), b = p.brand, j = journeyOfProject(projectId);
  const route = j ? chosenRoute(j) : null, im = route?.board.images;
  const shot = (v?: { id: string; w: number; h: number } | null): Shot | null => (v ? { url: assetUrl({ id: v.id }), w: v.w, h: v.h } : null);
  const done = (n: number) => j?.steps[n]?.status === "done";
  const stage: BrandSheet["stage"] = !j || (!j.identities?.list.length && !b?.logo?.assetId) ? "none" : !j.identityChoice ? (j.identities?.list.length ? "proposed" : "none") : done(3) ? "validated" : j.brandFinish?.at ? "finished" : "chosen";
  const chosen = stage !== "none" && stage !== "proposed";
  const colors: BrandSheet["colors"] = chosen && b?.palette ? (["light", "dark", "primary", "secondary", "accent"] as const).filter((r) => HEX.test(String(b.palette[r] ?? ""))).map((r) => ({ role: r, hex: b.palette[r] })) : [];
  const face = (k?: string) => { try { return k ? fontFace(k) ?? null : null; } catch { return null; } };
  return {
    stage,
    name: chosen ? b?.name?.trim() || null : null,
    slogan: chosen ? b?.tagline?.trim() || null : null,
    promise: chosen ? b?.positioning?.trim() || null : null,
    descriptor: route?.board.descriptor?.trim() || null,
    logo: chosen && b?.logo?.assetId ? assetUrl({ id: b.logo.assetId }) : null,
    colors,
    fonts: { heading: chosen ? (face(b?.fonts?.heading) as BrandSheet["fonts"]["heading"]) : null, body: chosen ? (face(b?.fonts?.body) as BrandSheet["fonts"]["body"]) : null },
    tone: chosen ? b?.personality ?? [] : [],
    houseWords: route?.board.voice.houseWords ?? [], bannedWords: route?.board.voice.bannedWords ?? [],
    lines: route?.board.lines ?? [], toProve: route?.board.toProve ?? [],
    images: { hero: shot(im?.hero), object: shot(im?.object), signs: shot(im?.signs), posts: (im?.posts ?? []).map((q) => shot(q)).filter((q): q is Shot => !!q) },
    kit: j?.brandKit && chosen ? {
      items: j.brandKit.items.map((x) => ({ key: x.key, label: x.label, href: assetUrl({ id: x.assetId }), downloadHref: x.download ? assetUrl({ id: x.assetId }, { download: true }) : null, dark: !!x.dark })),
      board: j.brandKit.boardId ? assetUrl({ id: j.brandKit.boardId }) : null,
      book: j.brandKit.bookId ? assetUrl({ id: j.brandKit.bookId }) : null, pages: j.brandKit.pageIds.length,
    } : null,
    issues: (j?.brandFinish?.issues ?? []).map(sansIdentifiantsDeCase),
    esquisses: j?.graphistes?.choix?.length ? null : vueDesEsquisses(j?.graphistes, (id) => assetUrl({ id })),
    planches: (j ? planchesMontrees(j) : []).filter((x) => !chosen || x.key === (j?.identityChoice?.mix?.logo ?? j?.identityChoice?.key)).flatMap((x) => {
      const pl = x.board?.planche;
      if (!pl?.image) return [];
      return [{ key: x.key, name: x.name, url: assetUrl({ id: pl.image.id }), download: assetUrl({ id: pl.image.id }, { download: true }), w: pl.image.w, h: pl.image.h, caseDuDomaine: caseDuDomaine({ domaine: pl.domaine, statut: pl.revu?.statut ?? pl.statut }) }];
    }),
    enVrai: chosen ? avecLesFichiersDuLogo(avecLesRoles(vueEnVrai(j?.plancheEnVrai, projectId, (id, download) => assetUrl({ id }, download ? { download: true } : undefined)), colors), {
      symbole: b?.logo?.markAssetId ?? null, favicons: j?.plancheEnVrai?.favicons ?? null, svg: j?.brandKit?.items.find((x) => x.key === "svg")?.assetId ?? null,
    }, (id, download) => assetUrl({ id }, download ? { download: true } : undefined)) : null,
  };
}

/**
 * Avec la planche en vrai, une seule section des logos (25 novembre 2026 : « Ta charte et tes fichiers » répétait « Tes
 * logos ») : après les dix versions, le symbole seul, le favicon 32, l'icône 512, l'avatar des réseaux et le logo vectoriel,
 * chacun en haute définition à télécharger seul ; jamais un fichier en double.
 */
export function avecLesFichiersDuLogo(v: VueEnVrai | null, f: { symbole?: string | null; favicons?: { f32: string; f512: string; avatar: string } | null; svg?: string | null }, url: (id: string, download?: boolean) => string): VueEnVrai | null {
  if (!v) return v;
  const deja = new Set(v.logos.map((l) => l.url));
  const autres = ([
    ["symbole", f.symbole, "Symbole seul", "Symbol only"], ["favicon-32", f.favicons?.f32, "Favicon 32 px", "Favicon 32 px"],
    ["icone-512", f.favicons?.f512, "Icône 512 px", "Icon 512 px"], ["avatar", f.favicons?.avatar, "Avatar des réseaux", "Social avatar"],
    ["svg", f.svg, "Logo vectoriel (SVG)", "Vector logo (SVG)"],
  ] as const).filter(([, id]) => id && !deja.has(url(id))).map(([version, id, fr, en]) => ({ version, label: L(fr, en), url: url(id!), download: url(id!, true) }));
  return { ...v, logos: [...v.logos, ...autres] };
}

/** Le rôle de chaque couleur de la planche en vrai, lu dans la marque du projet (la palette mesurée, rôles donnés par le code). */
export function avecLesRoles(v: VueEnVrai | null, colors: BrandSheet["colors"]): VueEnVrai | null {
  if (!v) return v;
  return { ...v, couleurs: v.couleurs.map((c) => ({ ...c, roles: colors.filter((x) => x.hex.toLowerCase() === c.hex.toLowerCase()).map((x) => x.role) })) };
}
