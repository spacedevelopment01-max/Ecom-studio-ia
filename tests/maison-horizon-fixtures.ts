/**
 * MAISON & HORIZON (issue #172) : agence immobilière de démonstration, achat et location, d'après les sept planches
 * du dossier `docs/briefs/maison-horizon/`. Projet de services composé par le vrai moteur dans le thème
 * « maison-horizon », puis rédigé avec les textes des planches. Les biens ne sont PAS écrits dans le thème : ils sont
 * saisis comme dans l'onglet « Biens » du studio (src/lib/biens.ts) et le thème les lit au rendu.
 *
 * Photos : 88 reconstitutions IA fournies par Thomas en grand format (kit privé `public/demo/maison-horizon/`, hors
 * dépôt), plus une carte et un plan illustratifs sans nom de lieu. Une série de photos par bien, jamais la même photo
 * pour deux biens. Valeurs contradictoires entre planches : la fiche détaillée fait foi (arbitrages dans le rapport).
 *
 * Rien d'inventé : Maison & Horizon est une marque de démonstration ; biens, prix et loyers sont des exemples
 * annoncés comme tels ; coordonnées, mentions professionnelles, honoraires et diagnostics restent « à renseigner » ;
 * aucune estimation chiffrée, aucune confirmation de visite, aucun message ni alerte n'est envoyé.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { run, now } from "../src/lib/db";
import { emptyProduct, emptyServiceProfile } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveServices, saveStrategy, saveSettings } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import { createBien, setBienStatus, type BienData } from "../src/lib/biens";
import { sectionSchema, withDefaults, type SectionInstance, type TemplateJson, type ThemeSpec } from "../src/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { hidePendingBlocks } from "./engine-demo-copy";

export const MH_PROVENANCE = "Dossier MAISON & HORIZON du 23 octobre 2026 (issue #172, docs/briefs/maison-horizon) — démonstration du studio, reconstitutions IA fournies par Thomas, sans personne, biens et prix d'exemple, aucun envoi réel";
export const MH_DIR = path.join(process.cwd(), "public", "demo", "maison-horizon");
export const MH_NOTE = "Biens et prix de démonstration";

/** Les 90 médias du kit : description d'après la photo réellement livrée (vérifiée une par une). */
export const MH_MEDIA: Record<string, string> = {
  "404-village.webp": "Ruelle pavée d'un village provençal au coucher du soleil, façades en pierre et cyprès.",
  "accueil-agence.webp": "Bureau d'agence lumineux : table en bois, fauteuils clairs, plantes et grande fenêtre.",
  "accueil-hero.webp": "Mas en pierre au milieu des oliviers, piscine au premier plan et chaises longues.",
  "acheter.webp": "Maison en pierre avec cour fleurie, chaises longues et grandes portes vitrées.",
  "agence-hero.webp": "Espace d'accueil de l'agence : grand bureau en bois, fauteuils arrondis et baies vitrées cintrées.",
  "agence-piscine.webp": "Piscine bordée d'oliviers devant une maison en pierre, salon d'extérieur sur la terrasse.",
  "alerte-maison.webp": "Façade de maison en pierre aux volets clairs, jardin de lavande et cyprès.",
  "article-cuisine.webp": "Cuisine ouverte en bois et pierre, îlot avec tabourets, suspensions dorées.",
  "article-escalier.webp": "Escalier en pierre et arche ouvrant sur un salon clair.",
  "article-hero.webp": "Salon clair avec canapés arrondis, table basse en bois et baies cintrées sur le jardin.",
  "article-interieur.webp": "Salon clair aux canapés blancs et grandes portes-fenêtres cintrées, table basse ronde.",
  "article-location.webp": "Terrasse ombragée d'un olivier, grande table en bois devant une maison en pierre.",
  "article-salon.webp": "Salon blanc lumineux ouvert sur le jardin, table basse ronde et tableau abstrait.",
  "article-terrasse.webp": "Terrasse en pierre surplombant la mer, fauteuils en bois et coussins clairs.",
  "article-vente.webp": "Maison en pierre aux volets verts ouverte sur un paysage de collines.",
  "bandeau-proprietaires.webp": "Cour dallée sous un grand olivier devant une maison en pierre couverte de vigne.",
  "compte-interieur.webp": "Entrée en pierre claire, console en bois et porte vitrée ouverte sur le jardin.",
  "conseil-achat.webp": "Salon d'extérieur sous un olivier, vue sur une baie et des collines.",
  "conseil-location.webp": "Salon d'appartement ancien, canapé blanc et fenêtres sur des immeubles.",
  "conseil-luberon.webp": "Village perché sur une colline, oliviers et cyprès au premier plan.",
  "conseils-hero.webp": "Terrasse avec salon en tissu clair, vue sur un village et des collines.",
  "contact-hero.webp": "Table ronde et chaises en rotin sous un olivier, devant une maison en pierre.",
  "contact-village.webp": "Terrasse fleurie dominant un village et des collines boisées.",
  "espace-recherche.webp": "Maison en pierre à étage avec balcon, piscine et chaises longues.",
  "espace-visite.webp": "Grande maison provençale en pierre au bord d'une piscine, terrasse ensoleillée.",
  "estimation-hero.webp": "Maison en pierre aux volets gris, piscine et jardin de graminées.",
  "estimation-salon.webp": "Salon voûté clair, canapé blanc et baie vitrée cintrée sur le jardin.",
  "estimation-terrasse.webp": "Terrasse en pierre avec chaises longues blanches face à un village et des cyprès.",
  "favori-appartement.webp": "Salon haussmannien avec lustre, cheminée, canapé et grandes fenêtres.",
  "favori-villa.webp": "Villa en pierre à étage, oliviers et piscine bordée de lavande.",
  "footer-interieur.webp": "Salon sous des arches en pierre, canapé clair et grande plante en pot.",
  "legal-plaque.webp": "Plaque claire sans inscription fixée sur un mur en pierre, entre des feuillages.",
  "location-balcon.webp": "Balcon filant en fer forgé fleuri, vue sur des immeubles anciens.",
  "location-carte-1.webp": "Salon d'appartement avec canapé clair, télévision murale et fenêtres hautes.",
  "location-carte-2.webp": "Terrasse avec table et chaises en métal, vue sur les toits d'une ville.",
  "location-carte-3.webp": "Pièce voûtée en pierre claire, canapés blancs et table basse en bois.",
  "location-carte-4.webp": "Séjour aux fauteuils verts et table ronde, porte-fenêtre sur un balcon.",
  "location-carte-5.webp": "Séjour avec canapé vert, tables basses rondes et grande fenêtre.",
  "location-carte-6.webp": "Terrasse de maison en pierre, canapé d'extérieur sous un parasol, piscine.",
  "location-chambre.webp": "Chambre au mur vert, lit au jeté terracotta et porte-fenêtre sur des immeubles.",
  "location-cour.webp": "Cour arborée entre des immeubles anciens en pierre.",
  "location-cuisine.webp": "Cuisine verte ouverte, table en bois et suspensions, grandes fenêtres.",
  "location-parc.webp": "Lac bordé d'arbres dans un grand parc, au soleil.",
  "location-salle-bain.webp": "Salle d'eau claire avec douche vitrée, double vasque et fenêtre ouverte.",
  "location-salon.webp": "Séjour lumineux avec canapé clair, coussins verts et terracotta, fenêtres à balcon.",
  "location-similaire-1.webp": "Séjour au mur terracotta, table en bois et grandes fenêtres.",
  "location-similaire-2.webp": "Salon ancien avec canapé clair, table basse ronde et cheminée.",
  "location-similaire-3.webp": "Salon clair avec suspension en verre et table de repas près de la fenêtre.",
  "location-similaire-4.webp": "Chambre lumineuse aux grandes fenêtres, lit au jeté beige.",
  "location-vue.webp": "Vue depuis un balcon fleuri sur une rue d'immeubles anciens.",
  "louer.webp": "Salon d'appartement ancien, canapé blanc et fenêtres sur la ville.",
  "mas-alpilles.webp": "Mas en pierre avec piscine face aux Alpilles, cyprès et jardin sec.",
  "mise-location-balcon.webp": "Porte-fenêtre ouverte sur un balcon en fer forgé et des immeubles parisiens.",
  "mise-location-chambre.webp": "Chambre lumineuse avec tableau, porte-fenêtre sur une terrasse.",
  "mise-location-hero.webp": "Salon haussmannien avec cheminée en marbre, fauteuil sombre et grandes fenêtres.",
  "mise-location-salon.webp": "Salle à manger avec cheminée en marbre, table ronde et miroir doré.",
  "recherche-achat-hero.webp": "Maison en pierre et jardin d'oliviers au coucher du soleil, terrasse éclairée.",
  "recherche-carte-hero.webp": "Village en pierre au milieu des collines boisées.",
  "recherche-location-hero.webp": "Salon d'appartement ancien ouvert sur un balcon et des immeubles parisiens.",
  "secteur-aix.webp": "Bastide aux façades ocre autour d'un bassin à fontaine.",
  "secteur-luberon.webp": "Village perché du Luberon entre oliviers et collines.",
  "secteur-marseille.webp": "Calanque aux falaises blanches et eau turquoise.",
  "secteur-paris.webp": "Pont de pierre sur la Seine et dôme doré, arbres d'automne.",
  "vedette-appartement.webp": "Salon d'appartement avec canapé blanc, table basse en bois et vue sur la ville.",
  "vedette-maison.webp": "Maison en pierre sous les oliviers, chaises longues et lavande.",
  "vedette-paris.webp": "Immeuble haussmannien vu depuis un balcon en fer forgé.",
  "vedette-villa.webp": "Villa contemporaine blanche avec piscine, oliviers et collines.",
  "vendre-hero.webp": "Salon clair ouvert sur une terrasse, canapé en lin et table basse en bois.",
  "vendre-maison.webp": "Façade de maison en pierre couverte de vigne, terrasse ombragée.",
  "vendre-olivier.webp": "Branche d'olivier dans un vase en céramique posé sur des livres.",
  "vendre-village.webp": "Toits d'un village provençal parmi les cyprès, montagnes au loin.",
  "vente-carte-1.webp": "Maison de caractère en pierre avec jardin paysager et piscine.",
  "vente-carte-2.webp": "Salon d'appartement ancien avec cheminée, moulures et grandes fenêtres.",
  "vente-carte-3.webp": "Villa contemporaine à étage avec grande piscine et vue sur la mer.",
  "vente-carte-4.webp": "Terrasse couverte avec table en bois et vue sur un village et des montagnes.",
  "vente-carte-5.webp": "Propriété en pierre aux volets bleus avec piscine et jardin arboré.",
  "vente-carte-6.webp": "Grand séjour lumineux avec canapé vert et grande baie vitrée.",
  "vente-cuisine.webp": "Cuisine aux meubles vert sombre, îlot en bois et suspensions en osier.",
  "vente-jardin.webp": "Maison en pierre ouverte sur un jardin fleuri, pergola et table de jardin.",
  "vente-quartier-parc.webp": "Parc arboré au bord de l'eau, dômes d'un édifice en arrière-plan.",
  "vente-quartier-rhone.webp": "Quais en pierre au bord d'un fleuve, immeubles et arbres.",
  "vente-quartier-rue.webp": "Rue bordée d'arbres et d'immeubles anciens couverts de verdure.",
  "vente-salon.webp": "Séjour lumineux avec canapé clair, table basse en bois et baies sur le jardin.",
  "vente-similaire-appartement.webp": "Salle à manger sous une porte-fenêtre cintrée, table ronde et lanterne.",
  "vente-similaire-maison.webp": "Maison bourgeoise aux volets bleus, jardin en terrasses.",
  "vente-similaire-vue.webp": "Jardin arboré avec un grand dôme en arrière-plan.",
  "vente-terrasse.webp": "Terrasse ombragée, table en bois et fleurs roses contre un mur en pierre.",
  "village.webp": "Village en pierre parmi les cyprès, collines et montagnes au loin.",
  "carte-reference.png": "Carte illustrative sans nom de lieu : rues, rivière et espaces verts.",
  "vente-plan-illustratif.png": "Plan illustratif d'une maison : séjour, cuisine, salle d'eau, deux chambres, terrasse et entrée.",
};
/** Variantes presque identiques d'une autre photo : gardées hors rendu (aucun doublon visible). */
export const MH_UNUSED = ["article-interieur.webp", "article-salon.webp", "vedette-appartement.webp"];

