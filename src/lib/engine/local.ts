/**
 * Moteur local : outils déterministes utilisés lorsque aucun fournisseur
 * d'IA n'est configuré (ou en secours). Ils produisent une base de travail
 * honnête — sans inventer — et sont signalés « moteur local » dans le studio.
 */
import { hsl, hslToHex, mix, withLightness, contrast } from "../color";
import { CANVAS_FONTS } from "../media/fonts";
import type { LogoSpec } from "../media/logo";
import type { VideoSpec } from "../media/video";
import { emptyProduct, emptyServiceProfile, type Brand, type BusinessType, type Fact, type ProductProfile, type ProductSectorId, type SectorId, type ServiceItem, type ServiceProfile, type ServiceSectorId, type Strategy } from "../project-types";
import { contactCta, isServicesBusiness, serviceDirection, serviceNames, serviceShowcase, serviceTaglines, type BusinessInfo } from "./services-text";
import { DIRECTIONS, type DirectionId } from "../theme/directions";
import type { ThemeOp } from "../theme/ops";
import type { ThemeSpec } from "../theme/spec";
import { availableSectionTypes, containerOf, sectionSchema } from "../theme/spec";
import { canvasFamily } from "../media/fonts";
import { C, L, uiLang } from "../i18n-server";

const SECTOR_WORDS: [ProductSectorId, RegExp][] = [
  // Mots français puis anglais : la description peut être rédigée dans l'une ou l'autre langue.
  ["beaute", /sérum|serum|crème|creme|soin|visage|peau|cosm|parfum|maquill|shampo|lotion|baume|huile|skin ?care|\bskin\b|\bface\b|moisturi[sz]|\bcream\b|beauty|make-?up|perfume|fragrance|\bbalm\b/i],
  ["bijoux", /bijou|bague|collier|bracelet|boucle|montre|pendentif|or |argent|jewel|\brings?\b|necklace|earring|\bwatch(es)?\b|pendant|\bgold\b|\bsilver\b/i],
  ["mode", /t-?shirt|robe|pantalon|veste|sac|chaussure|basket|casquette|écharpe|vêtement|sweat|jean|\bdress(es)?\b|trousers|\bpants\b|jacket|\bbags?\b|\bshoes?\b|sneaker|\bcaps?\b|scarf|clothing|apparel|hoodie/i],
  ["hightech", /drone|caméra|camera|projecteur|gps|écouteur|casque|chargeur|câble|enceinte|bluetooth|usb|smart|clavier|souris|batterie|led|projector|earbud|headphone|charger|\bcables?\b|speaker|keyboard|\bmouse\b|battery|gadget/i],
  ["sport", /gourde|yoga|fitness|sport|randonn|vélo|running|musculation|isotherme|camping|water bottle|hiking|\bbikes?\b|bicycle|cycling|workout|\bgym\b|insulated|outdoor/i],
  ["alimentation", /café|thé|chocolat|miel|épice|confiture|huile d'olive|vin|bière|biscuit|sauce|infusion|coffee|\bteas?\b|chocolate|honey|\bspices?\b|\bjam\b|olive oil|\bwine\b|\bbeer\b|cookie|snack/i],
  ["enfants", /bébé|enfant|jouet|doudou|biberon|poussette|naissance|\bbaby\b|\bkids?\b|child|\btoys?\b|stroller|pacifier|newborn/i],
  ["animaux", /chien|\bchats?\b|animal|croquette|laisse|litière|collier pour|\bdogs?\b|\bcats?\b|\bpets?\b|kibble|leash|\blitter\b|\bcollar\b/i],
  ["maison", /bougie|tasse|mug|vase|coussin|oreiller|couette|linge de lit|lampe|déco|plaid|vaisselle|assiette|cuisine|carafe|candle|\bcups?\b|cushion|pillow|duvet|bedding|\blamps?\b|decor|\bthrow\b|tableware|\bplates?\b|kitchen/i],
  ["artisanat", /carnet|papeterie|céramique|fait main|artisan|tissage|bois tourné|poterie|notebook|stationery|ceramic|hand-?made|handcrafted|weaving|pottery/i],
];

/** Métiers des entreprises de services (français puis anglais). */
const SERVICE_SECTOR_WORDS: [ServiceSectorId, RegExp][] = [
  ["batiment", /plomb|électricien|electricien|électricité|chauffag|chaudière|maçon|maconn|menuis|charpent|couvreur|toiture|carreleur|carrelage|peintre en bâtiment|peinture (intérieure|extérieure)|rénovation|serrurier|serrurerie|vitrier|paysagiste|élagage|terrassement|plâtrier|plaquiste|isolation|climatisation|dépannage|artisan du bâtiment|travaux|plumb|electrician|heating|boiler|\bhvac\b|carpenter|joiner|roofer|roofing|\btiler\b|tiling|bricklay|\bmason|locksmith|handyman|renovation|remodel|landscap|contractor|builder|glazier/i],
  ["bienetre", /coiff|barbier|esthéticienne|esthétique|institut de beauté|onglerie|manucure|prothésiste ongulaire|massage|\bspa\b|maquilleuse|épilation|soins? du visage|extension de cils|réhaussement|salon de beauté|hair ?salon|hairdress|hairstylist|barber|\bnails?\b|manicure|pedicure|beautician|beauty salon|beauty therapist|lash|\bbrows?\b|waxing|facials?\b/i],
  ["sante", /kiné|ostéo|infirmi|orthophon|podolog|pédicure-podologue|diététic|nutritionn|psycholog|psychothérap|sage-femme|dentiste|médecin|cabinet médical|ergothérap|psychomotric|sophrolog|naturopath|physio|osteopath|\bnurse|speech therap|podiatr|dietitian|nutritionist|psychotherap|counsell?or|dentist|doctor|chiropract|midwife|occupational therap|acupunct/i],
  ["coaching", /coach|préparat(eur|rice) physique|salle de sport|cours de (yoga|pilates|boxe|fitness)|professeur de (yoga|pilates)|yoga|pilates|fitness|crossfit|remise en forme|musculation|entraîneur|personal trainer|\btrainer\b|\bgym\b|boxing|bootcamp/i],
  ["conseil", /avocat|notaire|expert-comptable|expert comptable|comptab|juriste|consultant|cabinet de conseil|conseil en|conseill(er|ère) en|fiscal|gestion de patrimoine|courtier|assurance|lawyer|attorney|solicitor|notary|accountant|accounting|bookkeep|tax advis|consulting|financial advis|\bbroker|insurance/i],
  ["restauration", /restaurant|bistro|brasserie|traiteur|pizzeria|crêperie|food ?truck|chef à domicile|table d'hôtes?|salon de thé|\bbar à|caterer|catering|eatery|\bdiner\b|private chef|tea ?room|\bcafé-restaurant/i],
  ["immobilier", /immobili|mandataire|gestion locative|location saisonnière|syndic|diagnostiqueur|diagnostic immobilier|home staging|real estate|realtor|estate agent|property manag|letting agent|conveyanc/i],
  ["formation", /formation|formateur|formatrice|cours particuliers|soutien scolaire|professeur|prof de|enseign|auto-école|école de (musique|danse|langues?|dessin|cuisine)|cours de (musique|langues?|piano|guitare|dessin|cuisine|chant|danse|anglais|français|maths)|tutor|tutoring|teacher|lessons|training course|driving school|language school/i],
  ["evenementiel", /photograph|vidéaste|videaste|mariage|événementiel|evenementiel|organisat(eur|rice|ion) d'événements|\bdj\b|animat(eur|rice|ion) (de soirée|d'événements)|décorat(eur|rice) (événementiel|de mariage)|wedding|event planner|event planning|videographer|events? (company|agency)/i],
  ["domicile", /aide à domicile|ménage|repassage|garde d'enfants|baby-?sitt|nounou|aide aux seniors|auxiliaire de vie|jardinage à domicile|pet-?sitt|promeneur de chiens|conciergerie|déménag|services à la personne|cleaning|cleaner|housekeep|childcare|\bnanny|babysit|elderly care|caregiver|home care|dog walk|concierge|\bmovers?\b|removals/i],
  ["agence", /agence (web|digitale|de communication|marketing|créative|de design)|développeur|developpeur|web ?design|graphiste|community manager|rédact(eur|rice) web|traduct(eur|rice)|référencement|\bseo\b|marketing digital|web agency|digital agency|creative agency|\bdeveloper|graphic designer|copywriter|translator|social media manager|branding agency|marketing agency/i],
];

/**
 * Secteur probable : le mot-clé cité en premier l'emporte (« bougie parfumée » → maison).
 * `business` : « services » cherche parmi les métiers de services ; par défaut, parmi les secteurs de produits.
 */
export function guessSector(text: string, business: BusinessType = "products"): SectorId | null {
  let best: { s: SectorId; at: number; len: number } | null = null;
  const words: [SectorId, RegExp][] = business === "services" ? SERVICE_SECTOR_WORDS : SECTOR_WORDS;
  for (const [s, re] of words) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at || (m.index === best.at && m[0].length > best.len))) best = { s, at: m.index, len: m[0].length };
  }
  return best?.s ?? null;
}

