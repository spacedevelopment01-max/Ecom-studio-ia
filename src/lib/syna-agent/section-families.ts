/**
 * Familles de sections (consigne du propriétaire du 9 novembre 2026) : la bibliothèque est rangée en familles qui ne
 * se mélangent JAMAIS dans un même thème. SINA montre les familles au client EN IMAGE et lui demande laquelle il
 * préfère, puis monte le thème uniquement avec les sections de la famille choisie, aux couleurs de sa marque.
 *
 * - « Classique » : sections calmes et éditoriales (Brindi, démonstrations du catalogue).
 * - « Moderne » : d'après les modèles Instagram montrés par le propriétaire (titres énormes, mannequin détouré qui
 *   déborde de l'ouverture, couleurs franches, animations vives), en deux styles d'exemple : « Sport chic » et
 *   « Streetwear néon ». Plusieurs sections au choix pour chaque rôle.
 *
 * Choix gratuit, sans IA, enregistré dans les réglages du projet (projects.settings_json.sectionFamily).
 */
import { z } from "zod";
import { all, json, run } from "../db";
import { familySections } from "./custom-theme/library";

export type FamilyId = "classique" | "moderne";
export type StyleId = "sport-chic" | "streetwear-neon";

export type SectionFamily = {
  id: FamilyId;
  fr: string; en: string;
  /** Ce que le client voit sur la carte du choix. */
  pitch: { fr: string; en: string };
  /** Pour quelles marques elle convient (aide SINA à recommander, jamais à décider). */
  fits: string;
  styles: { id: StyleId | "classique"; fr: string; en: string; preview: string; /** Démonstration complète, à ouvrir en vrai (pages, panier, téléphone). */ demo: string; mood: string }[];
  /** Rôles de la page et nombre de sections au choix dans la famille. */
  roles: Record<string, string[]>;
  /** Consigne de style pour les maquettes en code. */
  brief: string[];
};

export const SECTION_FAMILIES: SectionFamily[] = [
  {
    id: "classique", fr: "Classique", en: "Classic",
    pitch: { fr: "Calme et chaleureux : grandes photos, titres élégants, beaucoup d'air, animations douces.", en: "Calm and warm: large photos, elegant titles, lots of air, gentle animations." },
    fits: "marques douces, sensorielles, artisanales, bien-être, services de proximité",
    styles: [{ id: "classique", fr: "Classique", en: "Classic", preview: "/section-families/classique.jpg", demo: "/demo/familles/classique/index.html", mood: "calme, éditorial, chaleureux" }],
    roles: {
      ouverture: ["Ouverture photo pleine", "Ouverture vidéo", "Ouverture qui s'agrandit au défilement"],
      produits: ["Collection en vedette", "Collection en grand nom"],
      "produit vedette": ["Produit vedette · lots dégressifs", "Produit vedette · loupe et onglets", "Produit vedette · abonnement", "Produit vedette · toute la gamme", "Produit vedette · calculateur"],
      "pied de page": ["Pied de page géant", "Pied de page avec grand appel"],
    },
    brief: ["FAMILLE CLASSIQUE : titres à empattements élégants, beaucoup d'air, photos pleines et douces, animations lentes (fondus, textes qui s'allument). Aucune section de la famille Moderne (pas de titres énormes en capitales serrées, pas de néon, pas de mannequin détouré qui déborde)."],
  },
  {
    id: "moderne", fr: "Moderne", en: "Modern",
    pitch: { fr: "Audacieux et vivant : titres énormes, mannequin détouré qui sort du cadre, couleurs franches, animations vives.", en: "Bold and lively: huge titles, cut-out model breaking out of the frame, strong colours, lively animations." },
    fits: "mode, chaussures, accessoires, sport, streetwear, lancements en série limitée, marques jeunes et affirmées",
    styles: [
      { id: "sport-chic", fr: "Sport chic", en: "Sport chic", preview: "/section-families/moderne-sport-chic.jpg", demo: "/demo/familles/moderne-sport-chic/index.html", mood: "solaire, sportif, élégant (bleu nuit, terre battue, orange)" },
      { id: "streetwear-neon", fr: "Streetwear néon", en: "Neon streetwear", preview: "/section-families/moderne-streetwear.jpg", demo: "/demo/familles/moderne-streetwear/index.html", mood: "urbain, nocturne, percutant (noir, jaune fluo, néon)" },
    ],
    roles: {
      "en-tête": ["En-tête à annonces et grand menu", "En-tête pilule"],
      ouverture: ["Ouverture « mot géant »", "Ouverture « drop »", "Ouverture éditoriale", "Ouverture en diaporama", "Ouverture à volets", "Ouverture mot-fenêtre"],
      looks: ["Tenue à points", "Compose ta tenue"],
      rayons: ["Choisis ton terrain", "Rayons en liste géante"],
      produits: ["Les pièces du moment", "Fraîchement sorti", "Grille à filtres animés", "Vestiaire en double défilement"],
      "produit vedette": ["Produit vedette · grand nom", "Produit vedette · galerie défilante", "Produit vedette · drop limité"],
      "mise en avant": ["L'édition de saison", "Carnet de looks", "Offre en deux tuiles", "Bandeaux croisés fluo", "Grille éditoriale", "Capsule numérotée", "Manifeste en images", "Matière à la loupe", "Tournée des boutiques éphémères", "Vidéos verticales"],
      confiance: ["Vus dans la rue", "Bande fluo des engagements", "Avis et ajustement", "Garanties à retourner"],
      "à propos": ["À propos éditorial"],
      journal: ["Journal façon magazine", "Article du journal"],
      contact: ["Boutique et contact"],
      commande: ["Commande en une page", "Commande confirmée"],
      compte: ["Connexion au compte"],
      "légal": ["Informations légales"],
      recherche: ["Recherche plein écran"],
      panier: ["Panier tiroir néon", "Page panier éditoriale", "Mini-panier qui surgit"],
      aide: ["Entre deux tailles ?", "Questions numérotées", "Aide et suivi de commande"],
      inscription: ["Sois là avant les autres", "Bande code de bienvenue", "Fenêtre de bienvenue"],
      "page 404": ["Page 404"],
      "pied de page": ["Pied de page en bande", "Pied de page streetwear", "Pied de page mot géant"],
    },
    brief: [
      "FAMILLE MODERNE : titres énormes en capitales serrées (police condensée très grasse), le nom de la marque en lettres immenses derrière le produit ou le mannequin détouré qui DÉBORDE en bas de l'ouverture, couleurs franches et contrastées, cartes arrondies ou angles vifs selon le style, animations vives (lettres qui montent, défilements, compte à rebours seulement avec une vraie date).",
      "Aucune section de la famille Classique dans la page (pas de grand texte à empattements fin et calme, pas de mise en page aérée et lente).",
    ],
  },
];

