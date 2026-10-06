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
  services: string;
  clients: string[];
  strengths: string[];
  since: string;
  extra: string;
  tone: string[];
  avoid: string;
};

export const emptyBrief = (): BriefAnswers => ({ trade: "", area: "", services: "", clients: [], strengths: [], since: "", extra: "", tone: [], avoid: "" });

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

/** Description structurée tirée des réponses (vide si rien n'est rempli). */
export function composeBrief(a: BriefAnswers, lang: Lang): string {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const out: string[] = [];
  const trade = clean(a.trade);
  const area = clean(a.area);
  if (trade || area) out.push(`${cap(trade || t("Activité", "Business"))}${area ? ` ${t("à", "in")} ${area}` : ""}.`);
  const services = list(a.services);
  if (services.length) out.push(`${t("Prestations", "Services")} :`, ...services.map((s) => `- ${cap(s)}`));
  if (a.clients.length) out.push(`${t("Clientèle", "Customers")} : ${join(a.clients.map((c) => c.toLocaleLowerCase(lang === "en" ? "en-GB" : "fr-FR")), lang)}.`);
  const since = clean(a.since);
  const strengths = [...a.strengths, ...(since ? [/^\d{4}$/.test(since) ? t(`Depuis ${since}`, `Since ${since}`) : since] : []), ...list(a.extra)];
  if (strengths.length) out.push(`${t("Ce qui nous distingue", "What sets us apart")} : ${join(strengths.map((s, i) => (i ? s.charAt(0).toLocaleLowerCase("fr-FR") + s.slice(1) : s)), lang)}.`);
  if (a.tone.length) out.push(`${t("Ton souhaité", "Desired tone")} : ${join(a.tone.map((s) => s.toLocaleLowerCase("fr-FR")), lang)}.`);
  const avoid = clean(a.avoid);
  if (avoid) out.push(`${t("À éviter", "To avoid")} : ${avoid}.`);
  return out.join("\n");
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