export const SECTOR_DIRECTION: Record<SectorId, DirectionId> = {
  beaute: "atelier",
  mode: "flux",
  bijoux: "joaillerie",
  maison: "terroir",
  hightech: "nocturne",
  sport: "elan",
  alimentation: "gourmand",
  enfants: "pop",
  animaux: "pop",
  artisanat: "galerie",
  batiment: serviceDirection({ sector: "batiment" }),
  bienetre: serviceDirection({ sector: "bienetre" }),
  sante: serviceDirection({ sector: "sante" }),
  coaching: serviceDirection({ sector: "coaching" }),
  conseil: serviceDirection({ sector: "conseil" }),
  restauration: serviceDirection({ sector: "restauration" }),
  immobilier: serviceDirection({ sector: "immobilier" }),
  formation: serviceDirection({ sector: "formation" }),
  evenementiel: serviceDirection({ sector: "evenementiel" }),
  domicile: serviceDirection({ sector: "domicile" }),
  agence: serviceDirection({ sector: "agence" }),
};

/** Faits extraits d'une description libre (formes simples « clé : valeur »). */
export function factsFromDescription(desc: string): Fact[] {
  const facts: Fact[] = [];
  // Intitulés compris en français et en anglais ; le libellé du fait suit la langue des contenus.
  const labels: [RegExp, string, string, string][] = [
    [/(contenance|volume|capacité|capacity)\s*[:=]\s*([^\n;]+)/i, "capacity", "Contenance", "Capacity"],
    [/(composition|ingrédients?|ingredients?|matières?|matériaux?|materials?)\s*[:=]\s*([^\n;]+)/i, "materials", "Composition", "Composition"],
    [/(dimensions?|taille|format|size)\s*[:=]\s*([^\n;]+)/i, "dimensions", "Dimensions", "Dimensions"],
    [/(poids|weight)\s*[:=]\s*([^\n;]+)/i, "weight", "Poids", "Weight"],
    [/(utilisation|usage|mode d'emploi|how to use|directions)\s*[:=]\s*([^\n;]+)/i, "usage", "Utilisation", "How to use"],
    [/(origine|fabrication|fabriqué|origin|made in)\s*[:=]\s*([^\n;]+)/i, "origin", "Origine", "Origin"],
    [/(livraison|shipping|delivery)\s*[:=]\s*([^\n;]+)/i, "shipping", "Livraison", "Shipping"],
    [/(retours?|returns?)\s*[:=]\s*([^\n;]+)/i, "returns", "Retours", "Returns"],
    [/(entretien|care)\s*[:=]\s*([^\n;]+)/i, "care", "Entretien", "Care"],
  ];
  for (const [re, key, fr, en] of labels) {
    const m = desc.match(re);
    if (m) facts.push({ key, label: C(fr, en), value: m[2].trim(), status: "confirmed", source: "description" });
  }
  // Volumes et mesures explicites.
  const vol = desc.match(/\b(\d+(?:[.,]\d+)?)\s?(ml|cl|l|g|kg|cm|mm|oz|fl ?oz|lb)\b/i);
  if (vol && !facts.some((f) => f.key === "capacity" || f.key === "dimensions")) facts.push({ key: "capacity", label: C("Contenance / mesure", "Capacity / size"), value: `${vol[1]} ${vol[2]}`, status: "confirmed", source: "description" });
  return facts;
}

/** Questions indispensables connues (prix, nom, livraison, retours) : posées au commerçant, donc dans la langue de son interface. */
const KNOWN_QUESTIONS: Record<string, () => { question: string; why: string }> = {
  price: () => ({ question: L("Quel est le prix de vente (TTC) ?", "What is the retail price (including tax)?"), why: L("Indispensable pour vendre ; il n'est pas déductible d'une photo.", "Essential for selling; it can't be inferred from a photo.") }),
  name: () => ({ question: L("Quel est le nom du produit ?", "What is the product name?"), why: L("Il apparaît partout : fiche, publicités, publications.", "It appears everywhere: product page, ads, posts.") }),
  shipping: () => ({ question: L("Quels sont vos délais et frais de livraison ?", "What are your shipping times and costs?"), why: L("Affichés dans la FAQ et la page Livraison ; rien ne sera inventé.", "Shown in the FAQ and on the Shipping page; nothing will be made up.") }),
  returns: () => ({ question: L("Quelles sont vos conditions de retour ?", "What is your return policy?"), why: L("Obligatoire pour la page Livraison et retours.", "Required for the Shipping and returns page.") }),
};

/** Retraduit à l'affichage les questions connues (projets créés dans une autre langue d'interface). */
export function localizeQuestions<Q extends { id: string; question: string; why?: string }>(questions: Q[]): Q[] {
  return questions.map((q) => (KNOWN_QUESTIONS[q.id] ? { ...q, ...KNOWN_QUESTIONS[q.id]() } : q));
}

export function localAnalysis(input: { name?: string; brand?: string; description?: string; price?: number | null; colors: { hex: string; name: string; share: number }[]; link?: { title: string; description: string; product: any } | null; photos: number }): ProductProfile {
  const desc = [input.description, input.link?.product?.description, input.link?.description].filter(Boolean).join("\n");
  const name = input.name || input.link?.product?.name || "";
  const sector = guessSector(`${name} ${desc} ${input.link?.title ?? ""}`);
  const facts: Fact[] = factsFromDescription(desc);
  if (input.link?.product?.description && !facts.length) facts.push({ key: "description", label: C("Description de la source", "Source description"), value: input.link.product.description.slice(0, 400), status: "confirmed", source: "link" });
  for (const k of [["shipping", C("Délais et frais de livraison", "Shipping times and costs")], ["returns", C("Conditions de retour", "Return policy")]] as const) {
    if (!facts.some((f) => f.key === k[0])) facts.push({ key: k[0], label: k[1], value: "", status: "unknown", source: "ai" });
  }
  const price = input.price ?? input.link?.product?.price ?? null;
  const colorLine = [...new Set(input.colors.slice(0, 4).map((c) => c.name))].slice(0, 3).join(", ");
  const questions = [
    ...(price === null ? [{ id: "price", ...KNOWN_QUESTIONS.price(), required: true, factKey: "price" }] : []),
    ...(!name ? [{ id: "name", ...KNOWN_QUESTIONS.name(), required: true, factKey: "name" }] : []),
    { id: "shipping", ...KNOWN_QUESTIONS.shipping(), required: false, factKey: "shipping" },
    { id: "returns", ...KNOWN_QUESTIONS.returns(), required: false, factKey: "returns" },
  ];
  return {
    name,
    nameStatus: input.name ? "provided" : name ? "detected" : "unknown",
    category: "",
    sector,
    summary: desc ? desc.split(/\n|\. /)[0].slice(0, 220) : input.photos ? C(`Produit présenté en photo${colorLine ? `, dominantes ${colorLine}` : ""}.`, `Product shown in photos${colorLine ? `, mainly ${colorLine}` : ""}.`) : "",
    facts,
    visual: { colors: input.colors, description: input.photos && colorLine ? C(`Teintes dominantes observées : ${colorLine}.`, `Main colors observed: ${colorLine}.`) : "" },
    price: { amount: price, currency: input.link?.product?.currency ?? "EUR", status: price === null ? "unknown" : "confirmed" },
    variants: input.link?.product?.variants?.length > 1 ? [{ name: "Option", values: input.link!.product.variants.map((v: any) => v.title) }] : [],
    questions,
    claimsToAvoid: [],
    sources: [],
    analyzedBy: "local",
  };
}

// ---------------------------------------------------------------- activité de services

/** Métiers reconnus : catégorie affichée et secteur visuel le plus proche (null : aucun secteur produit adapté). */
const SERVICE_KINDS: { re: RegExp; fr: string; en: string; sector: SectorId | null }[] = [
  { re: /plomb|chauffagiste|chauffage|sanitaire|plumb|heating engineer|boiler/i, fr: "Plomberie et chauffage", en: "Plumbing and heating", sector: "batiment" },
  { re: /électricien|electricien|électricité générale|electrician/i, fr: "Électricité", en: "Electrical services", sector: "batiment" },
  { re: /serrur|locksmith/i, fr: "Serrurerie", en: "Locksmith", sector: "batiment" },
  { re: /menuisi|ébéniste|charpent|carpenter|joiner|cabinetmaker/i, fr: "Menuiserie", en: "Carpentry", sector: "batiment" },
  { re: /peintre en bâtiment|peinture intérieure|peintre décorateur|house painter|painter and decorator/i, fr: "Peinture et décoration", en: "Painting and decorating", sector: "batiment" },
  { re: /maçon|rénovation|bâtiment|carreleur|plaquiste|couvreur|builder|renovation|roofer|tiler/i, fr: "Bâtiment et rénovation", en: "Building and renovation", sector: "batiment" },
  { re: /paysagis|jardinier|jardinage|élagage|landscap|gardener|gardening/i, fr: "Paysagisme et jardin", en: "Landscaping and gardening", sector: "batiment" },
  { re: /ménage|nettoyage|conciergerie|cleaning|housekeep/i, fr: "Nettoyage et entretien", en: "Cleaning services", sector: "domicile" },
  { re: /coiff|barbier|barber|hairdress|hair salon/i, fr: "Coiffure", en: "Hairdressing", sector: "bienetre" },
  { re: /esthéticienne|institut de beauté|onglerie|manucure|massage|\bspa\b|beauty salon|beautician|nail salon/i, fr: "Beauté et bien-être", en: "Beauty and wellness", sector: "bienetre" },
  { re: /kiné|ostéopathe|physio|infirmi|sage-femme|dentiste|médecin|psychologue|orthophon|diététicien|osteopath|nurse|dentist|psychologist|dietitian|therapist/i, fr: "Santé et soins", en: "Health care", sector: "sante" },
  { re: /avocat|notaire|juriste|lawyer|attorney|solicitor/i, fr: "Conseil juridique", en: "Legal services", sector: "conseil" },
  { re: /comptab|fiscalit|accountant|bookkeep/i, fr: "Comptabilité et gestion", en: "Accounting", sector: "conseil" },
  { re: /coach sportif|coaching sportif|préparateur physique|personal trainer|yoga|pilates|fitness/i, fr: "Coaching sportif et bien-être", en: "Fitness coaching", sector: "coaching" },
  { re: /coach|accompagnement|développement personnel|mentor/i, fr: "Coaching et accompagnement", en: "Coaching", sector: "coaching" },
  { re: /restaurant|bistrot|brasserie|traiteur|pizzeria|boulangerie|pâtisserie|salon de thé|caterer|catering|bakery/i, fr: "Restauration", en: "Food and dining", sector: "restauration" },
  { re: /photographe|vidéaste|photographer|videographer/i, fr: "Photographie et vidéo", en: "Photography and video", sector: "evenementiel" },
  { re: /agence|\bweb\b|marketing|graphiste|développeur|agency|developer|graphic designer|\bseo\b/i, fr: "Agence et services numériques", en: "Agency and digital services", sector: "agence" },
  { re: /informatique|it support|computer repair/i, fr: "Services informatiques", en: "IT services", sector: "agence" },
  { re: /professeur|cours particuliers?|soutien scolaire|formateur|formation|tutor|lessons|teacher/i, fr: "Cours et formation", en: "Lessons and training", sector: "formation" },
  { re: /garde d'enfants|crèche|nounou|baby-?sitt|childcare|nanny/i, fr: "Garde d'enfants", en: "Childcare", sector: "domicile" },
  { re: /toilett|vétérinaire|pet ?sitt|éducateur canin|dog walk|groomer|\bvet\b/i, fr: "Services pour animaux", en: "Pet services", sector: "domicile" },
  { re: /couturi|retouches?|tailleur|tailor|seamstress|alterations/i, fr: "Couture et retouches", en: "Tailoring", sector: "domicile" },
  { re: /immobili|real estate|estate agent|realtor/i, fr: "Immobilier", en: "Real estate", sector: "immobilier" },
  { re: /wedding planner|organisat(?:eur|rice) d'événements|événementiel|\bdj\b|event planner/i, fr: "Événementiel", en: "Events", sector: "evenementiel" },
  { re: /aide à domicile|services à la personne|auxiliaire de vie|home care|caregiver/i, fr: "Services à la personne", en: "Home care services", sector: "domicile" },
  { re: /\bgarage\b|mécanicien|carrosserie|mechanic|car repair/i, fr: "Garage et automobile", en: "Car services", sector: null },
];

/** Début d'un intitulé de prestation (un service rendu, pas un argument). */
const SERVICE_START = /^(dépannages?|installations?|entretiens?|réparations?|rénovations?|poses?|création|conception|conseils?|accompagnements?|coachings?|séances?|cours|consultations?|soins?|coupes?|colorations?|brushings?|massages?|nettoyages?|remplacements?|mise aux normes|diagnostics?|audits?|formations?|livraisons?|menus?|repas|shootings?|reportages?|tournages?|gardes?|toilettages?|tailles?|élagages?|tontes?|débouchages?|ramonages?|maintenances?|programmes?|suivis?|recherche de fuites?|désembouages?|bilans?|ateliers?|rédaction|refonte|développement|gestion|traitements?|épilations?|manucures?|repairs?|installations?|servicing|maintenance|consultations?|lessons?|sessions?|treatments?|haircuts?|cleaning|design|coaching|workshops?|photo shoots?|catering|emergency)\b/i;

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s);
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s\-–—•*·:]+|[\s.;:]+$/g, "").trim();

/** Coordonnées écrites en toutes lettres dans un texte (jamais devinées). */
export function contactsFromText(text: string): { phone: string; email: string; bookingUrl: string; hours: string } {
  const phone = text.match(/(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/)?.[0] ?? text.match(/\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}/)?.[0] ?? "";
  const email = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i)?.[0] ?? "";
  const bookingUrl = text.match(/https?:\/\/[^\s"'<>]*(?:calendly|planity|doctolib|treatwell|booksy|setmore|simplybook|acuityscheduling|resalib|zenchef|thefork|lafourchette|cal\.com)[^\s"'<>]*/i)?.[0] ?? "";
  const hours = clean(text.match(/(?:horaires?(?: d'ouverture)?|heures d'ouverture|opening hours|hours)\s*:\s*(.{3,160}?)(?=\.\s|\.?$|\n|\s(?:Tél|Tel|Phone|RDV|E-?mail)\b)/im)?.[1] ?? "");
  return { phone: phone.trim(), email, bookingUrl, hours };
}

/**
 * Analyse locale d'une activité de services : profil (nom, métier, résumé, faits)
 * et offre (prestations, zone, coordonnées), uniquement à partir de ce que le client
 * a écrit ou de ce que dit son site actuel. Rien n'est inventé : les manques restent vides.
 */
export function localServiceAnalysis(input: { name?: string; brand?: string; description?: string; link?: { url?: string; title: string; description: string; text?: string } | null; services: ServiceProfile }): { product: ProductProfile; services: ServiceProfile } {
  const desc = (input.description ?? "").trim();
  const linkText = [input.link?.description, input.link?.text?.slice(0, 15000)].filter(Boolean).join("\n");
  // Métier : le mot-clé cité en premier l'emporte.
  let kind: (typeof SERVICE_KINDS)[number] | null = null;
  let at = Infinity;
  for (const k of SERVICE_KINDS) {
    const m = k.re.exec(`${input.name ?? ""} ${desc} ${input.link?.title ?? ""}`);
    if (m && m.index < at) (kind = k), (at = m.index);
  }
  // Segments de la description : « Plombier chauffagiste à Lyon, dépannage 7j/7, installation de chaudières, devis gratuit ».
  const lines = desc.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-–•*·]\s*/.test(l)).map(clean);
  const segments = lines.filter((l) => !/^[-–•*·]\s*/.test(l)).flatMap((l) => l.split(/[,;]|\.\s+|\s+[–—-]\s+/)).map(clean).filter(Boolean);
  const headline = segments[0] ?? "";
  const facts: Fact[] = [];
  const fact = (key: string, fr: string, en: string, value: string) => !facts.some((f) => f.key === key) && facts.push({ key, label: C(fr, en), value, status: "confirmed", source: "description" });
  // Prestations citées par le client (puces, ou segments qui commencent par un service).
  const found: ServiceItem[] = [];
  for (const seg of [...bullets, ...segments.slice(1)]) {
    if (seg.length < 3 || seg.length > 120) continue;
    if (!bullets.includes(seg) && !SERVICE_START.test(seg)) continue;
    if (/devis|quote|estimate/i.test(seg) && !SERVICE_START.test(seg)) continue;
    const name = cap(seg);
    if (!found.some((f) => f.name.toLowerCase() === name.toLowerCase())) found.push({ name, description: "" });
  }
  if (/devis (?:gratuit|offert)|free (?:quote|estimate)/i.test(desc)) fact("free_quote", "Devis", "Quote", C("Gratuit", "Free"));
  const avail = desc.match(/7\s?j(?:ours)?\s?\/\s?7|24\s?h\s?\/\s?24|24\/7|7 days a week/i)?.[0];
  if (avail) fact("availability", "Disponibilité", "Availability", avail.replace(/\s/g, ""));
  const exp = desc.match(/depuis\s+(?:19|20)\d{2}|\d{1,2}\s+ans d'expérience|since\s+(?:19|20)\d{2}|\d{1,2}\s+years? of experience/i)?.[0];
  if (exp) fact("experience", "Expérience", "Experience", exp);
  const cred = desc.match(/(?:certifié|certifiée|qualifié|qualifiée|diplômé|diplômée|agréé|agréée|label|RGE|Qualibat|certified|qualified|licensed|accredited)[^,.;\n]{0,80}/i)?.[0];
  if (cred) fact("credentials", "Qualifications (indiquées par vous)", "Qualifications (as stated by you)", clean(cred));
  // Zone : nom propre après « à », « sur », « in »… (« Plombier à Lyon » → Lyon).
  const areaM = desc.match(/(?:^|[\s,(])(?:à|sur|autour de|dans (?:le|la|les|l')?|in|around|across)\s+((?:[A-ZÀ-Ý][\p{L}'’-]+)(?:[\s-](?:[A-ZÀ-Ý][\p{L}'’-]+|et|sur|en|de|du|la|le|les|and)){0,4})/u);
  let area = areaM ? areaM[1].replace(/\s+(?:et|sur|en|de|du|la|le|les|and)$/u, "").trim() : "";
  if (/^(?:Domicile|Distance|Home)$/i.test(area)) area = "";
  const fromDesc = contactsFromText(desc);
  const fromLink = input.link ? contactsFromText(linkText) : { phone: "", email: "", bookingUrl: "", hours: "" };
  const u = input.services;
  const services: ServiceProfile = {
    ...emptyServiceProfile(),
    ...u,
    services: u.services.length ? u.services : found,
    area: u.area || area,
    phone: u.phone || fromDesc.phone || fromLink.phone,
    email: u.email || fromDesc.email || fromLink.email,
    hours: u.hours || fromDesc.hours || fromLink.hours,
    bookingUrl: u.bookingUrl || fromDesc.bookingUrl || fromLink.bookingUrl,
    contactMode: u.contactMode !== "form" ? u.contactMode : u.bookingUrl || fromDesc.bookingUrl ? "booking" : facts.some((f) => f.key === "free_quote") || /devis|quote/i.test(desc) ? "quote" : u.contactMode,
  };
  const linkName = input.link?.title ? clean(input.link.title.split(/\s[|–—-]\s|\s·\s/)[0]) : "";
  const name = input.name?.trim() || (headline && headline.length <= 70 ? cap(headline) : "") || linkName || input.brand?.trim() || "";
  const firstSentence = desc ? desc.split(/\n|(?<=\.)\s/)[0].slice(0, 260) : "";
  const summary = firstSentence || clean(input.link?.description ?? "").slice(0, 260);
  if (input.link?.description && !desc) facts.push({ key: "site_description", label: C("Présentation (site actuel)", "Overview (current website)"), value: clean(input.link.description).slice(0, 400), status: "confirmed", source: "link" });
  const product: ProductProfile = {
    ...emptyProduct(),
    name,
    nameStatus: input.name ? "provided" : name ? "detected" : "unknown",
    category: kind ? C(kind.fr, kind.en) : "",
    sector: kind?.sector ?? null,
    summary,
    facts,
    questions: [],
    claimsToAvoid: kind && /santé|health/i.test(kind.fr + kind.en) ? [C("Promesses de guérison ou de résultat médical", "Promises of cure or medical results")] : [],
    analyzedBy: "local",
  };
  return { product, services };
}

/** Fusion de l'offre : ce que le client a saisi prime toujours sur ce qui a été trouvé. */
export function mergeServiceProfile(user: ServiceProfile, found: Partial<ServiceProfile>): ServiceProfile {
  const pickS = (a: string, b?: string) => (a?.trim() ? a : (b ?? "").trim());
  return {
    services: user.services.length ? user.services : (found.services ?? []).filter((x) => x.name?.trim()),
    area: pickS(user.area, found.area),
    address: pickS(user.address, found.address),
    phone: pickS(user.phone, found.phone),
    email: pickS(user.email, found.email),
    hours: pickS(user.hours, found.hours),
    bookingUrl: pickS(user.bookingUrl, found.bookingUrl),
    contactMode: user.contactMode !== "form" ? user.contactMode : found.contactMode ?? user.contactMode,
  };
}

/** Teinte d'accent par secteur, pour un produit sans couleur (gris, noir, blanc, métal). */
const NEUTRAL_ACCENT_HUE: Record<string, number> = { hightech: 212, sport: 18, maison: 24, beaute: 340, mode: 8, bijoux: 42, alimentation: 140, enfants: 200, animaux: 32, artisanat: 28 };

/** Saturation perçue (chroma 0 à 1) : stable pour les gris, contrairement à la saturation HSL des tons très clairs ou très sombres. */
const chroma = (hex: string) => {
  const v = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return Math.max(...c) - Math.min(...c);
};

/**
 * Palette de marque dérivée des couleurs mesurées du produit.
 * Produit sans couleur (gris, noir, métal) : palette neutre graphite et un seul accent propre au secteur, plutôt
 * qu'une teinte inventée à partir du reflet bleuté d'un gris. Rose pastel : la couleur principale reste un rose
 * profond (framboise) au lieu de virer au brun brique.
 */
export function paletteFromColors(colors: { hex: string; share: number }[], sector?: string | null) {
  const vivid = [...colors].sort((a, b) => hsl(b.hex)[1] * (0.4 + b.share) - hsl(a.hex)[1] * (0.4 + a.share))[0]?.hex ?? "#6B5B4B";
  if (colors.length && Math.max(...colors.map((c) => chroma(c.hex))) < 0.08) {
    const h0 = hsl(vivid)[0];
    const ah = NEUTRAL_ACCENT_HUE[sector ?? ""] ?? 212;
    return { primary: hslToHex(h0, 0.08, 0.22), secondary: hslToHex(h0, 0.05, 0.88), accent: hslToHex(ah, 0.62, 0.5), light: hslToHex(h0, 0.04, 0.97), dark: hslToHex(h0, 0.08, 0.08) };
  }
  let [h, s] = hsl(vivid);
  if ((h >= 335 || h <= 15) && hsl(vivid)[2] > 0.65) {
    h = 346;
    s = Math.max(s, 0.5);
  }
  const primary = hslToHex(h, Math.min(0.62, Math.max(0.25, s)), 0.36);
  const secondary = hslToHex(h, Math.min(0.35, s * 0.6), 0.84);
  const accent = hslToHex((h + 28) % 360, Math.min(0.55, Math.max(0.3, s)), 0.58);
  const light = hslToHex(h, 0.25, 0.96);
  const dark = hslToHex(h, 0.22, 0.1);
  return { primary, secondary, accent, light, dark };
}

/** Noms proposés par le moteur local : évocateurs, sans promesse, à valider par le marchand. */
const NAME_WORDS_FR: Record<string, string[]> = {
  beaute: ["Aube", "Sève", "Lumen", "Nacre", "Brume", "Velours", "Iris", "Opaline"],
  mode: ["Faubourg", "Ligne", "Trame", "Allure", "Écru", "Sillon", "Atelier Nord", "Lin"],
  bijoux: ["Éclat", "Orée", "Fil d'Or", "Constellation", "Perle", "Aurore", "Facette", "Lueur"],
  maison: ["Sillage", "Ardoise", "Braise", "Lueur", "Foyer", "Argile", "Terre d'Ombre", "Nuance"],
  hightech: ["Axiome", "Onde", "Vecteur", "Boréal", "Tangente", "Prisme", "Faisceau", "Orbite"],
  sport: ["Cap", "Élan", "Altitude", "Sentier", "Horizon", "Relief", "Boussole", "Crête"],
  alimentation: ["Récolte", "Terroir", "Fournil", "Verger", "Saveur", "Garrigue", "Moisson", "Cueillette"],
  enfants: ["Petit Pas", "Câlin", "Nuage", "Grelot", "Pirouette", "Luciole", "Ritournelle", "Comptine"],
  animaux: ["Patte", "Museau", "Gamelle", "Truffe", "Compagnon", "Pelage", "Balade", "Moustache"],
  artisanat: ["Papier", "Encre", "Établi", "Copeau", "Plume", "Fusain", "Canevas", "Atelier"],
};
const NAME_FORMS_FR = (w: string) => [w, `Maison ${w}`, `${w} & Co`, ...(w.includes(" ") ? [] : [`Atelier ${w}`]), ...(/[\s'sx]/.test(w) ? [] : [`Les ${w}s`])];
const TAGLINES_FR: Record<string, string> = {
  beaute: "Le soin, simplement.",
  mode: "Des pièces pensées pour vous.",
  bijoux: "Des détails qui comptent.",
  maison: "Des objets à vivre.",
  hightech: "La technologie, sans détour.",
  sport: "Fait pour bouger.",
  alimentation: "Le goût des bonnes choses.",
  enfants: "Pour les petits, avec soin.",
  animaux: "Pour nos compagnons.",
  artisanat: "Fait avec soin.",
};

const NAME_WORDS_EN: Record<string, string[]> = {
  beaute: ["Morrow", "Sap", "Lumen", "Pearl", "Mist", "Velvet", "Iris", "Opal"],
  mode: ["Thread", "Seam", "Weave", "Selvedge", "Ecru", "Furrow", "North Loom", "Linen"],
  bijoux: ["Gleam", "Halo", "Gold Thread", "Constellation", "Pearl", "Aurora", "Facet", "Glow"],
  maison: ["Hearth", "Slate", "Cinder", "Glow", "Alcove", "Clay", "Umber", "Shade"],
  hightech: ["Tangent", "Wave", "Vector", "Axiom", "Arclight", "Prism", "Northbeam", "Meridian"],
  sport: ["Summit", "Stride", "Altitude", "Trail", "Horizon", "Ridge", "Compass", "Crest"],
  alimentation: ["Harvest", "Orchard", "Bakehouse", "Grove", "Savor", "Pantry", "Gather", "Meadow"],
  enfants: ["Little Steps", "Cuddle", "Cloud", "Jingle", "Pirouette", "Firefly", "Lullaby", "Rhyme"],
  animaux: ["Paw", "Snout", "Bowl", "Whisker", "Companion", "Fur", "Stroll", "Tail"],
  artisanat: ["Paper", "Ink", "Workbench", "Shaving", "Quill", "Charcoal", "Canvas", "Workshop"],
};
const NAME_FORMS_EN = (w: string) => [w, `${w} & Co`, ...(w.includes(" ") ? [] : [`${w} Studio`, `The ${w} Co`]), `${w} House`];
const TAGLINES_EN: Record<string, string> = {
  beaute: "Skincare, simplified.",
  mode: "Pieces designed for you.",
  bijoux: "The details that matter.",
  maison: "Objects to live with.",
  hightech: "Tech, without the fuss.",
  sport: "Made to move.",
  alimentation: "A taste for good things.",
  enfants: "For little ones, with care.",
  animaux: "For our companions.",
  artisanat: "Made with care.",
};

function proposeNames(sector: string, seed: string): string[] {
  const NAME_WORDS = C(NAME_WORDS_FR, NAME_WORDS_EN);
  const NAME_FORMS = C(NAME_FORMS_FR, NAME_FORMS_EN);
  const words = NAME_WORDS[sector] ?? NAME_WORDS.maison;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  for (let i = 0; out.length < 5 && i < 40; i++) {
    const w = words[(h + i * 3) % words.length];
    const forms = NAME_FORMS(w).filter((f) => f.length <= 18 && !f.startsWith("Atelier Atelier") && f !== "Workshop Studio");
    const f = forms[(h >>> (i % 8)) % forms.length];
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}

/**
 * Marque et stratégie locales. `biz` (le projet, ou { business, services }) : pour une entreprise de services,
 * noms, signature, ton, angles, piliers et messages clés parlent de prestations et de rendez-vous.
 */
export function localBrand(p: ProductProfile, providedBrand?: string, biz?: BusinessInfo | null): { brand: Brand; strategy: Strategy; logoSpec: Omit<LogoSpec, "color"> } {
  const services = isServicesBusiness(biz);
  const sector = (p.sector ?? "maison") as SectorId;
  const direction = services ? serviceDirection(p) : SECTOR_DIRECTION[sector] ?? SECTOR_DIRECTION.maison;
  const d = DIRECTIONS.find((x) => x.id === direction)!;
  const seed = p.visual.colors.map((c) => c.hex).join("") + (p.name ?? "");
  const proposals = services ? serviceNames(p, seed) : proposeNames(sector, seed);
  const name = providedBrand?.trim() || proposals[0] || C(NAME_WORDS_FR, NAME_WORDS_EN).maison[0];
  if (services) {
    const out = localServiceBrand(p, biz, name, providedBrand, proposals);
    const logoFamily = canvasFamily(d.fonts.heading, "Cormorant");
    return {
      brand: { ...out.brand, palette: paletteFromColors(p.visual.colors.length ? p.visual.colors : [{ hex: "#3F5B6B", share: 1 }]), fonts: d.fonts, direction, logo: { concept: C(`Logotype typographique en ${logoFamily}`, `Typographic wordmark in ${logoFamily}`), status: "proposed" } },
      strategy: out.strategy,
      logoSpec: { name, family: CANVAS_FONTS[logoFamily] ? logoFamily : "Cormorant", weight: d.id === "brut" || d.id === "elan" || d.id === "pop" ? 800 : 500, case: d.id === "terroir" || d.id === "pop" || d.id === "gourmand" ? "title" : "upper", tracking: d.id === "atelier" || d.id === "galerie" || d.id === "joaillerie" ? 0.18 : 0.04, layout: name.length > 12 && name.includes(" ") ? "stacked" : "wordmark", emblem: d.id === "elan" ? "line" : "none" },
    };
  }
  const palette = paletteFromColors(p.visual.colors.length ? p.visual.colors : [{ hex: "#7A6552", share: 1 }], sector);
  const logoFamily = canvasFamily(d.fonts.heading, "Cormorant");
  return {
    brand: {
      name,
      nameStatus: providedBrand ? "provided" : "proposed",
      alternatives: providedBrand ? [] : proposals.slice(1),
      tagline: C(TAGLINES_FR, TAGLINES_EN)[sector] ?? "",
      positioning: C("[À définir avec vous : pour qui, pour quel usage, avec quelle différence]", "[To define with you: who it's for, what it's used for, what sets it apart]"),
      audience: C("[À préciser]", "[To complete: target audience]"),
      personality: [],
      tone: C(
        { voice: "Clair, précis et chaleureux", do: ["Parler concret", "Citer les caractéristiques vérifiées"], dont: ["Promettre sans preuve", "Superlatifs vides"] },
        { voice: "Clear, precise and warm", do: ["Keep it concrete", "Cite verified features"], dont: ["Promises without proof", "Empty superlatives"] },
      ),
      palette,
      fonts: d.fonts,
      logo: { concept: C(`Logotype typographique en ${logoFamily}`, `Typographic wordmark in ${logoFamily}`), status: "proposed" },
      story: "",
      values: [],
      direction,
      validated: [],
      generatedBy: "local",
    },
    strategy: {
      audience: [],
      angles: C(
        [{ title: "Le produit en détail", idea: "Montrer les détails réels de l'objet." }, { title: "Usage", idea: "Le produit dans son contexte." }],
        [{ title: "The product up close", idea: "Show the object's real details." }, { title: "In use", idea: "The product in its everyday context." }],
      ),
      pillars: C(["Produit", "Usage", "Coulisses"], ["Product", "In use", "Behind the scenes"]),
      keyMessages: [],
      generatedBy: "local",
    },
    logoSpec: {
      name,
      family: CANVAS_FONTS[logoFamily] ? logoFamily : "Cormorant",
      weight: d.id === "brut" || d.id === "elan" || d.id === "pop" ? 800 : 500,
      case: d.id === "terroir" || d.id === "pop" ? "title" : "upper",
      tracking: d.id === "atelier" || d.id === "galerie" ? 0.18 : 0.04,
      layout: name.length > 12 && name.includes(" ") ? "stacked" : "wordmark",
      emblem: d.id === "elan" ? "line" : "none",
    },
  };
}

/** Marque et stratégie d'une entreprise de services (sans palette, polices ni logo, ajoutés par localBrand). */
function localServiceBrand(p: ProductProfile, biz: BusinessInfo, name: string, providedBrand: string | undefined, proposals: string[]): { brand: Omit<Brand, "palette" | "fonts" | "direction" | "logo">; strategy: Strategy } {
  const profile = biz.services;
  const offer = (profile?.services ?? []).filter((x) => x.name.trim());
  const cta = contactCta(profile?.contactMode);
  const showcase = serviceShowcase(p);
  const angles: Strategy["angles"] = [
    ...offer.slice(0, 2).map((x) => ({ title: x.name, idea: x.description?.trim() || C("Présenter cette prestation : pour qui, comment elle se déroule, ce qu'il faut prévoir.", "Present this service: who it's for, how it works, what to plan for.") })),
    C({ title: "Le savoir-faire en action", idea: "Montrer le vrai travail : gestes, outils, coulisses d'une prestation." }, { title: "Skills in action", idea: "Show the real work: techniques, tools, behind the scenes of a job." }),
    showcase
      ? C({ title: "Avant / après", idea: "Uniquement de vraies réalisations, photographiées avec l'accord des clients." }, { title: "Before and after", idea: "Real projects only, photographed with the clients' consent." })
      : C({ title: "Comment se passe un rendez-vous", idea: "Expliquer simplement le déroulé, du premier contact à la fin de la prestation." }, { title: "What an appointment looks like", idea: "Explain the process simply, from first contact to the end of the service." }),
    C({ title: "Conseils d'expert", idea: "Partager des conseils utiles du métier, sans promesse de résultat." }, { title: "Expert tips", idea: "Share useful tips from the trade, without promising results." }),
    C({ title: "L'équipe", idea: "Présenter les personnes qui accueillent ou interviennent, avec leur accord." }, { title: "Meet the team", idea: "Introduce the people clients will meet, with their consent." }),
    C({ title: "Prise de rendez-vous", idea: `Rappeler simplement comment réserver (« ${cta} »), la zone et les horaires.` }, { title: "Easy booking", idea: `Remind people how to get in touch ("${cta}"), the area covered and the opening hours.` }),
  ];
  const keyMessages = [
    offer.length ? C(`Prestations : ${offer.slice(0, 4).map((x) => x.name).join(", ")}`, `Services: ${offer.slice(0, 4).map((x) => x.name).join(", ")}`) : "",
    profile?.area?.trim() ? C(`Zone d'intervention : ${profile.area.trim()}`, `Service area: ${profile.area.trim()}`) : profile?.address?.trim() ? C(`Adresse : ${profile.address.trim()}`, `Address: ${profile.address.trim()}`) : "",
    profile?.hours?.trim() ? C(`Horaires : ${profile.hours.trim()}`, `Opening hours: ${profile.hours.trim()}`) : "",
    cta,
  ].filter(Boolean);
  return {
    brand: {
      name,
      nameStatus: providedBrand ? "provided" : "proposed",
      alternatives: providedBrand ? [] : proposals.filter((x) => x !== name).slice(0, 4),
      tagline: serviceTaglines(p, profile)[0] ?? "",
      positioning: C("[À définir avec vous : pour quels clients, quelles prestations, dans quelle zone, avec quelle différence]", "[To define with you: which clients, which services, which area, what sets you apart]"),
      audience: C("[À compléter : clients visés]", "[To complete: target clients]"),
      personality: [],
      tone: C(
        { voice: "Professionnel, rassurant et accessible", do: ["Expliquer simplement chaque prestation", "Donner les informations pratiques (zone, horaires, contact)", "Montrer le vrai travail"], dont: ["Inventer des tarifs, des délais ou des avis", "Promettre un résultat", "Jargon sans explication"] },
        { voice: "Professional, reassuring and approachable", do: ["Explain each service simply", "Give the practical details (area, hours, contact)", "Show the real work"], dont: ["Making up rates, timelines or reviews", "Promising results", "Unexplained jargon"] },
      ),
      story: "",
      values: [],
      validated: [],
      generatedBy: "local",
    },
    strategy: {
      audience: [],
      angles,
      pillars: C(["Savoir-faire", showcase ? "Réalisations" : "Déroulé", "Conseils", "Coulisses", "Prise de rendez-vous"], ["Expertise", showcase ? "Our work" : "How it works", "Tips", "Behind the scenes", "Booking"]),
      keyMessages,
      generatedBy: "local",
    },
  };
}

/**
 * Découpage sans IA : une structure différente selon le produit (secteur, photos disponibles),
 * pour que deux boutiques n'aient jamais la même vidéo. Seules les informations confirmées sont montrées.
 */
export function localVideoPlan(p: ProductProfile, brand: Brand, format: VideoSpec["format"], imageRoles: string[], url?: string, biz?: BusinessInfo | null): VideoSpec {
  const facts = p.facts.filter((f) => f.status !== "unknown" && f.value && f.value.length < 60).slice(0, 3).map((f) => f.value.replace(/\.$/, ""));
  const name = p.name || brand.name;
  const line = brand.tagline || name;
  const life = imageRoles.indexOf("lifestyle");
  const life2 = imageRoles.indexOf("lifestyle", life + 1);
  const detail = imageRoles.indexOf("detail");
  const scene = imageRoles.indexOf("scene");
  const other = (exclude: number[]) => [life2, detail, scene].find((i) => i >= 0 && !exclude.includes(i)) ?? -1;
  // Variation stable par produit : deux produits d'un même secteur n'ont pas le même montage.
  const seed = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = <T,>(xs: T[]) => xs[seed % xs.length];
  // Entreprise de services : la fin invite à prendre rendez-vous, demander un devis ou appeler.
  const end: VideoSpec["scenes"][number] = { kind: "end", duration: 3, headline: name, cta: isServicesBusiness(biz) ? contactCta(biz.services?.contactMode) : C("Découvrir", "Discover"), url };
  const factScene = (): VideoSpec["scenes"] => facts.length >= 2 ? [pick<VideoSpec["scenes"][number]>([{ kind: "callouts", duration: 3.4, items: facts, heading: C("En détail", "In detail") }, { kind: "words", duration: Math.min(5.4, 1.8 * facts.length), items: facts }])] : [];
  const scenes: VideoSpec["scenes"] = [];
  let transition: VideoSpec["transition"] = "panel";
  let music: VideoSpec["music"] = "calm";
  const sector = p.sector ?? "";

  if (sector === "hightech" || sector === "sport") {
    // Énergique : le produit en action, puis sous le projecteur, détails, fin.
    transition = "push";
    music = "pulse";
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: line, tag: brand.name });
    else scenes.push({ kind: "words", duration: 2.2, items: [line] });
    scenes.push({ kind: "spotlight", duration: 3, headline: name });
    scenes.push(...factScene());
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "detail", duration: 2.2, image: o });
  } else if (sector === "mode" || sector === "bijoux" || sector === "beaute") {
    // Éditorial : phrase forte, photo plein cadre, écran partagé, détail.
    transition = pick<VideoSpec["transition"]>(["push", "fade"]);
    music = "pulse";
    scenes.push({ kind: "words", duration: 2, items: [line] });
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: name });
    else scenes.push({ kind: "reveal", duration: 2.8, headline: name, motion: "zoom" });
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "split", duration: 3, image: o, headline: facts[0] ?? name });
    else scenes.push(...factScene());
  } else if (sector === "animaux" || sector === "enfants" || sector === "maison") {
    // Chaleureux : la vie de tous les jours d'abord, le produit ensuite, ce qu'il apporte.
    transition = pick<VideoSpec["transition"]>(["fade", "panel"]);
    music = "calm";
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.8, image: life, headline: line, tag: brand.name });
    else scenes.push({ kind: "title", duration: 2.4, text: line, sub: name, bg: "brand" });
    const o = other([life]);
    if (o >= 0 && life >= 0) scenes.push({ kind: "split", duration: 3, image: o === life2 ? o : life, headline: name });
    else scenes.push({ kind: "reveal", duration: 2.8, headline: name, motion: pick(["rise", "zoom", "slide"] as const) });
    scenes.push(...factScene());
    if (o >= 0 && o !== life2) scenes.push({ kind: "detail", duration: 2.2, image: o });
  } else {
    // Classique (alimentation, artisanat…) : titre, révélation, détails, photos.
    transition = pick<VideoSpec["transition"]>(["panel", "fade"]);
    scenes.push({ kind: "title", duration: 2.4, text: line, sub: brand.tagline ? name : undefined, bg: pick(["brand", "dark"] as const) });
    scenes.push({ kind: "reveal", duration: 3, headline: name, motion: pick(["rise", "zoom", "slide"] as const) });
    scenes.push(...factScene());
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: facts[0] ?? line });
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "scene", duration: 2.2, image: o });
  }
  scenes.push(end);
  return { format, scenes, transition, music, captions: true };
}