export const familyChoiceSchema = z.object({
  family: z.enum(["classique", "moderne"]),
  style: z.enum(["classique", "sport-chic", "streetwear-neon"]).optional(),
}).strict().refine((c) => c.family === "classique" ? (c.style ?? "classique") === "classique" : c.style !== "classique", "Le style doit appartenir à la famille choisie.");
export type FamilyChoice = { family: FamilyId; style: StyleId | "classique"; chosenAt: number };

export function familyOf(id: FamilyId): SectionFamily {
  return SECTION_FAMILIES.find((f) => f.id === id)!;
}

export function loadFamilyChoice(projectId: string): FamilyChoice | null {
  const row = all<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id=?", projectId)[0];
  const raw = row ? (json<Record<string, unknown>>(row.settings_json, {}) as any).sectionFamily : null;
  return raw && typeof raw === "object" && (raw.family === "classique" || raw.family === "moderne") ? raw as FamilyChoice : null;
}

export function saveFamilyChoice(projectId: string, c: { family: FamilyId; style?: StyleId | "classique" }): FamilyChoice {
  const ok = familyChoiceSchema.parse(c);
  const style = ok.style ?? (ok.family === "classique" ? "classique" : "sport-chic");
  const row = all<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id=?", projectId)[0];
  if (!row) throw new Error("Projet introuvable.");
  const next: FamilyChoice = { family: ok.family, style, chosenAt: Date.now() };
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...json<Record<string, unknown>>(row.settings_json, {}), sectionFamily: next }), Date.now(), projectId);
  return next;
}

/** Une section appartient-elle à la famille ? (jamais de mélange dans un thème). */
export function sectionInFamily(section: string, family: FamilyId): boolean {
  const f = familyOf(family);
  return Object.values(f.roles).some((list) => list.includes(section));
}

/** Rôles où la famille ne propose pas encore de section (le montage le signale, il ne va pas chercher ailleurs). */
export function missingRoles(family: FamilyId, wanted: string[]): string[] {
  const f = familyOf(family);
  return wanted.filter((r) => !(f.roles[r]?.length));
}

