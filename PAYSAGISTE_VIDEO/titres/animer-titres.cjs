// Titres ANIMÉS du film Racines & Pierres (séquences PNG 1080 × 1920 transparentes, 30 i/s) : grands mots sur bandeau
// de couleur qui se déroule, lettres qui montent une à une, étiquette qui rebondit, numéro de plan ; carte finale avec
// logo réel qui surgit, slogan qui glisse, bouton qui pulse. Palette de la marque, polices du studio (tracées en
// chemins vectoriels : rendu identique partout). Relancer après modification : node PAYSAGISTE_VIDEO/titres/animer-titres.cjs
const fs = require("fs"), path = require("path"), sharp = require("sharp"), opentype = require("opentype.js");
const FONTS = path.join(__dirname, "../../assets/fonts"), OUT = path.join(__dirname, "anim");
const font = (f) => opentype.parse(fs.readFileSync(path.join(FONTS, f)).buffer.slice(0));
const BIG = font("BricolageGrotesque-800.ttf"), SMALL = font("DMSans-700.ttf"), SERIF = font("Cormorant-500italic.ttf");
const W = 1080, H = 1920, FPS = 30;
const C = { green: "#3F6B4A", mint: "#DCE6D2", rose: "#E89BA7", cream: "#F7F8F1", dark: "#1D2E22" };
const clamp = (x) => Math.max(0, Math.min(1, x));
const outCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
const inCubic = (x) => Math.pow(clamp(x), 3);
const outBack = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// Lettres posées une à une (chemins), avec décalage vertical et opacité propres à chaque lettre.
function letters(f, text, size, x0, y, fill, per) {
  let x = x0, out = "";
  const glyphs = [...text].map((ch) => f.charToGlyph(ch)); // sans mise en forme OpenType (non gérée pour ces polices)
  glyphs.forEach((g, i) => {
    const { dy = 0, op = 1 } = per(i);
    if (op > 0.01) out += `<path d="${g.getPath(Math.round(x), Math.round(y + dy), size).toPathData(2)}" fill="${fill}" opacity="${op.toFixed(3)}"/>`;
    x += (g.advanceWidth / f.unitsPerEm) * size + (i < glyphs.length - 1 ? (f.getKerningValue(g, glyphs[i + 1]) / f.unitsPerEm) * size : 0);
  });
  return out;
}
const width = (f, text, size) => {
  const g = [...text].map((ch) => f.charToGlyph(ch));
  return g.reduce((w, x, i) => w + (x.advanceWidth / f.unitsPerEm) * size + (i < g.length - 1 ? (f.getKerningValue(x, g[i + 1]) / f.unitsPerEm) * size : 0), 0);
};
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
async function sequence(name, dur, frame) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * FPS);
  for (let k = 0; k < n; k++) await sharp(svg(frame(k / FPS, dur))).png({ compressionLevel: 3 }).toFile(path.join(dir, `${String(k).padStart(3, "0")}.png`));
  console.log(name, n, "images");
}
// Titre d'un plan : numéro, petit bandeau « ON », grand bandeau du verbe qui se déroule, lettres qui montent une à
// une, étiquette qui rebondit, sortie balayée.
function titre({ num, mot, tag, band, ink, pill, pillInk, band2, ink2 }) {
  const verb = mot.replace(/^ON\s+/, ""), bx = 60;
  const size = Math.min(260, Math.floor(178 * (W - 2 * bx - 90) / width(BIG, verb, 178))), bh = Math.round(size * 1.3), by = 1530 - bh;
  const bw = width(BIG, verb, size) + 90;
  const sOn = 96, onH = 130, onW = width(BIG, "ON", sOn) + 70, onY = by - onH + 14;
  return (t, D) => {
    const exit = inCubic((t - (D - 0.4)) / 0.4);
    const strip = (x0, y0, w0, h0, delay, color, rx) => {
      const g = outCubic((t - delay) / 0.36), x = x0 + exit * (w0 + x0), w = Math.max(0, w0 * g - exit * w0);
      return { x, w, svg: `<rect x="${x}" y="${y0}" width="${w}" height="${h0}" rx="${rx}" fill="${color}"/>` };
    };
    let s = `<defs><filter id="sh" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity="0.38"/></filter>`;
    const a = strip(bx, onY, onW, onH, 0, band2, 22), b = strip(bx, by, bw, bh, 0.12, band, 30);
    s += `<clipPath id="ca"><rect x="${a.x}" y="${onY}" width="${a.w}" height="${onH}"/></clipPath><clipPath id="cb"><rect x="${b.x}" y="${by}" width="${b.w}" height="${bh}"/></clipPath></defs>`;
    const nOp = clamp(t / 0.3) * (1 - exit);
    s += letters(BIG, num, 120, 70, 230, C.cream, () => ({ op: nOp * 0.95 }));
    s += `<rect x="72" y="258" width="${90 * outCubic((t - 0.1) / 0.4) * (1 - exit)}" height="10" rx="5" fill="${band}"/>`;
    s += `<g filter="url(#sh)">${b.svg}${a.svg}</g>`;
    s += `<g clip-path="url(#ca)">` + letters(BIG, "ON", sOn, bx + 35, onY + onH / 2 + sOn * 0.36, ink2, () => {
      const p = outCubic((t - 0.1) / 0.3); return { dy: (1 - p) * 80, op: p };
    }) + `</g>`;
    s += `<g clip-path="url(#cb)">` + letters(BIG, verb, size, bx + 45, by + bh / 2 + size * 0.36, ink, (i) => {
      const p = outCubic((t - 0.28 - i * 0.045) / 0.32); return { dy: (1 - p) * 160, op: p };
    }) + `</g>`;
    const ps = outBack((t - 0.7) / 0.45) * (1 - exit), tagSize = 42, tagW = width(SMALL, tag, tagSize) + 72, px = bx + 6, py = by + bh + 30, ph = 90;
    if (ps > 0.01) {
      const cx = px + tagW / 2, cy = py + ph / 2;
      s += `<g transform="translate(${cx} ${cy}) scale(${ps.toFixed(3)}) translate(${-cx} ${-cy})"><rect x="${px}" y="${py}" width="${tagW}" height="${ph}" rx="45" fill="${pill}"/>`
        + letters(SMALL, tag, tagSize, px + 36, py + ph / 2 + 15, pillInk, () => ({})) + `</g>`;
    }
    return s;
  };
}
// Carte finale : fond vert, logo réel qui surgit, slogan qui glisse, bouton qui pulse.
async function carteFinale() {
  const src = path.join(__dirname, "../../public/demo/paysagiste/logo.png"), lw = 600;
  const raw = await sharp(src).extract({ left: 62, top: 62, width: 862, height: 708 }).resize({ width: lw }).png().toBuffer();
  const lh = Math.round(708 * lw / 862), logo64 = raw.toString("base64");
  const s1 = "Votre jardin,", s2 = "pensé pour durer.", btn = "DEMANDER UN DEVIS";
  return (t) => {
    const pop = outBack(t / 0.55), cx = W / 2, top = 300, cy = top + lh / 2;
    let s = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity="0.35"/></filter>
      <clipPath id="r"><rect x="${cx - lw / 2}" y="${top}" width="${lw}" height="${lh}" rx="34"/></clipPath></defs>`;
    // Cercles de couleur qui s'ouvrent derrière le logo.
    const ring = outCubic(t / 0.9);
    s += `<circle cx="${cx}" cy="${cy}" r="${520 * ring}" fill="${C.dark}" opacity="0.18"/><circle cx="${cx}" cy="${cy}" r="${430 * ring}" fill="none" stroke="${C.rose}" stroke-width="6" opacity="${0.9 * ring}"/>`;
    if (pop > 0.01) s += `<g filter="url(#sh)" transform="translate(${cx} ${cy}) scale(${pop.toFixed(3)}) translate(${-cx} ${-cy})"><rect x="${cx - lw / 2 - 26}" y="${top - 26}" width="${lw + 52}" height="${lh + 52}" rx="48" fill="${C.cream}"/><g clip-path="url(#r)"><image href="data:image/png;base64,${logo64}" x="${cx - lw / 2}" y="${top}" width="${lw}" height="${lh}"/></g></g>`;
    const a = outCubic((t - 0.45) / 0.5), b = outCubic((t - 0.65) / 0.5);
    const w1 = width(SERIF, s1, 104), w2 = width(SERIF, s2, 104);
    s += letters(SERIF, s1, 104, (W - w1) / 2, 1080 + (1 - a) * 60, C.cream, () => ({ op: a }));
    s += letters(SERIF, s2, 104, (W - w2) / 2, 1195 + (1 - b) * 60, C.rose, () => ({ op: b }));
    const bp = outBack((t - 0.95) / 0.45), pulse = t > 1.5 ? 1 + 0.045 * Math.sin((t - 1.5) * Math.PI * 2 / 0.9) : 1, sc = bp * pulse;
    if (bp > 0.01) {
      const bw = 680, bh = 124, bx = (W - bw) / 2, byy = 1330, tw = width(SMALL, btn, 44), bcx = W / 2, bcy = byy + bh / 2;
      s += `<g transform="translate(${bcx} ${bcy}) scale(${sc.toFixed(3)}) translate(${-bcx} ${-bcy})"><rect x="${bx}" y="${byy}" width="${bw}" height="${bh}" rx="62" fill="${C.rose}"/>`
        + letters(SMALL, btn, 44, (W - tw) / 2, byy + bh / 2 + 16, C.dark, () => ({})) + `</g>`;
    }
    return s;
  };
}
(async () => {
  await sequence("cree", 4.0, titre({ num: "01", mot: "ON CRÉE.", tag: "CRÉATION DE JARDIN", band: C.rose, ink: C.dark, pill: C.green, pillInk: C.cream, band2: C.cream, ink2: C.green }));
  await sequence("amenage", 4.0, titre({ num: "02", mot: "ON AMÉNAGE.", tag: "TERRASSES · ALLÉES · MURETS", band: C.mint, ink: C.green, pill: C.rose, pillInk: C.dark, band2: C.green, ink2: C.cream }));
  await sequence("entretient", 3.6, titre({ num: "03", mot: "ON ENTRETIENT.", tag: "ENTRETIEN À L’ANNÉE", band: C.green, ink: C.cream, pill: C.cream, pillInk: C.green, band2: C.rose, ink2: C.dark }));
  await sequence("fin", 2.6, await carteFinale());
})();
