import "server-only";

/**
 * Annuaire de l'administration (DILA / service-public.gouv.fr), Licence Ouverte 2.0.
 * Jeu de données « api-lannuaire-administration » sur l'API Opendatasoft (explore v2.1).
 * Plusieurs champs de ce jeu sont des chaînes JSON : on les décode prudemment.
 * Aucune coordonnée n'est jamais fabriquée : un champ absent reste absent.
 */
const BASE = process.env.ANNUAIRE_API_BASE ?? "https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1";
const DATASET = "api-lannuaire-administration";
export const ANNUAIRE_SITE = "https://lannuaire.service-public.gouv.fr/";
const GEO = process.env.GEOCODAGE_API_BASE ?? "https://data.geopf.fr/geocodage";

export type Office = {
  id: string;
  nom: string;
  type: string | null;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  telephone: string | null;
  horaires: string[];
  siteInternet: string | null;
  urlServicePublic: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  miseAJour: string | null;
  source: string;
};

/** Types d'organismes proposés (codes « pivot » de l'annuaire). */
export const ORGANISM_PIVOTS: Record<string, { label: string; pivot: string; espace?: { label: string; url: string } }> = {
  france_services: { label: "France Services", pivot: "france_services" },
  caf: { label: "CAF", pivot: "caf", espace: { label: "Mon compte sur caf.fr", url: "https://www.caf.fr/" } },
  cpam: { label: "CPAM (Assurance maladie)", pivot: "cpam", espace: { label: "Mon compte ameli", url: "https://www.ameli.fr/" } },
  impots: { label: "Centre des finances publiques", pivot: "sip", espace: { label: "Espace particulier impots.gouv.fr", url: "https://www.impots.gouv.fr/" } },
  mairie: { label: "Mairie", pivot: "mairie" },
  urssaf: { label: "URSSAF", pivot: "urssaf", espace: { label: "urssaf.fr", url: "https://www.urssaf.fr/" } },
  france_travail: { label: "France Travail", pivot: "france_travail", espace: { label: "francetravail.fr", url: "https://www.francetravail.fr/" } },
  prefecture: { label: "Préfecture", pivot: "prefecture" },
  carsat: { label: "Retraite (Carsat)", pivot: "carsat", espace: { label: "info-retraite.fr", url: "https://www.info-retraite.fr/" } },
};

