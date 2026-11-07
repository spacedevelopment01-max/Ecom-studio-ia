/**
 * Références de niveau du propriétaire pour l'étape 1 (#492, documents du 7 novembre 2026 : « 50 noms et leurs
 * slogans » et « 50 palettes de couleurs »). Ce sont des EXEMPLES pour comprendre ce qu'il recherche, jamais des
 * modèles à recopier : SINA ne reprend ni ces noms, ni ces slogans, ni ces palettes telles quelles.
 *
 * Palettes : cinq rôles, comme dans le document. Fond, texte, bouton (couleur de marque et d'action), surface (cartes),
 * accent (détails graphiques) ; pour un fond en dégradé (135°), « depart » et « arrivee » remplacent fond et surface.
 * Les titres prennent la couleur du texte.
 */
import { luminance } from "../color";

/** Clarté d'une couleur (tests de calage des palettes). */
export const luminanceOf = (hex: string) => luminance(hex);

export type NameExample = { name: string; slogan: string; activity: string; kind: "produits" | "services" };
export type PaletteExample = {
  name: string; ambiance: string; ground: "blanc" | "uni" | "degrade" | "sombre";
  fond?: string; depart?: string; arrivee?: string; texte: string; bouton: string; surface?: string; accent: string;
};

export const NAME_EXAMPLES: NameExample[] = [
  ["Maison Orvane", "Chaque flamme a son parfum.", "Bougies parfumées"],
  ["Sève Claire", "Le fruit prend des bulles.", "Boissons pétillantes aux fruits"],
  ["Cabosse & Sel", "Le cacao dans toutes ses nuances.", "Chocolats de dégustation"],
  ["Ligne Portée", "Emporte l'essentiel, garde les mains libres.", "Sacs et accessoires de voyage"],
  ["Noctelle", "Fais le noir, trouve le calme.", "Masques de nuit et oreillers"],
  ["Terre d'Usage", "De la terre à la table.", "Vaisselle en céramique"],
  ["Braise Douce", "Du feu, juste ce qu'il faut.", "Sauces pimentées"],
  ["Petit Sillage", "La pluie fait partie du jeu.", "Imperméables pour enfants"],
  ["Maison Vitrail", "Porte la lumière.", "Bijoux en verre"],
  ["Savelle", "Le soin tient dans la main.", "Savons solides"],
  ["Grain d'Altitude", "Une origine à chaque tasse.", "Café de spécialité"],
  ["Trace Haute", "L'essentiel pour aller plus loin.", "Accessoires de randonnée"],
  ["Auralis", "Retrouve les détails du son.", "Casques audio"],
  ["Papier Source", "Toute idée commence quelque part.", "Carnets et fournitures créatives"],
  ["Volume Juste", "Plus de place pour vivre.", "Mobilier compact"],
  ["Fauve & Fil", "La promenade, à leur rythme.", "Harnais et laisses pour chiens"],
  ["Route des Grains", "Change d'horizon, une pincée à la fois.", "Mélanges d'épices"],
  ["Velin", "La couleur à ton image.", "Maquillage"],
  ["Cadence Nord", "Le confort donne le rythme.", "Chaussettes de running"],
  ["Ligne Solaire", "La lumière sous un autre angle.", "Lunettes de soleil"],
  ["Table Commune", "La meilleure partie, c'est ensemble.", "Jeux de société"],
  ["Maison Frimas", "Prends le temps de fondre.", "Glaces artisanales"],
  ["Jardin de Rebord", "Un rebord suffit pour semer.", "Kits de culture d'aromates"],
  ["Relais Volt", "De l'énergie jusqu'au bout du trajet.", "Batteries externes"],
  ["Lisière", "La douceur après l'eau.", "Linge de bain"],
].map(([name, slogan, activity]): NameExample => ({ name, slogan, activity, kind: "produits" })).concat([
  ["Atelier Nomade", "Un van à la mesure de tes voyages.", "Aménagement de vans"],
  ["Trame Intérieure", "Des espaces dessinés pour ta façon de vivre.", "Architecture d'intérieur"],
  ["Studio Clairjour", "Des images pour retrouver la journée.", "Photographie de mariage"],
  ["Courant Maîtrisé", "Une installation pensée pour ton quotidien.", "Électricité résidentielle"],
  ["Atelier Parement", "Du mur brut à la finition soignée.", "Plâtrerie et peinture"],
  ["Cycle Service Mobile", "L'atelier vient à ton vélo.", "Réparation de vélos à domicile"],
  ["Table de Saison", "La saison s'invite à ta table.", "Traiteur événementiel"],
  ["Puente Langues", "L'espagnol se parle dès le premier cours.", "Cours d'espagnol"],
  ["Mouvement Durable", "Progresse à un rythme que tu peux tenir.", "Coaching sportif"],
  ["L'Atelier Canin", "Un soin au rythme de ton chien.", "Toilettage pour chiens"],
  ["Clair Dossier", "Tes démarches, étape par étape.", "Assistance administrative"],
  ["Studio Fréquence", "De la première prise au dernier épisode.", "Production de podcasts"],
  ["Studio Contretemps", "Trouve ton style dans le mouvement.", "École de danse urbaine"],
  ["Longitude Privée", "Un itinéraire à ton rythme.", "Création de voyages sur mesure"],
  ["Espace Méthode", "Chaque chose à sa place, chaque geste plus simple.", "Organisation des espaces de travail"],
  ["Ligne de Coupe", "Des vêtements ajustés à ta silhouette.", "Couture et retouches"],
  ["Studio Mèche", "Une coupe qui suit ton style.", "Salon de coiffure"],
  ["Strate Fabrication", "Du modèle numérique à la pièce en main.", "Prototypage et impression 3D"],
  ["Studio Point Web", "Un site qui explique clairement ton métier.", "Création de sites pour indépendants"],
  ["Commerce Pratique", "Apprends en construisant ta boutique.", "Formation e-commerce"],
  ["Canopée Urbaine", "Un jardin à portée de fenêtre.", "Végétalisation de balcons et terrasses"],
  ["Relais Locatif", "Prêt pour les prochains arrivants.", "Nettoyage entre deux locations"],
  ["Studio Séquence", "Le bon plan, au bon moment.", "Montage vidéo"],
  ["L'Atelier des Pâtes", "Apprends les gestes, repars avec tes créations.", "Cours de pâtisserie"],
  ["Passage Organisé", "Fais le tri avant de faire les cartons.", "Accompagnement au tri et au déménagement"],
].map(([name, slogan, activity]): NameExample => ({ name, slogan, activity, kind: "services" })));

