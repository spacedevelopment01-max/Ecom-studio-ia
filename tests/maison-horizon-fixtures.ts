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
  saveBrand(pid, { ...local.brand, name: "Maison & Horizon", generatedBy: "local" as const, tagline: "Un lieu à vous. Une nouvelle histoire.", story: "Maison & Horizon est une marque de démonstration du studio : une agence pour acheter, vendre et louer des maisons et des appartements de caractère.", positioning: "Maisons, appartements, propriétés d'exception : en ville comme à la campagne, un accompagnement pour acheter, vendre ou louer.", palette: { primary: "#163A2C", secondary: "#E7DCC8", accent: "#AC4E2A", light: "#F7F2EA", dark: "#16241C" }, direction: "maison-horizon" as never });
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
  const BUY = "/pages/acheter", RENT = "/pages/louer", MAP = "/pages/carte", CONTACT = "/pages/contact", ESTIMATE = "/pages/estimer", SELL = "/pages/vendre", LET = "/pages/mettre-en-location", AGENCY = "/pages/agence", ADVICE = "/pages/conseils", FAVORITES = "/pages/favoris", ARTICLE = "/pages/conseil-questions-visite", ALERT = "/pages/alertes", SPACE = "/pages/mon-espace", PROJECT = "/pages/mon-projet";
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
      tile({ ...img("conseil-achat.webp"), meta: "Acheter", title: "Les bonnes questions à poser lors d'une visite", link_label: "Lire l'article", link: ARTICLE }),
      tile({ ...img("conseil-location.webp"), meta: "Louer", title: "Location meublée ou vide : quelle solution pour votre projet ?", badge: "Article à venir" }),
      tile({ ...img("conseil-luberon.webp"), meta: "Vivre ici", title: "Le Luberon : un art de vivre entre nature et patrimoine", badge: "Article à venir" }),
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

  // ── Propriétaires : estimation, vendre, mettre en location (planche 06) ─────────────────────────────────────
  const qa = (title: string, text: string) => tile({ title, text });
  const ownerHero = (eyebrow: string, heading: string, text: string, file: string, buttons: Record<string, unknown> = {}) => section("re-hero", { layout: "page", height: "medium", text_side: "middle", ...img(file), eyebrow, heading, text: p(text), ...buttons, color_scheme: "scheme-1", padding_bottom: 0 });
  page("estimer", "Estimer", { title: "Estimer votre bien | Maison & Horizon", description: "Demandez l'estimation de votre maison ou de votre appartement en trois étapes : un conseiller étudie votre bien et vous recontacte. Aucun prix calculé en ligne." }, [
    ["hero", ownerHero("Estimation de bien immobilier", "Quelle est la valeur\nde votre bien ?", "Faites estimer votre bien par nos experts, pour un avis de valeur fiable et personnalisé, en fonction de votre bien, de son environnement et du marché local.", "estimation-hero.webp", { height: "tall", room_below: 170 })],
    ["form", section("re-form", { kind: "estimate", overlap: true, quote: "Chaque bien a une histoire, la vôtre mérite une estimation sur mesure.", ...img("estimation-terrasse.webp"), caption: "Une expertise locale pour révéler tout le potentiel de votre bien.", submit_label: "Envoyer ma demande d'estimation", ...pad(0, 32) })],
    ["method", section("re-tiles", { layout: "icons", align: "center", columns: 4, heading: "Une estimation à affiner avec notre agence", text: p("Notre estimation repose sur une analyse du marché local, de votre bien et de ses spécificités. Elle constitue une première indication, à affiner lors d'un échange avec nos conseillers."), color_scheme: "scheme-1", ...pad(24, 24) }, [
      tile({ icon: "chart", title: "Analyse du marché local", text: "Étude des biens similaires récemment vendus et en cours de commercialisation." }),
      tile({ icon: "estimate", title: "Prise en compte des spécificités", text: "Emplacement, état général, prestations, potentiel d'évolution." }),
      tile({ icon: "shield", title: "Un regard d'expert", text: "Un conseiller qui connaît votre secteur étudie votre demande." }),
      tile({ icon: "chat", title: "Un échange personnalisé", text: "Une estimation affinée lors d'un rendez-vous, sur place ou en visio." }),
    ])],
    ["faq", section("re-tiles", { layout: "questions", heading: "Vos questions sur l'estimation", side_image_asset: asset("estimation-salon.webp"), side_image_alt: MH_MEDIA["estimation-salon.webp"], ...pad(24, 48) }, [
      qa("L'estimation en ligne est-elle fiable ?", "Ce formulaire ne calcule pas de prix : il transmet les caractéristiques de votre bien à un conseiller, qui vous donne son avis de valeur après étude, puis l'affine lors d'un échange."),
      qa("Combien de temps faut-il pour obtenir une estimation ?", "Délai à préciser par l'agence."),
      qa("L'estimation est-elle gratuite et sans engagement ?", "Conditions à préciser par l'agence."),
      qa("Faut-il forcément un rendez-vous sur place ?", "Non : l'échange peut avoir lieu sur place ou en visio, selon votre choix."),
    ])],
  ]);
  page("vendre", "Vendre", { title: "Vendre votre bien | Maison & Horizon", description: "De l'estimation à la signature : une méthode en cinq étapes pour vendre votre maison ou votre appartement sereinement." }, [
    ["hero", ownerHero("Vente immobilière", "Vendre votre bien,\navec un accompagnement clair", "De l'estimation à la signature, nous vous guidons à chaque étape pour une vente sereine, dans le respect de vos objectifs.", "vendre-hero.webp", { button_label: "Demander une estimation", button_link: ESTIMATE, button2_label: "Nous contacter", button2_link: CONTACT })],
    ["steps", section("re-tiles", { layout: "steps", heading: "Un accompagnement en 5 étapes", text: p("Une méthode claire et personnalisée, pour avancer en toute confiance."), ...pad(36, 24) }, [
      tile({ icon: "house", title: "Estimation de votre bien", text: "Analyse du marché et avis de valeur par nos conseillers." }),
      tile({ icon: "document", title: "Préparation de la vente", text: "Conseils sur la mise en valeur, diagnostics et documents." }),
      tile({ icon: "search", title: "Diffusion de l'annonce", text: "Photos et mise en avant sur les canaux choisis avec vous." }),
      tile({ icon: "pin", title: "Organisation des visites", text: "Sélection des acquéreurs et visites qualifiées." }),
      tile({ icon: "signature", title: "Offre et signature", text: "Accompagnement jusqu'à la signature chez le notaire." }),
    ])],
    ["engagements", section("re-tiles", { layout: "icons", heading: "Nos engagements\npour une vente réussie", side_image_asset: asset("vendre-maison.webp"), side_image_alt: MH_MEDIA["vendre-maison.webp"], media_icon: "house", media_title: "Proximité", media_text: "Une connaissance locale de votre secteur.", ...pad(24, 24) }, [
      tile({ icon: "estimate", title: "Une estimation juste et argumentée", text: "Basée sur une étude du marché local." }),
      tile({ icon: "document", title: "Une stratégie de commercialisation sur mesure", text: "Photos, diffusion ciblée, mise en valeur du bien." }),
      tile({ icon: "user", title: "Un accompagnement personnalisé", text: "Un interlocuteur dédié tout au long de votre projet." }),
      tile({ icon: "people", title: "Une sélection rigoureuse des acquéreurs", text: "Des visites qualifiées pour gagner du temps." }),
      tile({ icon: "signature", title: "Un suivi jusqu'à la signature", text: "Coordination avec les notaires et toutes les parties prenantes." }),
    ])],
    ["cta", section("re-feature", { layout: "story", heading: "Parlons de votre projet de vente", text: p("Chaque bien est unique. Échangeons ensemble sur vos objectifs et les meilleures options pour une vente sereine."), button_style: "button", button_label: "Demander une estimation", button_link: ESTIMATE, ...img("vendre-olivier.webp"), quote: "Une vente réussie, c'est avant tout une histoire de confiance et d'écoute.", color_scheme: "scheme-2", ...pad(32, 32) })],
    ["faq", section("re-tiles", { layout: "questions", heading: "Questions fréquentes", side_image_asset: asset("vendre-village.webp"), side_image_alt: MH_MEDIA["vendre-village.webp"], media_side: "right", ...pad(32, 48) }, [
      qa("Combien de temps faut-il pour vendre un bien ?", "Cela dépend du bien, de son prix et du marché local : l'agence vous donne son analyse lors de l'estimation."),
      qa("Quels sont les diagnostics obligatoires ?", "La liste dépend du bien (année de construction, installations…) : l'agence vous indique ceux à réaliser pour le vôtre."),
      qa("Quels sont les frais d'agence ?", "Honoraires à préciser par l'agence (barème à renseigner)."),
      qa("Comment est fixé le prix de vente ?", "À partir de l'avis de valeur du conseiller et de votre décision : c'est vous qui fixez le prix."),
    ])],
  ]);
  page("mettre-en-location", "Mettre en location", { title: "Mettre votre bien en location | Maison & Horizon", description: "Loyer, annonce, visites, dossier et bail : une méthode en cinq étapes pour louer votre bien. Demandez à être rappelé." }, [
    ["hero", ownerHero("Location immobilière", "Mettre votre bien\nen location", "Un accompagnement professionnel pour louer votre bien dans les meilleures conditions, en toute sérénité.", "mise-location-hero.webp", { button_label: "Être rappelé par un conseiller", button_link: "#rappel", button2_label: "Nos services", button2_link: "#services" })],
    ["method", section("re-tiles", { layout: "steps", heading: "Notre méthode pour une location réussie", text: p("Une approche structurée pour valoriser votre bien et trouver le bon locataire."), side_image_asset: asset("mise-location-salon.webp"), side_image_alt: MH_MEDIA["mise-location-salon.webp"], ...pad(36, 24) }, [
      tile({ title: "Découvrir votre bien", text: "Analyse de ses atouts et de son potentiel locatif." }),
      tile({ title: "Définir le loyer", text: "Étude du marché local pour un positionnement juste." }),
      tile({ title: "Préparer l'annonce", text: "Conseils sur la mise en valeur, photos." }),
      tile({ title: "Organiser les visites", text: "Sélection des candidats et visites qualifiées." }),
      tile({ title: "Finaliser la location", text: "Étude des dossiers, rédaction du bail et état des lieux." }),
    ])],
    ["callback", section("re-form", { kind: "callback", anchor: "rappel", heading: "Demandez à être rappelé", text: p("Échangeons sur votre projet de mise en location et sur nos solutions d'accompagnement."), submit_label: "Être rappelé", quote: "Confiez votre bien en toute sérénité", ...img("mise-location-balcon.webp"), aside_style: "green", ...pad(24, 24) })],
    ["services", section("re-tiles", { layout: "cards", anchor: "services", columns: 4, heading: "Nos prestations de gestion locative", badge: "Prestations à préciser", text: p("Nos services de gestion locative s'adaptent à vos besoins. Le détail des prestations, conditions et honoraires vous est communiqué par l'agence."), ...pad(24, 24) }, [
      tile({ icon: "search", title: "Recherche de locataire", text: "Diffusion de l'annonce et sélection des dossiers." }),
      tile({ icon: "document", title: "Rédaction du bail", text: "Bail et état des lieux." }),
      tile({ icon: "chart", title: "Suivi administratif", text: "Quittances, révisions de loyer, relation locataire." }),
      tile({ icon: "house", title: "Gestion courante", text: "Prestations à préciser avec l'agence." }),
    ])],
    ["faq", section("re-tiles", { layout: "questions", heading: "Questions fréquentes", side_image_asset: asset("mise-location-chambre.webp"), side_image_alt: MH_MEDIA["mise-location-chambre.webp"], media_side: "right", ...pad(24, 48) }, [
      qa("Comment est fixé le loyer ?", "À partir de l'étude du marché local par l'agence, dans le respect des règles applicables à votre commune (à vérifier pour votre bien)."),
      qa("Quels documents sont nécessaires ?", "Liste à renseigner par l'agence."),
      qa("Quelle est la durée d'un bail de location ?", "Elle dépend du type de location (vide ou meublée) : l'agence vous l'indique pour votre bien."),
      qa("Proposez-vous la gestion locative ?", "Oui, plusieurs prestations sont proposées ; leur détail et leurs conditions sont à préciser par l'agence."),
    ])],
  ]);

  // ── Agence, conseils, article, contact (planche 05) ─────────────────────────────────────────────────────────
  page("agence", "L'agence", { title: "L'agence | Maison & Horizon", description: "Une agence à taille humaine pour acheter, vendre ou louer des lieux de vie de caractère. Marque de démonstration." }, [
    ["hero", pageHero("Une agence,\ndes projets de vie", "Des lieux uniques, des histoires singulières. Maison & Horizon vous accompagne avec exigence et bienveillance dans tous vos projets immobiliers.", "agence-hero.webp", { height: "medium", button_label: "Découvrir notre approche", button_link: "#approche", note: "Marque de démonstration du studio." })],
    ["roots", section("re-feature", { layout: "overlay", heading: "Ancrés dans un art\nde vivre local", text: p("Nous mettons notre connaissance du territoire au service de vos projets. Maisons de charme, appartements contemporains ou biens d'exception : nous sélectionnons des lieux de vie en harmonie avec leur environnement."), button_label: "Découvrir nos biens", button_link: BUY, ...img("village.webp"), ...pad(32, 24) })],
    ["approach", section("re-tiles", { layout: "icons", anchor: "approche", columns: 3, heading: "Notre approche", ...pad(24, 24) }, [
      tile({ icon: "house", title: "Écoute et exigence", text: "Comprendre vos besoins pour vous proposer des biens en adéquation avec vos projets de vie." }),
      tile({ icon: "leaf", title: "Un regard durable", text: "Valoriser des biens de qualité, dans le respect de leur histoire et de leur environnement." }),
      tile({ icon: "handshake", title: "Un accompagnement sur mesure", text: "À chaque étape, nous sommes à vos côtés pour avancer en toute sérénité." }),
    ])],
    ["horizons", section("re-feature", { layout: "overlay", heading: "Des biens pour\ntous vos horizons", text: p("Résidences principales, maisons de famille, pied-à-terre ou investissements : nous vous guidons vers des biens qui résonnent avec vos aspirations."), button_label: "Découvrir nos biens", button_link: BUY, ...img("agence-piscine.webp"), ...pad(24, 32) })],
    ["cta", section("re-feature", { layout: "cta", heading: "Parlons de votre projet", text: p("Une question, une envie, un projet ? Notre équipe est à votre écoute pour vous accompagner."), button_label: "Nous contacter", button_link: CONTACT, color_scheme: "scheme-3", ...pad(0) })],
  ]);
  const soon = "Article à venir";
  page("conseils", "Conseils", { title: "Nos conseils immobiliers | Maison & Horizon", description: "Des articles pour vous guider à chaque étape de votre projet immobilier : acheter, louer, vendre." }, [
    ["hero", pageHero("Nos conseils\nimmobiliers", "Des articles pour vous guider à chaque étape de votre projet immobilier.", "conseils-hero.webp")],
    ["list", section("re-tiles", { layout: "cards", columns: 2, filter_tabs: true, all_label: "Tous les articles", note: "Un seul article est rédigé dans cette démonstration ; les autres sont annoncés « à venir ».", ...pad(28, 48) }, [
      tile({ ...img("article-hero.webp"), meta: "Acheter", title: "Les bonnes questions à poser lors d'une visite", text: "Préparez votre visite et ne passez pas à côté des détails essentiels.", link_label: "Lire l'article", link: ARTICLE }),
      tile({ ...img("article-vente.webp"), meta: "Vendre", title: "Comment valoriser son bien avant la mise en vente", text: "Des conseils pratiques pour révéler tout le potentiel de votre bien.", badge: soon }),
      tile({ ...img("article-cuisine.webp"), meta: "Louer", title: "Location vide ou meublée : que choisir ?", text: "Avantages, contraintes : faites le bon choix selon votre projet.", badge: soon }),
      tile({ ...img("article-terrasse.webp"), meta: "Acheter", title: "Les quartiers à connaître dans la région", text: "Cadre de vie, commodités : notre regard sur les secteurs recherchés.", badge: soon }),
      tile({ ...img("article-escalier.webp"), meta: "Vendre", title: "Les diagnostics immobiliers : ce qu'il faut savoir", text: "Ce qu'ils couvrent et quand les faire réaliser.", badge: soon }),
      tile({ ...img("article-location.webp"), meta: "Louer", title: "Mettre un bien en location : les étapes clés", text: "De la préparation du bien à la signature du bail.", badge: soon }),
    ])],
  ]);
  const ul = (items: string[]) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  page("conseil-questions-visite", "Les bonnes questions à poser lors d'une visite", { title: "Les bonnes questions à poser lors d'une visite | Maison & Horizon", description: "Le bien, les charges, le quartier, les aspects pratiques : les questions à poser pour préparer une visite immobilière." }, [
    ["hero", pageHero("Les bonnes questions\nà poser lors d'une visite", "", "article-hero.webp", { height: "short", eyebrow: "Acheter", meta: "Publié dans Acheter · Temps de lecture : 3 min" })],
    ["body", section("re-article", { intro: p("Une visite est bien plus qu'une simple découverte : c'est l'occasion de recueillir des informations essentielles pour vous projeter et faire le bon choix. Voici les questions clés à poser pour ne rien oublier."), ...img("conseil-achat.webp"), ...pad(32, 16) }, [
      { type: "part", settings: { title: "Le bien et ses caractéristiques", body: p("Commencez par des questions concrètes sur le bien lui-même : son état général, son année de construction, les travaux déjà réalisés ou à prévoir, ainsi que les équipements inclus.") + ul(["Quelle est l'année de construction ?", "Des travaux ont-ils été réalisés récemment ?", "Quels sont les équipements inclus dans la vente ?", "Y a-t-il des travaux à prévoir ?"]) } },
      { type: "part", settings: { title: "Les charges et la gestion", body: p("Pour un appartement ou une maison en copropriété, il est important de bien comprendre le montant des charges et ce qu'elles couvrent.") + ul(["Quel est le montant des charges de copropriété ?", "Que comprennent-elles ?", "Y a-t-il des travaux votés ou à venir dans la copropriété ?", "Quelle est la taxe foncière ?"]) } },
      { type: "part", settings: { title: "L'environnement et le quartier", body: p("Le cadre de vie compte autant que le bien. Renseignez-vous sur les commodités, les transports, les établissements scolaires et l'ambiance du quartier.") + ul(["Quels sont les commerces et services à proximité ?", "Y a-t-il des écoles, collèges ou lycées à proximité ?", "Quels sont les moyens de transport disponibles ?", "Comment est l'ambiance du quartier (calme, animé, familial…) ?"]) } },
      { type: "part", settings: { title: "Les aspects pratiques", body: p("Enfin, pensez aux détails qui facilitent le quotidien et qui peuvent faire la différence.") + ul(["Quelle est l'orientation du bien ?", "Y a-t-il un extérieur (balcon, terrasse, jardin) ?", "Le stationnement est-il facile ?", "Y a-t-il des contraintes particulières (règlement de copropriété, servitudes…) ?"]) } },
      { type: "callout", settings: { title: "À retenir", body: p("Une visite bien préparée vous permet de comparer plus facilement les biens et de vous projeter sereinement. N'hésitez pas à prendre des notes et à poser toutes vos questions, même les plus précises.") } },
    ])],
    ["related", section("re-tiles", { layout: "articles", heading: "Articles liés", link_label: "Tous les conseils", link: ADVICE, ...pad(16, 48) }, [
      tile({ ...img("article-vente.webp"), meta: "Vendre", title: "Comment valoriser son bien avant la mise en vente", badge: soon }),
      tile({ ...img("article-cuisine.webp"), meta: "Louer", title: "Location vide ou meublée : que choisir ?", badge: soon }),
      tile({ ...img("article-terrasse.webp"), meta: "Acheter", title: "Les quartiers à connaître dans la région", badge: soon }),
    ])],
  ]);
  page("contact", "Contact", { title: "Contact | Maison & Horizon", description: "Une question, un projet d'achat, de location ou de vente ? Écrivez à l'agence. Coordonnées à renseigner." }, [
    ["hero", section("re-hero", { layout: "page", height: "medium", text_side: "bottom", ...img("contact-hero.webp"), heading: "Parlons de votre projet", text: p("Une question, une envie, un projet immobilier ? Nous sommes à votre écoute pour vous accompagner."), color_scheme: "scheme-1", padding_bottom: 0 })],
    ["form", section("re-form", { kind: "contact", heading: "Vos coordonnées", motifs: "Acheter|house,Louer|key,Vendre|tag,Mettre en location|building", message_placeholder: "Parlez-nous de votre projet…", submit_label: "Envoyer ma demande", aside_style: "info", ...img("carte-reference.png"), caption: "Carte illustrative : adresse à renseigner", ...pad(32, 32) })],
    ["side", section("re-feature", { layout: "overlay", heading: "À vos côtés,\nà chaque étape", text: p("Que vous souhaitiez acheter, louer, vendre ou mettre un bien en location, notre équipe est là pour vous conseiller."), button_style: "button", button_label: "Voir nos biens", button_link: BUY, ...img("contact-village.webp"), ...pad(16, 48) })],
  ]);

  // ── Favoris, alerte, espace, informations légales, cookies (planche 07) ─────────────────────────────────────
  page("favoris", "Mes favoris", { title: "Mes favoris | Maison & Horizon", description: "Les biens que vous avez mis de côté, à comparer côte à côte. Gardés dans ce navigateur, sans compte." }, [
    ["fav", section("re-favorites", { buy_url: BUY, rent_url: RENT, alert_url: ALERT, ...pad(24, 48) })],
  ]);
  page("alertes", "Créer une alerte", { title: "Créer une alerte | Maison & Horizon", description: "Indiquez vos critères (ville, budget, type, pièces) : l'agence reçoit votre demande d'alerte." }, [
    ["form", section("re-form", { kind: "alert", heading: "Créer une alerte", heading_tag: "h1", text: p("Recevez les nouveaux biens correspondant à vos critères."), submit_label: "Créer l'alerte", consent_label: "J'accepte de recevoir par e-mail les nouvelles annonces correspondant à ces critères.", ...img("alerte-maison.webp"), ...pad(24, 48) })],
  ]);
  page("mon-espace", "Mon espace", { title: "Mon espace | Maison & Horizon", description: "Accédez à votre compte ou créez un espace. Les comptes dépendent de la plateforme de la boutique." }, [
    ["account", section("re-account", { layout: "login", heading: "Mon espace", text: "Accédez à votre compte ou créez un nouvel espace.", ...img("compte-interieur.webp"), ...pad(24, 48) })],
  ]);
  page("mon-projet", "Mon projet immobilier", { title: "Mon projet immobilier | Maison & Horizon", description: "Vos favoris et vos recherches récentes, gardés dans ce navigateur, et vos accès rapides." }, [
    ["dash", section("re-account", { layout: "dashboard", heading: "Mon projet immobilier", text: "Suivez votre projet et retrouvez vos outils au même endroit.", favorites_url: FAVORITES, alert_url: ALERT, contact_url: CONTACT, visit_image_asset: asset("espace-visite.webp"), visit_image_alt: MH_MEDIA["espace-visite.webp"], ...pad(24, 48) })],
  ]);
  const todo = (label: string) => `${label} : <em>[À renseigner]</em>`;
  const legalTabs = [
    { type: "tab", settings: { title: "Mentions légales", anchor: "mentions", heading: "Mentions légales", body: p("Maison & Horizon est une marque de démonstration du studio : aucune agence n'est exploitée sous ce nom et aucun message envoyé depuis ce site n'est transmis.") + p("<em>[À compléter]</em> Raison sociale, forme juridique, capital, siège social, numéro RCS, directeur de la publication, hébergeur du site.") + p([todo("Carte professionnelle"), todo("Délivrée par"), todo("Garantie financière"), todo("Assurance responsabilité civile professionnelle")].join("<br>")) } },
    { type: "tab", settings: { title: "Honoraires", anchor: "honoraires", heading: "Barème des honoraires", body: p("Le barème des honoraires de l'agence (vente et location) est à afficher ici avant publication.") + p("<em>[À renseigner]</em>") } },
    { type: "tab", settings: { title: "Confidentialité", anchor: "confidentialite", heading: "Données personnelles", body: p("Les formulaires du site (demande de visite, rappel, estimation, alerte, contact) recueillent les informations saisies (nom, e-mail, téléphone, message, critères) pour répondre à votre demande.") + p("Vos favoris et vos recherches récentes restent dans votre navigateur : ils ne sont pas envoyés à l'agence.") + p([todo("Responsable du traitement"), todo("Durée de conservation"), todo("Contact pour exercer vos droits (accès, rectification, effacement)")].join("<br>")) } },
    { type: "tab", settings: { title: "Cookies", anchor: "cookies", heading: "Cookies et stockage dans le navigateur", body: p("Ce site garde dans votre navigateur vos favoris, vos recherches récentes et votre choix de cookies, pour que ces fonctions marchent d'une page à l'autre.") + p("Le thème n'ajoute aucun outil de mesure d'audience ni de publicité. Les cookies posés par la plateforme qui héberge la boutique sont à vérifier et à décrire ici : <em>[À renseigner]</em>"), cookie_button: true } },
  ];
  page("mentions-legales", "Informations légales", { title: "Informations légales | Maison & Horizon", description: "Mentions légales, honoraires, confidentialité et cookies. Éléments de démonstration à compléter avant publication." }, [
    ["legal", section("re-legal", { heading: "Informations légales", text: "Consultez nos informations légales et nos engagements de transparence.", notice: "Les contenus de cette page sont des éléments de démonstration, à compléter et à valider avant publication.", contact_text: `Pour toute question, vous pouvez nous contacter via notre <a href="${CONTACT}">formulaire de contact</a>.`, ...img("legal-plaque.webp"), ...pad(24, 48) }, legalTabs)],
  ]);
  page("cookies", "Cookies", { title: "Cookies | Maison & Horizon", description: "Les informations gardées dans votre navigateur et vos choix de cookies, modifiables à tout moment." }, [
    ["legal", section("re-legal", { heading: "Informations légales", text: "Consultez nos informations légales et nos engagements de transparence.", notice: "Les contenus de cette page sont des éléments de démonstration, à compléter et à valider avant publication.", initial_tab: "cookies", ...img("legal-plaque.webp"), ...pad(24, 48) }, legalTabs)],
  ]);
  // Page introuvable.
  spec.templates["404"] = template([["hero", section("re-hero", { layout: "page", height: "tall", text_side: "middle", ...img("404-village.webp"), heading: "Cette adresse\nreste à trouver", text: p("La page que vous recherchez n'existe pas ou a peut-être été déplacée."), button_label: "Retour à l'accueil", button_link: "/", button2_label: "Voir nos biens", button2_link: BUY, color_scheme: "scheme-1", padding_bottom: 0 })]]);

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
    "footer-agence": { title: "L'agence", links: [{ title: "Notre agence", url: AGENCY }, { title: "Conseils", url: ADVICE }, { title: "Contact", url: CONTACT }, { title: "Mes favoris", url: FAVORITES }, { title: "Mon espace", url: PROJECT }] },
    legal: { title: "Informations", links: [{ title: "Informations légales", url: "/pages/mentions-legales" }, { title: "Confidentialité", url: "/pages/mentions-legales#confidentialite" }, { title: "Cookies", url: "/pages/cookies" }] },
  };
  for (const sec of Object.values(spec.groups.header?.sections ?? {})) if (sec.type === "header") sec.settings = { ...sec.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, account_link: PROJECT, favorites_link: FAVORITES, favorites_label: "Mes favoris", cta_label: "Nous contacter", cta_link: CONTACT, cta_icon: "none", phone: "", color_scheme: "scheme-1" };
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
  spec.settings = { ...spec.settings, logo_asset: "", fab_contact_link: "", fab_back_to_top: false, cookie_banner: true, cookie_title: "Vos préférences de cookies", cookie_text: "Ce site garde vos favoris et vos choix dans votre navigateur. Aucun outil de mesure d'audience ni de publicité n'est ajouté par le thème.", cookie_policy_link: "/pages/cookies", cookie_policy_label: "En savoir plus" };
  // Pas de hidePendingBlocks : la consigne veut les mentions « à renseigner » visibles (rien d'inventé, rien de caché).
}
