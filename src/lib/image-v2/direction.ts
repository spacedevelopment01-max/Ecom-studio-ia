/**
 * Direction artistique (Image V2) : décidée pour CE projet (marque, public, produit ou métier, support), jamais une
 * esthétique unique imposée à tous. Une cosmétique premium, un artisan du bâtiment et un SaaS n'ont pas la même image.
 * Les refus du client (mémoire « image:<direction> ») sont respectés.
 */
import type { ArtDirectionId, Support, VisualKind } from "./types";
import { ART_DIRECTIONS } from "./types";

export type DirectionSpec = { label: string; composition: string; lighting: string; framing: string; mood: string };

export const DIRECTIONS: Record<ArtDirectionId, DirectionSpec> = {
  minimal_studio: { label: "studio minimaliste", composition: "single subject, generous negative space, clean seamless backdrop", lighting: "large soft key light from the side, gentle fill, soft contact shadow", framing: "eye level, 85 mm, subject centred or on a third", mood: "calm, precise, quiet" },
  premium_photo: { label: "photographie premium", composition: "subject as hero, refined props in the brand palette, layered depth", lighting: "controlled soft light with a subtle rim, rich tonal range", framing: "slightly low angle, 100 mm macro details or 70 mm hero", mood: "refined, tactile, high-end" },
  natural_lifestyle: { label: "lifestyle naturel", composition: "real moment of daily life, subject in use, candid", lighting: "window daylight, soft and directional", framing: "35-50 mm, eye level, shallow depth of field", mood: "authentic, warm, lived-in" },
  editorial: { label: "photographie éditoriale", composition: "strong graphic composition, intentional crop, story in one frame", lighting: "natural light with character, deliberate shadows", framing: "35 mm, considered angle, room for a headline", mood: "confident, magazine-like" },
  architectural: { label: "ambiance architecturale", composition: "clean lines, symmetry or strong perspective, space that breathes", lighting: "soft daylight raking across surfaces", framing: "24-35 mm, verticals kept straight", mood: "serene, structured" },
  product_demo: { label: "démonstration produit", composition: "hands using the product on a real task, result visible", lighting: "bright even light, readable details", framing: "close to medium shot, 50 mm, product readable", mood: "clear, useful, honest" },
  tech_universe: { label: "univers technologique", composition: "precise, modern desk or urban setting, sleek surfaces", lighting: "cool controlled key light with clean rim highlights", framing: "low three-quarter angle, 85 mm", mood: "precise, modern, understated" },
  warm_universe: { label: "univers chaleureux", composition: "cosy setting, natural materials, inviting textures", lighting: "warm late-afternoon light, soft shadows", framing: "50 mm, eye level, layered foreground", mood: "welcoming, generous, human" },
  premium_ad: { label: "publicité haut de gamme", composition: "bold hero placement, clear space reserved for the message", lighting: "sculpted light, deep contrast, crisp edges", framing: "hero angle, 85-100 mm", mood: "aspirational, striking, controlled" },
  graphic: { label: "composition graphique contemporaine", composition: "flat colour fields from the palette, geometric balance, editorial typography space", lighting: "even, shadowless", framing: "frontal, orthogonal", mood: "contemporary, clear" },
  documentary_trade: { label: "reportage métier", composition: "professional at work, tools and gesture clearly visible, real job site", lighting: "available light of the site, natural and honest", framing: "35-50 mm, medium shot on hands and work, eye level", mood: "skilled, trustworthy, real" },
};

const PREMIUM_RE = /premium|luxe|luxury|haut de gamme|high[- ]end|prestige|elegan|raffin|exclusi/i;

