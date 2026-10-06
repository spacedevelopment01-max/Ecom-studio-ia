/**
 * Aide à la description d'une activité (site de services), sans IA : le client répond à quelques questions courtes
 * et le studio en tire une description complète et structurée, celle que le moteur et l'IA comprennent le mieux
 * (métier et zone en première ligne, prestations en liste, clientèle, points forts, ton, ce qu'il faut éviter).
 * Rien n'est inventé : seules les réponses du client sont reprises ; ce qui manque est signalé, jamais comblé.
 */
import type { Lang } from "./i18n";

export type BriefAnswers = {
  trade: string;
  area: string;
  /** Une prestation par ligne (« Débosselage — 1 h — à partir de 80 € » : durée et prix seulement si le client les donne). */
  services: string;
  clients: string[];
  /** Pourquoi les clients vous contactent (une raison par ligne). */
  needs: string;
  /** Comment se passe une prestation, une étape par ligne. */
  steps: string;
  delay: string;
  quote: string;
  cancel: string;
  /** Questions fréquentes, une par ligne : « Question ? Réponse » (réponse facultative). */
  faq: string;
  strengths: string[];
  since: string;
  extra: string;
  /** Diplômes, labels, assurances, garanties (indiqués par le client). */
  proofs: string;
  goals: string[];
  look: string[];
  tone: string[];
  avoid: string;
};

export const emptyBrief = (): BriefAnswers => ({ trade: "", area: "", services: "", clients: [], needs: "", steps: "", delay: "", quote: "", cancel: "", faq: "", strengths: [], since: "", extra: "", proofs: "", goals: [], look: [], tone: [], avoid: "" });

