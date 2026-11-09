/**
 * Références de niveau du propriétaire pour l'étape 1 (#492, documents du 7 novembre 2026 : « 50 noms et leur
 * logique » — méthode de nommage, seule référence des noms, qui remplace la liste « 50 noms et leurs slogans » — et
 * « 50 palettes de couleurs »). Ce sont des EXEMPLES pour comprendre ce qu'il recherche, jamais des
 * modèles à recopier : SINA ne reprend ni ces noms, ni ces slogans, ni ces palettes telles quelles.
 *
 * Palettes : cinq rôles, comme dans le document. Fond, texte, bouton (couleur de marque et d'action), surface (cartes),
 * accent (détails graphiques) ; pour un fond en dégradé (135°), « depart » et « arrivee » remplacent fond et surface.
 * Les titres prennent la couleur du texte.
 */
import { luminance } from "../color";

/** Clarté d'une couleur (tests de calage des palettes). */
export const luminanceOf = (hex: string) => luminance(hex);

export type NameExample = { name: string; activity: string; logic: string; kind: "produits" | "services" };
export type PaletteExample = {
  name: string; ambiance: string; ground: "blanc" | "uni" | "degrade" | "sombre";
  fond?: string; depart?: string; arrivee?: string; texte: string; bouton: string; surface?: string; accent: string;
};

