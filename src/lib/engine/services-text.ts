/**
 * Vocabulaire et textes de base des entreprises de services (project.business === "services") :
 * artisans, salons, cabinets, coachs, restaurants, agences… Partagé par les moteurs de texte
 * locaux (site, marque, signatures, publications, annonces). Rien n'est inventé : tarifs, durées,
 * zone, horaires et coordonnées ne sont repris que s'ils ont été saisis ; sinon un espace réservé
 * « [À compléter : …] » (« [To complete: …] ») reste visible. Langue : celle des contenus (C).
 */
import { C } from "../i18n-server";
import { isServiceSector, type BusinessType, type ProductProfile, type ServiceItem, type ServiceProfile, type ServiceSectorId } from "../project-types";
import type { DirectionId } from "../theme/directions";
import type { SymbolKind } from "../media/logo";

/** Ce dont les moteurs ont besoin pour savoir qu'il s'agit d'une entreprise de services. */
export type BusinessInfo = { business?: BusinessType; services?: ServiceProfile };

export const isServicesBusiness = (b?: BusinessInfo | null): b is BusinessInfo & { business: "services" } => b?.business === "services";

/** Inconnue visible, dans la langue des contenus. */
export const unknownText = (fr: string, en: string) => C(`[À compléter : ${fr}]`, `[To complete: ${en}]`);

