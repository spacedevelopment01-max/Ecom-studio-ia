/**
 * Rédaction LOCALE des publications (gratuite, forfait Découverte) : pour chaque pilier, une matière vérifiée
 * (fait confirmé, réponse du client, prestation déclarée, zone, horaires…) et une tournure. Les combinaisons
 * matière × tournure ne se répètent pas avant d'être épuisées ; sans matière, la publication porte un
 * « [À compléter : …] » précis — jamais une information inventée. L'IA (niveau 2) peut ensuite réécrire, sous
 * contrôle.
 */
import { cleanTag } from "../engine/social-quality";
import { mainCity } from "../seo-v2/keywords";
import { fold } from "../seo-v2/lang";
import { tradeTopics, topicLabel } from "../seo-v2/trade-topics";
import type { VerifiedFacts } from "../seo-v2/types";
import type { Archetype, Pillar } from "./strategy";

export type Draft = { title: string; caption: string; hashtags: string[]; headline: string; visual: "packshot" | "scene" | "detail" | "creative" | "video"; material: string };

type Atom = { key: string; a: string; b?: string; kind?: "q" | "fact" | "topic" | "svc" | "local" | "brand" | "price" | "offer" };
type Tpl = (x: Atom, c: Ctx) => { hook: string; body?: string; headline: string } | null;
type Ctx = { f: VerifiedFacts; lang: string; city: string | null; brand: string; offer: string; cta: string };

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const low = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const strip = (s: string) => s.trim().replace(/[.!?\s]+$/, "");
/** Titre court du visuel : la partie avant « : » si elle suffit, sinon coupé sur un mot (jamais « des »/« de » final). */
const short = (s: string, n = 40) => {
  let t = cap(strip(s));
  if (t.length <= n) return t;
  const head = t.split(" : ")[0];
  if (head.length >= 6 && head.length <= n) return head;
  t = t.slice(0, n + 1);
  t = t.slice(0, Math.max(t.lastIndexOf(" "), 8));
  return t.replace(/\s+(de|des|du|la|le|les|d'|l'|et|à|au|aux|en|pour|of|the|and|to)$/i, "").replace(/[,;:–-]+$/, "");
};

/** Matière vérifiée d'un pilier (ce qui peut être affirmé). */
export function atomsFor(pillar: Pillar, archetype: Archetype, f: VerifiedFacts, questions: string[]): Atom[] {
  const facts: Atom[] = f.facts.map((x, i) => ({ key: `fact${i}`, a: x.label || x.value, b: x.value, kind: "fact" }));
  const answers: Atom[] = f.answers.map((x, i) => ({ key: `qa${i}`, a: strip(x.q), b: strip(x.a), kind: "q" }));
  const svc: Atom[] = f.services.map((s, i) => ({ key: `svc${i}`, a: s.name, b: s.description || s.price || "", kind: "svc" }));
  const topics: Atom[] = f.services.length ? tradeTopics(["plasterer", "painter", "electrician", "plumber", "tiler", "carpenter", "caterer", "hairdresser"], f.services.map((s) => `${s.name} ${s.description}`).join(" ")).declared.map((t) => ({ key: `topic:${t.key}`, a: topicLabel(t, "fr"), b: "", kind: "topic" as const })) : [];
  const qs: Atom[] = questions.filter((q) => !f.answers.some((a) => fold(a.q).startsWith(fold(strip(q))))).map((q, i) => ({ key: `q${i}`, a: strip(q), kind: "q" }));
  const local: Atom[] = [f.area ? { key: "area", a: f.area, kind: "local" as const } : null, f.contact.hours ? { key: "hours", a: f.contact.hours, kind: "local" as const } : null, f.contact.phone ? { key: "phone", a: f.contact.phone, kind: "local" as const } : null].filter((x): x is NonNullable<typeof x> => !!x);
  const brand: Atom[] = [f.difference ? { key: "diff", a: f.difference, kind: "brand" as const } : null, f.problem ? { key: "problem", a: f.problem, kind: "brand" as const } : null].filter((x): x is NonNullable<typeof x> => !!x);
  const buy: Atom[] = [f.price ? { key: "price", a: f.price, kind: "price" as const } : null, { key: "offer", a: f.offerName, kind: "offer" as const }].filter((x): x is NonNullable<typeof x> => !!x);
  switch (pillar.id) {
    case "savoir-faire":
      return [...topics, ...svc];
    case "conseils":
    case "questions":
      return [...answers, ...qs];
    case "prestations":
    case "carte":
      return svc;
    case "local":
    case "pratique":
    case "quartier":
      return local;
    case "specs":
    case "produit":
      return facts;
    case "demo":
      return [...facts, ...brand];
    case "rituel":
    case "usages":
    case "pedagogie":
    case "expertise":
      return qs;
    case "achat":
    case "conversion":
      return buy;
    case "marque":
    case "coulisses":
    case "cuisine":
      return brand;
    case "evenements":
      return [];
    default:
      return [...facts, ...answers];
  }
}