/** Les cartes du choix, telles que le client les voit (une par style). */
export function familyCards(): { family: FamilyId; style: string; title: string; titleEn: string; pitch: string; pitchEn: string; mood: string; preview: string; demo: string; sections: number }[] {
  return SECTION_FAMILIES.flatMap((f) => f.styles.map((s) => ({
    family: f.id, style: s.id,
    title: f.id === "classique" ? f.fr : `${f.fr} · ${s.fr}`, titleEn: f.id === "classique" ? f.en : `${f.en} · ${s.en}`,
    pitch: f.pitch.fr, pitchEn: f.pitch.en, mood: s.mood, preview: s.preview, demo: s.demo,
    // Nombre réel de sections de la bibliothèque (essai réel du 9 novembre : « 12 sections au choix » pour Classique, qui en a 133).
    sections: (() => { try { return familySections(f.id).length; } catch { return Object.values(f.roles).reduce((n, l) => n + l.length, 0); } })(),
  })));
}

/**
 * Direction artistique des IMAGES pour la famille Moderne (consigne du propriétaire du 9 novembre 2026 : « des images
 * dignes des thèmes, avec la même charte graphique ; ce n'est pas le même style que les autres »). Elle remplace
 * l'univers d'images du projet pour TOUTES ses images (site, publications, publicités), aux couleurs de SA marque.
 * Sans autorisation de personnes (règle du propriétaire), le même style est tenu avec les produits seuls.
 */
export type FamilyUniverse = { id: string; idea: string; light: string; setting: string; style: string; emotion: string; composition: string[]; density: "sparse" | "balanced" | "rich" };
export function familyArtUniverse(c: FamilyChoice | null, o: { people: boolean }): FamilyUniverse | null {
  if (!c || c.family !== "moderne") return null;
  const who = o.people ? "mannequins inventés en tenue de la marque, poses assurées, plein pied ou mi-corps" : "produits seuls mis en scène comme des pièces de mode, sans aucune personne";
  return c.style === "streetwear-neon"
    ? { id: "moderne-streetwear-neon", idea: `Photographie de mode urbaine éditoriale, de nuit : ${who}`, light: "nuit, contraste fort, reflets de néon de la couleur d'accent de la marque, sols mouillés", setting: "rues, béton brut, rideaux métalliques, parkings, toits de ville", style: "photographie de mode streetwear éditoriale, rendu réaliste et net, grain léger", emotion: "audace, énergie, appartenance", composition: ["plein pied", "contre-plongée légère", "sujet sur un tiers, l'autre côté dégagé pour le titre"], density: "sparse" }
    : { id: "moderne-sport-chic", idea: `Photographie de mode d'été éditoriale, en plein soleil : ${who}`, light: "soleil chaud, ombres nettes de feuillage ou de palmier", setting: "murs de terre cuite, courts de tennis en terre battue, escaliers de pierre blanche, plages, pergolas", style: "photographie de catalogue de prêt-à-porter haut de gamme, rendu réaliste", emotion: "élan, assurance, été", composition: ["plein pied", "sujet sur un tiers, l'autre côté dégagé pour le titre", "nature morte graphique pour les produits"], density: "sparse" };
}

/** Consigne de la famille pour les maquettes en code (vide tant que le client n'a pas choisi). */
export function familyBrief(c: FamilyChoice | null, o: { people?: boolean } = {}): string[] {
  if (!c) return [];
  const f = familyOf(c.family);
  const s = f.styles.find((x) => x.id === c.style) ?? f.styles[0];
  const u = familyArtUniverse(c, { people: !!o.people });
  return [`FAMILLE DE SECTIONS CHOISIE PAR LE CLIENT : ${f.fr}${c.family === "moderne" ? ` · ${s.fr}` : ""} (ambiance ${s.mood}, couleurs remplacées par celles de SA marque).`, ...f.brief,
    ...(u ? [`PHOTOS NOUVELLES (même charte que la famille) : ${u.style} ; ${u.idea} ; lumière : ${u.light} ; décors : ${u.setting}. Pour l'ouverture, la photo du ${o.people ? "mannequin" : "produit"} est sur un fond uni de la couleur exacte de la section (effet détouré qui déborde du cadre) ; ${o.people ? "le mannequin est entier, de la tête aux pieds" : "le produit est entier"}, avec de l'espace autour, rien de coupé.`] : [])];
}