/** Le texte cite-t-il déjà la zone (« Plombier à Lyon » et « Lyon et alentours ») ? */
export function areaMentioned(text: string, area: string): boolean {
  const head = area.trim().split(/[\s,(/]+/)[0]?.toLowerCase() ?? "";
  return !!head && head.length > 2 && text.toLowerCase().includes(head);
}

/** « de Lyon », « d'Équerre » : préposition « de » élidée devant une voyelle (français) ; « of »/« at » n'en a pas besoin. */
export const deName = (name: string) => C(/^[aeiouyhàâäéèêëîïôöûüœ]/i.test(name) ? `d'${name}` : `de ${name}`, name);

/** Secteur de services du projet, s'il est connu. */
export function serviceSector(product: Pick<ProductProfile, "sector">): ServiceSectorId | null {
  return isServiceSector(product.sector) ? product.sector : null;
}

type SectorText = {
  eyebrow: [string, string];
  about: [string, string];
  gallery: [string, string];
  /** L'activité se déplace chez le client (zone d'intervention) plutôt qu'elle ne reçoit (adresse). */
  mobile: boolean;
  /** Réalisations visibles (avant / après possible avec de vraies photos). */
  showcase: boolean;
  direction: DirectionId;
  symbol: SymbolKind;
  names: [string[], string[]];
  forms: [(w: string) => string[], (w: string) => string[]];
  lines: [string[], string[]];
};

const T: Record<ServiceSectorId | "autre", SectorText> = {
  autre: {
    eyebrow: ["Prestations", "Services"],
    about: ["Notre façon de travailler", "How we work"],
    gallery: ["En images", "Gallery"],
    mobile: false,
    showcase: false,
    direction: "atelier",
    symbol: "spark",
    names: [["Repère", "Relais", "Atelier", "Boussole", "Clarté", "Ancrage", "Cap", "Trait"], ["Landmark", "Relay", "Compass", "Clarity", "Anchor", "Bearing", "Keystone", "Line"]],
    forms: [(w) => [w, `${w} Services`, `Atelier ${w}`], (w) => [w, `${w} Services`, `${w} Studio`]],
    lines: [["À votre service, simplement.", "Votre projet, entre de bonnes mains.", "Un savoir-faire à votre écoute."], ["At your service, simply.", "Your project, in good hands.", "Expertise that listens."]],
  },
  batiment: {
    eyebrow: ["Artisan", "Trades"],
    about: ["Un métier, des chantiers", "A trade, real projects"],
    gallery: ["Nos réalisations", "Our work"],
    mobile: true,
    showcase: true,
    direction: "brut",
    symbol: "arch",
    names: [["Équerre", "Aplomb", "Niveau", "Charpente", "Truelle", "Clé de Voûte", "Chantier", "Mortier"], ["Plumb", "Level", "Keystone", "Trowel", "Beam", "Square", "Rafter", "Mortar"]],
    forms: [(w) => [w, `${w} Rénovation`, `Atelier ${w}`, `${w} Services`], (w) => [w, `${w} Renovation`, `${w} Works`, `${w} Services`]],
    lines: [["Réparer, rénover, construire.", "Votre projet, pas à pas.", "Le savoir-faire, près de chez vous."], ["Repair, renovate, build.", "Your project, step by step.", "Skilled work, close to home."]],
  },
  bienetre: {
    eyebrow: ["Beauté & bien-être", "Beauty & wellness"],
    about: ["Un lieu pensé pour vous", "A place designed for you"],
    gallery: ["En images", "Gallery"],
    mobile: false,
    showcase: true,
    direction: "atelier",
    symbol: "drop",
    names: [["Rituel", "Sérénité", "Velours", "Cocon", "Douceur", "Bulle", "Lumière", "Nacre"], ["Ritual", "Serene", "Velvet", "Cocoon", "Bloom", "Glow", "Haven", "Pearl"]],
    forms: [(w) => [w, `Institut ${w}`, `Maison ${w}`, `Studio ${w}`], (w) => [w, `${w} Beauty`, `${w} Studio`, `The ${w} Room`]],
    lines: [["Prendre soin de vous, simplement.", "Un moment pour soi.", "Votre parenthèse beauté."], ["Taking care of you, simply.", "A moment for yourself.", "Your beauty break."]],
  },
  sante: {
    eyebrow: ["Santé", "Health"],
    about: ["Un accompagnement attentif", "Attentive, personal care"],
    gallery: ["Le cabinet en images", "The practice"],
    mobile: false,
    showcase: false,
    direction: "clinique",
    symbol: "leaf",
    names: [["Équilibre", "Mouvement", "Souffle", "Ancrage", "Vitalité", "Axe", "Harmonie", "Racines"], ["Balance", "Motion", "Breath", "Anchor", "Vital", "Axis", "Harmony", "Roots"]],
    forms: [(w) => [w, `Cabinet ${w}`, `Espace ${w}`], (w) => [w, `${w} Clinic`, `${w} Health`, `${w} Practice`]],
    lines: [["Votre santé, avec attention.", "Un accompagnement à votre écoute.", "Prendre soin, ensemble."], ["Your health, with care.", "Care that listens.", "Looking after you, together."]],
  },
  coaching: {
    eyebrow: ["Coaching", "Coaching"],
    about: ["Avancer ensemble", "Moving forward together"],
    gallery: ["Les séances en images", "Sessions in pictures"],
    mobile: false,
    showcase: false,
    direction: "elan",
    symbol: "wave",
    names: [["Élan", "Impulsion", "Cap", "Déclic", "Énergie", "Rebond", "Allure", "Souffle"], ["Stride", "Spark", "Drive", "Momentum", "Pulse", "Rise", "Pace", "Core"]],
    forms: [(w) => [w, `Studio ${w}`, `${w} Coaching`], (w) => [w, `${w} Coaching`, `${w} Studio`, `${w} Training`]],
    lines: [["Avancer à votre rythme.", "Bouger, progresser, ensemble.", "Votre énergie, accompagnée."], ["Progress at your own pace.", "Move, improve, together.", "Your energy, coached."]],
  },
  conseil: {
    eyebrow: ["Conseil", "Advisory"],
    about: ["Comprendre avant de conseiller", "Understand first, then advise"],
    gallery: ["Le cabinet en images", "The firm"],
    mobile: false,
    showcase: false,
    direction: "clinique",
    symbol: "facet",
    names: [["Boussole", "Clarté", "Repère", "Pilier", "Jalon", "Méridien", "Socle", "Cap"], ["Compass", "Clarity", "Landmark", "Pillar", "Meridian", "Keel", "Bearing", "Ledger"]],
    forms: [(w) => [w, `Cabinet ${w}`, `${w} Conseil`], (w) => [w, `${w} Advisory`, `${w} Consulting`]],
    lines: [["Des décisions éclairées.", "Vos questions, des réponses claires.", "Avancer avec méthode."], ["Clearer decisions.", "Your questions, clear answers.", "Moving forward, with method."]],
  },
  restauration: {
    eyebrow: ["Restaurant", "Restaurant"],
    about: ["Notre table", "Our table"],
    gallery: ["En images", "Gallery"],
    mobile: false,
    showcase: false,
    direction: "gourmand",
    symbol: "cup",
    names: [["Comptoir", "Tablée", "Marmite", "Fourneau", "Assiette", "Bistrot", "Saveur", "Guinguette"], ["Counter", "Table", "Skillet", "Hearth", "Plate", "Larder", "Supper", "Pantry"]],
    forms: [(w) => [w, `Maison ${w}`, `${w} & Co`], (w) => [w, `${w} Kitchen`, `The ${w}`, `${w} House`]],
    lines: [["Une table, un moment.", "Le goût de se retrouver.", "Venez comme vous êtes."], ["A table, a moment.", "A taste for getting together.", "Come as you are."]],
  },
  immobilier: {
    eyebrow: ["Immobilier", "Real estate"],
    about: ["Votre projet, notre métier", "Your project, our job"],
    gallery: ["En images", "Gallery"],
    mobile: true,
    showcase: false,
    direction: "galerie",
    symbol: "arch",
    names: [["Seuil", "Clé", "Adresse", "Façade", "Pierre", "Toit", "Quartier", "Demeure"], ["Threshold", "Key", "Address", "Facade", "Stone", "Roof", "Quarter", "Dwell"]],
    forms: [(w) => [w, `${w} Immobilier`, `Agence ${w}`], (w) => [w, `${w} Realty`, `${w} Homes`, `${w} Property`]],
    lines: [["Votre projet immobilier, accompagné.", "Trouver sa place.", "D'une adresse à l'autre."], ["Your property project, guided.", "Find your place.", "From one address to the next."]],
  },
  formation: {
    eyebrow: ["Formation", "Learning"],
    about: ["Notre façon d'enseigner", "How we teach"],
    gallery: ["En images", "Gallery"],
    mobile: false,
    showcase: false,
    direction: "pop",
    symbol: "spark",
    names: [["Déclic", "Savoir", "Tremplin", "Étincelle", "Craie", "Cahier", "Méthode", "Ardoise"], ["Spark", "Chalk", "Springboard", "Notebook", "Method", "Slate", "Bright", "Lantern"]],
    forms: [(w) => [w, `Académie ${w}`, `Atelier ${w}`], (w) => [w, `${w} Academy`, `${w} Learning`, `${w} Lessons`]],
    lines: [["Apprendre à son rythme.", "Comprendre, pratiquer, progresser.", "Le déclic, pas à pas."], ["Learn at your own pace.", "Understand, practice, progress.", "Step by step, it clicks."]],
  },
  evenementiel: {
    eyebrow: ["Événements", "Events"],
    about: ["Raconter vos moments", "Telling your stories"],
    gallery: ["Nos réalisations", "Our work"],
    mobile: true,
    showcase: true,
    direction: "joaillerie",
    symbol: "sun",
    names: [["Instant", "Reflet", "Écrin", "Confetti", "Souvenir", "Lumière", "Fête", "Prisme"], ["Moment", "Frame", "Glimmer", "Confetti", "Keepsake", "Light", "Fete", "Prism"]],
    forms: [(w) => [w, `Studio ${w}`, `Atelier ${w}`], (w) => [w, `${w} Studio`, `${w} Events`]],
    lines: [["Vos moments, mis en lumière.", "Chaque instant compte.", "Des souvenirs à garder."], ["Your moments, in their best light.", "Every moment counts.", "Memories worth keeping."]],
  },
  domicile: {
    eyebrow: ["À domicile", "At home"],
    about: ["Présents au quotidien", "Here for everyday life"],
    gallery: ["En images", "Gallery"],
    mobile: true,
    showcase: false,
    direction: "terroir",
    symbol: "sun",
    names: [["Foyer", "Relais", "Entraide", "Cocon", "Présence", "Repos", "Coup de Main", "Quiétude"], ["Hearth", "Relay", "Helping Hand", "Cocoon", "Homely", "Ease", "Kindly", "Nest"]],
    forms: [(w) => [w, `${w} Services`, `${w} & Co`], (w) => [w, `${w} Care`, `${w} Services`, `${w} & Co`]],
    lines: [["Du temps pour l'essentiel.", "Un coup de main au quotidien.", "Chez vous, à vos côtés."], ["Time for what matters.", "A helping hand, every day.", "At home, by your side."]],
  },
  agence: {
    eyebrow: ["Studio", "Studio"],
    about: ["Notre façon de travailler", "How we work"],
    gallery: ["Nos réalisations", "Our work"],
    mobile: false,
    showcase: true,
    direction: "nocturne",
    symbol: "orbit",
    names: [["Pixel", "Signal", "Onde", "Prisme", "Vecteur", "Trame", "Orbite", "Studio Nord"], ["Pixel", "Signal", "Wave", "Prism", "Vector", "Grid", "Orbit", "North"]],
    forms: [(w) => [w, `Studio ${w}`, `Agence ${w}`], (w) => [w, `${w} Studio`, `${w} Agency`]],
    lines: [["Des idées qui prennent forme.", "Votre projet, en ligne.", "Du concept au lancement."], ["Ideas that take shape.", "Your project, online.", "From concept to launch."]],
  },
};

/** Textes du secteur (repli neutre si le secteur n'est pas un secteur de services). */
function sector(product: Pick<ProductProfile, "sector">): SectorText {
  return T[serviceSector(product) ?? "autre"];
}
const pick2 = (x: [string, string]) => C(x[0], x[1]);

export const serviceDirection = (product: Pick<ProductProfile, "sector">): DirectionId => sector(product).direction;
export const serviceSymbol = (product: Pick<ProductProfile, "sector">): SymbolKind => sector(product).symbol;
export const serviceEyebrow = (product: Pick<ProductProfile, "sector" | "category">) => product.category?.trim() || pick2(sector(product).eyebrow);
export const serviceAboutHeading = (product: Pick<ProductProfile, "sector">) => pick2(sector(product).about);
export const serviceGalleryHeading = (product: Pick<ProductProfile, "sector">) => pick2(sector(product).gallery);
export const serviceShowcase = (product: Pick<ProductProfile, "sector">) => sector(product).showcase;
export const serviceIsMobile = (product: Pick<ProductProfile, "sector">) => sector(product).mobile;

/** Noms proposés pour une entreprise de services (formes adaptées au métier : cabinet, institut, studio…). */
export function serviceNames(product: Pick<ProductProfile, "sector">, seed: string): string[] {
  const s = sector(product);
  const words = C(s.names[0], s.names[1]);
  const forms = C(s.forms[0], s.forms[1]);
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  for (let i = 0; out.length < 5 && i < 40; i++) {
    const w = words[(h + i * 3) % words.length];
    const fs = forms(w).filter((f) => f.length <= 20 && !/^(\w+) \1\b/.test(f));
    const f = fs[(h >>> (i % 8)) % fs.length];
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}

/** Signatures du secteur (courtes, sans promesse chiffrée ni garantie). */
export function serviceTaglines(product: Pick<ProductProfile, "sector" | "category">, profile: ServiceProfile | undefined, brandName?: string): string[] {
  const s = sector(product);
  const out = [...C(s.lines[0], s.lines[1])];
  const area = profile?.area?.trim();
  const cat = product.category?.trim();
  // Métier et lieu : une signature factuelle tirée des informations saisies.
  if (cat && area && cat.length + area.length < 60) out.unshift(C(`${cap(cat)}, ${area}.`, `${cap(cat)}, ${area}.`));
  if (brandName) out.push(C(`${brandName}, à votre écoute.`, `${brandName}, here for you.`));
  return [...new Set(out)];
}
const cap = (x: string) => x.charAt(0).toLocaleUpperCase() + x.slice(1);

// ---------------------------------------------------------------- contact et rendez-vous

/** Bouton principal selon la façon dont le client réserve ou contacte. */
export function contactCta(mode: ServiceProfile["contactMode"] | undefined): string {
  switch (mode) {
    case "booking":
      return C("Prendre rendez-vous", "Book an appointment");
    case "quote":
      return C("Demander un devis", "Request a quote");
    case "call":
      return C("Appeler", "Call us");
    default:
      return C("Nous contacter", "Contact us");
  }
}

/** Phrase factuelle : comment prendre rendez-vous ou demander un devis (d'après les seules coordonnées saisies). */
export function howToBook(profile: ServiceProfile | undefined): string {
  const p = profile;
  const phone = p?.phone?.trim();
  const email = p?.email?.trim();
  const url = p?.bookingUrl?.trim();
  const reach = [phone ? C(`par téléphone au ${phone}`, `by phone at ${phone}`) : "", email ? C(`par e-mail à ${email}`, `by email at ${email}`) : ""].filter(Boolean).join(C(" ou ", " or "));
  switch (p?.contactMode) {
    case "booking":
      // Le lien lui-même est porté par le bouton : pas d'adresse web en clair dans le texte.
      return url ? C("Choisissez votre créneau en ligne, en quelques clics", "Pick a time slot online in a few clicks") + (reach ? C(`. Vous pouvez aussi nous joindre ${reach}.`, `. You can also reach us ${reach}.`) : "") : C(`Prenez rendez-vous ${reach || "via le formulaire de contact"}.`, `Book an appointment ${reach || "through the contact form"}.`);
    case "quote":
      return C(`Décrivez votre besoin via le formulaire de contact${reach ? ` ou ${reach}` : ""} pour recevoir un devis.`, `Describe what you need through the contact form${reach ? ` or ${reach}` : ""} to get a quote.`);
    case "call":
      return phone ? C(`Appelez-nous au ${phone}.`, `Call us at ${phone}.`) + (email ? C(` Ou écrivez-nous à ${email}.`, ` Or email us at ${email}.`) : "") : C(`Appelez-nous au ${unknownText("numéro de téléphone", "phone number")}.`, `Call us at ${unknownText("numéro de téléphone", "phone number")}.`);
    default:
      return C(`Écrivez-nous via le formulaire de contact${reach ? ` ou ${reach}` : ""}.`, `Write to us through the contact form${reach ? ` or ${reach}` : ""}.`);
  }
}

/** Une prestation sur une ligne : nom, durée et tarif seulement s'ils ont été donnés. */
export function serviceLine(s: ServiceItem): string {
  const extra = [s.duration?.trim(), s.price?.trim()].filter(Boolean).join(" · ");
  return `${s.name}${extra ? ` (${extra})` : ""}`;
}

/** Informations pratiques (zone ou adresse, horaires, contact) avec espaces réservés pour les inconnues. */
export function practicalInfo(product: Pick<ProductProfile, "sector">, profile: ServiceProfile | undefined): { label: string; value: string }[] {
  const p = profile;
  const rows: { label: string; value: string }[] = [];
  const mobile = serviceIsMobile(product);
  if (p?.area?.trim() || mobile) rows.push({ label: C("Zone d'intervention", "Service area"), value: p?.area?.trim() || unknownText("zone d'intervention", "service area") });
  if (p?.address?.trim() || !mobile) rows.push({ label: C("Adresse", "Address"), value: p?.address?.trim() || unknownText("adresse d'accueil", "address") });
  rows.push({ label: C("Horaires", "Opening hours"), value: p?.hours?.trim() || unknownText("horaires", "opening hours") });
  if (p?.phone?.trim()) rows.push({ label: C("Téléphone", "Phone"), value: p.phone.trim() });
  if (p?.email?.trim()) rows.push({ label: C("E-mail", "Email"), value: p.email.trim() });
  if (!p?.phone?.trim() && !p?.email?.trim()) rows.push({ label: C("Contact", "Contact"), value: unknownText("téléphone ou e-mail", "phone or email") });
  rows.push({ label: C("Rendez-vous", "Appointments"), value: howToBook(p) });
  return rows;
}

/** Tarifs : uniquement ceux saisis, sinon espace réservé (jamais de prix inventé). */
export function pricesText(profile: ServiceProfile | undefined): string {
  const priced = (profile?.services ?? []).filter((s) => s.price?.trim());
  if (!priced.length) return profile?.contactMode === "quote" ? C("Chaque demande fait l'objet d'un devis. ", "Every request gets its own quote. ") + unknownText("modalités du devis", "quote terms") : unknownText("tarifs des prestations", "service rates");
  return priced.map((s) => C(`${s.name} : ${s.price!.trim()}`, `${s.name}: ${s.price!.trim()}`)).join(C(" ; ", "; ")) + ".";
}

/** Conditions de prestation (à la place des conditions de vente) : trame en espaces réservés, à valider par le professionnel. */
export function serviceTermsHtml(profile: ServiceProfile | undefined): string {
  const rows: [string, string][] = [
    [C("Prestations", "Services"), (profile?.services ?? []).length ? (profile!.services.map((s) => serviceLine(s)).join(C(" ; ", "; ")) + ".") : unknownText("liste des prestations", "list of services")],
    [C("Tarifs", "Rates"), pricesText(profile)],
    [C("Devis et réservation", "Quotes and booking"), unknownText("conditions de devis, d'acompte et de confirmation", "quote, deposit and confirmation terms")],
    [C("Annulation et report", "Cancellation and rescheduling"), unknownText("délai et conditions d'annulation", "cancellation notice and terms")],
    [C("Paiement", "Payment"), unknownText("moyens et échéances de paiement", "payment methods and due dates")],
    [C("Responsabilité et assurance", "Liability and insurance"), unknownText("assurance professionnelle et responsabilités", "professional insurance and liability")],
  ];
  return rows.map(([h, t]) => `<p><strong>${h}</strong><br>${t}</p>`).join("");
}