const TBANK: Record<string, { fr: Tpl[]; en: Tpl[] }> = {
  educate: {
    fr: [
      (x) => ({ hook: `${cap(x.a)} : ce que ça demande vraiment.`, body: x.b ? `${cap(strip(x.b))}.` : "[À compléter : les étapes que vous suivez]", headline: short(x.a) }),
      (x) => ({ hook: `On vous explique : ${low(x.a)}.`, body: x.b ? `${cap(strip(x.b))}.` : "[À compléter : votre explication en deux phrases]", headline: short(`Comprendre : ${x.a}`) }),
      (x) => ({ hook: `Avant de se lancer dans ${low(x.a)}, une question à se poser.`, body: "[À compléter : la question et votre conseil]", headline: short(x.a) }),
      (x) => ({ hook: `${cap(x.a)} en trois points.`, body: "[À compléter : les trois points]", headline: short(`${x.a} en 3 points`) }),
    ],
    en: [
      (x) => ({ hook: `${cap(x.a)}: what it really takes.`, body: x.b ? `${cap(strip(x.b))}.` : "[To complete: the steps you follow]", headline: short(x.a) }),
      (x) => ({ hook: `Explained: ${low(x.a)}.`, body: x.b ? `${cap(strip(x.b))}.` : "[To complete: your two-sentence explanation]", headline: short(x.a) }),
      (x) => ({ hook: `Before starting on ${low(x.a)}, one question to ask.`, body: "[To complete: the question and your advice]", headline: short(x.a) }),
    ],
  },
  engage: {
    fr: [
      (x) => ({ hook: `« ${cap(x.a)} ? » On nous la pose souvent.`, body: x.b ? `${cap(x.b)}.` : "[À compléter : votre réponse]", headline: short(x.a) }),
      (x) => ({ hook: `Question du jour : ${low(x.a)} ?`, body: x.b ? `Notre réponse : ${low(x.b)}.` : "[À compléter : votre réponse]", headline: short(`${x.a} ?`) }),
      (x) => ({ hook: `Vous vous demandez ${low(x.a)} ?`, body: x.b ? `${cap(x.b)}.` : "[À compléter : votre réponse]", headline: short(x.a) }),
    ],
    en: [
      (x) => ({ hook: `"${cap(x.a)}?" We get asked this a lot.`, body: x.b ? `${cap(x.b)}.` : "[To complete: your answer]", headline: short(x.a) }),
      (x) => ({ hook: `Question of the day: ${low(x.a)}?`, body: x.b ? `Our answer: ${low(x.b)}.` : "[To complete: your answer]", headline: short(`${x.a}?`) }),
    ],
  },
  demonstrate: {
    fr: [
      (x) => ({ hook: x.b ? `${cap(x.a)} : ${strip(x.b)}. Et ça se voit.` : `${cap(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x, c) => ({ hook: `${c.offer}, vu de près.`, body: x.b ? `${cap(x.a)} : ${strip(x.b)}.` : `${cap(strip(x.a))}.`, headline: short(x.b ?? x.a) }),
      (x) => ({ hook: `Un détail qui compte : ${low(x.a)}${x.b ? `, ${strip(x.b)}` : ""}.`, body: "", headline: short(x.b ?? x.a) }),
      (x, c) => ({ hook: `Ce que ${c.offer} change au quotidien.`, body: x.b ? `${cap(x.a)} : ${strip(x.b)}.` : `${cap(strip(x.a))}.`, headline: short(x.a) }),
    ],
    en: [
      (x) => ({ hook: x.b ? `${cap(x.a)}: ${strip(x.b)}. And it shows.` : `${cap(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x, c) => ({ hook: `${c.offer}, up close.`, body: x.b ? `${cap(x.a)}: ${strip(x.b)}.` : `${cap(strip(x.a))}.`, headline: short(x.b ?? x.a) }),
      (x) => ({ hook: `A detail that matters: ${low(x.a)}${x.b ? `, ${strip(x.b)}` : ""}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
  },
  sell: {
    fr: [
      (x) => ({ hook: `${cap(strip(x.a))}.`, body: x.b ? `${cap(strip(x.b))}.` : "[À compléter : ce qui rend ce plat ou cette formule particulier]", headline: short(x.a) }),
      (x) => ({ hook: `Cette semaine, on vous parle de ${low(x.a)}.`, body: x.b ? `${cap(strip(x.b))}.` : "[À compléter : le détail qui donne envie]", headline: short(x.a) }),
    ],
    en: [
      (x) => ({ hook: `${cap(strip(x.a))}.`, body: x.b ? `${cap(strip(x.b))}.` : "[To complete: what makes it special]", headline: short(x.a) }),
      (x) => ({ hook: `This week: ${low(x.a)}.`, body: x.b ? `${cap(strip(x.b))}.` : "[To complete: the detail that makes people want it]", headline: short(x.a) }),
    ],
  },
  convert: {
    fr: [
      (x, c) => ({ hook: `${cap(strip(x.a))}${c.city ? ` à ${c.city}` : ""}.`, body: x.b ? `${cap(strip(x.b))}.` : "", headline: short(x.a) }),
      (x, c) => ({ hook: x.key === "price" ? `${c.offer} : ${x.a}.` : `${cap(strip(x.a))} : comment se lancer ?`, body: "", headline: short(x.key === "price" ? x.a : x.a) }),
      (x, c) => ({ hook: `Un projet de ${low(strip(x.a))} ?`, body: c.f.area ? `Nous intervenons : ${c.f.area}.` : "", headline: short(x.a) }),
    ],
    en: [
      (x, c) => ({ hook: `${cap(strip(x.a))}${c.city ? ` in ${c.city}` : ""}.`, body: x.b ? `${cap(strip(x.b))}.` : "", headline: short(x.a) }),
      (x, c) => ({ hook: x.key === "price" ? `${c.offer}: ${x.a}.` : `${cap(strip(x.a))}: how to get started?`, body: "", headline: short(x.a) }),
    ],
  },
  local: {
    fr: [
      (x) => (x.key === "area" ? { hook: `Où intervenons-nous ? ${strip(x.a)}.`, body: "", headline: short(x.a) } : x.key === "hours" ? { hook: `Nos horaires : ${strip(x.a)}.`, body: "", headline: "Nos horaires" } : { hook: `Une question ? Un seul numéro : ${x.a}.`, body: "", headline: x.a }),
      (x, c) => (x.key === "area" ? { hook: `${c.city ? `${c.city} et alentours` : cap(strip(x.a))} : on se déplace.`, body: `Zone : ${strip(x.a)}.`, headline: short(c.city ?? x.a) } : x.key === "hours" ? { hook: `Pour nous joindre : ${strip(x.a)}.`, body: "", headline: "Quand nous joindre" } : { hook: `Le plus simple pour nous joindre : ${x.a}.`, body: "", headline: "Nous appeler" }),
    ],
    en: [
      (x) => (x.key === "area" ? { hook: `Where do we work? ${strip(x.a)}.`, body: "", headline: short(x.a) } : x.key === "hours" ? { hook: `Our hours: ${strip(x.a)}.`, body: "", headline: "Our hours" } : { hook: `A question? One number: ${x.a}.`, body: "", headline: x.a }),
    ],
  },
  brand: {
    fr: [
      (x) => ({ hook: `${cap(strip(x.a))}.`, body: "", headline: short(x.a) }),
      (x, c) => ({ hook: `Pourquoi ${c.brand} ? ${cap(strip(x.a))}.`, body: "", headline: short(x.a) }),
      (_x, c) => ({ hook: `Derrière ${c.brand}, il y a ${"[À compléter : qui, et ce qui vous guide]"}.`, body: "", headline: short(c.brand) }),
    ],
    en: [
      (x) => ({ hook: `${cap(strip(x.a))}.`, body: "", headline: short(x.a) }),
      (x, c) => ({ hook: `Why ${c.brand}? ${cap(strip(x.a))}.`, body: "", headline: short(x.a) }),
    ],
  },
};

/** Questions (réponse du client si elle existe, sinon « à compléter ») : tournures propres aux questions. */
const QBANK: { fr: Tpl[]; en: Tpl[] } = {
  fr: [
    (x) => ({ hook: `« ${cap(x.a)} ? » On nous la pose souvent.`, body: x.b ? `${cap(x.b)}.` : "[À compléter : votre réponse]", headline: short(x.a) }),
    (x) => ({ hook: `${cap(x.a)} ? On vous répond.`, body: x.b ? `${cap(x.b)}.` : "[À compléter : votre réponse en deux phrases]", headline: short(x.a) }),
    (x) => ({ hook: `Question du jour : ${low(x.a)} ?`, body: x.b ? `Notre réponse : ${low(x.b)}.` : "[À compléter : votre réponse]", headline: short(x.a) }),
    (x) => ({ hook: `Vous nous demandez souvent : ${low(x.a)} ?`, body: x.b ? `${cap(x.b)}.` : "[À compléter : votre réponse, avec un exemple concret]", headline: short(x.a) }),
  ],
  en: [
    (x) => ({ hook: `"${cap(x.a)}?" We get asked this a lot.`, body: x.b ? `${cap(x.b)}.` : "[To complete: your answer]", headline: short(x.a) }),
    (x) => ({ hook: `${cap(x.a)}? Here's our answer.`, body: x.b ? `${cap(x.b)}.` : "[To complete: your two-sentence answer]", headline: short(x.a) }),
    (x) => ({ hook: `Question of the day: ${low(x.a)}?`, body: x.b ? `Our answer: ${low(x.b)}.` : "[To complete: your answer]", headline: short(x.a) }),
  ],
};

/** Lieu : un restaurant « se trouve », un artisan « intervient ». */
const LOCALBANK = (archetype: Archetype): { fr: Tpl[]; en: Tpl[] } => {
  const venue = archetype === "restaurant";
  return {
    fr: [
      (x) => (x.key === "area" ? { hook: venue ? `Où nous trouver : ${strip(x.a)}.` : `Où intervenons-nous ? ${strip(x.a)}.`, body: "", headline: short(x.a) } : x.key === "hours" ? { hook: `Nos horaires : ${strip(x.a)}.`, body: "", headline: "Nos horaires" } : { hook: venue ? `Pour réserver : ${x.a}.` : `Une question ? Un seul numéro : ${x.a}.`, body: "", headline: x.a }),
      (x, c) => (x.key === "area" ? { hook: venue ? `Dans le quartier : ${strip(x.a)}.` : `${c.city ? `${c.city} et alentours` : cap(strip(x.a))} : on se déplace.`, body: venue ? "" : `Zone : ${strip(x.a)}.`, headline: short(c.city ?? x.a) } : x.key === "hours" ? { hook: `Quand venir ? ${strip(x.a)}.`, body: "", headline: "Quand venir" } : { hook: `Le plus simple pour nous joindre : ${x.a}.`, body: "", headline: "Nous appeler" }),
    ],
    en: [
      (x) => (x.key === "area" ? { hook: venue ? `Find us: ${strip(x.a)}.` : `Where do we work? ${strip(x.a)}.`, body: "", headline: short(x.a) } : x.key === "hours" ? { hook: `Our hours: ${strip(x.a)}.`, body: "", headline: "Our hours" } : { hook: venue ? `To book: ${x.a}.` : `A question? One number: ${x.a}.`, body: "", headline: x.a }),
    ],
  };
};

/** Achat : prix confirmé ou nom de l'offre, jamais de promotion inventée. */
const BUYBANK: { fr: Tpl[]; en: Tpl[] } = {
  fr: [
    (x, c) => (x.kind === "price" ? { hook: `${c.offer} : ${x.a}.`, body: "", headline: x.a } : { hook: `${c.offer}, ${low(c.f.category)}.`, body: "", headline: short(c.offer) }),
    (x, c) => (x.kind === "price" ? { hook: `Le prix, sans détour : ${x.a}.`, body: `${c.offer}.`, headline: x.a } : { hook: `${c.offer} : ce qu'il faut savoir avant de le choisir.`, body: c.f.facts[0] ? `${c.f.facts[0].label} : ${c.f.facts[0].value}.` : "", headline: short(c.offer) }),
  ],
  en: [
    (x, c) => (x.kind === "price" ? { hook: `${c.offer}: ${x.a}.`, body: "", headline: x.a } : { hook: `${c.offer}, ${low(c.f.category)}.`, body: "", headline: short(c.offer) }),
  ],
};

/** Pas de matière : une publication qui demande précisément ce qui manque (jamais d'invention). */
function missing(pillar: Pillar, lang: string, n: number): { hook: string; body: string; headline: string } {
  const fr = [`[À compléter : ${pillar.idea}]`, `[À compléter : une photo et deux phrases pour « ${pillar.title} »]`, `[À compléter : un exemple réel pour « ${pillar.title} »]`];
  const en = [`[To complete: ${pillar.idea}]`, `[To complete: a photo and two sentences for "${pillar.title}"]`, `[To complete: a real example for "${pillar.title}"]`];
  const list = lang === "en" ? en : fr;
  return { hook: list[n % list.length], body: "", headline: short(pillar.title) };
}

export function hashtagsFor(f: VerifiedFacts, archetype: Archetype, pillar: Pillar, atom: Atom | null): string[] {
  const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(pour|avec|dans|des|les|une|and|the|with)$/.test(w));
  const out = new Set<string>();
  const cat = words(f.category).slice(0, 2).join("");
  if (cat) out.add(cleanTag(cat));
  const city = mainCity(f.area);
  if (city) out.add(cleanTag(fold(city).replace(/[^a-z0-9]/g, "")));
  if (atom && atom.kind !== "q" && atom.kind !== "local" && atom.kind !== "price") {
    const w = words(atom.a).slice(0, 2).join("");
    if (w && w.length <= 24) out.add(cleanTag(w));
  }
  const pil = words(pillar.title)[0];
  if (pil) out.add(cleanTag(pil));
  out.add(cleanTag(fold(f.brand).replace(/[^a-z0-9]/g, "")));
  return [...out].filter((x) => x.length >= 3).slice(0, 5);
}

/**
 * Publication locale du n-ième passage dans un pilier. `used` : accroches déjà utilisées dans le calendrier
 * (une accroche n'est jamais répétée ; on passe à la combinaison suivante).
 */
export function writeLocal(o: { pillar: Pillar; archetype: Archetype; f: VerifiedFacts; questions: string[]; n: number; lang: string; cta: string; used: Set<string> }): Draft {
  const { pillar, f, lang } = o;
  const atoms = atomsFor(pillar, o.archetype, f, o.questions);
  const bank = TBANK[pillar.id === "carte" ? "sell" : pillar.objective] ?? TBANK.educate;
  const local = LOCALBANK(o.archetype);
  // La tournure suit la nature de la matière (une caractéristique se montre, une question se répond).
  const pickBank = (a: Atom) => (a.kind === "q" ? QBANK : a.kind === "local" ? local : a.kind === "price" || a.kind === "offer" ? BUYBANK : a.kind === "fact" ? TBANK.demonstrate : a.kind === "brand" ? TBANK.brand : bank);
  const tplsOf = (a: Atom) => (lang === "en" ? pickBank(a).en : pickBank(a).fr);
  const tpls = atoms.length ? tplsOf(atoms[0]) : lang === "en" ? bank.en : bank.fr;
  const c: Ctx = { f, lang, city: mainCity(f.area), brand: f.brand, offer: f.offerName, cta: o.cta };
  let chosen: { hook: string; body?: string; headline: string } | null = null;
  let atom: Atom | null = null;
  const combos = atoms.length * tpls.length;
  for (let k = 0; k < combos && !chosen; k++) {
    const idx = (o.n + k) % combos;
    const a = atoms[idx % atoms.length];
    const list = tplsOf(a);
    const t = list[Math.floor(idx / atoms.length) % list.length];
    const r = t(a, c);
    if (r && !o.used.has(fold(r.hook))) {
      chosen = r;
      atom = a;
    }
  }
  if (!chosen) chosen = missing(o.pillar, lang, o.n);
  o.used.add(fold(chosen.hook));
  const caption = [chosen.hook, chosen.body, o.cta].filter((x) => x && x.trim()).join("\n\n");
  const visual: Draft["visual"] = pillar.formats[0] === "reel" || pillar.formats[0] === "video" ? "video" : pillar.objective === "demonstrate" ? "detail" : pillar.objective === "brand" ? "scene" : "creative";
  return { title: cap(chosen.headline || pillar.title), caption, hashtags: hashtagsFor(f, o.archetype, pillar, atom), headline: chosen.headline, visual, material: atom?.key ?? "missing" };
}