export const NAME_EXAMPLES: NameExample[] = [
  ["La Mèche Courte", "Bougies parfumées", "Pars de la mèche, pièce centrale de la bougie. « Avoir la mèche courte » lui donne un tempérament vif."],
  ["Fruits Défendus", "Sodas aux fruits", "Pars de l'ingrédient, le fruit. Le « fruit défendu » ajoute l'idée d'une tentation."],
  ["Le Dernier Carré", "Chocolats", "Observe la forme de la tablette. Le dernier carré évoque celui que chacun aimerait garder."],
  ["Repli", "Sacs de voyage pliables", "Pars du geste de replier le sac. Un mot court fait sentir la compacité."],
  ["Songe", "Linge de lit", "Pars du moment d'usage, la nuit. Le songe évoque ce qui commence une fois couché."],
  ["Tour de Table", "Vaisselle en céramique", "Relie le tour du potier à la table dressée. L'expression réunit les deux."],
  ["Mordant", "Sauces pimentées", "Pars de la sensation en bouche. Le mot décrit aussi un caractère affirmé."],
  ["Temps de Canard", "Imperméables pour enfants", "Pars de la pluie. Le canard fait penser à l'eau et donne un personnage à la marque."],
  ["Éclat de Verre", "Bijoux en verre", "Pars de la matière. « Éclat » désigne un fragment et la lumière qu'il renvoie."],
  ["Écume", "Savons solides", "Pars de la mousse qui apparaît au contact de l'eau. L'écume transpose cette image au bord de mer."],
  ["Allongé", "Café de spécialité", "Pars d'une façon de servir le café. Le mot invite aussi à prolonger la pause."],
  ["Dénivelé", "Accessoires de randonnée", "Pars d'un repère que les randonneurs regardent avant de partir. Le mot évoque l'effort et le relief."],
  ["Sourdine", "Casques à réduction de bruit", "Pars du bénéfice recherché. Mettre le monde en sourdine traduit la réduction du bruit."],
  ["Marge de Manœuvre", "Carnets créatifs", "Pars de la marge sur la page. L'expression évoque la liberté d'essayer."],
  ["Double Fond", "Mobilier avec rangement intégré", "Pars du compartiment dissimulé. Le nom traduit la fonction en évoquant une cachette."],
  ["Cavale", "Harnais et laisses pour chiens", "Pars du mouvement du chien en balade. « Cavale » donne une impression d'aventure."],
  ["Pincée de Folie", "Mélanges d'épices", "Pars d'une mesure de cuisine. La folie évoque le petit écart qui change le plat."],
  ["Sans Fard", "Maquillage effet peau nue", "Pars du fard, associé au maquillage. L'expression suggère aussi le naturel."],
  ["À Pied d'Œuvre", "Chaussettes de running", "Pars du pied, en contact direct avec le produit. L'expression évoque le passage à l'action."],
  ["Incognito", "Lunettes de soleil", "Pars de ce que cachent les verres, le regard. Le nom joue sur le plaisir de passer inaperçu."],
  ["Jeu de Mains", "Jeux d'adresse", "Pars du geste du joueur. L'expression transforme la dextérité en promesse de jeu."],
  ["Frisson", "Glaces artisanales", "Pars du froid à la première bouchée. Le frisson évoque aussi une émotion."],
  ["On Sème", "Kits de culture d'aromates", "Pars de la première étape, semer. À l'oral, on entend aussi « on s'aime »."],
  ["Dernier Pourcent", "Batteries externes", "Pars du moment où le besoin se fait sentir, à 1 %. Le nom met en scène cette urgence."],
  ["À Sec", "Serviettes et peignoirs", "Pars du résultat après la douche. L'expression détourne l'idée de se retrouver sans eau."],
  ["Solstice", "Mode d'été", "Pars de la saison des vêtements : le jour le plus long, le plein soleil. Un seul mot fort, élégant, qui se dit dans toutes les langues (genre préféré du propriétaire, 9 novembre 2026)."],
  ["Rupture", "Streetwear en séries limitées", "Pars de l'attitude de la marque : casser les codes, sortir du rang. Un mot court et percutant qui sonne comme un manifeste (genre préféré du propriétaire)."],
].map(([name, activity, logic]): NameExample => ({ name, activity, logic, kind: "produits" })).concat([
  ["Contretemps", "Escape game", "Relie le compte à rebours aux obstacles imprévus. « Contretemps » réunit les deux."],
  ["Pièce Rapportée", "Architecture d'intérieur", "Pars de la pièce à aménager. L'expression évoque aussi un élément qu'on ajoute à un ensemble."],
  ["Entre Deux Poses", "Photographie de mariage", "Pars des photos posées. Le nom attire l'attention sur les moments spontanés entre elles."],
  ["Le Courant Passe", "Électricité résidentielle", "Pars du courant électrique. L'expression parle aussi du bon contact avec l'artisan."],
  ["Seconde Couche", "Peinture et rénovation", "Pars d'un geste du métier. La seconde couche suggère aussi un nouveau départ pour la pièce."],
  ["Roue Libre", "Réparation de vélos", "Pars d'un mécanisme du vélo. L'expression évoque aussi la liberté de repartir."],
  ["À Table", "Traiteur événementiel", "Pars du moment où le service prend vie. L'invitation familière appelle directement les convives."],
  ["Double Sens", "Cours d'espagnol en conversation", "Pars des mots qui changent de sens selon le contexte ou la langue. Le nom attise la curiosité."],
  ["Souffle", "Cours de chant", "Pars de la respiration, à la base du chant. Le mot évoque aussi l'élan donné à une phrase musicale."],
  ["Au Poil", "Toilettage canin", "Pars du pelage. L'expression décrit aussi un travail impeccable."],
  ["Dépli", "Assistance administrative", "Pars du geste d'ouvrir un courrier plié. Le nom suggère qu'on démêle une démarche."],
  ["Prise de Voix", "Studio de podcast", "Pars de la prise de son. La voix devient le centre du nom et évoque la prise de parole."],
  ["Pas de Côté", "École de danse", "Pars d'un mouvement concret. L'expression évoque aussi une façon différente de bouger ou de voir."],
  ["Bifurque", "Voyages sur mesure", "Pars du choix d'un itinéraire. Le verbe invite à quitter le trajet habituel."],
  ["Place Nette", "Désencombrement à domicile", "Pars du résultat visible, l'espace libéré. L'expression traduit à la fois la place et l'ordre retrouvés."],
  ["Point de Reprise", "Couture et retouches", "Pars du point de couture et de la reprise d'un vêtement. Le nom suggère aussi sa seconde vie."],
  ["Coupe Court", "Salon spécialisé dans les coupes courtes", "Pars de la spécialité. L'expression « couper court » rend le nom direct et mémorisable."],
  ["Strate", "Prototypage et impression 3D", "Pars de la fabrication couche par couche. Le mot condense le procédé en une image."],
  ["Point d'Entrée", "Création de sites web", "Pars du premier accès à un site. Le nom évoque la porte d'entrée vers l'entreprise."],
  ["Dernier Kilomètre", "Logistique e-commerce", "Pars de la dernière étape jusqu'au client. Cette image concrète résume l'enjeu de la livraison."],
  ["Prends Racine", "Végétalisation de balcons", "Pars des plantes qui s'installent. L'expression suggère aussi qu'on a envie de rester sur son balcon."],
  ["Entre Deux Clés", "Ménage entre deux locations", "Pars de la restitution puis de la remise des clés. Le nom situe le créneau exact du service."],
  ["Raccord", "Montage vidéo", "Pars du passage entre deux plans. Le mot suggère aussi la continuité de l'ensemble."],
  ["Fouetté", "Ateliers de pâtisserie", "Pars du geste au fouet. Le mot évoque aussi la texture qu'on apprend à obtenir."],
  ["Échappée", "Aménagement de vans", "Pars de ce que rend possible le van aménagé. Le nom évoque le départ et la liberté de partir."],
].map(([name, activity, logic]): NameExample => ({ name, activity, logic, kind: "services" })));

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
/**
 * Noms INVENTÉS célèbres et leur fabrication (repères d'oreille pour les marques de produits, choix du propriétaire du
 * 7 novembre 2026). Ce sont des marques existantes : modèles de construction, jamais à imiter ni à copier.
 */