/** Sections demandées par une entreprise de services (types du studio, puis équivalents courants des thèmes importés). */
const SERVICE_ADDS: [RegExp, string[]][] = [
  [/tarifs?|grille|\brates\b|pricing|price list|\bprices\b/, ["pricing", "services-list", "multicolumn"]],
  [/prestations?|nos services|\bservices?\b/, ["services-list", "service-list", "features-grid", "multicolumn"]],
  [/rendez-vous|\brdv\b|réserv|prise de contact|devis|booking|appointment|book now|\bquote\b/, ["booking", "booking-cta", "cta-banner", "contact-form"]],
  [/infos? pratiques?|horaires|zone d'intervention|adresse|accès|plan d'accès|opening hours|\bhours\b|service area|\bmap\b|address/, ["practical-info", "map", "specs-list", "multicolumn"]],
  [/avant ?\/? ?après|before ?(and|&|\/) ?after/, ["before-after", "portfolio", "gallery-mosaic"]],
  [/réalisations?|portfolio|chantiers?|our work|projects/, ["portfolio", "before-after", "gallery-mosaic", "editorial-gallery", "collage"]],
  [/équipe|praticien|\bteam\b|staff|practitioners?/, ["team", "expert-endorsements", "about", "multicolumn"]],
  [/déroulé|étapes|comment ça (se passe|marche)|process|how it works|steps/, ["timeline", "scroll-steps", "how-to", "multirow"]],
  [/formulaire|contact form|\bcontact\b/, ["contact-form"]],
];

