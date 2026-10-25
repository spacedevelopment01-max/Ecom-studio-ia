/**
 * Export statique des démos (scripts/reference-static-preview.ts) : depuis le lot 9, l'aperçu embarque ses ressources
 * (adresses data:) pour l'iframe d'origine opaque. L'export les remet en fichiers partagés `assets/inline-<empreinte>`
 * (un fichier par contenu) : pages légères, aucune copie par page ni par état du panier. Les data: d'une feuille ou
 * d'un script embarqué sont écrites à côté de lui. Types limités à ceux que le studio sert (theme-demos.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/svg+xml": "svg", "font/ttf": "ttf", "font/otf": "otf", "font/woff": "woff", "font/woff2": "woff2", "text/css": "css", "application/javascript": "js", "text/javascript": "js", "video/mp4": "mp4", "video/webm": "webm" };
/** Plus petit contenu remis en fichier (encodé) : les très petites ressources restent dans la page. */
export const MIN_INLINE_FILE = 2048;

export function staticDeinliner(assetsDir: string) {
  const written = new Set<string>();
  const deinline = (text: string, prefix = "assets/"): string => text.replace(/data:([a-z0-9.+/-]+)((?:;[a-z0-9=._-]+)*);base64,([A-Za-z0-9+/=]+)/gi, (m, mime: string, _params: string, b64: string) => {
    const ext = EXT[mime.toLowerCase()];
    if (!ext || b64.length < MIN_INLINE_FILE) return m;
    let buf = Buffer.from(b64, "base64");
    if (ext === "css" || ext === "js") buf = Buffer.from(deinline(buf.toString("utf8"), ""));
    const name = `inline-${createHash("sha256").update(buf).digest("hex").slice(0, 20)}.${ext}`;
    if (!written.has(name)) { written.add(name); fs.writeFileSync(path.join(assetsDir, name), buf); }
    return prefix + name;
  });
  return { deinline, written };
}
