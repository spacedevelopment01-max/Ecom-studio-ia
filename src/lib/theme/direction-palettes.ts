/**
 * Palette PROPRE à chaque direction artistique : choisir une direction change vraiment les couleurs (site, logo,
 * charte, visuels). La palette est verrouillée par la direction — pour changer de couleurs, on change de direction.
 * Seule exception : les vraies couleurs d'un client (site existant ou logo fourni) restent les siennes tant qu'il
 * ne choisit pas une autre direction (« Vos couleurs », voir `paletteFor`).
 *
 * Chaque palette respecte les contrôles de la marque (brand-check) : sombre sur clair ≥ 7:1, principale sur clair et
 * secondaire avec le sombre ≥ 4,5:1 — vérifié par les tests.
 */
import type { DirectionId } from "./directions";

export type DirectionPalette = { primary: string; secondary: string; accent: string; light: string; dark: string };

export const DIRECTION_PALETTES: Record<DirectionId, DirectionPalette> = {
  // Directions d'origine
  atelier: { primary: "#2B2420", secondary: "#E9DFD0", accent: "#B8893B", light: "#FBF7F0", dark: "#1A1512" }, // espresso, sable, or
  clinique: { primary: "#0A5BD3", secondary: "#E6ECF5", accent: "#00A884", light: "#F7F9FC", dark: "#0F1724" }, // bleu net, vert soin
  brut: { primary: "#111111", secondary: "#BDBDB5", accent: "#D7FF3A", light: "#F2F2EE", dark: "#0A0A0A" }, // noir, néon citron
  terroir: { primary: "#8A4B2A", secondary: "#D9C7A7", accent: "#C98B2B", light: "#F6EFE3", dark: "#2B1D14" }, // terre cuite, miel
  nocturne: { primary: "#14213D", secondary: "#8FA8C8", accent: "#7FD1FF", light: "#EEF3F8", dark: "#070D1A" }, // nuit, lueur cyan
  pop: { primary: "#C2185B", secondary: "#FFD23F", accent: "#3A86FF", light: "#FFF8EE", dark: "#1E1B3A" }, // framboise, jaune, bleu
  galerie: { primary: "#1F1F1F", secondary: "#E8E4DC", accent: "#3D5A80", light: "#FAFAF7", dark: "#141414" }, // blanc galerie, bleu musée
  elan: { primary: "#1E2326", secondary: "#9AA5AA", accent: "#FF4D00", light: "#F4F6F6", dark: "#0E1214" }, // charbon, orange vif
  flux: { primary: "#0D0D0D", secondary: "#C4C4C4", accent: "#E10600", light: "#FAFAFA", dark: "#050505" }, // noir et blanc, rouge sport
  joaillerie: { primary: "#262626", secondary: "#E4E0DA", accent: "#7A2E3A", light: "#F7F5F2", dark: "#121212" }, // perle, rubis
  gourmand: { primary: "#1F5C3A", secondary: "#F6C28B", accent: "#E8483C", light: "#FBF5EC", dark: "#14301F" }, // vert profond, pêche, tomate
  // Catalogue
  vitrine: { primary: "#0B3D91", secondary: "#E8EEF7", accent: "#FFB400", light: "#F8FAFD", dark: "#0A1630" }, // bleu enseigne, jaune
  manifeste: { primary: "#1A1A1A", secondary: "#F1E6D2", accent: "#2B3BFF", light: "#F7F2E8", dark: "#0B0B0B" }, // papier affiche, bleu Klein
  laboratoire: { primary: "#0E3B43", secondary: "#DCE8E8", accent: "#19B8A6", light: "#F5F9F9", dark: "#082429" }, // pétrole, turquoise
  magazine: { primary: "#A3122B", secondary: "#F0E7DB", accent: "#E0A100", light: "#FBF8F3", dark: "#1B1717" }, // rouge couverture, ocre
  cinema: { primary: "#0F0F12", secondary: "#A9A6B8", accent: "#F5A623", light: "#F3F1EC", dark: "#050507" }, // salle noire, ambre projecteur
  rituel: { primary: "#7D5C4F", secondary: "#EADBD2", accent: "#6F8A75", light: "#FAF5F1", dark: "#2E2421" }, // terre rosée, sauge
  horizon: { primary: "#2F5D62", secondary: "#C9DCE0", accent: "#E07A5F", light: "#F4F7F6", dark: "#13262A" }, // lac, ciel, couchant
  lookbook: { primary: "#1A1A1A", secondary: "#D9CFC6", accent: "#C43B5E", light: "#F8F6F3", dark: "#111111" }, // taupe, fuchsia mode
  marche: { primary: "#2F3A40", secondary: "#E4D6BE", accent: "#6A994E", light: "#F7F1E6", dark: "#1B2226" }, // ardoise, kraft, vert marché
  signal: { primary: "#0B0F1A", secondary: "#8A9BC2", accent: "#00E0A4", light: "#E8EEF6", dark: "#05070D" }, // tech sombre, vert signal
  jardin: { primary: "#3F6B4A", secondary: "#DCE6D2", accent: "#E89BA7", light: "#F7F8F1", dark: "#1D2E22" }, // feuillage, rose fleur
  reception: { primary: "#6B1D2F", secondary: "#EADFCB", accent: "#9DB4C0", light: "#FBF8F2", dark: "#24121A" }, // bordeaux hôtel, bleu argenté
  cabinet: { primary: "#23395B", secondary: "#DDE3EA", accent: "#3E8E7E", light: "#F7F8FA", dark: "#121C2C" }, // bleu confiance, sarcelle
  recre: { primary: "#5A4FE0", secondary: "#FFE3A3", accent: "#FF8FAB", light: "#FFF9F2", dark: "#2A2550" }, // violet, pastels
  epure: { primary: "#3A3F44", secondary: "#E5E2DC", accent: "#8FA9B8", light: "#FAFAF8", dark: "#1E2124" }, // anthracite, bleu fjord
  tribu: { primary: "#C2410C", secondary: "#FFE8D6", accent: "#2EC4B6", light: "#FFFAF5", dark: "#1F2933" }, // orange chaleureux, turquoise
  etabli: { primary: "#5A3E2B", secondary: "#D7C3A3", accent: "#2F6F73", light: "#F5EFE6", dark: "#231912" }, // noyer, chêne, acier patiné
  velours: { primary: "#3B0F2A", secondary: "#C9A3B6", accent: "#D4AF7A", light: "#F4ECE6", dark: "#1A0712" }, // prune, champagne
  lancement: { primary: "#0A0A0F", secondary: "#B3ABD9", accent: "#7B5CFF", light: "#F1F0F7", dark: "#050508" }, // nuit, violet électrique
  // Thèmes de référence (issue #137) : couleurs de repli ; un projet garde ses propres rôles de couleur.
  fraise: { primary: "#C4312A", secondary: "#F9E1DB", accent: "#E4473F", light: "#FBF7F2", dark: "#141414" }, // rouge fraise (principal assombri : 5,1:1 sur le crème), rose pâle en fond doux, crème
  onde: { primary: "#3A403C", secondary: "#F1F2F1", accent: "#C2F94A", light: "#FDFDFD", dark: "#0B0D0C" }, // graphite des coques, gris clair, lime et graphite profond des planches du 24 octobre (distinct du noir et citron de « brut »)
  orbe: { primary: "#9B4F36", secondary: "#D8CCB9", accent: "#9B4F36", light: "#F4F0E8", dark: "#29251F" }, // terre cuite, crème
  sillon: { primary: "#9C5A2C", secondary: "#E7D8C6", accent: "#3B1C0C", light: "#F4EDE3", dark: "#24140C" }, // cuivre (lisible sur ivoire), brun du logo, ivoire chaud
  noctil: { primary: "#4B3BB8", secondary: "#ECE8FA", accent: "#8E6CF0", light: "#ECE8FA", dark: "#0D0B26" }, // indigo lisible sur lavande, violet du halo, nuit profonde
  traverse: { primary: "#4F5631", secondary: "#D9D2C2", accent: "#A8572E", light: "#F5F1E8", dark: "#20251A" }, // olive du sac (6,9:1 sur le crème), pierre, crème, terre cuite en accent
  heuren: { primary: "#15233E", secondary: "#D9DDE3", accent: "#C0C6D0", light: "#F7F5F0", dark: "#0D1526" }, // bleu nuit du cadran, argent brumeux, argent des index et du boîtier, ivoire
  "museau-club": { primary: "#1636C9", secondary: "#EFE6D2", accent: "#F2C14E", light: "#FBF7EE", dark: "#0B1B5E" }, // bleu cobalt des sangles, crème de la maille, jaune du socle, marine du logo
  souple: { primary: "#5A1B36", secondary: "#E8CFCB", accent: "#B4637A", light: "#FBF3F0", dark: "#2B0E1C" }, // prune de la sangle et de l'anneau, rose poudré du tapis, rose mauve des poignées de l'anneau, ivoire rosé, prune profond (le liège porte le quatrième fond du thème)
  "maison-horizon": { primary: "#163A2C", secondary: "#E7DCC8", accent: "#AC4E2A", light: "#F7F2EA", dark: "#16241C" }, // vert profond, ivoire et terre cuite (maquettes du 23 octobre)
  alcove: { primary: "#A14225", secondary: "#EEE8E1", accent: "#D9A07E", light: "#F6F0E8", dark: "#2B1A12" }, // terre cuite du logo et du tissu, sable, abricot des lumières du soir
  rive: { primary: "#243B32", secondary: "#B7C2AE", accent: "#243B32", light: "#EEEAE2", dark: "#1B2B25" }, // vert profond, papier
};

