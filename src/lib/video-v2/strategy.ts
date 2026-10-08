/**
 * Stratégie créative vidéo (sans IA) : objectif, audience, angle, message, accroche, émotion, rythme, style,
 * durée, appel à l'action et format — à partir du Project Brain (analyse publicitaire `adInsight`, réutilisée).
 *
 * Le langage visuel suit la catégorie du produit ou le métier : un plâtrier-peintre (documentaire de chantier,
 * lumière naturelle, gestes) ne reçoit pas celui d'un cosmétique premium (macro, lumière douce, lenteur). Aucune
 * preuve n'est affirmée sans fait confirmé ; ce qui manque est signalé.
 */
import crypto from "node:crypto";
import type { Project } from "../projects";
import { adInsight } from "../ads-v2/insight";
import type { AdInsight } from "../ads-v2/types";
import { CTAS } from "../ads-v2/platforms";
import { contentLang } from "../i18n-server";
import type { CreativeStrategy, MusicMood, NarrativeStyle, Transition, VideoIntent, VisualLanguage } from "./types";

const BUILDING = new Set(["plasterer", "painter", "mason", "electrician", "plumber", "carpenter", "tiler", "roofer", "gardener", "mechanic", "cleaner"]);
const CARE = new Set(["hairdresser", "beautician", "physiotherapist", "coach", "photographer"]);

/** Langage visuel d'après la catégorie (produits) ou le métier (services) — règle générale, aucun cas particulier. */
export function visualLanguage(i: AdInsight, sector?: string | null): VisualLanguage {
  const id = i.category.id;
  if (i.business === "services") {
    // Métier canonique, composé (« plasterer_painter », « a+b ») ou repli par secteur (« sector:batiment »).
    const parts = id.replace(/^sector:/, "").split(/[_+]/);
    if (parts.some((x) => BUILDING.has(x)) || id === "sector:batiment" || sector === "batiment") return "craft_documentary";
    if (parts.includes("caterer") || id === "sector:restauration" || sector === "restauration") return "food_warm";
    if (parts.some((x) => CARE.has(x))) return i.premium ? "premium_soft" : "local_trust";
    return "local_trust";
  }
  if (id === "digital") return "digital_explainer";
  if (id === "tech") return "tech_precise";
  if (id === "food" || id === "kitchen") return "food_warm";
  if (id === "cosmetics" || id === "beauty_tools" || id === "accessories" || id === "wellness") return i.premium || id === "cosmetics" ? "premium_soft" : "lifestyle_natural";
  if (id === "fashion") return i.premium ? "premium_soft" : "lifestyle_natural";
  return "lifestyle_natural";
}

const LANGUAGE: Record<VisualLanguage, { camera: string; light: string; music: MusicMood; transitions: Transition[]; energy: CreativeStrategy["rhythm"]["energy"]; avgShotS: number; emotion: string; narrative: NarrativeStyle }> = {
  craft_documentary: { camera: "caméra à l'épaule stable, plans de gestes serrés puis plans larges du chantier", light: "lumière naturelle du chantier, sans filtre", music: "warm", transitions: ["cut", "cut", "slide"], energy: "steady", avgShotS: 3.2, emotion: "confiance dans un travail soigné", narrative: "demonstrative" },
  premium_soft: { camera: "lents mouvements de glissière, macro, mise au point qui bascule", light: "lumière douce et diffuse, reflets maîtrisés", music: "calm", transitions: ["fade", "cut", "fade"], energy: "calm", avgShotS: 3.6, emotion: "désir calme, soin de soi", narrative: "premium" },
  tech_precise: { camera: "travellings nets, rotations lentes du produit, plans de détail précis", light: "studio contrasté, liseré de lumière froide", music: "pulse", transitions: ["cut", "zoom", "cut"], energy: "dynamic", avgShotS: 2.4, emotion: "maîtrise et efficacité", narrative: "direct" },
  food_warm: { camera: "plans serrés sur les assiettes, panoramiques lents de la salle", light: "lumière chaude, fin d'après-midi", music: "warm", transitions: ["cut", "fade", "cut"], energy: "steady", avgShotS: 2.8, emotion: "gourmandise et convivialité", narrative: "storytelling" },
  digital_explainer: { camera: "animations d'interface, typographie animée, zooms sur les écrans", light: "aplats de la charte, contrastes francs", music: "pulse", transitions: ["slide", "cut", "wipe"], energy: "steady", avgShotS: 3, emotion: "clarté, soulagement", narrative: "educational" },
  lifestyle_natural: { camera: "plans d'usage au quotidien, légèrement mobiles", light: "lumière du jour naturelle", music: "warm", transitions: ["cut", "fade", "slide"], energy: "steady", avgShotS: 2.8, emotion: "plaisir simple du quotidien", narrative: "emotional" },
  local_trust: { camera: "plans posés de l'équipe et du lieu, gestes du métier", light: "lumière naturelle, tons chaleureux", music: "warm", transitions: ["cut", "fade", "cut"], energy: "steady", avgShotS: 3.2, emotion: "proximité et confiance", narrative: "conversational" },
};