type Ph = string | [string, string];
type BienSeed = { ref: string; transaction: "vente" | "location"; photos: Ph[]; plan?: string; quartier?: Ph[]; data: Partial<BienData> };
const P = (...paras: string[]) => paras.join("\n\n");

/**
 * Les biens de la démonstration (un par carte des planches). Une série de photos par bien ; la fiche détaillée fait
 * foi quand une carte la contredit (ex. loyer « 1 290 € » d'une carte = charges comprises de la fiche : 1 200 + 90).
 */
export const MH_BIENS: BienSeed[] = [
  // ── Vente ──────────────────────────────────────────────────────────────────────────────────────────────────────
  { ref: "V-0001", transaction: "vente", photos: ["vente-jardin.webp", "vente-salon.webp", "vente-cuisine.webp", "vente-terrasse.webp"], plan: "vente-plan-illustratif.png", quartier: [["vente-quartier-rhone.webp", "Les quais, à quelques minutes."], ["vente-quartier-rue.webp", "Des rues résidentielles arborées."], ["vente-quartier-parc.webp", "Un grand parc tout proche."]],
    data: { title: "Maison avec jardin", headline: "Une maison ouverte sur le jardin", type: "maison", city: "Lyon", summary: "Maison de caractère avec jardin paysager et terrasse.", price: 485000, surface: 128, rooms: 5, bedrooms: 3, land: 420, exteriors: ["jardin", "terrasse"],
      description: P("Au cœur d'un quartier résidentiel recherché de Lyon, cette maison de caractère séduit par son atmosphère chaleureuse et sa belle ouverture sur le jardin.", "D'une surface d'environ 128 m², elle offre un séjour lumineux donnant sur la terrasse et le jardin paysager, une cuisine conviviale, trois chambres et des espaces bien pensés pour le quotidien.", "Le jardin, à l'abri des regards, propose un cadre de vie paisible, idéal pour profiter des beaux jours. Un bien rare, alliant charme de l'ancien et confort actuel, à proximité des commodités, des écoles et des transports."),
      features: ["Jardin paysager", "Terrasse", "Cuisine équipée", "Cheminée", "Double vitrage", "Rangements", "Stationnement", "Cave"], fees: "Honoraires à préciser", propertyTax: "À préciser", availability: "À préciser",
      neighborhood: { text: "Ce bien est situé dans un environnement résidentiel apprécié, à proximité des commerces, des écoles et des transports. Le secteur offre un cadre de vie agréable, entre vie de quartier et espaces verts.", photos: [], places: [] }, map: { x: 52, y: 47 } } },
  { ref: "V-0002", transaction: "vente", photos: ["vedette-maison.webp"], data: { title: "Maison de charme avec jardin", type: "maison", city: "Uzès", postalCode: "30700", price: 485000, surface: 145, rooms: 5, bedrooms: 3, exteriors: ["jardin"], featured: true } },
  { ref: "V-0003", transaction: "vente", photos: ["vedette-villa.webp"], data: { title: "Villa contemporaine avec piscine", type: "villa", city: "Aix-en-Provence", postalCode: "13100", price: 1250000, surface: 200, rooms: 6, bedrooms: 4, pool: true, exteriors: ["jardin"], featured: true, map: { x: 61, y: 43 } } },
  { ref: "V-0004", transaction: "vente", photos: ["vente-carte-1.webp"], data: { title: "Maison de caractère", type: "maison", city: "Aix-en-Provence", postalCode: "13100", price: 1250000, surface: 210, rooms: 6, bedrooms: 4, pool: true, exteriors: ["jardin"], summary: "Belle demeure provençale avec jardin paysager et piscine.", map: { x: 81, y: 30 } } },
  { ref: "V-0005", transaction: "vente", photos: ["vente-carte-2.webp"], data: { title: "Appartement", type: "appartement", city: "Paris 7e", postalCode: "75007", price: 985000, surface: 120, rooms: 4, bedrooms: 3, summary: "Appartement haussmannien aux volumes généreux." } },
  { ref: "V-0006", transaction: "vente", photos: ["vente-carte-3.webp"], data: { title: "Villa contemporaine", type: "villa", city: "Biarritz", postalCode: "64200", price: 2480000, surface: 280, rooms: 7, bedrooms: 5, pool: true, exteriors: ["jardin"], summary: "Vue océan, piscine et prestations haut de gamme." } },
  { ref: "V-0007", transaction: "vente", photos: ["vente-carte-4.webp"], data: { title: "Maison de village", type: "maison", city: "Uzès", postalCode: "30700", price: 695000, surface: 140, rooms: 5, bedrooms: 3, exteriors: ["cour", "terrasse"], summary: "Maison en pierre avec cour intérieure et terrasse panoramique." } },
  { ref: "V-0008", transaction: "vente", photos: ["vente-carte-5.webp"], data: { title: "Propriété", type: "propriete", city: "Saint-Rémy-de-Provence", postalCode: "13210", price: 1890000, surface: 300, rooms: 8, bedrooms: 5, pool: true, exteriors: ["jardin"], summary: "Mas rénové avec parc arboré et piscine." } },
  { ref: "V-0009", transaction: "vente", photos: ["vente-carte-6.webp"], data: { title: "Loft", type: "loft", city: "Lyon 2e", postalCode: "69002", price: 1050000, surface: 380, rooms: 5, bedrooms: 5, exteriors: ["terrasse"], summary: "Loft lumineux avec terrasse et vue dégagée." } },
  { ref: "V-0010", transaction: "vente", photos: ["mas-alpilles.webp"], data: { title: "Mas en pierre avec vue sur les Alpilles", type: "mas", city: "Saint-Rémy-de-Provence", postalCode: "13210", price: 1980000, surface: 250, rooms: 7, bedrooms: 5, pool: true, exteriors: ["jardin"], exceptional: true,
      summary: "Authentique mas provençal rénové avec des matériaux nobles, offrant une vue panoramique sur les Alpilles, un jardin paysager et une piscine chauffée." } },
  { ref: "V-0011", transaction: "vente", photos: ["favori-villa.webp"], data: { title: "Villa d'exception", type: "villa", city: "Aix-en-Provence", postalCode: "13100", price: 1490000, surface: 220, rooms: 6, land: 1200, pool: true, exteriors: ["jardin"], map: { x: 20, y: 59 } } },
  { ref: "V-0012", transaction: "vente", photos: ["vente-similaire-maison.webp"], data: { title: "Maison familiale avec terrasse", type: "maison", city: "Lyon", price: 520000, surface: 120, rooms: 5, bedrooms: 4, exteriors: ["terrasse"] } },
  { ref: "V-0013", transaction: "vente", photos: ["vente-similaire-appartement.webp"], data: { title: "Appartement de caractère", type: "appartement", city: "Lyon", price: 395000, surface: 98, rooms: 4, bedrooms: 3 } },
  { ref: "V-0014", transaction: "vente", photos: ["vente-similaire-vue.webp"], data: { title: "Maison avec vue dégagée", type: "maison", city: "Lyon", price: 620000, surface: 145, rooms: 6, bedrooms: 4, exteriors: ["jardin"] } },
  // ── Location ───────────────────────────────────────────────────────────────────────────────────────────────────
  { ref: "L-0001", transaction: "location", photos: ["location-salon.webp", "location-cuisine.webp", "location-chambre.webp", "location-balcon.webp", "location-cour.webp", "location-salle-bain.webp", "location-vue.webp"], quartier: [["location-parc.webp", "Le parc de la Tête d'Or, un cadre de vie unique à quelques minutes."]],
    data: { title: "Appartement meublé avec balcon", headline: "Un appartement lumineux, prêt pour votre quotidien", type: "appartement", city: "Lyon 6e", postalCode: "69006", sector: "Cours Vitton", summary: "À deux pas du parc de la Tête d'Or, dans un quartier recherché.", rent: 1200, charges: 90, surface: 64, rooms: 3, bedrooms: 2, furnished: true, exteriors: ["balcon"], featured: true,
      description: P("Dans un bel immeuble lyonnais, cet appartement meublé de 64 m² séduit par sa luminosité et son atmosphère chaleureuse. La pièce de vie, spacieuse et élégante, s'ouvre sur un balcon filant, idéal pour profiter des beaux jours. La cuisine, entièrement équipée, s'intègre harmonieusement à l'espace de vie.", "Côté nuit, deux chambres confortables offrent des rangements optimisés. La salle d'eau moderne dispose d'une grande douche à l'italienne et d'un espace buanderie. L'ensemble a été décoré avec soin, dans un esprit contemporain et intemporel.", "Situé au cœur du 6e arrondissement, l'appartement bénéficie d'un environnement privilégié, à proximité immédiate des commerces, des transports et du parc de la Tête d'Or."),
      features: ["Meublé", "Balcon", "Cuisine équipée", "Lave-linge", "Lave-vaisselle", "Rangements", "Chauffage individuel", "Fibre optique", "Interphone", "Ascenseur"], fees: "À préciser", availability: "Date à confirmer",
      neighborhood: { text: "Le Cours Vitton est l'un des plus beaux axes de Lyon 6e, apprécié pour son élégance et sa qualité de vie. Vous profitez ici d'un cadre verdoyant avec le parc de la Tête d'Or tout proche, de nombreux commerces de proximité, de marchés et de restaurants. Le quartier est parfaitement desservi par les transports en commun, facilitant tous vos déplacements dans Lyon.", photos: [], places: [{ label: "Parc de la Tête d'Or", detail: "10 min à pied" }, { label: "Métro Masséna", detail: "5 min à pied" }, { label: "Commerces", detail: "À proximité" }] }, map: { x: 45, y: 38 } } },
  { ref: "L-0002", transaction: "location", photos: ["vedette-paris.webp"], data: { title: "Appartement haussmannien", type: "appartement", city: "Paris 7e", postalCode: "75007", rent: 2500, surface: 102, rooms: 4, bedrooms: 3, exteriors: ["balcon"], featured: true } },
  { ref: "L-0003", transaction: "location", photos: ["location-carte-1.webp"], data: { title: "Appartement", type: "appartement", city: "Bordeaux", postalCode: "33000", rent: 1650, charges: 150, surface: 85, rooms: 3, bedrooms: 3, exteriors: ["balcon"], summary: "Bel appartement rénové avec balcon en centre-ville." } },
  { ref: "L-0004", transaction: "location", photos: ["location-carte-2.webp"], data: { title: "Appartement", type: "appartement", city: "Paris 11e", postalCode: "75011", rent: 2100, charges: 200, surface: 95, rooms: 4, bedrooms: 3, exteriors: ["terrasse"], summary: "Appartement lumineux avec terrasse plein sud." } },
  { ref: "L-0005", transaction: "location", photos: ["location-carte-3.webp"], data: { title: "Maison", type: "maison", city: "Nantes", postalCode: "44000", rent: 1480, charges: 120, surface: 110, rooms: 5, bedrooms: 4, exteriors: ["jardin"], summary: "Maison familiale avec jardin." } },
  { ref: "L-0006", transaction: "location", photos: ["location-carte-4.webp"], data: { title: "Appartement", type: "appartement", city: "Toulouse", postalCode: "31000", rent: 1250, charges: 100, surface: 70, rooms: 3, bedrooms: 2, exteriors: ["balcon"], summary: "Appartement au calme avec loggia." } },
  { ref: "L-0007", transaction: "location", photos: ["location-carte-5.webp"], data: { title: "Appartement", type: "appartement", city: "Lille", postalCode: "59000", rent: 980, charges: 80, surface: 55, rooms: 2, bedrooms: 1, furnished: true, summary: "T2 meublé moderne en hyper-centre." } },
  { ref: "L-0008", transaction: "location", photos: ["location-carte-6.webp"], data: { title: "Maison", type: "maison", city: "Montpellier", postalCode: "34000", rent: 1750, charges: 180, surface: 130, rooms: 5, bedrooms: 4, pool: true, exteriors: ["jardin", "terrasse"], summary: "Maison avec piscine et jardin arboré." } },
  { ref: "L-0009", transaction: "location", photos: ["location-similaire-1.webp"], data: { title: "Appartement 2 pièces", type: "appartement", city: "Lyon 7e", postalCode: "69007", sector: "Jean Macé", rent: 1050, surface: 48, rooms: 2, bedrooms: 1, furnished: true } },
  { ref: "L-0010", transaction: "location", photos: ["location-similaire-2.webp"], data: { title: "Appartement 3 pièces", type: "appartement", city: "Lyon 6e", postalCode: "69006", sector: "Foch", rent: 1620, surface: 78, rooms: 3, bedrooms: 2, furnished: true } },
  { ref: "L-0011", transaction: "location", photos: ["location-similaire-3.webp"], data: { title: "Appartement 2 pièces", type: "appartement", city: "Lyon 3e", postalCode: "69003", sector: "Part-Dieu", rent: 980, surface: 42, rooms: 2, bedrooms: 1, furnished: true } },
  { ref: "L-0012", transaction: "location", photos: ["location-similaire-4.webp"], data: { title: "Appartement 3 pièces", type: "appartement", city: "Lyon 4e", postalCode: "69004", sector: "Croix-Rousse", rent: 1400, surface: 67, rooms: 3, bedrooms: 2, furnished: true } },
  { ref: "L-0013", transaction: "location", photos: ["favori-appartement.webp"], data: { title: "Appartement haussmannien", type: "appartement", city: "Paris 7e", postalCode: "75007", rent: 3200, surface: 118, rooms: 4, floor: "3e étage sur 6" } },
];