/** Synonymes courants pour retrouver une section par son nom, en français comme en anglais. */
const SECTION_SYNONYMS: string[][] = [
  ["newsletter", "inscription", "diffusion", "e-mail", "email", "signup", "sign-up", "abonnement"],
  ["faq", "questions", "collapsible", "réductible", "accordéon", "accordion"],
  ["avis", "témoignage", "témoignages", "review", "reviews", "testimonial", "testimonials"],
  ["bandeau", "annonce", "announcement", "marquee", "défilant", "scrolling"],
  ["vidéo", "video"],
  ["galerie", "gallery", "collage", "mosaïque", "mosaic"],
  ["collection", "collections", "produits", "products"],
  ["diaporama", "slideshow", "carrousel", "carousel"],
  ["image avec texte", "image with text"],
  ["texte enrichi", "rich text"],
];

/** La demande désigne-t-elle cette section (nom français ou anglais, type technique, synonyme) ? */
function sectionMatches(spec: ThemeSpec, type: string, m: string): boolean {
  const names = [type.replace(/[-_]/g, " "), sectionSchema(spec, type, "fr")?.name ?? "", sectionSchema(spec, type, "en")?.name ?? ""].map((x) => x.toLowerCase()).filter(Boolean);
  if (names.some((n) => n.length > 2 && m.includes(n))) return true;
  return SECTION_SYNONYMS.some((group) => group.some((w) => m.includes(w)) && group.some((w) => names.some((n) => n.includes(w))));
}

