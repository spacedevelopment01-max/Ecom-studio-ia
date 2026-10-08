/**
 * Langues des contenus (français, anglais, espagnol ; extensible en ajoutant un paquet). Chaque paquet porte ses
 * propres tournures de recherche et d'écriture (pas une traduction mot à mot) : façons de poser une question,
 * modificateurs d'intention, intitulés de sections, appels à l'action, marque des inconnues, formules creuses.
 */
import type { ContentLang } from "./types";

export type LangPack = {
  code: ContentLang;
  country: string;
  unknown: (what: string) => string;
  /** Racines de questions de recherche (complétées par le sujet). */
  questions: { how: (x: string) => string; which: (x: string) => string; why: (x: string) => string; price: (x: string) => string; vs: (x: string, y: string) => string; maintain: (x: string) => string; choose: (x: string) => string; time: (x: string) => string };
  modifiers: { buy: string; best: string; near: (area: string) => string; guide: string; price: string; review: string };
  headings: Record<string, string>;
  cta: { buy: string; discover: string; quote: string; call: string; book: string; contact: string; read: string; try: string };
  /** Formules creuses propres à la langue (en plus des communes). */
  hollow: RegExp[];
  stop: Set<string>;
};

const FR: LangPack = {
  code: "fr",
  country: "FR",
  unknown: (w) => `[À compléter : ${w}]`,
  questions: {
    // Tournures neutres (sans article à accorder) : utilisables comme requête et comme titre.
    how: (x) => `${x} : comment l'utiliser`,
    which: (x) => `${x} : quel modèle choisir`,
    why: (x) => `${x} : avantages et limites`,
    price: (x) => `${x} : quel prix prévoir`,
    vs: (x, y) => `${x} ou ${y} : que choisir`,
    maintain: (x) => `${x} : comment l'entretenir`,
    choose: (x) => `${x} : comment bien choisir`,
    time: (x) => `${x} : quelle durée prévoir`,
  },
  modifiers: { buy: "acheter", best: "meilleur", near: (a) => `${a}`, guide: "guide", price: "prix", review: "avis" },
  headings: {
    benefits: "Ce que ça change pour vous",
    specs: "Caractéristiques",
    usage: "Utilisation",
    tips: "Conseils",
    faq: "Questions fréquentes",
    delivery: "Livraison et retours",
    range: "La gamme",
    criteria: "Comment choisir",
    useful: "Bon à savoir",
    process: "Comment se déroule une intervention",
    services: "Nos prestations",
    area: "Zone d'intervention",
    contact: "Nous contacter",
    about: "Qui sommes-nous",
    values: "Ce qui nous guide",
    intro: "En bref",
    conclusion: "En résumé",
    steps: "Étapes",
    compare: "Comparer les critères",
    practical: "Informations pratiques",
  },
  cta: { buy: "Ajouter au panier", discover: "Voir le produit", quote: "Demander un devis", call: "Appeler", book: "Prendre rendez-vous", contact: "Nous contacter", read: "Lire l'article", try: "Essayer" },
  hollow: [/expérience unique/i, /révolutionnez/i, /solution idéale/i, /qualité exceptionnelle/i, /au cœur de/i, /n'attendez plus/i, /sublimer? votre quotidien/i, /plongez dans/i, /dans un monde où/i],
  stop: new Set(["le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "pour", "avec", "sans", "en", "au", "aux", "à", "d", "l", "sur", "par", "votre", "vos", "notre", "nos", "ce", "cette", "ces"]),
};

const EN: LangPack = {
  code: "en",
  country: "US",
  unknown: (w) => `[To complete: ${w}]`,
  questions: {
    how: (x) => `how to use ${x}`,
    which: (x) => `which ${x} to choose`,
    why: (x) => `why choose ${x}`,
    price: (x) => `${x} price`,
    vs: (x, y) => `${x} vs ${y}`,
    maintain: (x) => `how to care for ${x}`,
    choose: (x) => `how to choose ${x}`,
    time: (x) => `how long does ${x} take`,
  },
  modifiers: { buy: "buy", best: "best", near: (a) => `in ${a}`, guide: "guide", price: "price", review: "reviews" },
  headings: {
    benefits: "What it does for you",
    specs: "Specifications",
    usage: "How to use it",
    tips: "Tips",
    faq: "FAQ",
    delivery: "Shipping and returns",
    range: "The range",
    criteria: "How to choose",
    useful: "Good to know",
    process: "How a job works",
    services: "Our services",
    area: "Service area",
    contact: "Contact us",
    about: "About us",
    values: "What guides us",
    intro: "In short",
    conclusion: "Summary",
    steps: "Steps",
    compare: "Comparing the criteria",
    practical: "Practical information",
  },
  cta: { buy: "Add to cart", discover: "See the product", quote: "Get a quote", call: "Call us", book: "Book an appointment", contact: "Contact us", read: "Read the article", try: "Try it" },
  hollow: [/unique experience/i, /revolutioni[sz]e/i, /ideal solution/i, /elevate your/i, /dive into/i, /in today's fast-paced world/i, /unlock the (power|secret)/i],
  stop: new Set(["the", "a", "an", "and", "or", "for", "with", "without", "in", "on", "of", "to", "your", "our", "this", "that", "these"]),
};

const ES: LangPack = {
  code: "es",
  country: "ES",
  unknown: (w) => `[Por completar: ${w}]`,
  questions: {
    how: (x) => `cómo usar ${x}`,
    which: (x) => `qué ${x} elegir`,
    why: (x) => `por qué elegir ${x}`,
    price: (x) => `precio ${x}`,
    vs: (x, y) => `${x} o ${y}`,
    maintain: (x) => `cómo cuidar ${x}`,
    choose: (x) => `cómo elegir ${x}`,
    time: (x) => `cuánto dura ${x}`,
  },
  modifiers: { buy: "comprar", best: "mejor", near: (a) => `en ${a}`, guide: "guía", price: "precio", review: "opiniones" },
  headings: {
    benefits: "Lo que cambia para ti",
    specs: "Características",
    usage: "Modo de uso",
    tips: "Consejos",
    faq: "Preguntas frecuentes",
    delivery: "Envío y devoluciones",
    range: "La gama",
    criteria: "Cómo elegir",
    useful: "A tener en cuenta",
    process: "Cómo se desarrolla una intervención",
    services: "Nuestros servicios",
    area: "Zona de intervención",
    contact: "Contacto",
    about: "Quiénes somos",
    values: "Lo que nos guía",
    intro: "En resumen",
    conclusion: "Conclusión",
    steps: "Pasos",
    compare: "Comparar los criterios",
    practical: "Información práctica",
  },
  cta: { buy: "Añadir al carrito", discover: "Ver el producto", quote: "Pedir presupuesto", call: "Llamar", book: "Pedir cita", contact: "Contactar", read: "Leer el artículo", try: "Probar" },
  hollow: [/experiencia única/i, /revoluciona/i, /solución ideal/i, /calidad excepcional/i, /sumérgete/i, /no esperes más/i],
  stop: new Set(["el", "la", "los", "las", "de", "del", "un", "una", "y", "o", "para", "con", "sin", "en", "al", "a", "por", "tu", "tus", "nuestro", "nuestra", "este", "esta"]),
};

const PACKS: Record<string, LangPack> = { fr: FR, en: EN, es: ES };

/** Paquet de langue ; une langue sans paquet retombe sur l'anglais (signalé par l'appelant). */
export const langPack = (lang: string): LangPack => PACKS[lang] ?? EN;
export const supportedLangs = () => Object.keys(PACKS) as ContentLang[];

export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const words = (s: string, pack: LangPack) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !pack.stop.has(w));
