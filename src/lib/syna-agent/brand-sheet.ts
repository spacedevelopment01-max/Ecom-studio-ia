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
};

const HEX = /^#[0-9a-f]{6}$/i;

export function brandSheetOf(projectId: string): BrandSheet {
  const p = loadProject(projectId), b = p.brand, j = journeyOfProject(projectId);
  const route = j ? chosenRoute(j) : null, im = route?.board.images;
  const shot = (v?: { id: string; w: number; h: number } | null): Shot | null => (v ? { url: assetUrl({ id: v.id }), w: v.w, h: v.h } : null);
  const done = (n: number) => j?.steps[n]?.status === "done";
  const stage: BrandSheet["stage"] = !j || (!j.identities?.list.length && !b?.logo?.assetId) ? "none" : !j.identityChoice ? (j.identities?.list.length ? "proposed" : "none") : done(3) ? "validated" : j.brandFinish?.at ? "finished" : "chosen";
  const chosen = stage !== "none" && stage !== "proposed";
  const face = (k?: string) => { try { return k ? fontFace(k) ?? null : null; } catch { return null; } };
  return {
    stage,
    name: chosen ? b?.name?.trim() || null : null,
    slogan: chosen ? b?.tagline?.trim() || null : null,
    promise: chosen ? b?.positioning?.trim() || null : null,
    descriptor: route?.board.descriptor?.trim() || null,
    logo: chosen && b?.logo?.assetId ? assetUrl({ id: b.logo.assetId }) : null,
    colors: chosen && b?.palette ? (["light", "dark", "primary", "secondary", "accent"] as const).filter((r) => HEX.test(String(b.palette[r] ?? ""))).map((r) => ({ role: r, hex: b.palette[r] })) : [],
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
    issues: j?.brandFinish?.issues ?? [],
    esquisses: j?.graphistes?.choix?.length ? null : vueDesEsquisses(j?.graphistes, (id) => assetUrl({ id })),
  };
}