/**
 * Réglage de couleur des boutons dans les schémas de couleurs : « accent » pour nos thèmes,
 * « button » pour Dawn et la plupart des thèmes Shopify, etc. Appliqué aux schémas qui partagent
 * la couleur de bouton du premier (les schémas sombres gardent la leur).
 */
function buttonColorTargets(spec: ThemeSpec): { key: string; schemes: string[] } {
  const schemes = (spec.settings.color_schemes ?? {}) as Record<string, { settings?: Record<string, unknown> }>;
  const ids = Object.keys(schemes);
  if (!spec.imported) return { key: "accent", schemes: ids.filter((x) => x === "scheme-1" || x === "scheme-2") };
  if (!ids.length) return { key: "", schemes: [] };
  const first = schemes[ids[0]].settings ?? {};
  const key = ["button", "button_background", "primary_button_background", "button_bg", "accent", "accent_1", "primary"].find((k) => typeof first[k] === "string");
  if (!key) return { key: "", schemes: [] };
  const ref = String(first[key]).toLowerCase();
  return { key, schemes: ids.filter((x) => String(schemes[x].settings?.[key] ?? "").toLowerCase() === ref) };
}

/**
 * Commandes simples comprises sans IA (mode local) : annuler, couleur du
 * bouton, texte entre guillemets dans l'élément désigné, ajout ou
 * suppression de sections courantes, changement de direction.
 * Les demandes sont comprises en français comme en anglais, quelle que soit la langue :
 * la réponse suit la langue de l'interface (L), les textes ajoutés au thème celle des contenus (C).
 */
