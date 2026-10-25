import sharp from "sharp";
import sanitizeHtml from "sanitize-html";
import { HttpError } from "./auth";
import { L } from "./i18n-server";

const refused = () => new HttpError(415, L("Ce fichier est malformé, actif ou ne correspond pas au type annoncé.", "This file is malformed, active or does not match its declared type."), "unsafe_file");
const cssDecoded=(value:string)=>value.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi,(_m,hex,char)=>hex?String.fromCodePoint(Math.min(parseInt(hex,16),0x10ffff)):char);
function unsafeCss(value:string){
 const css=cssDecoded(value);if(/@import|expression\s*\(/i.test(css))return true;
 const urls=[...css.matchAll(/url\s*\(\s*([^)]*)\)/gi)];
 return /url\s*\(/i.test(css)&&(!urls.length||urls.some(m=>!/^#[\w.:-]+$/.test(m[1].trim().replace(/^['"]|['"]$/g,""))));
}

/** Accepte le SVG statique (tracés, gradients…), sans exécuter ni réécrire silencieusement le logo. */
export function assertStaticSvg(data: Buffer) {
  const text = data.toString("utf8");
  if (text.length > 4 * 1048576 || !/<svg(?:\s|>)/i.test(text) || /<!DOCTYPE|<!ENTITY|<\?|@import|expression\s*\(/i.test(text.replace(/^\s*<\?xml[^?]*\?>/i, ""))) throw refused();
  for(const block of text.matchAll(/<style\b[^>]*>([\s\S]*?)(?:<\/style\s*>|$)/gi))if(unsafeCss(block[1]))throw refused();
  sanitizeHtml(text, {
    allowedTags: false, allowedAttributes: false, allowVulnerableTags: true,
    transformTags: { "*": (tagName, attribs) => {
      if (["script", "foreignobject", "iframe", "object", "embed", "animate", "animatetransform", "set", "audio", "video"].includes(tagName.toLowerCase())) throw refused();
      for (const [name, value] of Object.entries(attribs)) {
        if (/^on/i.test(name) || /^(?:href|xlink:href|src)$/i.test(name) && !/^#[a-z0-9_.:-]+$/i.test(value)) throw refused();
        if(unsafeCss(value))throw refused();
      }
      return { tagName, attribs };
    } },
    textFilter: (text, tagName) => { if (tagName === "style" && unsafeCss(text)) throw refused(); return text; },
  });
}

export async function checkedUpload(data: Buffer, name: string, declaredMime: string): Promise<string> {
  if (!name || name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(name) || name === "." || name === "..") throw refused();
  const mime = declaredMime.toLowerCase().split(";")[0];
  const start = data.subarray(0, 512).toString("utf8").trimStart();
  if(mime.startsWith("image/")&&start.startsWith("<"))assertStaticSvg(data);
  if (mime === "image/svg+xml") {
    assertStaticSvg(data);
    try{const m=await sharp(data,{limitInputPixels:40_000_000,failOn:"error"}).metadata();if(!m.width||!m.height||m.width*m.height>40_000_000)throw refused();await sharp(data,{limitInputPixels:40_000_000,failOn:"error"}).resize(1,1).png().toBuffer();}catch{throw refused();}
    return mime;
  }
  if (/^image\//.test(mime)) {
    try {
      const m = await sharp(data, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
      const types: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heif: m.compression === "av1" ? "image/avif" : "image/heic", avif: "image/avif" };
      if (!m.format || !types[m.format] || types[m.format] !== mime || !m.width || !m.height || m.width * m.height * (m.pages ?? 1) > 40_000_000) throw refused();
      // Décoder réellement les pixels, pas uniquement lire l'en-tête.
      await sharp(data, { limitInputPixels: 40_000_000, failOn: "error" }).resize(1, 1).png().toBuffer();
      return types[m.format];
    } catch { throw refused(); }
  }
  if (/^video\//.test(mime) || /^audio\//.test(mime)) {
    const is = (at: number, s: string) => data.subarray(at, at + s.length).toString("binary") === s;
    const valid = /^(?:video\/(?:mp4|quicktime)|audio\/mp4)$/.test(mime) ? is(4, "ftyp")
      : /^(?:video|audio)\/webm$/.test(mime) ? data.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))
      : /^(?:audio\/(?:x-)?wav)$/.test(mime) ? is(0,"RIFF") && is(8,"WAVE")
      : mime === "audio/ogg" ? is(0,"OggS")
      : mime === "audio/mpeg" ? is(0,"ID3") || data[0] === 0xff && (data[1] & 0xe0) === 0xe0
      : mime === "audio/aac" ? data[0] === 0xff && (data[1] & 0xf6) === 0xf0 : false;
    if (!valid) throw refused();
    return mime;
  }
  if (/^application\/(?:zip|x-zip-compressed)$/.test(mime) && data.subarray(0,2).toString() === "PK") return "application/zip";
  if (mime === "application/pdf" && start.startsWith("%PDF-")) return mime;
  if (/^(?:text\/(?:plain|markdown|csv|vtt)|application\/(?:json|x-subrip))$/.test(mime) && !data.includes(0) && !/^<(?:!doctype|html|svg|script|\?xml)/i.test(start)) return mime;
  // Documents bureautiques et polices : seulement leurs signatures reconnues, toujours téléchargés sans exécution.
  if (/\.(?:docx|xlsx|pptx)$/i.test(name) && data.subarray(0,2).toString() === "PK") return mime;
  if (/\.(?:ttf|otf|woff2?)$/i.test(name) && ["00010000", "4f54544f", "774f4646", "774f4632"].includes(data.subarray(0,4).toString("hex"))) return mime;
  throw refused();
}
