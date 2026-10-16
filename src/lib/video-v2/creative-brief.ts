/**
 * BRIEF ET FICHE CRÉATIVE d'une publicité vidéo (guide créatif, règles 5, 7, 9, 10, 11, 12). Avant chaque création :
 * ce que le Project Brain sait (offre, cible, bénéfice, positionnement, preuves DISPONIBLES, objections, charte,
 * plateforme, durée, objectif), puis une fiche créative ADAPTÉE à l'offre : concept, palette (charte d'abord),
 * typographies, tailles, animation principale, rythme, voix, musique et appel à l'action. Une montre premium, un
 * artisan et un service de réservation n'ont pas le même traitement. La mémoire créative du projet évite de reprendre
 * un concept déjà utilisé et garde les préférences du client.
 */
import type { Project } from "../projects";
import { C } from "../i18n-server";
import { brandTypo, palette } from "../engine/images";
import { contactModesOf } from "../project-types";
import { contrastRatio, loadVideoGuide, px, type AnimationPreset, type PaletteFamily, type VideoCreativeGuide } from "./creative-guide";
import { loadCreativeMemory, type CreativeMemory } from "./creative-memory";

export type Goal = "buy" | "quote" | "booking" | "visit" | "contact";

export type CreativeBrief = {
  route: "services" | "products";
  family: PaletteFamily;
  goal: Goal;
  offer: string;
  audience: string;
  benefit: string;
  positioning: string;
  /** Preuves DISPONIBLES seulement (une preuve manquante n'est jamais affirmée). */
  proofs: string[];
  objections: string[];
  platform: string;
  durationS: number;
  concept: string;
  colors: { bg: string; text: string; accent: string; secondary: string; source: "charter" | "example" };
  fonts: { heading: string; body: string };
  /** Tailles en pixels pour CE cadre. */
  sizes: { hook: number; sceneTitle: number; benefit: number; secondary: number; subtitle: number; cta: number };
  lineHeight: { title: number; body: number };
  animation: AnimationPreset;
  transition: { kind: "cut" | "fade"; durationS: number };
  rhythm: "measured" | "steady" | "lively";
  voice: { kokoroVoice: string; speed: number; tone: string };
  music: { mood: "calm" | "warm" | "pulse" };
  cta: string;
  ctaHoldS: number;
  /** Ce qui a été repris de la mémoire du projet (préférences, concepts déjà faits). */
  fromMemory: string[];
};

const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Famille de traitement selon l'offre (direction, secteur, catégorie, demande) : jamais le même pour tous. */
export function familyOf(p: Project, request?: string | null): PaletteFamily {
  const t = fold(`${request ?? ""} ${p.brand?.direction ?? ""} ${p.product.category ?? ""} ${p.product.sector ?? ""} ${p.product.name ?? ""} ${(p.services?.services ?? []).map((s) => s.name).join(" ")}`);
  if (/promo|soldes|offre speciale|reduction|black friday|-\d+ ?%/.test(t)) return "promo";
  if (/joaill|horlog|montre|bijou|luxe|parfum|maroquin|prestige/.test(t)) return "premium";
  if (/tech|drone|casque|ecouteur|electroni|informati|logiciel|appli|gaming|robot/.test(t)) return "tech";
  if (/bien[- ]etre|spa|massage|yoga|cosmet|soin|naturo|sophro|beaute|the\b|infusion/.test(t)) return "wellness";
  if (p.business === "services" || /artisan|atelier|peint|platr|menuis|plomb|electri|jardin|paysag|fleur|boulang|ceram/.test(t)) return "artisan";
  return "premium";
}

/** Objectif : achat (produit), devis (artisan), réservation, visite sur place ou prise de contact. */
export function goalOf(p: Project): Goal {
  if (p.business !== "services") return "buy";
  const modes = contactModesOf(p.services);
  if (modes.includes("booking")) return "booking";
  if (modes.includes("quote")) return "quote";
  if (modes.includes("call")) return "contact";
  return "contact";
}

const CONCEPTS: Record<PaletteFamily, { fr: string; en: string }[]> = {
  premium: [{ fr: "Révélation par la lumière : la pièce sort de l'ombre, détail après détail", en: "Revealed by light: the piece emerges from darkness, detail by detail" }, { fr: "Le temps d'un geste : la pièce dans son quotidien raffiné", en: "A moment of craft: the piece in a refined everyday life" }],
  tech: [{ fr: "Démonstration nette : un usage, un bénéfice par plan", en: "Clean demonstration: one use, one benefit per shot" }, { fr: "Précision : gros plans sur ce qui fait la différence", en: "Precision: close-ups on what makes the difference" }],
  artisan: [{ fr: "Le métier en étapes : du besoin au résultat, gestes et matières", en: "The craft step by step: from need to result, gestures and materials" }, { fr: "Avant / pendant / après : la confiance par le travail bien fait", en: "Before / during / after: trust through work well done" }],
  wellness: [{ fr: "Respiration : lumière douce, matières, rituel", en: "Breathing space: soft light, textures, ritual" }, { fr: "Un moment pour soi, plan après plan", en: "A moment for yourself, shot after shot" }],
  promo: [{ fr: "L'offre d'abord : comprise en trois secondes, puis la preuve", en: "Offer first: understood in three seconds, then the proof" }, { fr: "Rythme vif : bénéfice, produit, offre, action", en: "Fast pace: benefit, product, offer, action" }],
};