export function localThemeCommand(spec: ThemeSpec, message: string, selection: { template: string; section: string; block?: string; kind?: string } | null, business: BusinessType = "products"): { ops: ThemeOp[]; reply: string; revert: boolean; direction?: DirectionId } {
  const services = business === "services";
  const m = message.toLowerCase();
  if (/(reviens|revenir|annule|version précédente|\bundo\b|go back|revert|previous version|roll ?back)/.test(m)) return { ops: [], reply: L("Je reviens à la version précédente.", "Going back to the previous version."), revert: true };
  const quoted = message.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)?.[1];
  const hex = message.match(/#[0-9a-fA-F]{6}\b/)?.[0];
  // Couleurs nommées : l'anglais d'abord (« or » est aussi une conjonction anglaise), puis le français.
  const namedEn: Record<string, string> = { black: "#111111", white: "#FFFFFF", red: "#B42318", blue: "#1D4ED8", green: "#1F7A4D", gold: "#B8913A", golden: "#B8913A", beige: "#E8DCC8", pink: "#E7A5B5", orange: "#E07A2E", gray: "#6B6B6B", grey: "#6B6B6B" };
  const namedFr: Record<string, string> = { noir: "#111111", blanc: "#FFFFFF", rouge: "#B42318", bleu: "#1D4ED8", vert: "#1F7A4D", or: "#B8913A", doré: "#B8913A", beige: "#E8DCC8", rose: "#E7A5B5", orange: "#E07A2E", gris: "#6B6B6B" };
  const findColor = (named: Record<string, string>) => {
    const k = Object.keys(named).find((w) => new RegExp(`\\b${w}\\b`).test(m));
    return k ? named[k] : undefined;
  };
  const color = hex ?? findColor(namedEn) ?? findColor(namedFr);
  const ops: ThemeOp[] = [];
  const dir = DIRECTIONS.find((d) => m.includes(d.name.toLowerCase()) || m.includes(d.id));
  if (dir && /(style|direction|thème|theme|passe|switch|apply)/.test(m)) return { ops: [], reply: L(`J'applique la direction ${dir.name} en conservant vos textes et images.`, `Applying the ${dir.name} direction while keeping your copy and images.`), revert: false, direction: dir.id };
  if (color && /(bouton|button|accent|cta)/.test(m)) {
    const target = buttonColorTargets(spec);
    if (!target.schemes.length) return { ops: [], reply: L("Je ne trouve pas le réglage de couleur des boutons de ce thème : changez-la dans l'éditeur de thème Shopify (Paramètres du thème › Couleurs).", "I can't find this theme's button color setting: change it in the Shopify theme editor (Theme settings › Colors)."), revert: false };
    for (const sc of target.schemes) ops.push({ op: "set_scheme_color", scheme: sc, key: target.key, value: color });
    return { ops, reply: L(`Couleur des boutons : ${color}.`, `Button color: ${color}.`), revert: false };
  }
  if (color && /(fond|arrière|background)/.test(m)) {
    ops.push({ op: "set_scheme_color", scheme: "scheme-1", key: "background", value: color });
    return { ops, reply: L(`Fond principal : ${color}.`, `Main background: ${color}.`), revert: false };
  }
  if (selection && quoted) {
    const c = containerOf(spec, selection.template);
    const s = c?.sections[selection.section];
    const target = selection.block ? s?.blocks?.[selection.block] : s;
    const key = target ? ["heading", "title", "text", "question", "label", "button_label", "heading_line1"].find((k) => k in target.settings) : undefined;
    if (key) {
      const wantsButton = (/bouton|button/.test(m) || selection.kind === "Bouton" || selection.kind === "Button") && target && "button_label" in target.settings;
      ops.push({ op: "set_setting", template: selection.template, section: selection.section, block: selection.block, key: wantsButton ? "button_label" : key, value: quoted });
      return { ops, reply: L(`Texte remplacé par « ${quoted} ».`, `Text replaced with "${quoted}".`), revert: false };
    }
  }
  // Fiche produit qui convertit : blocs ajoutés au produit, uniquement avec les informations données (boutiques de produits).
  const pdp = services ? null : productPageCommand(spec, message, m);
  if (pdp) return pdp;
  // Types candidats : ceux du thème du studio, puis leurs équivalents dans les thèmes importés (Dawn et dérivés).
  const adds: [RegExp, string[]][] = [
    [/faq|questions/, ["faq", "collapsible-content"]],
    [/vidéo|video/, ["video-showcase", "video"]],
    // Entreprises de services : prestations, tarifs, rendez-vous, infos pratiques, réalisations, équipe, déroulé.
    ...(services ? SERVICE_ADDS : []),
    [/défil|scroll|animation/, ["scroll-story", "multirow", "image-with-text"]],
    [/newsletter|e-?mail|inscription|sign-?up/, ["newsletter", "email-signup"]],
    [/bandeau|marquee|banner|ticker/, ["marquee", "scrolling-text", "announcement-bar"]],
    [/caractéristique|spécification|specification|\bspecs\b|\bfeatures?\b/, ["specs-list", "multicolumn"]],
    [/galerie|mosaïque|gallery|mosaic/, ["gallery-mosaic", "collage", "multicolumn"]],
    [/image avec (du )?texte|image et texte|image with text|image and text/, ["image-with-text"]],
    [/texte|paragraphe|\btext\b|paragraph/, ["rich-text"]],
  ];
  if (/ajoute|ajouter|insère|\badd\b|insert/.test(m)) {
    const hit = adds.find(([re]) => re.test(m));
    if (hit) {
      const available = new Set(availableSectionTypes(spec));
      const type = hit[1].find((t) => available.has(t));
      if (!type) return { ops: [], reply: L("Votre thème ne propose pas de section de ce genre. Ouvrez « + Section » pour voir celles qu'il contient.", "Your theme doesn't offer a section like this. Open \"+ Section\" to see the ones it includes."), revert: false };
      ops.push({ op: "add_section", template: selection?.template ?? "index", type, position: selection ? { after: selection.section } : undefined });
      return { ops, reply: L("Section ajoutée avec un contenu de départ à personnaliser.", "Section added with starter content for you to customize."), revert: false };
    }
  }
  // « Masque / affiche la section … » : section de la page désignée par son nom.
  if (/(masque|cache|affiche|réaffiche|montre|\bhide\b|\bshow\b|unhide)/.test(m)) {
    // Section désignée dans l'aperçu, sinon reconnue par son nom (français ou anglais), son type ou un synonyme courant,
    // sur la page désignée puis dans l'en-tête et le pied de page.
    const pages = selection ? [selection.template] : ["index", "group:header", "group:footer"];
    let page = pages[0];
    let found: { id: string } | undefined = selection ? { id: selection.section } : undefined;
    for (const t of selection ? [] : pages) {
      const c = containerOf(spec, t);
      const hit = c?.order.find((id) => c.sections[id] && sectionMatches(spec, c.sections[id].type, m));
      if (hit) {
        found = { id: hit };
        page = t;
        break;
      }
    }
    const c = containerOf(spec, page);
    if (found && c?.sections[found.id]) {
      const hide = /(masque|cache|\bhide\b)/.test(m);
      ops.push({ op: "toggle_section", template: page, section: found.id, disabled: hide });
      return { ops, reply: hide ? L("Section masquée (elle reste dans la page, réaffichable).", "Section hidden (it stays on the page and can be shown again).") : L("Section réaffichée.", "Section shown again."), revert: false };
    }
    // Section introuvable : on dit lesquelles existent plutôt qu'un message générique.
    if (/(section|bloc|block|bandeau|newsletter|faq|avis|review|galerie|gallery|vidéo|video|collection)/.test(m)) {
      const names = pages.flatMap((t) => {
        const ct = containerOf(spec, t);
        return ct ? ct.order.filter((id) => ct.sections[id]).map((id) => sectionSchema(spec, ct.sections[id].type, uiLang())?.name ?? ct.sections[id].type) : [];
      });
      return { ops: [], reply: L(`Je ne trouve pas cette section sur la page. Sections présentes : ${names.join(", ")}. Désignez-la dans l'aperçu ou reprenez son nom.`, `I can't find that section on this page. Sections present: ${names.join(", ")}. Select it in the preview or use its name.`), revert: false };
    }
  }
  if (selection && /(supprime|retire|enlève|remove|delete)/.test(m)) {
    ops.push({ op: "remove_section", template: selection.template, section: selection.section });
    return { ops, reply: L("Section supprimée.", "Section removed."), revert: false };
  }
  if (selection && /(monte|plus haut|remonte|move (it |this )?up|higher)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: Math.max(0, i - 1) } });
    return { ops, reply: L("Section remontée.", "Section moved up."), revert: false };
  }
  if (selection && /(descends|plus bas|descend|move (it |this )?down|lower)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: i + 1 } });
    return { ops, reply: L("Section descendue.", "Section moved down."), revert: false };
  }
  if (services)
    return {
      ops: [],
      revert: false,
      reply: L(
        "La version simplifiée comprend des commandes simples : couleur des boutons, texte entre guillemets sur l'élément désigné, ajouter une section prestations, prise de rendez-vous, infos pratiques (zone, horaires), réalisations, équipe, déroulé, FAQ ou formulaire de contact ; masquer, supprimer, monter, revenir en arrière, changer de direction. Les retouches libres seront disponibles dès que l'IA sera connectée.",
        "The simplified version understands simple commands: button color, text in quotes on the selected element, adding a services, booking, practical information (area, hours), our work, team, process, FAQ or contact form section; hiding, removing, moving up, going back, changing direction. Free-form edits will be available as soon as AI is connected.",
      ),
    };
  return {
    ops: [],
    revert: false,
    reply: L(
      "La version simplifiée comprend des commandes simples : couleur des boutons, texte entre guillemets sur l'élément désigné, ajouter une FAQ, des lots, la livraison estimée (avec vos délais), des pastilles (entre guillemets), une section avis, un abonnement, le prix dans le bouton ; supprimer, monter, revenir en arrière, changer de direction. Les retouches libres seront disponibles dès que l'IA sera connectée.",
      "The simplified version understands simple commands: button color, text in quotes on the selected element, adding an FAQ, bundles, estimated delivery (with your shipping times), badges (in quotes), a reviews section, a subscription, the price in the button; removing, moving up, going back, changing direction. Free-form edits will be available as soon as AI is connected.",
    ),
  };
}