/** Projet de services composé par le moteur dans le thème « maison-horizon », biens saisis comme dans le studio. */
export async function maisonHorizonProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo Maison & Horizon");
  const product = { ...emptyProduct(), name: "Achat, vente et location de biens immobiliers", nameStatus: "provided" as const, category: "Agence immobilière", sector: "services" as never, summary: "Une agence pour acheter, vendre, louer ou mettre en location une maison ou un appartement." };
  saveProduct(pid, product);
  const services = {
    ...emptyServiceProfile(),
    services: [
      { key: "acheter", name: "Acheter", description: "Un accompagnement personnalisé pour trouver le bien qui vous correspond." },
      { key: "louer", name: "Louer", description: "Des biens sélectionnés avec soin pour une location en toute confiance." },
      { key: "estimer", name: "Faire estimer", description: "Une demande d'estimation de votre bien, étudiée par un conseiller." },
    ],
    contactMode: "form" as const, contactModes: ["form" as const],
  };
  const local = localBrand(product, "Maison & Horizon", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "Maison & Horizon", generatedBy: "local" as const, tagline: "Un lieu à vous. Une nouvelle histoire.", story: "Maison & Horizon est une marque de démonstration du studio : une agence pour acheter, vendre et louer des maisons et des appartements de caractère.", positioning: "Maisons, appartements, propriétés d'exception : en ville comme à la campagne, un accompagnement pour acheter, vendre ou louer.", palette: { primary: "#1F3A2F", secondary: "#E7DCC8", accent: "#B4553A", light: "#F7F2EA", dark: "#16241C" }, direction: "maison-horizon" as never });
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const [file, alt] of Object.entries(MH_MEDIA)) {
    if (MH_UNUSED.includes(file)) continue;
    const source = path.join(MH_DIR, file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const mime = file.endsWith(".png") ? "image/png" : "image/webp";
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime, name: `maison-horizon-${file}`, origin: "upload", role: /carte-reference|plan-illustratif/.test(file) ? "detail" : "scene", status: "approved", meta: { demo: { isDemo: true, provenance: MH_PROVENANCE }, width: meta.width, height: meta.height, alt } });
    ids[file] = a.id;
  }
  // Biens : saisis puis publiés comme depuis l'onglet « Biens » (mêmes contrôles côté serveur).
  const photo = (p: Ph) => { const [file, alt] = typeof p === "string" ? [p, MH_MEDIA[p]] : [p[0], p[1]]; return ids[file] ? { assetId: ids[file], alt: alt ?? "" } : null; };
  const biens: { ref: string; id: string; handle: string }[] = [];
  for (const b of MH_BIENS) {
    const photos = b.photos.map(photo).filter((x): x is { assetId: string; alt: string } => !!x);
    if (!photos.length) continue;
    const neighborhood = { text: "", photos: [] as { assetId: string; alt: string }[], places: [] as { label: string; detail: string }[], ...(b.data.neighborhood ?? {}) };
    neighborhood.photos = (b.quartier ?? []).map(photo).filter((x): x is { assetId: string; alt: string } => !!x);
    const created = createBien(userId, pid, { transaction: b.transaction, ref: b.ref, data: { ...b.data, demo: true, photos, plan: b.plan ? photo(b.plan) : null, neighborhood } });
    const live = setBienStatus(pid, created.id, "published");
    biens.push({ ref: live.ref, id: live.id, handle: live.handle });
  }
  const built = await composeShop(pid, "maison-horizon" as never, null, false);
  curateMaisonHorizon(built.spec, ids, biens);
  return { pid, spec: built.spec, missing, biens, project: loadProject(pid) };
}

