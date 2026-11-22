/**
 * LA SIGNATURE « FAIT PAR L'IA » DES IMAGES D'OPENAI (C2PA), GARDÉE (22 novembre 2026). OpenAI met dans chaque image un
 * manifeste C2PA, lisible par une machine, qui dit qu'elle est créée par une IA. L'article 50 du règlement européen sur
 * l'IA exige ce marquage (délai du 2 décembre 2026 pour les outils déjà en service), et Meta et TikTok s'en servent pour
 * étiqueter. Ré-encoder une image (sharp, `.png()`, `.jpeg()`) l'efface : une image d'OpenAI que le Studio garde telle
 * quelle est donc rangée avec ses octets d'origine.
 *
 * Une image transformée (recadrée, composée, détourée, éclaircie) ne peut pas garder la signature d'origine : le
 * manifeste est lié aux pixels, le recopier serait une fausse preuve. Ces images-là devront être signées par le Studio
 * lui-même (manifeste C2PA qui cite l'image d'OpenAI comme ingrédient) : cela demande un certificat de signature reconnu
 * par la liste de confiance C2PA et une bibliothèque de signature ; c'est au propriétaire de décider (voir le compte
 * rendu du 22 novembre).
 */
import sharp from "sharp";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const estPng = (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(PNG);

/** L'image porte-t-elle un manifeste C2PA (PNG : bloc « caBX » ; JPEG : segment APP11 « jumb » ; WebP : bloc « C2PA ») ? */
export function aLaSignatureIa(b: Buffer): boolean {
  if (estPng(b)) {
    for (let i = 8; i + 8 <= b.length;) {
      const len = b.readUInt32BE(i), type = b.toString("latin1", i + 4, i + 8);
      if (type === "caBX") return true;
      if (type === "IEND") return false;
      i += 12 + len;
    }
    return false;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 4 <= b.length && b[i] === 0xff;) {
      const marker = b[i + 1], len = b.readUInt16BE(i + 2);
      if (marker === 0xeb && b.subarray(i + 4, i + 4 + len).includes(Buffer.from("jumb"))) return true;
      if (marker === 0xda) return false;
      i += 2 + len;
    }
    return false;
  }
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return b.includes(Buffer.from("C2PA"));
  return false;
}

/** L'image en PNG, SANS ré-encoder une image qui l'est déjà (sa signature « fait par l'IA » reste). */
export async function pngSansPerte(b: Buffer): Promise<Buffer> {
  return estPng(b) ? b : sharp(b).png().toBuffer();
}