/** Couleurs : la charte du projet d'abord (texte relevé si le contraste est insuffisant), sinon l'exemple du guide. */
function colorsOf(p: Project, family: PaletteFamily, g: VideoCreativeGuide): CreativeBrief["colors"] {
  if (p.brand) {
    const pal = palette(p);
    const bg = pal.dark;
    const text = [pal.light, "#FFFFFF"].find((c) => contrastRatio(c, bg) >= g.colors.minContrast) ?? "#FFFFFF";
    return { bg, text, accent: pal.accent, secondary: pal.primary, source: "charter" };
  }
  const ex = g.colors.examples[family];
  return { bg: ex.bg, text: ex.text, accent: ex.accent, secondary: ex.accent, source: "example" };
}

export function buildCreativeBrief(p: Project, o: { request?: string | null; durationS: number; width: number; height: number; platform: string; guide?: VideoCreativeGuide; memory?: CreativeMemory }): CreativeBrief {
  const g = o.guide ?? loadVideoGuide();
  const mem = o.memory ?? loadCreativeMemory(p.id);
  const route = p.business === "services" ? "services" : "products";
  const family = mem.preferences.family ?? familyOf(p, o.request);
  const goal = goalOf(p);
  const st = p.strategy;
  const pf = st?.platform;
  // Concept : le premier qui n'a pas déjà été utilisé pour ce projet (variété d'une vidéo à l'autre).
  const concepts = CONCEPTS[family].map((c) => C(c.fr, c.en));
  const concept = concepts.find((c) => !mem.directionsUsed.includes(c)) ?? concepts[mem.directionsUsed.length % concepts.length];
  const typo = brandTypo(p);
  const lively = family === "promo" || family === "tech";
  const measured = family === "premium" || family === "wellness";
  const anim = g.animations.find((a) => a.id === (mem.preferences.animation ?? (family === "promo" ? "punchy" : family === "tech" ? "mask" : "sober"))) ?? g.animations[0];
  const T = (r: { min: number; max: number }, t: number) => px(r, o.height, t, o.width);
  const fromMemory: string[] = [];
  if (mem.preferences.family) fromMemory.push(C(`style choisi par le client : ${mem.preferences.family}`, `style chosen by the client: ${mem.preferences.family}`));
  if (mem.directionsUsed.length) fromMemory.push(C(`${mem.directionsUsed.length} concept(s) déjà utilisé(s) évité(s)`, `${mem.directionsUsed.length} concept(s) already used avoided`));
  for (const c of mem.corrections.slice(-3)) fromMemory.push(C(`correction demandée : ${c}`, `requested correction: ${c}`));
  return {
    route,
    family,
    goal,
    offer: route === "services" ? (p.services?.services ?? []).map((s) => s.name).join(", ") : p.product.name,
    audience: pf?.persona || st?.audience?.[0]?.label || "",
    benefit: pf?.difference || st?.keyMessages?.[0] || "",
    positioning: p.brand?.positioning ?? "",
    proofs: (pf?.proofs ?? []).filter((x) => x.status === "available").map((x) => `${x.claim} — ${x.proof}`),
    objections: (pf?.objections ?? []).map((x) => x.objection),
    platform: o.platform,
    durationS: o.durationS,
    concept,
    colors: colorsOf(p, family, g),
    fonts: { heading: typo.heading, body: typo.body },
    sizes: {
      hook: T(g.text.hook, measured ? 0.25 : 0.6),
      sceneTitle: T(g.text.sceneTitle, measured ? 0.3 : 0.6),
      benefit: T(g.text.benefit, 0.5),
      secondary: T(g.text.secondary, 0.5),
      subtitle: T(g.text.subtitle, 0.5),
      cta: T(g.cta.textPx, 0.5),
    },
    lineHeight: { title: measured ? 1.1 : 1.04, body: 1.25 },
    animation: anim,
    // Coupe franche par défaut ; fondu doux seulement pour un changement d'ambiance (marques posées).
    transition: measured ? { kind: "fade", durationS: g.editing.softFade[0] + 0.1 } : { kind: "cut", durationS: 0 },
    rhythm: lively ? "lively" : measured ? "measured" : "steady",
    voice: {
      kokoroVoice: family === "wellness" ? "ff_siwis" : family === "promo" || family === "tech" ? "ff_siwis:0.5,em_alex:0.5" : "ff_siwis:0.4,em_alex:0.6",
      speed: family === "premium" ? 0.94 : family === "wellness" ? 0.92 : family === "promo" ? 1.06 : 1.0,
      tone: { premium: C("posée, grave, sobre", "calm, low, understated"), tech: C("claire, précise", "clear, precise"), artisan: C("chaleureuse, de confiance", "warm, trustworthy"), wellness: C("douce, lente", "soft, slow"), promo: C("énergique, directe", "energetic, direct") }[family],
    },
    music: { mood: lively ? "pulse" : measured ? "calm" : "warm" },
    cta: C(g.cta.byGoal[goal].fr, g.cta.byGoal[goal].en),
    ctaHoldS: Math.max(g.cta.holdS[0], Math.min(g.cta.holdS[1], measured ? 3.2 : 2.8)),
    fromMemory,
  };
}