const p = (s: string) => `<p>${s}</p>`;

/** Rédaction d'après les planches : accueil, recherche (achat, location, carte), puis les pages intérieures. */
export function curateMaisonHorizon(spec: ThemeSpec, ids: Record<string, string>, biens: { ref: string; handle: string }[]) {
  const name = (file: string) => `mh-${file}`;
  for (const [file, aid] of Object.entries(ids)) spec.files[name(file)] = aid;
  const asset = (file: string) => (ids[file] ? name(file) : "");
  const img = (file: string, key = "image") => ({ [`${key}_asset`]: asset(file), [`${key}_alt`]: MH_MEDIA[file] ?? "" });
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type); if (!schema) throw new Error(`Section absente ${type}`);
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((_, i) => `b${i}`) };
  };
  const template = (rows: [string, SectionInstance][]): TemplateJson => ({ order: rows.map(([k]) => k), sections: Object.fromEntries(rows) });
  const pad = (top: number, bottom = top) => ({ padding_top: top, padding_bottom: bottom });
  const BUY = "/pages/acheter", RENT = "/pages/louer", MAP = "/pages/carte", CONTACT = "/pages/contact", ESTIMATE = "/pages/estimer", SELL = "/pages/vendre", LET = "/pages/mettre-en-location", AGENCY = "/pages/agence", ADVICE = "/pages/conseils", FAVORITES = "/pages/favoris";
  const tile = (settings: Record<string, unknown>) => ({ type: "tile", settings });
  const pageHero = (heading: string, text: string, file: string, extra: Record<string, unknown> = {}) => section("re-hero", { layout: "page", height: "short", text_side: "middle", ...img(file), heading, text: p(text), ...extra, color_scheme: "scheme-1", padding_bottom: 0 });

  // ── Accueil (planche 01) ─────────────────────────────────────────────────────────────────────────────────────────
  spec.templates.index = template([
    ["hero", section("re-hero", { layout: "home", height: "tall", ...img("accueil-hero.webp"), focus_x: 50, focus_y: 45, mobile_focus_x: 40, heading: "Un lieu à vous.\nUne nouvelle histoire.", text: p("Maisons, appartements, propriétés d'exception.<br>En ville comme à la campagne, trouvons ensemble le lieu qui vous ressemble."), buy_url: BUY, rent_url: RENT, padding_bottom: 0 })],
    ["featured", section("re-listings", { mode: "featured", layout: "home", heading: "Nos biens à la une", note: MH_NOTE, link_label: "Voir tous les biens", link: BUY, limit: 4, ...pad(36, 32) })],
    ["paths", section("re-tiles", { layout: "split", heading: "Acheter ou louer,\nà chaque projet sa place.", text: p("Un accompagnement sur-mesure, une expertise locale et une sélection de biens de caractère pour concrétiser vos projets immobiliers, en toute sérénité."), link_label: "Découvrir notre approche", link: AGENCY, color_scheme: "scheme-2", ...pad(0) }, [
      tile({ ...img("acheter.webp"), title: "Acheter", text: "Se projeter, s'ancrer, transmettre.", link: BUY }),
      tile({ ...img("louer.webp"), title: "Louer", text: "Vivre autrement, en toute liberté.", link: RENT }),
    ])],
    ["exception", section("re-feature", { layout: "bien", eyebrow: "Bien d'exception", bien_ref: "V-0010", button_label: "Découvrir ce bien", color_scheme: "scheme-3", ...pad(0) })],
    ["services", section("re-tiles", { layout: "services", heading: "Nos services, à vos côtés", ...pad(32, 24) }, [
      tile({ icon: "house", title: "Acheter", text: "Un accompagnement personnalisé pour trouver le bien qui vous correspond.", link_label: "En savoir plus", link: BUY }),
      tile({ icon: "key", title: "Louer", text: "Des biens sélectionnés avec soin pour une location en toute confiance.", link_label: "En savoir plus", link: RENT }),
      tile({ icon: "document", title: "Faire estimer", text: "Une demande d'estimation de votre bien, étudiée par un conseiller, sans engagement.", link_label: "Demander une estimation", link: ESTIMATE }),
    ])],
    ["owners", section("re-feature", { layout: "band", heading: "Vous souhaitez vendre ou mettre en location ?", text: p("Confiez votre projet à notre équipe. Nous vous accompagnons avec exigence et bienveillance, de l'estimation à la signature."), button_label: "Nous contacter", button_link: CONTACT, ...img("bandeau-proprietaires.webp"), ...pad(0) })],
    ["sectors", section("re-tiles", { layout: "sectors", heading: "Nos secteurs de prédilection", link_label: "Voir tous les biens", link: BUY, ...pad(32, 24) }, [
      tile({ ...img("secteur-aix.webp"), title: "Aix-en-Provence", text: "Art de vivre et patrimoine", link: `${BUY}?ville=Aix-en-Provence` }),
      tile({ ...img("secteur-luberon.webp"), title: "Luberon", text: "Nature et villages de caractère", link: `${BUY}?ville=Luberon` }),
      tile({ ...img("secteur-marseille.webp"), title: "Marseille", text: "Entre mer et authenticité", link: `${BUY}?ville=Marseille` }),
      tile({ ...img("secteur-paris.webp"), title: "Paris", text: "Élégance et dynamisme", link: `${BUY}?ville=Paris` }),
    ])],
    ["agency", section("re-feature", { layout: "story", eyebrow: "Notre agence", heading: "Une équipe passionnée par\nles lieux et par les gens.", text: p("Maison & Horizon, c'est une agence à taille humaine, animée par la même exigence : vous offrir un accompagnement sincère, discret et sur-mesure, au service de vos projets de vie.") + p("<small>Marque de démonstration du studio.</small>"), button_label: "Découvrir l'agence", button_link: AGENCY, ...img("accueil-agence.webp"), side: "right", ...pad(24, 24) })],
    ["advice", section("re-tiles", { layout: "articles", heading: "Nos conseils", link_label: "Voir tous les conseils", link: ADVICE, ...pad(24, 24) }, [
      tile({ ...img("article-hero.webp"), meta: "Conseil d'achat", title: "Achat immobilier : les étapes clés pour un projet serein", link_label: "Lire l'article", link: "/pages/conseil-etapes-achat" }),
      tile({ ...img("conseil-location.webp"), meta: "Conseil de location", title: "Location meublée ou vide : quelle solution pour votre projet ?", link_label: "Lire l'article", link: "/pages/conseil-meuble-ou-vide" }),
      tile({ ...img("conseil-luberon.webp"), meta: "Vivre ici", title: "Le Luberon : un art de vivre entre nature et patrimoine", link_label: "Lire l'article", link: "/pages/conseil-luberon" }),
    ])],
    ["contact", section("re-feature", { layout: "strip", heading: "Une question ?\nParlons de votre projet.", phone: "", phone_note: "Téléphone : à renseigner", email: "", email_note: "E-mail : à renseigner", button_label: "Nous contacter", button_link: CONTACT, ...pad(16, 16) })],
  ]);

  // ── Recherche : achat, location, carte (planche 02) ─────────────────────────────────────────────────────────────
  const pages: { handle: string; title: string; seo: { title: string; description: string }; rows: [string, SectionInstance][] }[] = [];
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => pages.push({ handle, title, seo, rows });
  const search = (mode: "vente" | "location", heading: string, extra: Record<string, unknown> = {}) => section("re-listings", { mode, layout: "grid", heading, heading_tag: "h2", note: MH_NOTE, link_label: "", limit: 0, show_summary: true, show_filters: true, use_url: true, show_count: true, show_sort: true, per_page: 6, tabs: "transaction", buy_url: BUY, rent_url: RENT, overlap: true, ...extra, ...pad(0, 48) });
  page("acheter", "Acheter", { title: "Acheter | Maison & Horizon, biens à vendre", description: "Maisons, appartements, demeures de caractère à vendre : filtrez par ville, type, budget, surface et chambres. Biens et prix de démonstration." }, [
    ["hero", pageHero("Trouvez votre\nprochain chez-vous", "Maisons, appartements, demeures de caractère.<br>Des lieux de vie pour aujourd'hui et pour demain.", "recherche-achat-hero.webp", { height: "medium" })],
    ["list", search("vente", "Nos biens à vendre", { placeholder_city: "Ex : Bordeaux, Lyon…" })],
  ]);
  page("louer", "Louer", { title: "Louer | Maison & Horizon, biens à louer", description: "Appartements et maisons à louer : filtrez par ville, type, loyer, meublé et disponibilité. Loyers et charges de démonstration." }, [
    ["hero", pageHero("Votre prochaine\nadresse vous attend", "Appartements et maisons en location.<br>Des espaces de vie pour tous vos projets.", "recherche-location-hero.webp", { height: "medium" })],
    ["list", search("location", "Nos biens à louer", { placeholder_city: "Ex : Nantes, Lille…" })],
  ]);
  page("carte", "Carte des biens", { title: "Carte des biens | Maison & Horizon", description: "Les biens à vendre sur une carte illustrative : choisissez une ville, affinez vos critères et passez de la carte à la liste." }, [
    ["hero", pageHero("Explorez nos biens\nsur la carte", "Affinez votre recherche et découvrez les biens disponibles dans la zone de votre choix.", "recherche-carte-hero.webp", { height: "medium" })],
    ["map", section("re-listings", { mode: "vente", layout: "map", heading: "", note: "", link_label: "", limit: 0, show_filters: true, use_url: true, show_count: true, show_sort: true, per_page: 0, tabs: "view", overlap: true, default_city: "Aix-en-Provence", ...img("carte-reference.png", "map"), map_label: "Carte illustrative", ...pad(0, 48) })],
  ]);

  // ── Fiche d'un bien (planches 03 et 04) : un seul modèle pour tous les biens, rempli par l'onglet « Biens ». ────
  const q = (question: string, answer: string, applies = "location") => ({ type: "question", settings: { applies, question, answer: p(answer) } });
  spec.templates["metaobject/bien"] = template([
    ["bien", section("re-bien", { buy_url: BUY, rent_url: RENT, ...img("carte-reference.png", "map"), map_label: "Carte illustrative : emplacement approximatif", hood_title: "Un quartier recherché", steps_text_rent: "Un accompagnement simple et personnalisé à chaque étape.", padding_top: 8, padding_bottom: 32 }, [
      { type: "step", settings: { applies: "location", icon: "calendar", title: "Visiter le bien", text: "Organisez une visite selon vos disponibilités." } },
      { type: "step", settings: { applies: "location", icon: "document", title: "Constituer votre dossier", text: "Nous vous guidons sur les pièces à fournir." } },
      { type: "step", settings: { applies: "location", icon: "key", title: "Signer et emménager", text: "Une fois votre dossier validé, vous signez votre bail et récupérez les clés." } },
      q("Le logement est-il meublé ?", "C'est indiqué en tête de fiche et dans les équipements (« Meublé »). Pour la liste du mobilier, demandez-la à l'agence."),
      q("Les charges comprennent-elles l'eau et l'internet ?", "Le montant des charges figure dans les informations financières ; leur détail est à renseigner par l'agence."),
      q("Quand est-il disponible ?", "La date figure dans les informations financières. « Date à confirmer » signifie que l'agence vous la précisera."),
      q("Y a-t-il un stationnement à proximité ?", "Information à renseigner par l'agence pour ce bien."),
      q("Quels sont les documents à fournir pour le dossier de location ?", "L'agence vous remet la liste des pièces à fournir (liste à renseigner par l'agence)."),
      q("Puis-je visiter le bien rapidement ?", "Envoyez une demande de visite depuis cette fiche : l'agence vous recontacte pour convenir d'un créneau. Aucune visite n'est réservée automatiquement."),
    ])],
    ["similar", section("re-listings", { mode: "similar", layout: "mini", heading: "Autres biens [transaction] à [ville]", note: "", link_label: "", limit: 4, same_city: true, ...pad(8, 48) })],
  ]);

  // Pages, menus, en-tête et pied (planches 01 à 07).
  spec.store.pages = pages.map((pg) => ({ handle: pg.handle, title: pg.title, template_suffix: pg.handle, body_html: "", seo: pg.seo }));
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  for (const pg of pages) spec.templates[`page.${pg.handle}`] = template([["title", section("main-page", { show_title: false, width: "wide", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })], ...pg.rows]);
  spec.store.menus = {
    "main-menu": { title: "Menu principal", links: [{ title: "Acheter", url: BUY }, { title: "Louer", url: RENT }, { title: "Estimer", url: ESTIMATE }, { title: "L'agence", url: AGENCY }, { title: "Conseils", url: ADVICE }, { title: "Contact", url: CONTACT }] },
    "footer-acheter": { title: "Acheter", links: [{ title: "Tous nos biens à vendre", url: BUY }, { title: "Maisons", url: `${BUY}?type=maison` }, { title: "Appartements", url: `${BUY}?type=appartement` }, { title: "Voir sur la carte", url: MAP }] },
    "footer-louer": { title: "Louer", links: [{ title: "Tous nos biens à louer", url: RENT }, { title: "Appartements", url: `${RENT}?type=appartement` }, { title: "Maisons", url: `${RENT}?type=maison` }, { title: "Locations meublées", url: `${RENT}?meuble=oui` }] },
    "footer-proprietaires": { title: "Propriétaires", links: [{ title: "Demander une estimation", url: ESTIMATE }, { title: "Vendre", url: SELL }, { title: "Mettre en location", url: LET }] },
    "footer-agence": { title: "L'agence", links: [{ title: "Notre agence", url: AGENCY }, { title: "Conseils", url: ADVICE }, { title: "Contact", url: CONTACT }, { title: "Mes favoris", url: FAVORITES }] },
    legal: { title: "Informations", links: [{ title: "Mentions légales", url: "/pages/mentions-legales" }, { title: "Cookies", url: "/pages/cookies" }] },
  };
  for (const sec of Object.values(spec.groups.header?.sections ?? {})) if (sec.type === "header") sec.settings = { ...sec.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, account_link: "", favorites_link: FAVORITES, favorites_label: "Mes favoris", cta_label: "Nous contacter", cta_link: CONTACT, cta_icon: "none", phone: "", color_scheme: "scheme-1" };
  for (const g of Object.values(spec.groups)) for (const [sid, sec] of Object.entries(g.sections)) {
    if (sec.type === "announcement-bar") sec.disabled = true;
    if (sec.type !== "footer") continue;
    const schema = sectionSchema(spec, "footer")!;
    const links = (menu: string, heading: string) => ({ type: "links", settings: withDefaults(schema.blocks.find((b) => b.type === "links")?.settings, { heading, menu }) });
    g.sections[sid] = { type: "footer", settings: withDefaults(schema.settings, { ...sec.settings, style: "brand-left", show_wordmark: false, show_policies: false, show_payment: false, logo_asset: "", tagline: "Des lieux de vie de caractère, au service de vos projets.", bottom_text: `${MH_NOTE}. Marque de démonstration du studio.`, bottom_menu: "legal", color_scheme: "scheme-3" }), blocks: { a: links("footer-acheter", "Acheter"), b: links("footer-louer", "Louer"), c: links("footer-proprietaires", "Propriétaires"), d: links("footer-agence", "L'agence") }, block_order: ["a", "b", "c", "d"] };
  }
  spec.name = "Maison & Horizon — thème Maison & Horizon (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: MH_PROVENANCE, contactTest: false } };
  spec.store.shopName = "Maison & Horizon";
  spec.store.seo = { title: "Maison & Horizon | Acheter, vendre, louer une maison ou un appartement", description: "Maisons, appartements et propriétés de caractère à vendre et à louer, estimation sur demande. Marque, biens et prix de démonstration." };
  spec.settings = { ...spec.settings, logo_asset: "", fab_contact_link: "", fab_back_to_top: false };
  hidePendingBlocks(spec);
}