/** Directions conseillées pour les entreprises de services, par secteur. */
const SERVICE_DIRECTIONS: Record<string, ArtDirectionId[]> = {
  batiment: ["documentary_trade", "editorial", "architectural"],
  restauration: ["warm_universe", "editorial", "natural_lifestyle"],
  bienetre: ["natural_lifestyle", "warm_universe", "premium_photo"],
  sante: ["natural_lifestyle", "editorial"],
  coaching: ["natural_lifestyle", "documentary_trade", "editorial"],
  conseil: ["editorial", "graphic", "natural_lifestyle"],
  immobilier: ["architectural", "editorial"],
  formation: ["natural_lifestyle", "editorial"],
  evenementiel: ["editorial", "warm_universe"],
  domicile: ["documentary_trade", "natural_lifestyle", "warm_universe"],
  agence: ["editorial", "graphic", "tech_universe"],
};

export type DirectionInput = {
  business: "products" | "services";
  sector: string | null;
  /** Directions de la catégorie produit (products) ; ignorées pour les services. */
  categoryDirections: ArtDirectionId[];
  personality: string[];
  positioning: string | null;
  kind: VisualKind;
  support: Support;
  /** Directions refusées par le client (mémoire). */
  rejected: ArtDirectionId[];
};

/** Direction artistique d'une image, avec la raison (tracée dans le brief). */
export function chooseDirection(i: DirectionInput): { id: ArtDirectionId; why: string } {
  const premium = PREMIUM_RE.test(`${i.personality.join(" ")} ${i.positioning ?? ""}`);
  const base: ArtDirectionId[] = i.business === "services" ? (SERVICE_DIRECTIONS[i.sector ?? ""] ?? ["natural_lifestyle", "editorial"]) : i.categoryDirections.length ? i.categoryDirections : ["minimal_studio", "natural_lifestyle"];
  // L'intention et le support orientent d'abord (un packshot reste un packshot) ; la famille et la marque départagent.
  const byKind: Partial<Record<VisualKind, ArtDirectionId[]>> = {
    packshot: premium ? ["premium_photo", "minimal_studio"] : ["minimal_studio", "premium_photo"],
    product_image: premium ? ["premium_photo", "minimal_studio"] : ["minimal_studio", "product_demo"],
    lifestyle: ["natural_lifestyle", "warm_universe", "editorial"],
    usage_scene: ["product_demo", "natural_lifestyle", "documentary_trade"],
    ad_image: premium ? ["premium_ad", "editorial"] : ["premium_ad", "product_demo", "editorial"],
    banner: ["editorial", "architectural", "warm_universe"],
    trade_photo: ["documentary_trade", "editorial"],
  };
  const pref = byKind[i.kind] ?? [];
  // Services : le reportage du métier prime pour les images du métier ; un produit ne reçoit jamais « reportage métier ».
  const pool = i.business === "products" ? [...pref.filter((d) => d !== "documentary_trade"), ...base] : [...base.filter((d) => pref.includes(d)), ...base, ...pref.filter((d) => d !== "premium_photo" || premium)];
  const choice = pool.find((d) => !i.rejected.includes(d) && (d !== "premium_ad" || i.kind === "ad_image" || premium)) ?? (ART_DIRECTIONS as readonly ArtDirectionId[]).find((d) => !i.rejected.includes(d) && (i.business === "services" || d !== "documentary_trade"))!;
  const why = [i.business === "services" ? `métier (${i.sector ?? "secteur inconnu"})` : `famille de produit`, `intention ${i.kind}`, `support ${i.support}`, premium ? "marque premium" : null, i.rejected.length ? `refusées : ${i.rejected.join(", ")}` : null].filter(Boolean).join(" · ");
  return { id: choice, why };
}

/** Refus mémorisés (« image:<direction> » ou libellé) → directions à ne plus proposer. */
export function rejectedDirections(memory: { kind: string; key: string; value: string }[]): ArtDirectionId[] {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const out = new Set<ArtDirectionId>();
  for (const m of memory) {
    if (m.kind !== "rejection" || !m.key.startsWith("image:")) continue;
    const k = norm(m.key.slice(6));
    for (const id of ART_DIRECTIONS) if (k === id || k === norm(DIRECTIONS[id].label)) out.add(id);
  }
  return [...out];
}
