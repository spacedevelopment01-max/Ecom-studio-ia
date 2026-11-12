/**
 * Données d'essai des routes de marque de SINA : les trois routes du troisième essai du 12 novembre 2026 (infusions de
 * fruits à boire froides) et une quatrième, avec des planches complètes et valides. Aucune image, aucun appel d'IA.
 */
import type { Board } from "@/lib/syna-agent/brand-board";
import type { Route, RouteKey } from "@/lib/syna-agent/brand-routes";
import { emptyJourney, type Journey, type StartField } from "@/lib/syna-agent/journey";

/** Fiche de départ du projet d'exemple : ce que le client a dit lui-même (seule source de faits sur son produit). */
export const START: Partial<Record<StartField, string>> = {
  business: "products",
  offer: "Des infusions de fruits en vrac à boire froides : de vrais morceaux de fruits, sans sucres ajoutés, sans arôme artificiel. Sachet de 100 g à 12 €. Six recettes, dont pêche-verveine et hibiscus-fraise.",
  existing: "Rien, je pars de zéro.",
  audience: "Des femmes de 25 à 45 ans qui veulent arrêter le soda sans boire de l'eau plate.",
  image: "Joyeux, franc, coloré. Pas de marron.",
  setup: "6 produits",
  market: "En ligne, France.",
  price: "12 € le sachet de 100 g",
  difference: "De vrais morceaux de fruits qu'on voit dans le sachet.",
  language: "Français seulement",
  platform: "shopify",
};

export function journey(over: Partial<Journey> = {}): Journey {
  const j = emptyJourney();
  for (const [f, value] of Object.entries(START)) j.start[f as StartField] = { value: value!, status: "answered", source: "client", at: 1 };
  j.steps[0] = { status: "done" };
  return { ...j, ...over };
}

const SYMBOL = { source: "ai" as const, viewBox: [0, 0, 100] as [number, number, number], shapes: [{ d: "M50 10A40 40 0 1 0 50 90A40 40 0 1 0 50 10Z", paint: "fill" as const, tone: "main" as const }] };

export function board(over: Partial<Board> = {}): Board {
  return {
    idea: { belief: "L'attente est la preuve : un vrai morceau de fruit met du temps à donner son goût.", confession: "Quand je lis « sans sucre », je cherche ce qu'on me cache.", confessionSupport: 7, enemy: "Ce qui est prêt tout de suite, donc plein d'arômes.", proof: "Les morceaux de fruits qu'on voit tremper dans la carafe.", cost: "La marque ne sert pas la soif de tout de suite." },
    nameCheck: "rien_trouve",
    lines: ["Prépare ce soir, bois demain.", "La nuit porte fruit."],
    voice: {
      sliders: [{ left: "Sérieuse", right: "Joueuse", value: 70 }, { left: "Discrète", right: "Franche", value: 80 }, { left: "Pressée", right: "Patiente", value: 85 }, { left: "Sage", right: "Défendue", value: 60 }],
      thisNotThat: [{ yes: "Ce soir, les fruits se jettent à l'eau.", no: "Une infusion rafraîchissante." }, { yes: "Bois demain.", no: "Prêt en un instant." }, { yes: "On laisse faire la nuit.", no: "Une recette élaborée avec soin." }],
      houseWords: ["la nuit", "tremper", "demain"], bannedWords: ["détox", "instantané", "bien-être"],
    },
    signs: [
      { kind: "lettrage", title: "Le nom coupé par l'eau", text: "La ligne de l'eau traverse le nom : le bas des lettres trempe.", symbol: SYMBOL },
      { kind: "objet", title: "La lune en tranche de citron", text: "Sur chaque sachet, la lune est une tranche de fruit." },
      { kind: "couleur", title: "Le bleu nuit", text: "Toujours la nuit en fond, les fruits en lumière." },
    ],
    wordmark: { case: "upper", tracking: 0.04, align: "gauche", dot: false, symbolPlace: "gauche" },
    object: { kind: "sachet", front: ["BAIN DE MINUIT", "Pêche, verveine"], back: ["Verse, ajoute de l'eau froide, laisse faire la nuit."] },
    site: { headline: "Ce soir, les fruits se jettent à l'eau.", text: "Des morceaux de fruits qui trempent pendant que tu dors.", button: "Préparer ma nuit", menu: ["Les recettes", "Le geste"] },
    posts: [{ text: "Il est tard. Parfait.", look: "fond" }, { text: "Demain matin, ça aura du goût.", look: "citation" }, { text: "Les fruits savent nager.", look: "motif" }],
    toProve: ["Le temps d'infusion à froid reste à mesurer avec ta recette."],
    ...over,
  };
}