/** Style narratif selon l'intention (le langage visuel donne la valeur par défaut). */
function narrativeFor(intent: VideoIntent, base: NarrativeStyle): NarrativeStyle {
  if (intent.kind === "ugc") return "conversational";
  if (intent.kind === "product_tutorial" || intent.kind === "explainer") return "educational";
  if (intent.kind === "product_demo") return "demonstrative";
  if (intent.kind === "brand_film") return base === "direct" ? "storytelling" : base;
  if (intent.kind === "video_ad" || intent.kind === "social_content") return base === "premium" ? "premium" : "direct";
  return base;
}

/**
 * Usage dicible : prestations (services). Pour un produit, les « usages » de la catégorie sont des mots-clés de
 * recherche d'images en anglais — jamais montrés ni dits dans une vidéo.
 */
export const spokenUsage = (i: AdInsight): string | null => (i.business === "services" ? (i.usage[0] ?? null) : null);

const seeded = (key: string, n: number) => (n ? parseInt(crypto.createHash("sha256").update(key).digest("hex").slice(0, 8), 16) % n : 0);

/**
 * Accroches possibles, construites UNIQUEMENT avec la matière du projet (problème, différence, fait confirmé,
 * usage, prestation). Choix déterministe par projet et par intention : deux projets différents n'ont pas la même.
 */
export function hookCandidates(i: AdInsight, intent: VideoIntent): string[] {
  const out: string[] = [];
  const name = i.offerName;
  if (i.problem) out.push(`${i.problem.replace(/\.$/, "")} ?`);
  if (i.difference) out.push(i.difference.replace(/\.$/, ""));
  const fact = i.facts[0];
  if (fact) out.push(`${fact.label} : ${fact.value}`);
  if (i.business === "services") {
    const s = i.services[0]?.name;
    if (s) out.push(intent.kind === "trade_video" ? `${s} : le geste qui fait la différence` : `${s}${i.area ? ` à ${i.area}` : ""}`);
    if (i.area) out.push(`Votre ${i.category.label.toLowerCase()} à ${i.area}`);
  } else {
    out.push(`Voici ${name}`);
  }
  return [...new Set(out.map((h) => h.trim()).filter((h) => h.length >= 4 && h.length <= 90))];
}

export function videoStrategy(p: Project, intent: VideoIntent, opts: { offer?: string | null; insight?: AdInsight } = {}): CreativeStrategy {
  const i = opts.insight ?? adInsight(p, { audience: intent.audience, offer: opts.offer });
  const lang = visualLanguage(i, p.product.sector ?? null);
  const L = LANGUAGE[lang];
  const narrative = narrativeFor(intent, L.narrative);
  const hooks = hookCandidates(i, intent);
  const hook = hooks[seeded(`${p.id}:${intent.kind}`, hooks.length)] ?? i.offerName;
  const proofs = [...i.facts.map((f) => `${f.label} : ${f.value}`), ...i.proofs].slice(0, 4);
  const ctas = CTAS[i.business][contentLang()];
  const cta = intent.kind === "product_tutorial" || intent.kind === "explainer" ? ctas[Math.min(1, ctas.length - 1)] : ctas[0];
  // Rythme : plus nerveux pour la publicité et le contenu social, plus posé pour les présentations.
  const fast = intent.kind === "video_ad" || intent.kind === "social_content" || intent.kind === "ugc" || intent.kind === "launch";
  const avgShotS = Math.max(1.6, Math.round((fast ? L.avgShotS * 0.8 : L.avgShotS) * 10) / 10);
  const angle = i.business === "services" ? (i.services[0]?.name ?? i.category.label) : (i.difference ?? i.category.label);
  const message = i.difference ?? (i.business === "services" ? `${i.category.label}${i.area ? ` à ${i.area}` : ""}` : `${i.offerName} : ${i.category.label.toLowerCase()}`);
  const gaps = [...i.gaps];
  if (!proofs.length) gaps.push("aucune preuve confirmée : la vidéo ne contient aucune affirmation de résultat");
  return {
    objective: intent.goal,
    audience: i.audience.declared ?? i.audience.persona ?? "public large (à préciser)",
    angle,
    message,
    hook,
    emotion: L.emotion,
    rhythm: { avgShotS, cutsPerMin: Math.round(60 / avgShotS), energy: fast && L.energy === "steady" ? "dynamic" : L.energy },
    style: { language: lang, narrative, camera: L.camera, light: L.light, music: L.music, transitions: L.transitions },
    durationS: intent.durationS,
    cta,
    aspect: intent.aspect,
    proofs,
    gaps,
  };
}
