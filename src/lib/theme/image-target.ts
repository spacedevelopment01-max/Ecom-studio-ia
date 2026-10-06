/**
 * « Remplace cette image par celle-ci » : retrouve le réglage exact (section, bloc, clé *_asset) de l'image
 * désignée dans l'aperçu, puis prépare l'opération use_media avec l'image jointe au message.
 * Fonctionne sans IA (moteur local) ; avec l'IA, sert d'indication précise et de filet de sécurité.
 */
import { L } from "@/lib/i18n-server";
import { containerOf, sectionSchema, type ThemeSpec } from "./spec";
import type { ThemeOp } from "./ops";

export type MediaSelection = { template: string; section: string; block?: string; kind?: string; tag?: string; src?: string; text?: string } | null | undefined;
export type MediaTarget = { template: string; section: string; block?: string; key: string; current: string };
export type MediaAttachment = { assetId: string; name: string; kind: string };

/** Demande de remplacement (« remplace », « mets celle-ci », « use this one »…). */
export const REPLACE_INTENT = /(remplac|change|chang|mets|met |mettre|utilise|prends|à la place|a la place|celle[- ]ci|celle[- ]là|celle-la|par (celle|cette|la mienne|ma photo)|replace|swap|use this|use my|put this|instead|this one)/i;

const isVideoKey = (k: string) => /video/.test(k);
const fileOf = (src: string) => {
  try {
    return decodeURIComponent(src.split("?")[0].split("#")[0].split("/").pop() ?? "");
  } catch {
    return src.split("?")[0].split("/").pop() ?? "";
  }
};

/** L'élément désigné est-il une image ou une vidéo ? */
export const isMediaSelection = (sel: MediaSelection) => !!sel && (sel.kind === "Image" || sel.tag === "img" || sel.tag === "video" || !!sel.src);

/** Réglage *_asset qui affiche l'image (ou la vidéo) désignée. */
export function mediaTargetOf(spec: ThemeSpec, sel: MediaSelection, want: "image" | "video" = "image"): MediaTarget | null {
  if (!sel) return null;
  const c = containerOf(spec, sel.template);
  const s = c?.sections[sel.section];
  if (!s) return null;
  const schema = sectionSchema(spec, s.type);
  if (!schema) return null;
  type Cand = MediaTarget & { scope: "block" | "section" | "other-block" };
  const cands: Cand[] = [];
  const push = (scope: Cand["scope"], defs: { id?: string }[] | undefined, values: Record<string, unknown>, block?: string) => {
    for (const d of defs ?? []) {
      if (!d.id?.endsWith("_asset")) continue;
      if ((want === "video") !== isVideoKey(d.id)) continue;
      cands.push({ template: sel.template, section: sel.section, block, key: d.id, current: String(values[d.id] ?? ""), scope });
    }
  };
  const blockDefs = (type: string) => schema.blocks.find((b) => b.type === type)?.settings;
  if (sel.block && s.blocks?.[sel.block]) push("block", blockDefs(s.blocks[sel.block].type), s.blocks[sel.block].settings ?? {}, sel.block);
  push("section", schema.settings, s.settings ?? {});
  for (const [bid, b] of Object.entries(s.blocks ?? {})) if (bid !== sel.block) push("other-block", blockDefs(b.type), b.settings ?? {}, bid);
  const strip = (c: Cand): MediaTarget => ({ template: c.template, section: c.section, ...(c.block ? { block: c.block } : {}), key: c.key, current: c.current });

  // 1. L'adresse de l'image affichée désigne le fichier : on retrouve le réglage qui le contient.
  const file = sel.src ? fileOf(sel.src) : "";
  if (file) {
    const hit = cands.find((c) => c.current && (c.current === file || file.endsWith(c.current) || (sel.src ?? "").includes(c.current)));
    if (hit) return strip(hit);
  }
  // 2. Sinon (emplacement vide, image par défaut) : le seul emplacement du bloc désigné, puis de la section.
  for (const scope of ["block", "section"] as const) {
    const list = cands.filter((c) => c.scope === scope);
    if (list.length === 1) return strip(list[0]);
    const main = list.find((c) => c.key === (want === "video" ? "video_asset" : "image_asset"));
    if (main) return strip(main);
    if (list.length) return null;
  }
  return null;
}

/**
 * Moteur local : image désignée + image jointe → use_media. Renvoie null si la demande ne concerne pas
 * le remplacement d'un média (le reste du moteur local prend alors le relais).
 */
export function localMediaReplace(spec: ThemeSpec, message: string, sel: MediaSelection, atts: MediaAttachment[]): { ops: ThemeOp[]; reply: string } | null {
  const media = atts.filter((a) => a.kind === "image" || a.kind === "video" || a.kind === "logo");
  const asksReplace = REPLACE_INTENT.test(message) || /\b(image|photo|visuel|picture|vidéo|video)\b/i.test(message);
  if (!media.length) {
    if (isMediaSelection(sel) && REPLACE_INTENT.test(message))
      return {
        ops: [],
        reply: L(
          "Je n'ai pas reçu de nouvelle image. Joignez-la avec le trombone (bibliothèque du projet) ou le bouton d'import, puis renvoyez « Remplace cette image par celle-ci ».",
          "I didn't receive a new image. Attach it with the paperclip (project library) or the upload button, then send “Replace this image with this one” again.",
        ),
      };
    return null;
  }
  if (!sel || sel.kind === "Section") {
    if (!asksReplace) return null;
    return {
      ops: [],
      reply: L(
        "Pour remplacer une image précise : cliquez sur la cible (viseur) puis sur l'image dans l'aperçu, joignez la nouvelle image et envoyez « Remplace cette image par celle-ci ».",
        "To replace a specific image: click the crosshair, then the image in the preview, attach the new image and send “Replace this image with this one”.",
      ),
    };
  }
  if (!isMediaSelection(sel) && !asksReplace) return null;
  const att = media[0];
  const want = att.kind === "video" ? "video" : "image";
  const target = mediaTargetOf(spec, sel, want);
  if (!target)
    return {
      ops: [],
      reply: L(
        want === "video"
          ? "Je ne trouve pas d'emplacement vidéo modifiable à cet endroit. Désignez directement la vidéo dans l'aperçu."
          : "Cette image n'est pas un emplacement de la page : les photos d'un produit se changent dans l'onglet Produit, le logo dans l'onglet Marque. Pour une autre image, désignez-la directement dans l'aperçu, puis réessayez.",
        want === "video"
          ? "I can't find an editable video slot here. Select the video itself in the preview."
          : "This image isn't a page slot: product photos are changed in the Product tab, the logo in the Brand tab. For another image, select it directly in the preview, then try again.",
      ),
    };
  const extra = media.length > 1 ? L(` (j'ai utilisé la première des ${media.length} pièces jointes)`, ` (I used the first of the ${media.length} attachments)`) : "";
  return {
    ops: [{ op: "use_media", template: target.template, section: target.section, ...(target.block ? { block: target.block } : {}), key: target.key, assetId: att.assetId }],
    reply: L(`C'est fait : l'image désignée est remplacée par « ${att.name} »${extra}.`, `Done: the selected image is replaced with “${att.name}”${extra}.`),
  };
}
