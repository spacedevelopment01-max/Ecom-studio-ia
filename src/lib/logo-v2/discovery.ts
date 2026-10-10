/**
 * Découverte de la marque (Logo V2) : tout vient du Project Brain (projet, marque, stratégie, mémoire, métier compris),
 * sans nouvel appel à l'IA. Ce qui n'est pas confirmé reste absent (pas de valeurs inventées, pas de baseline).
 */
import type { Project } from "../projects";
import { brainSnapshot } from "../brain/snapshot";
import { brainContext } from "../brain/facade";
import { isLocked } from "../brain/brand-locks";
import { localBrand } from "../engine/local";
import type { BrandBrief, LogoStyle, MarkType } from "./types";

/** Concept refusé (mémoire « logo:<concept> », phase 2B) → types de logo à ne plus proposer. */
const REJECTED_TO_MARK: Record<string, MarkType[]> = {
  badge: ["emblem"],
  monogramme: ["monogram", "lettermark"],
  "lettre seule": ["lettermark"],
  "logotype seul": ["wordmark"],
  "pictogramme du metier": ["symbol_wordmark"],
  "symbole dessine": ["symbol_wordmark", "abstract_mark"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const placeholder = (s: string | null | undefined) => !s || /\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(s);

/**
 * Symboles convenus de TOUS les secteurs (globe, virgule, poignée de main…) : signalés à l'IA comme risques de
 * banalité. Un objet du métier (maison, pinceau, outil) n'en fait pas partie : bien intégré, il est permis.
 */
const GENERIC_CLICHES = ["globe", "swoosh", "lightbulb", "ampoule", "handshake", "poignée de main", "check mark", "coche"];

export function brandDiscovery(p: Project, opts: { style?: LogoStyle | "auto" } = {}): BrandBrief {
  const s = brainSnapshot(p);
  const brand = p.brand ?? localBrand(p.product, p.product.name || p.name, p).brand;
  const st = p.strategy;
  const logoRejections = s.memory.filter((m) => m.kind === "rejection" && m.key.startsWith("logo:"));
  const rejectedMarkTypes = [...new Set(logoRejections.flatMap((m) => REJECTED_TO_MARK[norm(m.key.slice(5))] ?? []))];
  const confirmedValues = p.product.facts.filter((f) => f.status === "confirmed" && /valeur|value|engagement|commitment/i.test(`${f.key} ${f.label}`)).map((f) => f.value);
  const decisions = s.memory.filter((m) => m.kind === "decision" && m.source === "user").map((m) => `${m.key} : ${m.value}`.slice(0, 200));
  return {
    projectId: p.id,
    name: brand.name,
    nameStatus: brand.nameStatus ?? p.product.nameStatus,
    descriptor: null,
    business: p.business,
    activity: p.product.category || p.product.name || "",
    trade: { label: s.trade.labels.fr || p.product.category || "", actions: s.trade.actions.slice(0, 8), objects: s.trade.icons.keywords.slice(0, 8), generic: s.trade.source === "generic" },
    positioning: placeholder(brand.positioning) ? null : brand.positioning,
    audience: placeholder(brand.audience) ? null : brand.audience,
    personality: brand.personality ?? [],
    values: confirmedValues,
    differentiation: st?.platform?.difference || null,
    competitorCodes: st?.platform?.alternatives || null,
    palette: brand.palette,
    paletteLocked: isLocked(p.brand, "palette"),
    fontsLocked: isLocked(p.brand, "fonts") && p.brand?.fonts ? { heading: p.brand.fonts.heading, body: p.brand.fonts.body } : null,
    decisions,
    rejectedMarkTypes,
    rejections: logoRejections.map((m) => m.value),
    cliches: [...new Set([...s.trade.icons.avoid, ...s.trade.icons.keywords.map((k) => `${k} (literal)`), ...GENERIC_CLICHES])],
    brainContext: brainContext(p, "logo"),
    activities: [...new Set([...(p.business === "services" ? p.services.services.map((x) => x.name) : []), p.product.category ?? ""].map((x) => x.trim()).filter(Boolean))].slice(0, 12),
    tagline: isLocked(p.brand, "tagline") && p.brand?.tagline?.trim() ? p.brand.tagline.trim() : null,
    style: opts.style ?? "auto",
  };
}
