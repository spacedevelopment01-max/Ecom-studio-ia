/**
 * Symbole dessiné par une IA d'images (image matricielle) → SVG vectoriel d'une seule couleur, pour entrer dans le
 * même circuit que les autres symboles (nettoyage, lisibilité en petit, planches, déclinaisons, export).
 * Le dessin est recadré, mis en noir et blanc, puis vectorisé (imagetracerjs, sans dépendance).
 */
import sharp from "sharp";
// @ts-expect-error — module sans types
import ImageTracer from "imagetracerjs";

const SIZE = 256;

export async function traceSymbol(image: Buffer): Promise<{ ok: true; svg: string } | { ok: false; reason: string }> {
  // Fond uni → blanc, dessin → noir ; recadrage serré sur le dessin avec une petite marge.
  const bw = await sharp(image).rotate().flatten({ background: "#ffffff" }).greyscale().threshold(150).png().toBuffer();
  // Image vide ou entièrement remplie : aucun dessin à reprendre.
  const stats = await sharp(bw).stats();
  const darkShare = 1 - stats.channels[0].mean / 255;
  if (darkShare < 0.01) return { ok: false, reason: "image vide (aucun dessin)" };
  if (darkShare > 0.9) return { ok: false, reason: "dessin plein (pas de forme lisible)" };
  let trimmed: Buffer;
  try {
    trimmed = await sharp(bw).trim({ background: "#ffffff", threshold: 10 }).toBuffer();
  } catch {
    return { ok: false, reason: "image vide (aucun dessin)" };
  }
  const { data, info } = await sharp(trimmed)
    .resize(SIZE - 24, SIZE - 24, { fit: "contain", background: "#ffffff" })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#ffffff" })
    .threshold(128)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dark++;
  const ratio = dark / (info.width * info.height);
  if (ratio < 0.03) return { ok: false, reason: "dessin presque vide" };
  if (ratio > 0.85) return { ok: false, reason: "dessin plein (pas de forme lisible)" };
  const svg: string = ImageTracer.imagedataToSVG(
    { width: info.width, height: info.height, data },
    { numberofcolors: 2, colorsampling: 0, pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], ltres: 1.5, qtres: 1.5, pathomit: 24, roundcoords: 0, blurradius: 0, viewbox: true, desc: false },
  );
  // Seules les formes noires sont gardées, réunies en un tracé (les trous se découpent par la règle evenodd).
  const ds = [...svg.matchAll(/<path fill="rgb\(0,0,0\)"[^>]*\sd="([^"]+)"/g)].map((m) => m[1].trim());
  if (!ds.length) return { ok: false, reason: "aucune forme vectorisable" };
  const d = ds.join(" ").replace(/\s+/g, " ");
  return { ok: true, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.width} ${info.height}"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>` };
}