/** Commandes simples pour la fiche produit (lots, livraison, pastilles, avis, abonnement…). */
function productPageCommand(spec: ThemeSpec, message: string, m: string): { ops: ThemeOp[]; reply: string; revert: boolean } | null {
  if (!/ajoute|ajouter|insère|mets|active|\badd\b|insert|\bput\b|enable|turn on|price (in|on) the button/.test(m)) return null;
  const tpl = spec.templates.product;
  const mainId = tpl?.order.find((id) => tpl.sections[id]?.type === "main-product");
  if (!tpl || !mainId) return null;
  const main = tpl.sections[mainId];
  const blockOf = (type: string) => Object.entries(main.blocks ?? {}).find(([, b]) => b.type === type)?.[0];
  const buy = blockOf("buy_buttons");
  const after = (type: string) => ({ after: blockOf(type) ?? buy });
  const add = (type: string, settings: Record<string, string | number | boolean>, pos: { after?: string }, reply: string) => ({ ops: [{ op: "add_block", template: "product", section: mainId, type, settings, position: pos } as ThemeOp], reply, revert: false });
  const quotes = [...message.matchAll(/[«"“]\s*([^»"”]+?)\s*[»"”]/g)].map((x) => x[1]).slice(0, 4);
  if (/\blots?\b|packs?\b|compose ton panier|quantités? dégressi|\bbundles?\b|multi-?buy|quantity (break|discount)s?|volume discounts?/.test(m)) {
    return add(
      "bundles",
      { layout: /ligne|\brows?\b/.test(m) ? "rows" : "cards", heading: C("Compose ton panier", "Build your bundle"), qty1: 1, label1: C("1 article", "1 item"), qty2: 2, label2: C("2 articles", "2 items"), qty3: 3, label3: C("3 articles", "3 items"), default_tier: "1" },
      after("price"),
      L(
        "Lots ajoutés (1, 2 et 3 articles, sans remise). Indiquez vos remises dans l'éditeur Shopify et créez-les aussi dans Shopify › Réductions pour qu'elles s'appliquent au paiement.",
        "Bundles added (1, 2 and 3 items, no discount). Set your discounts in the Shopify editor and also create them in Shopify › Discounts so they apply at checkout.",
      ),
    );
  }
  if (/livraison estimée|délais? de livraison|date de livraison|estimated delivery|delivery (time|date|estimate)s?|shipping times?/.test(m)) {
    const nums = (m.match(/(\d+)\s*(?:à|-|–|et|to|and)\s*(\d+)\s*(?:jours?|days?)/) ?? m.match(/(\d+)\s*(?:jours?|days?)/))?.slice(1).filter(Boolean).map(Number);
    if (!nums?.length) return { ops: [], revert: false, reply: L("Indiquez vos délais réels, par exemple : « ajoute la livraison estimée 2 à 4 jours ». Je n'invente pas de délai.", "Tell me your real shipping times, for example: \"add estimated delivery 2 to 4 days\". I won't make up a delivery time.") };
    const [min, max] = nums.length > 1 ? nums : [0, nums[0]];
    const calendar = /calendaire|calendar/.test(m);
    return add(
      "delivery",
      { min_days: Math.min(min, max), max_days: Math.max(min, max), business_days: !calendar, label: C("Livraison estimée", "Estimated delivery") },
      { after: buy },
      L(`Livraison estimée ajoutée : ${min ? `${min} à ` : "sous "}${max} jours ${calendar ? "" : "ouvrés"}.`.trim(), `Estimated delivery added: ${min ? `${min} to ` : "within "}${max} ${calendar ? "" : "business "}days.`),
    );
  }
  if (/pastilles?|badges?/.test(m)) {
    if (!quotes.length) return { ops: [], revert: false, reply: L("Donnez les pastilles entre guillemets, par exemple : ajoute des pastilles « Fabriqué en France » « Vegan ». Seulement des engagements vérifiés.", "Give the badges in quotes, for example: add badges \"Made in France\" \"Vegan\". Verified commitments only.") };
    return add("badges", Object.fromEntries(quotes.map((q, i) => [`badge${i + 1}`, q])), { after: blockOf("title") }, L(`Pastilles ajoutées : ${quotes.join(", ")}.`, `Badges added: ${quotes.join(", ")}.`));
  }
  if (/abonnement|subscription|subscribe/.test(m)) return add("subscription", {}, after("price"), L("Bloc abonnement ajouté : il s'affichera avec les plans de votre application d'abonnement Shopify.", "Subscription block added: it will display with the plans from your Shopify subscription app."));
  if (/autres? (saveurs?|modèles?|couleurs?|parfums?)|variantes? en cartes|other (flavou?rs?|models?|styles?|colou?rs?|scents?)|variants? as cards/.test(m)) {
    const col = spec.store.collections?.[0]?.handle ?? "all";
    const flavor = /saveur|flavou?r/.test(m);
    return add(
      "siblings",
      { collection: col, heading: flavor ? C("Choisissez votre saveur", "Choose your flavor") : C("Choisissez votre modèle", "Choose your style") },
      after("title"),
      L("Cartes des autres modèles ajoutées (collection « " + col + " »).", `Cards for the other models added ("${col}" collection).`),
    );
  }
  if (/prix dans le bouton|price (in|on) the button/.test(m) && buy) return { ops: [{ op: "set_setting", template: "product", section: mainId, block: buy, key: "price_in_button", value: true }], reply: L("Le prix s'affiche désormais dans le bouton d'ajout.", "The price now shows in the add-to-cart button."), revert: false };
  if (/\bavis\b|\breviews?\b/.test(m) && !tpl.order.some((id) => tpl.sections[id]?.type === "product-reviews")) {
    return { ops: [{ op: "add_section", template: "product", type: "product-reviews", position: { after: mainId } }], reply: L("Section avis ajoutée : ajoutez-y le bloc de votre application d'avis (seuls de vrais avis s'afficheront).", "Reviews section added: add your reviews app block to it (only real reviews will be shown)."), revert: false };
  }
  if (/situations?|vous reconnaissez|sound familiar/.test(m)) {
    return { ops: [{ op: "add_section", template: "index", type: "situations" }], reply: L("Section « Vous vous reconnaissez ? » ajoutée avec trois cartes à rédiger.", "\"Sound familiar?\" section added with three cards to write."), revert: false };
  }
  return null;
}

export { mix, withLightness, contrast };
