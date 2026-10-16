/**
 * Images du parcours de l'accueil (« 03 Images », publicité, vidéo, calendrier) choisies parmi les VRAIES créations
 * de la démonstration, chacune avec sa vraie nature. Avant, une image absente (ex. ARVEN n'a ni packshot ni détail,
 * et ses scènes s'appellent « En situation ») était remplacée par la photo d'origine du fournisseur, affichée trois
 * fois sous les étiquettes « Fond blanc », « Scène » et « Détail » : une promesse fausse. Ici, rien n'est inventé :
 * une case sans création réelle disparaît, la photo d'origine n'est utilisée qu'en tout dernier recours, et une
 * publicité, un visuel social ou une bannière absents restent vides (« » : le panneau s'affiche sans image).
 */
export type MediaKind = "cutout" | "packshot" | "detail" | "scene" | "social" | "ad" | "banner" | "post";
export type MediaTile = { src: string; kind: MediaKind };

const KINDS: [MediaKind, RegExp][] = [
  ["cutout", /détourage|cutout/i],
  ["packshot", /packshot|fond blanc|white background/i],
  ["detail", /détail|detail|gros plan|close-?up/i],
  ["scene", /scène|scene|situation|lifestyle/i],
  ["social", /social|publication/i],
  ["ad", /publicité|^ad$|\bads?\b/i],
  ["banner", /bannière|banner/i],
];

export function mediaKind(label: string): MediaKind | null {
  return KINDS.find(([, re]) => re.test(label))?.[0] ?? null;
}

export type StoryMedia = {
  cutout: string;
  /** Jusqu'à 4 créations différentes pour la case « Images », chacune avec sa vraie nature. */
  tiles: MediaTile[];
  packshot: string;
  detail: string;
  scene1: string;
  scene2: string;
  social: string;
  ad: string;
  banner: string;
};

export function storyMedia(d: { photo: string; images: { src: string; label: string }[]; posts?: string[] }): StoryMedia {
  const all: MediaTile[] = [];
  const seen = new Set<string>();
  const add = (src: string | undefined, kind: MediaKind) => {
    if (!src || seen.has(src) || src === d.photo) return;
    seen.add(src);
    all.push({ src, kind });
  };
  for (const im of d.images) add(im.src, mediaKind(im.label) ?? "post");
  for (const p of d.posts ?? []) add(p, "post");
  const of = (k: MediaKind) => all.filter((x) => x.kind === k);
  const cutout = of("cutout")[0]?.src ?? d.photo;
  // Case « Images » : le détourage, puis une création de chaque nature d'image produit, puis les autres scènes.
  const tiles: MediaTile[] = [];
  const take = (x?: MediaTile) => x && !tiles.includes(x) && tiles.length < 4 && tiles.push(x);
  take(of("cutout")[0]);
  for (const k of ["packshot", "detail", "scene", "social", "ad"] as MediaKind[]) take(of(k)[0]);
  of("scene").forEach(take);
  // Les autres emplacements : la création de la bonne nature, sinon une autre création réelle, sinon la photo d'origine.
  const pool = all.filter((x) => x.kind !== "cutout");
  // Deux passes : chaque emplacement prend d'abord une création de sa propre nature, puis les vides se complètent.
  const slots: [keyof Omit<StoryMedia, "cutout" | "tiles">, MediaKind[]][] = [["scene1", ["scene"]], ["packshot", ["packshot", "scene"]], ["detail", ["detail", "scene"]], ["ad", ["ad"]], ["social", ["social", "post"]], ["banner", ["banner", "post"]], ["scene2", ["scene"]]];
  const used = new Set<string>();
  const got: Partial<Record<(typeof slots)[number][0], string>> = {};
  const free = (list: MediaTile[]) => list.find((y) => !used.has(y.src));
  for (const [slot, kinds] of slots) {
    const x = free(of(kinds[0]));
    if (x) (used.add(x.src), (got[slot] = x.src));
  }
  for (const [slot, kinds] of slots) {
    if (got[slot]) continue;
    // Publicité, visuel social, bannière : jamais une autre image présentée à leur place (vide = rien n'est affiché).
    // La publicité du panneau « Publicités » est une publicité modifiable : une publication IA (texte dans l'image) n'en
    // tient pas lieu.
    const strict = slot === "ad" || slot === "social" || slot === "banner";
    const x = free(kinds.flatMap(of)) ?? (strict ? kinds.flatMap(of)[0] : free(pool) ?? kinds.flatMap(of)[0] ?? pool[0]);
    if (x) used.add(x.src);
    got[slot] = x?.src ?? (strict ? "" : d.photo);
  }
  const { scene1, scene2, packshot, detail, ad, social, banner } = got as Record<(typeof slots)[number][0], string>;
  return { cutout, tiles, packshot, detail, scene1, scene2, social, ad, banner };
}

/** Couleurs de la marque proposées pour le bouton de la démo « Personnalisation », sans doublon (ARVEN : l'ancrage et
 *  la couleur du texte sont le même noir, deux pastilles identiques s'affichaient). */
export function buttonColors(palette: string[]): string[] {
  return [...new Set([palette[0] ?? "#454873", palette[2] ?? "#8D74B4", palette[4] ?? "#14151F"])];
}
