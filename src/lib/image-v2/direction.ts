/**
 * Direction artistique (Image V2) : décidée pour CE projet (marque, public, produit ou métier, support), jamais une
 * esthétique unique imposée à tous. Une cosmétique premium, un artisan du bâtiment et un SaaS n'ont pas la même image.
 * Les refus du client (mémoire « image:<direction> ») sont respectés.
 */
import type { ArtDirectionId, Support, VisualKind } from "./types";
import { ART_DIRECTIONS } from "./types";

export type DirectionSpec = { label: string; composition: string; lighting: string; framing: string; mood: string };

/** Prises de vue en français : elles entrent telles quelles dans les consignes envoyées au modèle d'images (Qwen). */
export const DIRECTIONS: Record<ArtDirectionId, DirectionSpec> = {
  minimal_studio: { label: "studio minimaliste", composition: "un seul sujet, beaucoup d'espace libre autour, fond de studio uni et propre", lighting: "grande lumière douce de côté, léger débouchage, ombre de contact douce", framing: "à hauteur d'œil, 85 mm, sujet centré ou sur un tiers", mood: "calme, précis, silencieux" },
  premium_photo: { label: "photographie premium", composition: "le sujet en héros, quelques accessoires raffinés dans la palette de la marque, profondeur en plusieurs plans", lighting: "lumière douce maîtrisée avec un léger liseré, tons riches", framing: "angle légèrement bas, détails au 100 mm macro ou plan héros au 70 mm", mood: "raffiné, tactile, haut de gamme" },
  natural_lifestyle: { label: "lifestyle naturel", composition: "vrai moment de la vie quotidienne, sujet utilisé, naturel", lighting: "lumière du jour d'une fenêtre, douce et directionnelle", framing: "35-50 mm, à hauteur d'œil, faible profondeur de champ", mood: "authentique, chaleureux, vécu" },
  editorial: { label: "photographie éditoriale", composition: "composition graphique forte, cadrage voulu, une histoire en une seule image", lighting: "lumière naturelle avec du caractère, ombres choisies", framing: "35 mm, angle réfléchi, place pour un titre", mood: "assuré, comme dans un magazine" },
  architectural: { label: "ambiance architecturale", composition: "lignes nettes, symétrie ou perspective forte, espace qui respire", lighting: "lumière du jour douce et rasante sur les surfaces", framing: "24-35 mm, verticales bien droites", mood: "serein, structuré" },
  product_demo: { label: "démonstration produit", composition: "des mains utilisent le produit pour une vraie tâche, résultat visible", lighting: "lumière vive et égale, détails lisibles", framing: "plan rapproché à moyen, 50 mm, produit lisible", mood: "clair, utile, honnête" },
  tech_universe: { label: "univers technologique", composition: "bureau moderne et précis ou décor urbain, surfaces lisses", lighting: "lumière principale froide et maîtrisée, liserés nets", framing: "angle bas de trois quarts, 85 mm", mood: "précis, moderne, sobre" },
  warm_universe: { label: "univers chaleureux", composition: "lieu douillet, matières naturelles, textures accueillantes", lighting: "lumière chaude de fin d'après-midi, ombres douces", framing: "50 mm, à hauteur d'œil, premier plan en profondeur", mood: "accueillant, généreux, humain" },
  premium_ad: { label: "publicité haut de gamme", composition: "sujet placé en héros, bel espace libre réservé au message", lighting: "lumière sculptée, contraste profond, contours nets", framing: "angle héroïque, 85-100 mm", mood: "désirable, saisissant, maîtrisé" },
  graphic: { label: "composition graphique contemporaine", composition: "aplats de couleur de la palette, équilibre géométrique, place pour une typographie éditoriale", lighting: "égale, sans ombre", framing: "de face, orthogonal", mood: "contemporain, clair" },
  documentary_trade: { label: "reportage métier", composition: "professionnel au travail, outils et geste bien visibles, vrai chantier", lighting: "lumière disponible sur place, naturelle et honnête", framing: "35-50 mm, plan moyen sur les mains et l'ouvrage, à hauteur d'œil", mood: "compétent, digne de confiance, réel" },
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