export const directionPalette = (id: DirectionId | string): DirectionPalette => ({ ...(DIRECTION_PALETTES[id as DirectionId] ?? DIRECTION_PALETTES.atelier) });

type PaletteBrand = { palette: DirectionPalette; direction: DirectionId; paletteMode?: "direction" | "client"; clientPalette?: DirectionPalette };

/**
 * Palette d'une marque dans une direction donnée : les vraies couleurs du client si elles sont retenues (« Vos
 * couleurs ») et qu'il s'agit de sa direction actuelle ; sinon la palette verrouillée de la direction.
 * Anciennes marques (avant le verrou, sans `paletteMode`) : leur palette reste pour leur direction actuelle (rien
 * n'est changé sans action du client) ; toute autre direction montre ses propres couleurs.
 */
export function paletteFor(brand: PaletteBrand, direction: DirectionId = brand.direction): DirectionPalette {
  if (direction === brand.direction) {
    if (brand.paletteMode === "client") return { ...(brand.clientPalette ?? brand.palette) };
    if (!brand.paletteMode) return { ...brand.palette };
  }
  return directionPalette(direction);
}

/**
 * Nouvel état de la palette quand le client change de direction ou de mode ; null si rien ne change.
 * - autre direction : palette de cette direction (les vraies couleurs d'un client restent gardées dans `clientPalette`) ;
 * - « client » : retour aux vraies couleurs ; « direction » : adoption de la palette de la direction actuelle.
 * Ancienne marque (sans verrou) d'un client qui avait fourni son site ou son logo : sa palette actuelle devient
 * « Vos couleurs » avant d'être remplacée (rien n'est perdu).
 */
export function lockedPalette(
  brand: PaletteBrand,
  o: { direction?: string; paletteMode?: "direction" | "client"; hasClientLogo?: boolean },
): { palette: DirectionPalette; paletteMode: "direction" | "client"; clientPalette?: DirectionPalette } | null {
  const clientPalette = brand.clientPalette ?? (!brand.paletteMode && o.hasClientLogo ? { ...brand.palette } : undefined);
  const keep = clientPalette ? { clientPalette } : {};
  if (o.paletteMode === "client") return brand.clientPalette ? { palette: { ...brand.clientPalette }, paletteMode: "client", ...keep } : null;
  const direction = (o.direction ?? brand.direction) as DirectionId;
  if (o.direction && o.direction !== brand.direction) return { palette: directionPalette(direction), paletteMode: "direction", ...keep };
  if (o.paletteMode === "direction") return { palette: directionPalette(direction), paletteMode: "direction", ...keep };
  return null;
}