/** Palette « fond uni ou blanc ou sombre » : fond, texte, bouton, surface, accent. */
const solid = (name: string, ambiance: string, ground: "blanc" | "uni" | "sombre", fond: string, texte: string, bouton: string, surface: string, accent: string): PaletteExample => ({ name, ambiance, ground, fond, texte, bouton, surface, accent });
/** Palette « fond dégradé » (135°) : départ, texte, bouton, arrivée, accent. */
const grad = (name: string, ambiance: string, depart: string, texte: string, bouton: string, arrivee: string, accent: string): PaletteExample => ({ name, ambiance, ground: "degrade", depart, texte, bouton, arrivee, accent });

/**
 * Les palettes du document, hors la n° 11 (« Grain d'Altitude ») dont le texte clair sur fond blanc est illisible
 * dans le document lui-même : elle n'est pas proposée en exemple.
 */
export const PALETTE_EXAMPLES: PaletteExample[] = [
  solid("Maison Orvane", "Ivoire et aubergine", "blanc", "#FFFFFF", "#402039", "#A65346", "#E9CDB6", "#B88163"),
  grad("Sève Claire", "Verger électrique", "#FFF36E", "#191629", "#FF3C80", "#FF8EC9", "#FF9677"),
  solid("Cabosse & Sel", "Cacao et lavande", "sombre", "#2B1918", "#FFF2E0", "#C9B3F0", "#523330", "#E9A66C"),
  solid("Ligne Portée", "Sable et encre", "blanc", "#FFFFFF", "#172E40", "#28586B", "#D4E5E4", "#E19B51"),
  grad("Noctelle", "Nuit bleue", "#17183D", "#FFFFFF", "#B9B0F4", "#53378A", "#7BAFC8"),
  solid("Terre d'Usage", "Argile et sauge", "blanc", "#FFFFFF", "#38392D", "#596748", "#DCE0C8", "#BC785D"),
  grad("Braise Douce", "Paprika fumé", "#FFCE43", "#191629", "#D51B36", "#FF8669", "#F4D06F"),
  grad("Petit Sillage", "Averse pastel", "#AFE7FF", "#191629", "#402CF0", "#FFB6EC", "#FFB945"),
  solid("Maison Vitrail", "Verre givré", "blanc", "#FFFFFF", "#194B49", "#26675C", "#CDE3EE", "#D4ABDD"),
  solid("Savelle", "Propre et citronné", "uni", "#FAF8D7", "#29382D", "#526318", "#E6F2D9", "#C8CB5B"),
  grad("Trace Haute", "Sentier minéral", "#C8ECAD", "#191629", "#254F42", "#EAF3E5", "#D36A46"),
  solid("Auralis", "Signal nocturne", "sombre", "#111B28", "#F0F7FA", "#79D9E5", "#243345", "#AA8EF2"),
  grad("Papier Source", "Papier et indigo", "#FEE4FF", "#191629", "#5538F5", "#A6CCFF", "#EA8A75"),
  solid("Volume Juste", "Béton et olive", "blanc", "#FFFFFF", "#272B23", "#56603A", "#DDE0D0", "#C4A171"),
  solid("Fauve & Fil", "Promenade brique", "uni", "#F5D9D7", "#432D38", "#833E54", "#E7E7C5", "#7E9A82"),
  grad("Route des Grains", "Safran et prune", "#FFE385", "#191629", "#77354F", "#F8A55C", "#C57144"),
  solid("Velin", "Rose éditorial", "blanc", "#FFFFFF", "#3B1631", "#84234D", "#F1CBDD", "#B674B6"),
  grad("Cadence Nord", "Athlétique cobalt", "#DDF84D", "#191629", "#2336FF", "#70DBFF", "#DBEE65"),
  solid("Ligne Solaire", "Soleil et pétrole", "sombre", "#153D42", "#FBF0CB", "#EACD7C", "#24555B", "#EB9174"),
  solid("Table Commune", "Jeu en couleurs", "blanc", "#FFFFFF", "#3E285E", "#F84B91", "#DAD0F1", "#E7756B"),
  grad("Maison Frimas", "Gelato givré", "#FFD0F5", "#191629", "#762DDB", "#9FE9FF", "#A4CFBA"),
  solid("Jardin de Rebord", "Feuille tendre", "blanc", "#FFFFFF", "#303D24", "#496232", "#D9E6BD", "#C7906C"),
  solid("Relais Volt", "Graphite et citron vert", "sombre", "#171D24", "#EBF5E6", "#C8ED61", "#303A43", "#76C6AE"),
  solid("Lisière", "Linge côtier", "blanc", "#FFFFFF", "#304653", "#456474", "#F6F2E9", "#B6C6C9"),
  grad("Atelier Nomade", "Route forestière", "#24382F", "#FFFFFF", "#E4AF83", "#526854", "#A0B18E"),
  solid("Trame Intérieure", "Pierre et lilas", "blanc", "#FFFFFF", "#353040", "#58506C", "#DCD4E9", "#9F897B"),
  solid("Studio Clairjour", "Argentique rosé", "uni", "#F7EBE8", "#412F37", "#6A4655", "#E9D6D9", "#B79A81"),
  solid("Courant Maîtrisé", "Signal industriel", "blanc", "#FFFFFF", "#212E42", "#294E7A", "#D3E2F5", "#F3C35C"),
  solid("Atelier Parement", "Enduit et terre", "uni", "#F1E2D6", "#392C26", "#744633", "#E6CCB8", "#A7A991"),
  solid("Cycle Service Mobile", "Cycle urbain", "blanc", "#FFFFFF", "#1A3535", "#245B60", "#C6D9E9", "#E7A654"),
  solid("Table de Saison", "Table provençale", "blanc", "#FFFFFF", "#3B4531", "#58643B", "#DFE3C5", "#C78361"),
  grad("Puente Langues", "Conversation franche", "#FFD963", "#191629", "#A722E7", "#FF9F99", "#7460A8"),
  solid("Mouvement Durable", "Élan boréal", "sombre", "#173737", "#ECF6EA", "#A5E0AC", "#285052", "#F0AE71"),
  grad("L'Atelier Canin", "Pelage et menthe", "#B5FFE4", "#191629", "#006D62", "#E1D3FF", "#91BDB6"),
  solid("Clair Dossier", "Clarté administrative", "blanc", "#FFFFFF", "#192D47", "#214D82", "#DCE9F8", "#80B4AB"),
  grad("Studio Fréquence", "Fréquence ultraviolette", "#231940", "#FFFFFF", "#FF7BE5", "#58388D", "#F0AE9F"),
  solid("Studio Contretemps", "Danse urbaine", "sombre", "#292026", "#FFF4EA", "#FF673E", "#493241", "#D0E68B"),
  grad("Longitude Privée", "Atlas privé", "#D0EBF7", "#191629", "#315E75", "#F1D1AF", "#C3856C"),
  solid("Espace Méthode", "Ordre et graphite", "blanc", "#FFFFFF", "#283735", "#365D57", "#D4DFD9", "#9FADB9"),
  solid("Ligne de Coupe", "Fil et grenat", "uni", "#F3E3E7", "#3D2330", "#734154", "#E8D0D6", "#AFA77E"),
  solid("Studio Mèche", "Salon monochrome", "blanc", "#FFFFFF", "#2E2427", "#5C3F44", "#E0D3CA", "#C98E7F"),
  solid("Strate Fabrication", "Prototype cobalt", "sombre", "#182445", "#EAF3FF", "#83BEFF", "#26395C", "#A0D7BD"),
  grad("Studio Point Web", "Pixel corail", "#FFAEBB", "#191629", "#3021EE", "#D8BCFF", "#E88175"),
  solid("Commerce Pratique", "Commerce lisible", "blanc", "#FFFFFF", "#213B39", "#28655B", "#D4E9DF", "#EAC27F"),
  grad("Canopée Urbaine", "Terrasse méditerranéenne", "#DDF5AD", "#191629", "#116643", "#92DBC8", "#D99E78"),
  solid("Relais Locatif", "Accueil et fraîcheur", "blanc", "#FFFFFF", "#263D58", "#315C81", "#EAF4EF", "#90C7C7"),
  grad("Studio Séquence", "Montage en clair-obscur", "#20183F", "#FFFFFF", "#59F2D9", "#603778", "#71D5CB"),
  solid("L'Atelier des Pâtes", "Atelier pâtissier", "uni", "#F6E1D1", "#482B32", "#773D4C", "#F0CCD6", "#D6A56E"),
  solid("Passage Organisé", "Transition paisible", "blanc", "#FFFFFF", "#343352", "#53547F", "#D9DFEF", "#B4BDA2"),
];

