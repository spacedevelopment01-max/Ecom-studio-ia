/**
 * Images du parcours de l'accueil (« 03 Images », publicité, vidéo, calendrier) choisies parmi les VRAIES créations
 * de la démonstration, chacune avec sa vraie nature. Avant, une image absente (ex. ARVEN n'a ni packshot ni détail,
 * et ses scènes s'appellent « En situation ») était remplacée par la photo d'origine du fournisseur, affichée trois
 * fois sous les étiquettes « Fond blanc », « Scène » et « Détail » : une promesse fausse. Ici, rien n'est inventé :
 * une case sans création réelle disparaît, la photo d'origine n'est utilisée qu'en tout dernier recours, et une
 * publicité, un visuel social ou une bannière absents restent vides (« » : le panneau s'affiche sans image).
 */
export type MediaKind = "cutout" | "packshot" | "detail" | "scene" | "social" | "ad" | "banner" | "post";
/** ai : visuel entièrement créé par l'IA, texte compris (non modifiable dans l'éditeur de publicités). */
export type MediaTile = { src: string; kind: MediaKind; ai?: boolean };

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
  const add = (src: string | undefined, kind: MediaKind, ai = false) => {
    if (!src || seen.has(src) || src === d.photo) return;
    seen.add(src);
    all.push(ai ? { src, kind, ai } : { src, kind });
  };
  for (const im of d.images) add(im.src, mediaKind(im.label) ?? "post", /\b(IA|AI)\b/.test(im.label));
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
  // La publicité du panneau « Publicités » doit être modifiable : une publicité tout IA (texte dans l'image) n'y va pas.
  const of2 = (k: MediaKind, slot: string) => of(k).filter((x) => !(slot === "ad" && x.ai));
  for (const [slot, kinds] of slots) {
    const x = free(of2(kinds[0], slot));
    if (x) (used.add(x.src), (got[slot] = x.src));
  }
  for (const [slot, kinds] of slots) {
    if (got[slot]) continue;
    // Publicité, visuel social, bannière : jamais une autre image présentée à leur place (vide = rien n'est affiché).
    const strict = slot === "ad" || slot === "social" || slot === "banner";
    const own = kinds.flatMap((k) => of2(k, slot));
    const x = free(own) ?? (strict ? own[0] : free(pool) ?? own[0] ?? pool[0]);
    if (x) used.add(x.src);
    got[slot] = x?.src ?? (strict ? "" : d.photo);
  }
  const { scene1, scene2, packshot, detail, ad, social, banner } = got as Record<(typeof slots)[number][0], string>;
  return { cutout, tiles, packshot, detail, scene1, scene2, social, ad, banner };
}

/** Couleurs de la marque proposées pour le bouton de la démo « Personnalisation », sans doublon (ARVEN : l'ancrage et
 *  la couleur du texte sont le même noir, deux pastilles identiques s'affichaient). */
export function buttonColors(palette: string[]): string[] {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const near = (a: string, b: string) => {
    const [x, y] = [rgb(a), rgb(b)];
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 40;
  };
  // Deux couleurs presque identiques (ex. Les Tribunes : #0D0D0D et #050505) ne font qu'une pastille.
  const out: string[] = [];
  for (const c of [palette[0] ?? "#454873", palette[2] ?? "#8D74B4", palette[4] ?? "#14151F"]) if (!out.some((o) => near(o, c))) out.push(c);
  return out;
}