type Bi = { fr: string; en: string };
export const CLIENT_CHOICES: Bi[] = [
  { fr: "Particuliers", en: "Individuals" },
  { fr: "Professionnels", en: "Businesses" },
  { fr: "Assurances", en: "Insurers" },
  { fr: "Collectivités", en: "Public bodies" },
];
export const STRENGTH_CHOICES: Bi[] = [
  { fr: "Devis gratuit", en: "Free quote" },
  { fr: "Disponible 7j/7", en: "Available 7 days a week" },
  { fr: "Intervention rapide", en: "Fast response" },
  { fr: "Travail garanti", en: "Guaranteed work" },
  { fr: "Sur rendez-vous", en: "By appointment" },
  { fr: "Paiement en plusieurs fois", en: "Payment in instalments" },
];
export const GOAL_CHOICES: Bi[] = [
  { fr: "Recevoir des demandes de devis", en: "Get quote requests" },
  { fr: "Faire prendre rendez-vous", en: "Get bookings" },
  { fr: "Recevoir des appels", en: "Get phone calls" },
  { fr: "Montrer nos réalisations", en: "Show our work" },
  { fr: "Rassurer avant un premier contact", en: "Reassure before a first contact" },
  { fr: "Être trouvés sur Google dans notre zone", en: "Be found on Google locally" },
];
export const LOOK_CHOICES: Bi[] = [
  { fr: "Sobre et épuré", en: "Clean and minimal" },
  { fr: "Chaleureux", en: "Warm" },
  { fr: "Premium", en: "Premium" },
  { fr: "Moderne et technique", en: "Modern and technical" },
  { fr: "Artisanal et authentique", en: "Crafted and authentic" },
  { fr: "Nature et apaisant", en: "Natural and calming" },
  { fr: "Énergique et coloré", en: "Energetic and colourful" },
];
export const TONE_CHOICES: Bi[] = [
  { fr: "Chaleureux et proche", en: "Warm and friendly" },
  { fr: "Expert et rassurant", en: "Expert and reassuring" },
  { fr: "Haut de gamme", en: "Premium" },
  { fr: "Simple et direct", en: "Plain and direct" },
];

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s\-–—•*·:]+|[\s.;:,]+$/g, "").trim();
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s);
const list = (s: string) => s.split(/\n|[,;]/).map(clean).filter(Boolean);
const join = (xs: string[], lang: Lang) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "et"} ${xs[xs.length - 1]}`);

/** Rubriques de la description structurée (libellés reconnus en français et en anglais). */
export const BRIEF_SECTIONS = [
  { key: "services", fr: "Prestations", en: "Services" },
  { key: "clients", fr: "Clientèle", en: "Customers" },
  { key: "needs", fr: "Pourquoi nos clients nous contactent", en: "Why customers contact us" },
  { key: "steps", fr: "Comment ça se passe", en: "How it works" },
  { key: "delay", fr: "Délai habituel", en: "Usual lead time" },
  { key: "quote", fr: "Devis et tarifs", en: "Quotes and rates" },
  { key: "cancel", fr: "Annulation et report", en: "Cancellation and rescheduling" },
  { key: "faq", fr: "Questions fréquentes", en: "Frequently asked questions" },
  { key: "strengths", fr: "Ce qui nous distingue", en: "What sets us apart" },
  { key: "proofs", fr: "Qualifications et garanties", en: "Qualifications and guarantees" },
  { key: "goals", fr: "Objectif du site", en: "Website goal" },
  { key: "look", fr: "Ambiance souhaitée", en: "Desired look" },
  { key: "tone", fr: "Ton souhaité", en: "Desired tone" },
  { key: "avoid", fr: "À éviter", en: "To avoid" },
] as const;
export type BriefSection = (typeof BRIEF_SECTIONS)[number]["key"];

const lines = (s: string) => s.split(/\n/).map(clean).filter(Boolean);
const low = (s: string) => s.charAt(0).toLocaleLowerCase("fr-FR") + s.slice(1);

/**
 * Description complète et structurée tirée des réponses (vide si rien n'est rempli) : une rubrique par sujet,
 * listes à puces pour ce qui en compte plusieurs. C'est ce que lisent le moteur du studio et l'IA ; rien n'est ajouté.
 */
export function composeBrief(a: BriefAnswers, lang: Lang): string {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const label = (k: BriefSection) => { const x = BRIEF_SECTIONS.find((y) => y.key === k)!; return lang === "en" ? x.en : x.fr; };
  const out: string[] = [];
  const trade = clean(a.trade);
  const area = clean(a.area);
  if (trade || area) out.push(`${cap(trade || t("Activité", "Business"))}${area ? ` ${t("à", "in")} ${area}` : ""}.`);
  const block = (k: BriefSection, items: string[]) => { if (items.length) out.push("", `${label(k)} :`, ...items.map((s) => `- ${cap(s)}`)); };
  const one = (k: BriefSection, v: string) => { const x = clean(v); if (x) out.push("", `${label(k)} : ${cap(x)}.`); };
  // Une prestation par ligne ; une ligne sans durée ni prix peut aussi en lister plusieurs, séparées par des virgules.
  block("services", lines(a.services).flatMap((l) => (/—|€|\d\s?(?:h|min)\b/.test(l) ? [l] : list(l))));
  if (a.clients.length) out.push("", `${label("clients")} : ${join(a.clients.map((c) => c.toLocaleLowerCase(lang === "en" ? "en-GB" : "fr-FR")), lang)}.`);
  block("needs", lines(a.needs));
  block("steps", lines(a.steps));
  one("delay", a.delay);
  one("quote", a.quote);
  one("cancel", a.cancel);
  block("faq", lines(a.faq));
  const since = clean(a.since);
  const strengths = [...a.strengths, ...(since ? [/^\d{4}$/.test(since) ? t(`Depuis ${since}`, `Since ${since}`) : since] : []), ...list(a.extra)];
  if (strengths.length) out.push("", `${label("strengths")} : ${join(strengths.map((s, i) => (i ? low(s) : s)), lang)}.`);
  block("proofs", lines(a.proofs));
  if (a.goals.length) out.push("", `${label("goals")} : ${join(a.goals.map((s, i) => (i ? low(s) : s)), lang)}.`);
  if (a.look.length) out.push("", `${label("look")} : ${join(a.look.map((s, i) => (i ? low(s) : s)), lang)}.`);
  if (a.tone.length) out.push("", `${label("tone")} : ${join(a.tone.map((s) => s.toLocaleLowerCase("fr-FR")), lang)}.`);
  one("avoid", a.avoid);
  return out.join("\n").replace(/^\n+/, "");
}

export type ParsedBrief = { headline: string; sections: Partial<Record<BriefSection, string[]>> };

/**
 * Lecture d'une description structurée (celle de l'aide, ou écrite à la main avec les mêmes rubriques).
 * null si le texte n'a aucune rubrique reconnue : la description libre est alors lue comme avant.
 */
export function parseBrief(text: string): ParsedBrief | null {
  const rows = text.split(/\n/).map((l) => l.trim());
  const headerOf = (l: string) => {
    const m = l.match(/^([^:]{3,60}?)\s*:\s*(.*)$/);
    if (!m) return null;
    const name = m[1].trim().toLowerCase();
    const sec = BRIEF_SECTIONS.find((x) => x.fr.toLowerCase() === name || x.en.toLowerCase() === name);
    return sec ? { key: sec.key as BriefSection, rest: m[2].trim() } : null;
  };
  if (!rows.some((l) => headerOf(l))) return null;
  const sections: ParsedBrief["sections"] = {};
  let headline = "";
  let cur: BriefSection | null = null;
  for (const l of rows) {
    if (!l) continue;
    const h = headerOf(l);
    if (h) {
      cur = h.key;
      sections[cur] = h.rest ? [clean(h.rest)] : [];
      continue;
    }
    if (cur && /^[-–•*·]|^\d+[.)]\s/.test(l)) sections[cur]!.push(clean(l.replace(/^\d+[.)]\s*/, "")));
    else if (!cur && !headline) headline = clean(l);
    else if (cur) sections[cur]!.push(clean(l));
  }
  for (const k of Object.keys(sections) as BriefSection[]) sections[k] = sections[k]!.filter(Boolean);
  return { headline, sections };
}

/** Premiers éléments repris d'une description déjà écrite (pour préremplir les questions). */
export function briefFromText(text: string): Partial<BriefAnswers> {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-–•*·]\s*/.test(l)).map(clean);
  const first = (lines.find((l) => !/^[-–•*·]/.test(l)) ?? "").split(/[,;]|\.\s+|\.$/)[0] ?? "";
  const m = first.match(/^(.*?)\s+(?:à|sur|autour de|in|around)\s+([A-ZÀ-Ý][\p{L}'’ -]+)$/u);
  const segs = lines.filter((l) => !/^[-–•*·]/.test(l)).flatMap((l) => l.split(/[,;]/)).map(clean).filter(Boolean).slice(1);
  return {
    trade: clean(m ? m[1] : first),
    area: m ? clean(m[2]) : "",
    services: (bullets.length ? bullets : segs.filter((s) => s.length <= 60 && !/devis|quote|7\s?j|24\s?h|depuis|since/i.test(s))).join("\n"),
  };
}

/**
 * La description indique-t-elle une zone ? Ville après « à / sur / dans / autour de… » (avec ou sans majuscule),
 * code postal ou département, rayon (« 30 km »), mots de zone (« alentours », « région »…), ou nom propre
 * en milieu de phrase (« Carrossier Mâcon »).
 */
export function hasArea(text: string): boolean {
  const s = text.replace(/\s+/g, " ");
  if (/\b\d{5}\b|\b\d{1,3}\s?km\b|\b(?:alentours|environs|aux? alentours|région|département|secteur|agglomération|métropole|canton|toute la france|france entière|nearby|surrounding|county|nationwide|area)\b/i.test(s)) return true;
  // Ville avec majuscule après une préposition : « à Mâcon », « en Saône-et-Loire », « in Leeds ».
  if (/(?:^|[\s,(])(?:à|sur|dans|autour de|près de|vers|en|in|around|across|near)\s+\p{Lu}/u.test(s)) return true;
  // Ville sans majuscule : « à mâcon » (hors « à domicile », « à distance », « à la demande »…).
  if (/(?:^|[\s,(])(?:à|sur|autour de|près de|in|around|near)\s+(?!(?:domicile|distance|la|le|les|l'|un|une|des|votre|vos|notre|nos|partir|toute|home|your|our|the|a)\b)\p{Ll}[\p{L}'’-]{2,}/u.test(s)) return true;
  // Nom propre au milieu d'une phrase (pas en début de phrase ni après une ponctuation) : « Carrossier peintre Mâcon ».
  return /[\p{Ll}\d]\s+[\p{Lu}][\p{Ll}'’-]{2,}/u.test(s);
}

export type BriefCheck = { key: "trade" | "services" | "area" | "clients" | "strengths" | "tone"; ok: boolean; fr: string; en: string };

/** Ce que la description couvre déjà (repères simples, pour guider la rédaction). */
export function briefChecklist(text: string, opts: { area?: string } = {}): BriefCheck[] {
  const s = text.trim();
  const lines = s.split(/\n+/).filter(Boolean);
  const bullets = lines.filter((l) => /^\s*[-–•*·]/.test(l)).length;
  const segments = s.split(/[,;\n]|\.\s+/).map((x) => x.trim()).filter((x) => x.length > 2).length;
  return [
    { key: "trade", ok: s.length >= 8, fr: "Votre métier", en: "Your trade" },
    { key: "services", ok: bullets >= 2 || segments >= 3, fr: "Vos prestations", en: "Your services" },
    { key: "area", ok: !!opts.area?.trim() || hasArea(s), fr: "Votre zone", en: "Your area" },
    { key: "clients", ok: /particuliers?|professionnels?|entreprises?|assurances?|collectivit|clientèle|individuals?|businesses|insurers?|customers?|clients?/i.test(s), fr: "Votre clientèle", en: "Your customers" },
    { key: "strengths", ok: /devis|garanti|depuis|\bans\b|certifi|agréé|qualifi|label|rapide|7\s?j|24\s?h|distingue|quote|guarantee|since|years|certified|licensed|fast|sets us apart/i.test(s), fr: "Ce qui vous distingue", en: "What sets you apart" },
    { key: "tone", ok: /\bton\b|chaleureu|rassurant|haut de gamme|premium|simple et direct|tone|warm|friendly|reassuring/i.test(s), fr: "Le ton souhaité", en: "Desired tone" },
  ];
}
