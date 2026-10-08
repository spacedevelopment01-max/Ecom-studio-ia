/**
 * Banques d'images (Image V2) : registre extensible. Chaque source déclare ses capacités de recherche, ses
 * métadonnées, sa licence, l'attribution, ses restrictions, ses formats et ses limites de requêtes. Ajouter une banque
 * = ajouter une entrée ici (avec sa fonction de recherche), sans toucher au moteur.
 *
 * Une image n'est JAMAIS présentée comme « libre de droits » si sa licence n'a pas été établie : soit par les
 * conditions de la plateforme pour tout son contenu (Pexels, Pixabay), soit par la licence du résultat lui-même
 * (Openverse, uniquement CC0 et domaine public demandés). Les licences ne couvrent pas le droit à l'image des
 * personnes reconnaissables ni les marques visibles : c'est rappelé dans les restrictions conservées avec l'image.
 */
import { activeProviderKey } from "../ai/config";
import { searchSource, type Orientation } from "../stock/photos";
import type { LicenseInfo, StockCandidate } from "./types";

export type StockProvider = {
  id: string;
  label: string;
  /** Source utilisable maintenant (clé gratuite enregistrée, ou sans clé). */
  available: () => boolean;
  capabilities: {
    orientation: boolean;
    /** Langues de recherche acceptées (la plus fiable en premier). */
    languages: ("en" | "fr")[];
    /** L'API accepte-t-elle des termes d'exclusion ? Sinon : exclusions appliquées au classement et au contrôle. */
    negativeTerms: boolean;
    perPage: number;
  };
  /** Métadonnées fournies avec chaque résultat (base du classement gratuit). */
  metadata: ("title" | "tags" | "alt" | "author" | "dimensions" | "license")[];
  /** Licence d'un résultat (plateforme ou résultat). */
  license: (raw: { license?: string }) => LicenseInfo;
  formats: string[];
  /** Limites de requêtes déclarées (documentation publique de la source, à revérifier en cas de changement). */
  rateLimit: string;
  search: (query: string, orientation: Orientation, lang: "en" | "fr") => Promise<StockCandidate[]>;
};

const PEOPLE_AND_MARKS = "personnes reconnaissables et marques visibles : autorisations (droit à l'image, marques) non couvertes par la licence";

export const PEXELS_LICENSE: LicenseInfo = {
  name: "Licence Pexels",
  url: "https://www.pexels.com/license/",
  verifiedBy: "platform_terms",
  commercialUse: true,
  attributionRequired: false,
  restrictions: ["ne pas revendre la photo telle quelle", "ne pas laisser croire qu'une personne ou une marque de la photo recommande le produit", PEOPLE_AND_MARKS],
};

export const PIXABAY_LICENSE: LicenseInfo = {
  name: "Licence de contenu Pixabay",
  url: "https://pixabay.com/service/license-summary/",
  verifiedBy: "platform_terms",
  commercialUse: true,
  attributionRequired: false,
  restrictions: ["ne pas revendre ni redistribuer la photo seule, telle quelle", "ne pas présenter des personnes de façon offensante ou trompeuse", PEOPLE_AND_MARKS],
};

/** Openverse : licence du RÉSULTAT ; seules CC0 et domaine public (PDM) sont acceptées sans vérification humaine. */
export function openverseLicense(raw: { license?: string }): LicenseInfo {
  const l = String(raw.license ?? "").toLowerCase();
  if (l === "cc0" || l === "pdm")
    return {
      name: l === "cc0" ? "CC0 1.0 (domaine public)" : "Marque du domaine public (PDM)",
      url: l === "cc0" ? "https://creativecommons.org/publicdomain/zero/1.0/" : "https://creativecommons.org/publicdomain/mark/1.0/",
      verifiedBy: "result_license",
      commercialUse: true,
      attributionRequired: false,
      restrictions: ["licence déclarée par la source d'origine (Openverse ne la garantit pas)", PEOPLE_AND_MARKS],
    };
  return { name: l ? l.toUpperCase() : "inconnue", url: null, verifiedBy: "unverified", commercialUse: null, attributionRequired: null, restrictions: ["licence non vérifiée : ne pas utiliser sans contrôle humain"] };
}