function parseJsonField<T = unknown>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Convertit un enregistrement brut de l'annuaire en fiche lisible (exportée pour les tests). */
export function normalizeRecord(r: Record<string, unknown>, origin?: [number, number]): Office {
  const adresses = parseJsonField<Record<string, unknown>[]>(r.adresse) ?? [];
  const adr = adresses.find((a) => /physique|postale/i.test(String(a.type_adresse ?? ""))) ?? adresses[0] ?? {};
  const tels = parseJsonField<Record<string, unknown>[]>(r.telephone) ?? [];
  const sites = parseJsonField<Record<string, unknown>[]>(r.site_internet) ?? [];
  const plages = parseJsonField<Record<string, unknown>[]>(r.plage_ouverture) ?? [];
  const pivots = parseJsonField<Record<string, unknown>[]>(r.pivot) ?? [];
  const lat = Number(adr.latitude);
  const lon = Number(adr.longitude);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0;
  const horaires = plages
    .map((p) => {
      const jours = [p.nom_jour_debut, p.nom_jour_fin].filter(Boolean).join(" au ");
      const h = [
        [p.valeur_heure_debut_1, p.valeur_heure_fin_1],
        [p.valeur_heure_debut_2, p.valeur_heure_fin_2],
      ]
        .filter(([d, f]) => d && f)
        .map(([d, f]) => `${String(d).slice(0, 5)}–${String(f).slice(0, 5)}`)
        .join(", ");
      const extra = asString(p.commentaire);
      return [jours, h, extra].filter(Boolean).join(" : ");
    })
    .filter(Boolean);
  const line = [adr.numero_voie, adr.complement1, adr.complement2, adr.service_distribution].map(asString).filter(Boolean).join(", ");
  return {
    id: String(r.id ?? ""),
    nom: asString(r.nom) ?? "Organisme",
    type: asString(pivots[0]?.type_service_local) ?? null,
    adresse: line || null,
    codePostal: asString(adr.code_postal),
    commune: asString(adr.nom_commune),
    telephone: asString(tels[0]?.valeur),
    horaires,
    siteInternet: asString(sites[0]?.valeur),
    urlServicePublic: asString(r.url_service_public),
    latitude: hasGeo ? lat : null,
    longitude: hasGeo ? lon : null,
    distanceKm: hasGeo && origin ? Math.round(haversineKm(origin, [lat, lon]) * 10) / 10 : null,
    miseAJour: asString(r.date_modification),
    source: "Annuaire de l'administration – service-public.gouv.fr (Licence Ouverte 2.0)",
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Annuaire : réponse ${res.status}`);
  return res.json();
}

export type AnnuaireResult = { ok: true; offices: Office[]; place: string | null } | { ok: false; message: string };

/** Géocode un code postal (ou des coordonnées) via le service public de géocodage de l'IGN. */
async function locate(input: { postalCode?: string; lat?: number; lon?: number }): Promise<{ postalCode: string; city: string; coords: [number, number] } | null> {
  try {
    if (input.lat != null && input.lon != null) {
      const data = (await fetchJson(`${GEO}/reverse?lat=${input.lat}&lon=${input.lon}&limit=1`)) as { features?: { properties: Record<string, string> }[] };
      const p = data.features?.[0]?.properties;
      return p ? { postalCode: p.postcode, city: p.city, coords: [input.lat, input.lon] } : null;
    }
    if (input.postalCode) {
      const data = (await fetchJson(`${GEO}/search?q=${encodeURIComponent(input.postalCode)}&type=municipality&limit=1`)) as {
        features?: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }[];
      };
      const f = data.features?.[0];
      return f ? { postalCode: input.postalCode, city: f.properties.city, coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]] } : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function searchOffices(kind: keyof typeof ORGANISM_PIVOTS, input: { postalCode?: string; lat?: number; lon?: number }): Promise<AnnuaireResult> {
  const def = ORGANISM_PIVOTS[kind];
  if (!def) return { ok: false, message: "Type d'organisme inconnu." };
  if (input.postalCode && !/^\d{5}$/.test(input.postalCode)) return { ok: false, message: "Code postal invalide (5 chiffres)." };
  const place = await locate(input);
  const cp = place?.postalCode ?? input.postalCode;
  if (!cp) return { ok: false, message: "Indiquez un code postal." };
  const dept = cp.startsWith("97") ? cp.slice(0, 3) : cp.slice(0, 2);
  const where = `search(pivot, "${def.pivot}") and search(adresse, "${dept}")`;
  const url = `${BASE}/catalog/datasets/${DATASET}/records?where=${encodeURIComponent(where)}&limit=100`;
  try {
    const data = (await fetchJson(url)) as { results?: Record<string, unknown>[] };
    const offices = (data.results ?? [])
      .map((r) => normalizeRecord(r, place?.coords))
      .filter((o) => !o.codePostal || o.codePostal.startsWith(dept));
    offices.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || (a.codePostal === cp ? -1 : 0));
    return { ok: true, offices: offices.slice(0, 6), place: place ? `${place.city} (${place.postalCode})` : cp };
  } catch {
    return {
      ok: false,
      message: "L'annuaire officiel ne répond pas pour le moment. Vous pouvez chercher directement sur lannuaire.service-public.gouv.fr.",
    };
  }
}

/** Compare une adresse extraite d'un courrier et une adresse d'annuaire (contradiction ⇒ vérification). */
export function addressesConflict(a: { postalCode?: string | null; line?: string | null }, b: { postalCode?: string | null; line?: string | null }): boolean {
  const norm = (s?: string | null) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  if (a.postalCode && b.postalCode && a.postalCode !== b.postalCode) return true;
  if (a.line && b.line && norm(a.line) !== norm(b.line)) return true;
  return false;
}
