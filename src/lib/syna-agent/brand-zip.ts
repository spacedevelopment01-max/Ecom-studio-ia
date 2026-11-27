/**
 * « TOUT TÉLÉCHARGER » DE LA MARQUE (planche en vrai, 25 novembre 2026 ; le propriétaire : « Le clients pourra télécharger
 * les logo image au besoin et les code couleur seront la aussi en copier coller ? ») : un seul fichier zip avec les huit
 * versions du logo (ni logo compact ni logo empilé, retirés le 27 novembre 2026, même pour un ancien projet) (PNG haute définition, fond transparent), les favicons et l'avatar, chaque image en haute définition,
 * la planche en vrai entière, les codes des couleurs et les deux polices avec leur fichier. Gratuit, sans IA.
 */
import fs from "node:fs";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { FONT_DIR } from "../media/fonts";
import { imagesMontrees, type EtatPlancheEnVrai } from "./planche-en-vrai";
import { estUneVersionDuLogo } from "./planche-en-vrai-code";

/** Les fichiers du zip, par chemin. `lire` rend les octets d'un fichier rangé (null : introuvable, il est omis). */
export function fichiersDeLaMarque(ev: EtatPlancheEnVrai, nom: string, lire: (id: string) => Buffer | null, lirePolice: (fichier: string) => Buffer | null = lirePoliceLocale): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  const mettre = (chemin: string, id: string | null | undefined) => { if (!id) return; const b = lire(id); if (b) out[chemin] = new Uint8Array(b); };
  for (const l of ev.logos.filter((x) => estUneVersionDuLogo(x.version))) mettre(`logos/${l.version}.png`, l.id);
  if (ev.favicons) { mettre("logos/favicon-32.png", ev.favicons.f32); mettre("logos/favicon-64.png", ev.favicons.f64); mettre("logos/favicon-512.png", ev.favicons.f512); mettre("logos/avatar.png", ev.favicons.avatar); }
  // Les images montrées dans l'onglet Marque, rognées au contenu ; le site en une seule image quand il y est.
  for (const e of imagesMontrees(ev)) mettre(`images/${e.element === "site" ? "site-ordinateur-et-telephone" : e.element}${e.ambiance ? "-image-d-ambiance" : ""}.png`, e.id);
  mettre("planche-en-vrai.png", ev.planche?.id);
  out["couleurs.txt"] = strToU8([`Couleurs de ${nom}`, "", ...ev.palette.map((c) => `${c.hex}${c.nom ? `  ${c.nom}` : ""}`), ""].join("\n"));
  if (ev.polices) {
    const lignes = [`Polices de ${nom}`, ""];
    for (const role of ["titres", "textes"] as const) {
      const p = ev.polices[role];
      lignes.push(`${role === "titres" ? "Titres" : "Textes"} : ${p.famille}${p.remplacee && p.lue ? ` (la plus proche de « ${p.lue} »)` : ""}`);
      const b = lirePolice(p.fichier);
      if (b) out[`polices/${p.fichier}`] = new Uint8Array(b);
    }
    out["polices.txt"] = strToU8(`${lignes.join("\n")}\n`);
  }
  return out;
}
const lirePoliceLocale = (fichier: string): Buffer | null => {
  if (!/^[\w.-]+\.ttf$/.test(fichier)) return null;
  try { return fs.readFileSync(path.join(FONT_DIR, fichier)); } catch { return null; }
};
/** Le zip lui-même (dates fixes : le même contenu donne le même fichier). */
export const zipDeLaMarque = (fichiers: Record<string, Uint8Array>): Uint8Array => zipSync(fichiers, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