/** Texte des références placé dans les consignes de Claude (mises en cache) : niveau et esprit, jamais à recopier. */
export function referencesForPrompt(): string {
  const names = (kind: NameExample["kind"]) => NAME_EXAMPLES.filter((x) => x.kind === kind).map((x) => `${x.name} — « ${x.slogan} » (${x.activity})`).join(" ; ");
  const pal = PALETTE_EXAMPLES.map((p) => p.ground === "degrade"
    ? `${p.ambiance} [dégradé] départ ${p.depart} → arrivée ${p.arrivee}, texte ${p.texte}, bouton ${p.bouton}, accent ${p.accent}`
    : `${p.ambiance} [fond ${p.ground}] fond ${p.fond}, texte ${p.texte}, bouton ${p.bouton}, surface ${p.surface}, accent ${p.accent}`).join("\n");
  return `Exemples de NOMS et SLOGANS choisis par le propriétaire du Studio (niveau et esprit attendus ; ne recopie jamais ces noms ni ces slogans) :
Produits : ${names("produits")}.
Services : ${names("services")}.
Ce qu'ils ont en commun : sobres, élégants, évocateurs ; une image du métier ou de son geste (la braise pour une sauce pimentée, la cabosse pour le chocolat, la sève pour une boisson aux fruits, la trame pour l'architecture d'intérieur) associée à un mot qui donne l'émotion ou la qualité (douce, claire, juste, haute) ; formes fréquentes : deux mots, « X & Y », « Maison … », « Atelier … », « Studio … », ou un mot inventé doux et prononçable (Noctelle, Savelle, Auralis, Velin). Aucun jeu de mots appuyé, aucun mot-valise forcé avec un nom de lieu. Slogans : une phrase courte et concrète (9 mots au plus), souvent au tutoiement ou à l'impératif, qui dit le bénéfice avec une image simple.

Exemples de PALETTES choisies par le propriétaire (niveau et esprit attendus ; ne recopie jamais une palette telle quelle) :
${pal}
Ce qu'elles ont en commun : cinq rôles (fond, texte, bouton, surface, accent ; dégradé à 135° : départ et arrivée à la place du fond et de la surface) ; le texte est une couleur foncée TEINTÉE (encre, aubergine, graphite vert), jamais un noir pur ; les titres prennent la couleur du texte ; le bouton porte la couleur de marque ; la surface est une version très claire et douce ; l'accent sert aux détails graphiques. Les couleurs sont accordées entre elles, actuelles, parfois franches (dégradés lumineux, boutons vifs), parfois fines et sourdes, jamais criardes ni au hasard.`;
}
