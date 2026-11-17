/**
 * Tour des sections : les planches. Une planche par pièce et par état de contenu : une ligne par construction, une
 * colonne par tenue et par largeur d'écran ; chaque défaut mesuré est encadré en rouge et numéroté, et redit en clair
 * sous la ligne. Les téléphones (320 et 390 px, à taille réelle) et l'ordinateur (réduit) ont chacun leur planche.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Defaut } from "./banc";

// ══════════════════════════════════════════════════════════ les mesures d'une planche
/** Une planche ne dépasse jamais ces dimensions (au-delà, elle est coupée en plusieurs). */
export const PLANCHE_LARGEUR_MAX = 2400;
export const PLANCHE_HAUTEUR_MAX = 7000;
/** Une capture plus haute que cela (une fois mise à l'échelle) continue sur la ligne suivante. */
export const BANDE_MAX = 3000;
const MARGE = 20, ENTETE = 62, LIBELLE = 40, COLONNE = 26, LEGENDE_LIGNE = 22, LEGENDE_MAX = 14;
/** Au plus tant de cadres rouges par capture (les suivants sont dans defauts.json). */
export const CADRES_MAX = 40;

export type Cellule = { tenue: string; largeur: number; fichier: string | null; hauteur: number; defauts: (Defaut & { numero: number })[]; note?: string };
export type Ligne = { libelle: string; cellules: Cellule[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const texte = (w: number, h: number, t: string, o: { size?: number; fill?: string; bg?: string; bold?: boolean; x?: number } = {}) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${o.bg ?? "#ffffff"}"/><text x="${o.x ?? 8}" y="${Math.round(h * 0.7)}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${o.size ?? 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill ?? "#1b1a17"}">${esc(t)}</text></svg>`)).png().toBuffer();
const couleurDe = (g: string) => (g === "bloquant" ? "#E0002A" : g === "important" ? "#E0002A" : "#C25A00");

/** La capture d'une cellule, mise à l'échelle, avec ses cadres rouges numérotés ; coupée en bandes si elle est très haute. */
async function bandes(c: Cellule, echelle: number, colonne: number): Promise<Buffer[]> {
  if (!c.fichier || !fs.existsSync(c.fichier)) return [await texte(colonne, 60, c.note ?? "non rendue par le Studio", { size: 14, fill: "#7a7468", bg: "#f1eee8" })];
  const meta = await sharp(c.fichier).metadata(), W = meta.width ?? c.largeur, H = meta.height ?? c.hauteur;
  const w = Math.max(1, Math.round(W * echelle)), h = Math.max(1, Math.round(H * echelle));
  const cadres = c.defauts.slice(0, CADRES_MAX).map((d) => {
    const [x, y, dw, dh] = d.cadre, col = couleurDe(d.gravite);
    const rx = Math.max(1, Math.round(x * echelle)), ry = Math.max(1, Math.round(y * echelle)), rw = Math.max(8, Math.min(w - rx - 1, Math.round(dw * echelle))), rh = Math.max(8, Math.min(h - ry - 1, Math.round(dh * echelle)));
    if (rw <= 0 || rh <= 0 || ry >= h) return "";
    const n = String(d.numero), tw = 9 + n.length * 8, ty = ry >= 18 ? ry - 17 : Math.min(h - 18, ry + 1);
    return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="${col}" stroke-width="2.5"${d.gravite === "mineur" ? ' stroke-dasharray="6 4"' : ""}/><rect x="${rx}" y="${ty}" width="${tw}" height="17" fill="${col}"/><text x="${rx + 4}" y="${ty + 13}" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#fff">${n}</text>`;
  }).join("");
  const image = await sharp(c.fichier).resize(w, h, { fit: "fill" }).composite(cadres ? [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${cadres}</svg>`), left: 0, top: 0 }] : []).png().toBuffer();
  if (h <= BANDE_MAX) return [image];
  const out: Buffer[] = [];
  for (let y = 0; y < h; y += BANDE_MAX) out.push(await sharp(image).extract({ left: 0, top: y, width: w, height: Math.min(BANDE_MAX, h - y) }).png().toBuffer());
  return out;
}

/**
 * Assemble les planches d'une pièce pour un état : `<dossier>/<nom>--tel.jpg` et `<nom>--ordi.jpg` (suivies de
 * « -2 », « -3 » quand il en faut plusieurs). Rend les fichiers écrits.
 */
export async function assembler(o: { dossier: string; nom: string; titre: string; lignes: Ligne[]; tenues: string[]; largeurs: number[] }): Promise<string[]> {
  fs.mkdirSync(o.dossier, { recursive: true });
  const ecrits: string[] = [];
  const groupes = [{ cle: "tel", largeurs: o.largeurs.filter((l) => l <= 480) }, { cle: "ordi", largeurs: o.largeurs.filter((l) => l > 480) }].filter((g) => g.largeurs.length);
  for (const g of groupes) {
    const colonnes = o.tenues.flatMap((t) => g.largeurs.map((l) => ({ tenue: t, largeur: l })));
    const brut = colonnes.reduce((a, c) => a + c.largeur, 0), libre = PLANCHE_LARGEUR_MAX - MARGE * (colonnes.length + 1);
    const echelle = Math.min(1, libre / brut), W = Math.round(brut * echelle) + MARGE * (colonnes.length + 1);
    const xDe = (i: number) => MARGE + colonnes.slice(0, i).reduce((a, c) => a + Math.round(c.largeur * echelle) + MARGE, 0);
    // Les blocs à empiler : pour chaque ligne, son libellé, ses bandes de captures, sa légende.
    const blocs: { h: number; parts: { input: Buffer; left: number; top: number }[] }[] = [];
    for (const ligne of o.lignes) {
      const cells = await Promise.all(colonnes.map(async (c) => { const cell = ligne.cellules.find((x) => x.tenue === c.tenue && x.largeur === c.largeur); return cell ? { cell, bandes: await bandes(cell, echelle, Math.round(c.largeur * echelle)) } : { cell: null, bandes: [await texte(Math.round(c.largeur * echelle), 60, "non rendue", { size: 14, fill: "#7a7468", bg: "#f1eee8" })] }; }));
      const n = Math.max(...cells.map((x) => x.bandes.length));
      for (let b = 0; b < n; b++) {
        const parts: { input: Buffer; left: number; top: number }[] = [{ input: await texte(W, LIBELLE, `${ligne.libelle}${b ? `  (suite ${b + 1})` : ""}`.slice(0, 200), { size: 18, bold: true, bg: "#e9e6df", x: MARGE }), left: 0, top: 0 }];
        let hmax = 0;
        for (const [i, x] of cells.entries()) {
          parts.push({ input: await texte(Math.round(colonnes[i].largeur * echelle), COLONNE, `${colonnes[i].tenue} · ${colonnes[i].largeur} px${x.cell?.note ? ` · ${x.cell.note}` : ""}`, { size: 13, fill: "#5b564c" }), left: xDe(i), top: LIBELLE });
          const img = x.bandes[b];
          if (!img) continue;
          const m = await sharp(img).metadata();
          parts.push({ input: img, left: xDe(i), top: LIBELLE + COLONNE });
          hmax = Math.max(hmax, m.height ?? 0);
        }
        let h = LIBELLE + COLONNE + hmax + 8;
        // La légende, sous la dernière bande de la ligne.
        if (b === n - 1) {
          const tous = cells.flatMap((x) => (x.cell ? x.cell.defauts.map((d) => ({ d, c: x.cell! })) : []));
          const lignes = tous.slice(0, LEGENDE_MAX).map(({ d, c }) => `${c.tenue} ${c.largeur} · n° ${d.numero} · ${d.gravite} · ${d.type} : ${d.detail}${d.texte ? ` — « ${d.texte.slice(0, 40)} »` : ""}  [${d.selecteur}]`.slice(0, 250));
          if (tous.length > LEGENDE_MAX) lignes.push(`… et ${tous.length - LEGENDE_MAX} autre(s) défaut(s) sur cette ligne : voir defauts.json`);
          if (!tous.length) lignes.push("aucun défaut mesuré sur cette ligne");
          for (const [k, l] of lignes.entries()) parts.push({ input: await texte(W - 2 * MARGE, LEGENDE_LIGNE, l, { size: 13, fill: tous.length ? "#9b0019" : "#2f6b3a" }), left: MARGE, top: h + k * LEGENDE_LIGNE });
          h += lignes.length * LEGENDE_LIGNE + 14;
        }
        blocs.push({ h, parts });
      }
    }
    // Les planches : on empile jusqu'à la hauteur maximale.
    let no = 1, pile: typeof blocs = [], haut = ENTETE;
    const ecrire = async () => {
      if (!pile.length) return;
      const H = Math.min(PLANCHE_HAUTEUR_MAX, haut + MARGE);
      const composites: { input: Buffer; left: number; top: number }[] = [{ input: await texte(W, ENTETE, `${o.titre} · ${g.cle === "tel" ? "téléphone" : "ordinateur"}${no > 1 ? ` · planche ${no}` : ""}`.slice(0, 190), { size: 22, bold: true, fill: "#ffffff", bg: "#1b1a17", x: MARGE }), left: 0, top: 0 }];
      let y = ENTETE;
      for (const b of pile) { for (const p of b.parts) composites.push({ input: p.input, left: p.left, top: y + p.top }); y += b.h; }
      const f = path.join(o.dossier, `${o.nom}--${g.cle}${no > 1 ? `-${no}` : ""}.jpg`);
      await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } }).composite(composites.filter((c) => c.top < H)).jpeg({ quality: 82 }).toFile(f);
      ecrits.push(f); no++; pile = []; haut = ENTETE;
    };
    for (const b of blocs) { if (pile.length && haut + b.h + MARGE > PLANCHE_HAUTEUR_MAX) await ecrire(); pile.push(b); haut += b.h; }
    await ecrire();
  }
  return ecrits;
}
