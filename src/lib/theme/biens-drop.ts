/**
 * Biens immobiliers dans le Liquid du thème (Maison & Horizon) : chaque bien devient un « métaobjet » de type
 * `bien`, comme dans Shopify (champs lus par `bien.<champ>.value`, adresse `bien.system.url`), et la liste est
 * `shop.metaobjects.bien.values`. Les montants arrivent déjà mis en forme (« 485 000 € », « 1 290 € / mois ») pour
 * que la même section s'affiche à l'identique dans l'aperçu, l'export et la démonstration.
 */
import type { StoreBien } from "./spec";

const nbsp = " ";
/** 485000 → « 485 000 € » (espace fine insécable, comme les maquettes). */
export const euros = (n: number | null | undefined) => (n == null ? "" : `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, nbsp)}${" "}€`);
const num = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 10) / 10).replace(".", ","));

const TYPE_LABELS: Record<string, string> = { maison: "Maison", appartement: "Appartement", villa: "Villa", loft: "Loft", propriete: "Propriété", mas: "Mas", terrain: "Terrain", autre: "Bien" };
const EXTERIOR_LABELS: Record<string, string> = { jardin: "Jardin", terrasse: "Terrasse", balcon: "Balcon", cour: "Cour" };

/** Une valeur de champ Shopify : `{{ bien.titre.value }}`. */
const v = <T,>(value: T) => ({ value });

export function bienDrop(b: StoreBien, base: string) {
  const rentTotal = b.rent != null ? b.rent + (b.charges ?? 0) : null;
  const status = b.status === "sold" ? "Vendu" : b.status === "rented" ? "Loué" : "";
  const location = [b.city, b.postalCode ? `(${b.postalCode})` : ""].filter(Boolean).join(" ");
  const tags = [b.transaction, b.type, b.furnished ? "meuble" : "", b.exteriors.length ? "exterieur" : "", b.pool ? "piscine" : "", b.status === "published" ? "disponible" : b.status].filter(Boolean);
  return {
    system: { type: "bien", handle: b.handle, id: b.ref, url: `${base}/pages/bien/${b.handle}` },
    reference: v(b.ref),
    transaction: v(b.transaction),
    transaction_label: v(b.transaction === "vente" ? "Vente" : "Location"),
    statut: v(b.status),
    statut_label: v(status),
    disponible: v(b.status === "published"),
    type_bien: v(b.type),
    type_label: v(TYPE_LABELS[b.type] ?? "Bien"),
    titre: v(b.title),
    accroche: v(b.summary),
    description: v(b.description),
    paragraphes: v(b.description.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)),
    ville: v(b.city),
    code_postal: v(b.postalCode),
    secteur: v(b.sector),
    adresse: v(b.address),
    localisation: v(location),
    prix: v(b.price),
    prix_texte: v(euros(b.price)),
    loyer_hc: v(b.rent),
    loyer_hc_texte: v(euros(b.rent)),
    charges: v(b.charges),
    charges_texte: v(euros(b.charges)),
    loyer_cc: v(rentTotal),
    loyer_cc_texte: v(euros(rentTotal)),
    /** Montant affiché sur les cartes : prix (vente) ou loyer charges comprises (location). */
    montant: v(b.transaction === "vente" ? b.price : rentTotal),
    montant_texte: v(b.transaction === "vente" ? euros(b.price) : euros(rentTotal)),
    depot: v(b.deposit),
    depot_texte: v(euros(b.deposit)),
    honoraires: v(b.fees),
    surface: v(b.surface),
    surface_texte: v(b.surface != null ? `${num(b.surface)} m²` : ""),
    terrain: v(b.land),
    terrain_texte: v(b.land != null ? `${num(b.land)} m²` : ""),
    pieces: v(b.rooms),
    chambres: v(b.bedrooms),
    etage: v(b.floor),
    meuble: v(b.furnished),
    exterieurs: v(b.exteriors.map((x) => EXTERIOR_LABELS[x] ?? x)),
    exterieur: v(b.exteriors.length > 0),
    piscine: v(b.pool),
    equipements: v(b.features),
    disponibilite: v(b.availability),
    dpe: v(b.dpe),
    ges: v(b.ges),
    taxe_fonciere: v(b.propertyTax),
    photos: v(b.photos),
    photos_count: v(b.photos.length),
    couverture: v(b.photos[0] ?? null),
    plan: v(b.plan),
    quartier_texte: v(b.neighborhood.text),
    quartier_photos: v(b.neighborhood.photos),
    quartier_lieux: v(b.neighborhood.places),
    carte_x: v(b.map?.x ?? null),
    carte_y: v(b.map?.y ?? null),
    a_la_une: v(b.featured),
    exception: v(b.exceptional),
    demo: v(b.demo),
    /** Mots-clés des filtres côté navigateur (data-*) : transaction, type, meublé, extérieur, piscine, état. */
    filtres: v(tags.join(" ")),
  };
}

export function bienDrops(biens: StoreBien[] | undefined, base: string) {
  return (biens ?? []).map((b) => bienDrop(b, base));
}