/** Tests automatiques : jamais d'appel aux banques réelles (même règle que les recherches existantes). */
const offline = () => process.env.STOCK_OFFLINE === "1";

const toCandidates = async (source: "pexels" | "pixabay" | "openverse", query: string, orientation: Orientation, lang: "en" | "fr", license: (raw: { license?: string }) => LicenseInfo): Promise<StockCandidate[]> =>
  (offline() ? [] : await searchSource(source, query, orientation, lang)).map((p) => ({ source: p.source, id: p.id, url: p.url, page: p.page, author: p.author, width: p.width, height: p.height, alt: p.alt, license: license({ license: p.license }), query }));

export const STOCK_PROVIDERS: StockProvider[] = [
  {
    id: "pexels",
    label: "Pexels",
    available: () => !!activeProviderKey("pexels"),
    capabilities: { orientation: true, languages: ["en", "fr"], negativeTerms: false, perPage: 15 },
    metadata: ["alt", "author", "dimensions"],
    license: () => PEXELS_LICENSE,
    formats: ["jpeg"],
    rateLimit: "200 requêtes par heure et 20 000 par mois (documentation Pexels)",
    search: (q, o, lang) => toCandidates("pexels", q, o, lang, () => PEXELS_LICENSE),
  },
  {
    id: "pixabay",
    label: "Pixabay",
    available: () => !!activeProviderKey("pixabay"),
    capabilities: { orientation: true, languages: ["en", "fr"], negativeTerms: false, perPage: 20 },
    metadata: ["tags", "author", "dimensions"],
    license: () => PIXABAY_LICENSE,
    formats: ["jpeg", "png"],
    rateLimit: "100 requêtes par minute (documentation Pixabay)",
    search: (q, o, lang) => toCandidates("pixabay", q, o, lang, () => PIXABAY_LICENSE),
  },
  {
    id: "openverse",
    label: "Openverse",
    available: () => true,
    // Recherche en anglais (métadonnées surtout anglaises), sans filtre d'orientation côté API.
    capabilities: { orientation: false, languages: ["en"], negativeTerms: false, perPage: 20 },
    metadata: ["title", "author", "dimensions", "license"],
    license: openverseLicense,
    formats: ["jpeg", "png"],
    rateLimit: "accès anonyme limité par Openverse (limites non vérifiées ici)",
    search: (q, o, lang) => toCandidates("openverse", q, o, lang, openverseLicense),
  },
];

/** Licence établie d'une photo trouvée par les recherches existantes (source + licence déclarée). */
export function licenseOf(source: string, license: string): LicenseInfo {
  if (source === "pexels") return PEXELS_LICENSE;
  if (source === "pixabay") return PIXABAY_LICENSE;
  return openverseLicense({ license });
}

/** Licence suffisante pour une utilisation automatique (établie, usage commercial non exclu). */
export const licenseUsable = (l: LicenseInfo) => l.verifiedBy !== "unverified" && l.commercialUse !== false;

/** Mention conservée avec l'image (crédit de l'auteur, même quand la licence ne l'exige pas). */
export function creditLine(c: Pick<StockCandidate, "source" | "author" | "license">, lang: "fr" | "en" = "fr"): string {
  const usable = licenseUsable(c.license);
  return lang === "fr"
    ? `${usable ? "Photo libre de droits" : "Photo à licence NON vérifiée"} (${c.license.name}${c.source === "openverse" ? ", via Openverse" : ""})${c.author ? `, ${c.author}` : ""} — illustration, pas une photo de vos réalisations`
    : `${usable ? "Royalty-free photo" : "Photo with UNVERIFIED licence"} (${c.license.name}${c.source === "openverse" ? ", via Openverse" : ""})${c.author ? `, ${c.author}` : ""} — illustration, not a photo of your work`;
}