const BASE = { nameStyle: "", nameTest: "", nameCandidates: [] as string[], sloganTone: "", paletteFamily: "", fontStyle: "", logoStyle: "lettrage" as const, logoIdea: "" };

const ROUTES: Record<RouteKey, () => Route> = {
  A: () => ({
    ...BASE, key: "A", name: "Bain de Minuit", nameWhy: "Je pars des fruits qui trempent des heures dans l'eau froide ; le bain de minuit, c'est la joie d'été un peu défendue.", nameAnchor: "les fruits trempent la nuit", nameExpression: "bain de minuit : se baigner la nuit, en cachette",
    slogan: "Ce soir, les fruits se jettent à l'eau.", promise: "Tu prépares le soir, tu bois un vrai goût de fruit le lendemain.", territory: "la joie défendue des nuits d'été",
    ground: "sombre", palette: { dark: "#0B1437", primary: "#F6D34A", secondary: "#17245C", accent: "#7FD6C2", light: "#F4F1E8" },
    fonts: { heading: "playfair_display_n7", body: "inter_n4" }, tone: { adjectives: ["complice", "patiente", "nocturne"], avoid: ["promettre l'instantané", "parler de régime", "faire la leçon"] },
    why: "Tes clientes se méfient de ce qui est prêt en trois secondes : ici, l'attente devient la preuve.", board: board(),
  }),
  B: () => ({
    ...BASE, key: "B", name: "Lâche le Morceau", nameWhy: "Je pars du geste : on lâche les morceaux de fruits dans l'eau ; « lâcher le morceau », c'est tout avouer.", nameAnchor: "on lâche les morceaux dans l'eau", nameExpression: "lâcher le morceau : tout avouer",
    slogan: "Rien à chercher au dos.", promise: "Tout ce que la boisson fait, et ne fait pas, est écrit devant.", territory: "la franchise qui fait sourire",
    ground: "degrade", gradient: { from: "#FFD84D", to: "#FF9F6B" }, palette: { dark: "#2A1433", primary: "#D81B60", secondary: "#FFF3C4", accent: "#3B2A8C", light: "#FFFDF5" },
    fonts: { heading: "archivo_black_n4", body: "dm_sans_n4" }, tone: { adjectives: ["franche", "drôle", "directe"], avoid: ["les superlatifs", "cacher un défaut", "parler de santé"] },
    why: "Tes clientes cherchent ce qu'on leur cache : tu leur dis tout avant qu'elles demandent.",
    board: board({
      idea: { belief: "Mieux vaut décevoir avant l'achat qu'après.", confession: "Quand je lis « sans sucre », je cherche ce qu'on me cache.", confessionSupport: 7, enemy: "La promesse en grand devant, la vérité en petit au dos.", proof: "La liste complète des ingrédients, écrite en grand sur le devant.", cost: "La meilleure place du sachet donnée aux défauts." },
      lines: ["Ça ne pétille pas. Voilà, c'est dit.", "Si c'est fade, remets-en."],
      wordmark: { case: "upper", tracking: 0, lines: ["LÂCHE LE", "MOR", "CEAU"], align: "gauche", dot: false, symbolPlace: "gauche" },
      object: { kind: "sachet", front: ["Pêche, verveine, pomme", "Ne pétille pas."], back: ["Rien à ajouter. Sauf de l'eau."] },
      site: { headline: "Ça ne pétille pas. Voilà, c'est dit.", text: "Des morceaux de fruits, de l'eau froide, et rien à cacher.", button: "Tout savoir", menu: ["Les recettes"] },
      posts: [{ text: "Aveu du jour : il faut attendre.", look: "couleur" }, { text: "Devant, la liste. Derrière, rien.", look: "citation" }, { text: "Fade ? Remets-en.", look: "fond" }],
      toProve: ["La liste exacte des ingrédients de chaque recette reste à me donner."],
    }),
  }),
  C: () => ({
    ...BASE, key: "C", name: "L'Eau Est Bonne", nameWhy: "Je pars de l'eau, que tes clientes n'aiment pas ; « viens, elle est bonne », c'est ce qu'on crie au bord de la piscine.", nameAnchor: "l'eau, que la cliente n'aime pas", nameExpression: "elle est bonne : l'eau est à la bonne température",
    slogan: "Tu n'aimes pas l'eau ? Viens, elle est bonne.", promise: "L'eau prend enfin un goût qui te donne envie d'y revenir.", territory: "la piscine en été, entre amies",
    ground: "blanc", palette: { dark: "#10243A", primary: "#0B7A5C", secondary: "#E6F6F0", accent: "#FF7A59", light: "#FFFFFF" },
    fonts: { heading: "nunito_n9", body: "karla_n4" }, tone: { adjectives: ["joyeuse", "taquine", "solaire"], avoid: ["parler d'hydratation", "compter les litres", "le bleu de l'eau en bouteille"] },
    why: "Tu dis tout haut ce que tes clientes pensent tout bas : l'eau seule ne leur fait pas envie.",
    board: board({
      idea: { belief: "Personne ne devrait boire par devoir.", confession: "Je n'ai pas soif d'eau. J'ai envie de goût.", confessionSupport: 8, enemy: "L'eau présentée comme une vertu.", proof: "La couleur que les fruits donnent à l'eau.", cost: "Plus un mot sur l'hydratation ni sur les litres à boire." },
      lines: ["Ajoute de l'eau. Désolée.", "On plonge ?"],
      wordmark: { case: "title", tracking: 0.01, align: "centre", dot: false, symbolPlace: "dessus" },
      object: { kind: "sachet", front: ["L'Eau Est Bonne", "Hibiscus, fraise"], back: ["Ajoute de l'eau. Désolée."] },
      site: { headline: "Tu n'aimes pas l'eau ? Viens, elle est bonne.", text: "Des fruits qui donnent à l'eau une couleur et un goût.", button: "Plonger", menu: ["Les recettes"] },
      posts: [{ text: "Elle est bonne, promis.", look: "couleur" }, { text: "Le grand bain commence dans une carafe.", look: "fond" }, { text: "Ajoute de l'eau. Désolée.", look: "citation" }],
      toProve: ["La couleur réelle de chaque recette dans l'eau reste à photographier."],
    }),
  }),
  D: () => ({
    ...BASE, key: "D", name: "Trempette", nameWhy: "Je pars du geste de tremper ; « faire trempette », c'est se baigner un peu, pour le plaisir.", nameAnchor: "les fruits trempent dans l'eau", nameExpression: "faire trempette : se baigner un peu",
    slogan: "Trempe, attends, savoure.", promise: "Un geste simple qui remplace la canette de l'après-midi.", territory: "le petit plaisir à soi",
    ground: "uni", palette: { dark: "#2B1A12", primary: "#5B3FD9", secondary: "#FFE0BF", accent: "#E4572E", light: "#FFF1E0" },
    fonts: { heading: "fraunces_n8", body: "jost_n4" }, tone: { adjectives: ["tendre", "simple", "gourmande"], avoid: ["le jargon du thé", "les promesses de santé", "le ton de cure"] },
    why: "Le soda de tes clientes est un moment à elles : tu gardes le moment et tu changes le verre.",
    board: board({
      idea: { belief: "Le soda n'était pas une soif : c'était un moment à soi.", confession: "Mon soda, ce n'est pas de la soif : c'est mon seul petit plaisir de la journée.", confessionSupport: 0, enemy: "L'idée qu'il faudrait boire pour sa santé.", proof: "Le geste de tremper les fruits, qui devient le rituel.", cost: "La marque parle d'un plaisir à soi, pas de partage." },
      lines: ["Celle-là, elle est pour toi.", "Le moment d'abord."],
      wordmark: { case: "lower", tracking: 0.02, align: "gauche", dot: true, symbolPlace: "gauche" },
      object: { kind: "pot", front: ["trempette", "Pomme, cannelle"], back: ["Trempe, attends, savoure."] },
      site: { headline: "Le moment de l'après-midi, sans la canette.", text: "Des fruits à tremper, et un moment rien qu'à toi.", button: "Prendre mon moment", menu: ["Les recettes"] },
      posts: [{ text: "Ton moment. Pas touche.", look: "couleur" }, { text: "On trempe ?", look: "fond" }, { text: "La canette peut attendre.", look: "citation" }],
      toProve: ["Le moment de la journée où tes clientes boivent leur soda reste à leur demander."],
    }),
  }),
};

export const route = (key: RouteKey): Route => ROUTES[key]();
/** Série valide de 2, 3 ou 4 routes (clés A à D). */
export const series = (count: 2 | 3 | 4): Route[] => (["A", "B", "C", "D"] as RouteKey[]).slice(0, count).map(route);