export const INVENTED_NAME_EXAMPLES: { name: string; how: string }[] = [
  { name: "Velcro", how: "« velours » + « crochet » : deux mots du produit fondus sans couture visible" },
  { name: "Vélib'", how: "« vélo » + « liberté » : le produit et ce qu'il apporte, en deux syllabes" },
  { name: "Duracell", how: "« durable » + « cell » (pile) : la qualité et l'objet, d'un seul souffle" },
  { name: "Febreze", how: "« fabric » (tissu) + « breeze » (brise) : la matière et l'effet" },
  { name: "Gore-Tex", how: "le nom du fabricant + « tex » (textile) : la matière dite en une syllabe" },
  { name: "Twingo", how: "« twist », « swing » et « tango » mélangés : le rythme et la gaieté de la voiture" },
  { name: "Nutella", how: "« nut » (noisette) + une terminaison douce « -ella » : l'ingrédient rendu chantant" },
  { name: "Lego", how: "« leg godt » (joue bien, en danois) raccourci : le geste d'usage en deux syllabes" },
];

export function referencesForPrompt(): string {
  const names = (kind: NameExample["kind"]) => NAME_EXAMPLES.filter((x) => x.kind === kind).map((x) => `${x.name} (${x.activity}) : ${x.logic}`).join("\n");
  const pal = PALETTE_EXAMPLES.map((p) => p.ground === "degrade"
    ? `${p.ambiance} [dégradé] départ ${p.depart} → arrivée ${p.arrivee}, texte ${p.texte}, bouton ${p.bouton}, accent ${p.accent}`
    : `${p.ambiance} [fond ${p.ground}] fond ${p.fond}, texte ${p.texte}, bouton ${p.bouton}, surface ${p.surface}, accent ${p.accent}`).join("\n");
  return `MÉTHODE DE NOMMAGE du propriétaire du Studio (à appliquer pour CHAQUE nom) : pars d'un DÉTAIL RÉEL du produit ou du service (un geste, une matière, une sensation, un moment ou un résultat), puis cherche un mot ou une expression qui lui donne une DEUXIÈME LECTURE (expression courante détournée, double sens, mot qui évoque aussi une émotion ou un caractère). Le nom est court (1 à 3 mots), en français, facile à dire et à retenir ; on comprend le métier et on sourit ou on est intrigué.
GENRE PRÉFÉRÉ DU PROPRIÉTAIRE (9 novembre 2026, « c'est ce genre de nom que SINA doit trouver ») : le MOT FORT, comme SOLSTICE (mode d'été) ou RUPTURE (streetwear) : un seul mot qui existe, court (2 ou 3 syllabes), puissant et élégant, qui évoque l'univers, la saison, le moment ou l'attitude de la marque plutôt qu'une pièce du produit ; il se comprend aussi hors de France, sonne comme une marque écrit en capitales (étiquette, enseigne, mot géant d'une page d'accueil) ; on dit en une phrase pourquoi ce mot pour cette marque.
CE QUI FAIT UN BON NOM (règle du propriétaire du 7 novembre 2026, après des noms refusés : « Sangle Réflexe », « Roulé Bouclé », « Rabâche », « Repris de Route », « Ça Roule ») :
1. LA LOGIQUE D'ABORD : chaque nom a un lien évident avec le produit ou le service ; on peut dire en une phrase pourquoi ce nom pour ce produit (« Repli » : le sac se replie ; « La Mèche Courte » : la mèche de la bougie). Jamais un mot pris au hasard, jamais un nom choisi pour sa sonorité ou parce que l'expression est connue.
2. Ce sont des mots ou des expressions qui existent en français (Songe, Écume, Strate ; « avoir la mèche courte », « roue libre », « au poil »), pas deux mots assemblés pour l'occasion ; le lien au produit vient d'un mot de l'expression ou de la scène qu'elle évoque. EXCEPTION choisie par le propriétaire pour les MARQUES DE PRODUITS : un mot inventé court, construit à partir d'un mot du produit (« Reflo », de reflet), est le genre préféré. Repères de NOMS INVENTÉS célèbres et de leur fabrication (modèles de construction, jamais à copier) : ${INVENTED_NAME_EXAMPLES.map((x) => `${x.name} (${x.how})`).join(" ; ")}. Ce qui fait un beau nom inventé : la fusion est INVISIBLE, on lit un seul mot naturel et pas deux mots collés (« Bâchemin » montrait la soudure) ; 2 ou 3 syllabes avec du rythme ; le mot du produit reste reconnaissable mais transformé ; pas de terminaison plaquée qui sonne générique (« -co », « -ly », « -io » ajoutés au bout d'un mot, comme « Étanco ») ; il se dit facilement en français, et si possible dans d'autres langues ; il n'a pas besoin d'explication pour plaire à l'oreille.
3. Le sens courant est positif ou neutre (jamais rabâcher, déroute, repris de justice, à bout, en panne).
4. Il sonne bien à voix haute, s'écrit sans hésiter et se retient du premier coup.
Ses 50 exemples, avec leur logique (niveau et esprit attendus ; ne recopie jamais ces noms) :
Produits :
${names("produits")}
Services :
${names("services")}
Slogans : une phrase courte et concrète (9 mots au plus), souvent au tutoiement ou à l'impératif, qui dit le bénéfice avec une image simple.

Exemples de PALETTES choisies par le propriétaire (niveau et esprit attendus ; ne recopie jamais une palette telle quelle) :
${pal}
Ce qu'elles ont en commun : cinq rôles (fond, texte, bouton, surface, accent ; dégradé à 135° : départ et arrivée à la place du fond et de la surface) ; le texte est une couleur foncée TEINTÉE (encre, aubergine, graphite vert), jamais un noir pur ; les titres prennent la couleur du texte ; le bouton porte la couleur de marque ; la surface est une version très claire et douce ; l'accent sert aux détails graphiques. Les couleurs sont accordées entre elles, actuelles, parfois franches (dégradés lumineux, boutons vifs), parfois fines et sourdes, jamais criardes ni au hasard.`;
}
