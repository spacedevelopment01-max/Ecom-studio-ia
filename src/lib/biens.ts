/**
 * Biens immobiliers d'un projet (thème Maison & Horizon, issue #172).
 *
 * Une fiche par bien, saisie une seule fois dans l'onglet « Biens » du studio : elle alimente l'accueil, les listes
 * d'achat et de location, la carte, la fiche du bien, les favoris, les biens similaires et l'export, sans toucher au
 * thème. États : brouillon → publié (visible dans le site du projet) ↔ retiré de l'affichage ; vendu / loué (fiche
 * conservée avec la mention) ; archivé (hors de tout affichage, jamais effacé).
 * « Publier » rend le bien visible dans le contenu du projet et de son export : aucun hébergement n'est lancé ici.
 *
 * Contrôles côté serveur : projet du compte (route), photos et plan pris dans les médias de CE projet uniquement,
 * référence unique dans le projet, et un bien ne se publie que s'il a un titre, une ville, une photo, une surface et
 * son prix (vente) ou son loyer (location). Rien n'est inventé : un champ vide reste vide (« à renseigner » à l'écran).
 */
import { z } from "zod";
import { HttpError } from "./auth";
import { all, id as newId, json, now, one, run, tx } from "./db";
import { L } from "./i18n-server";
import { slugify } from "./blog-html";
import type { StoreBien, ThemeSpec } from "./theme/spec";

export const BIEN_TRANSACTIONS = ["vente", "location"] as const;
export const BIEN_STATUSES = ["draft", "published", "withdrawn", "sold", "rented", "archived"] as const;
export const BIEN_TYPES = ["maison", "appartement", "villa", "loft", "propriete", "mas", "terrain", "autre"] as const;
export const BIEN_EXTERIORS = ["jardin", "terrasse", "balcon", "cour"] as const;
export const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;

export type BienTransaction = (typeof BIEN_TRANSACTIONS)[number];
export type BienStatus = (typeof BIEN_STATUSES)[number];

const photo = z.object({ assetId: z.string().min(1).max(40), alt: z.string().trim().max(200).default("") });
const money = z.number().int().min(0).max(1_000_000_000).nullable();
const short = (max: number) => z.string().trim().max(max);

/** Données saisies d'un bien (tout est facultatif en brouillon ; la publication exige l'essentiel). */
export const bienDataSchema = z.object({
  title: short(120).default(""),
  /** Titre d'ouverture de la fiche (facultatif) : sinon le titre du bien. */
  headline: short(140).default(""),
  type: z.enum(BIEN_TYPES).default("maison"),
  summary: short(180).default(""),
  description: short(6000).default(""),
  city: short(80).default(""),
  postalCode: short(12).default(""),
  sector: short(80).default(""),
  address: short(160).default(""),
  /** Adresse publiée : secteur seulement (par défaut), adresse exacte, ou rien. */
  addressVisibility: z.enum(["secteur", "exacte", "masquee"]).default("secteur"),
  price: money.default(null),
  rent: money.default(null),
  charges: money.default(null),
  deposit: money.default(null),
  fees: short(200).default(""),
  surface: z.number().min(0).max(100_000).nullable().default(null),
  land: z.number().min(0).max(10_000_000).nullable().default(null),
  rooms: z.number().int().min(0).max(200).nullable().default(null),
  bedrooms: z.number().int().min(0).max(200).nullable().default(null),
  floor: short(40).default(""),
  furnished: z.boolean().nullable().default(null),
  exteriors: z.array(z.enum(BIEN_EXTERIORS)).max(4).default([]),
  pool: z.boolean().default(false),
  features: z.array(short(40).min(1)).max(40).default([]),
  availability: short(60).default(""),
  dpe: z.enum(ENERGY_CLASSES).nullable().default(null),
  ges: z.enum(ENERGY_CLASSES).nullable().default(null),
  propertyTax: short(60).default(""),
  photos: z.array(photo).max(40).default([]),
  plan: photo.nullable().default(null),
  neighborhood: z.object({ text: short(1200).default(""), photos: z.array(photo).max(4).default([]), places: z.array(z.object({ label: short(60).min(1), detail: short(60).default("") })).max(6).default([]) }).default({ text: "", photos: [], places: [] }),
  /** Position sur la carte illustrative du thème (0 à 100) : jamais une adresse géolocalisée. */
  map: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable().default(null),
  featured: z.boolean().default(false),
  exceptional: z.boolean().default(false),
  /** Bien et prix d'exemple (démonstration) : annoncé comme tel sur le site. */
  demo: z.boolean().default(false),
});
export type BienData = z.infer<typeof bienDataSchema>;

type BienRow = { id: string; project_id: string; user_id: string; ref: string; transaction_type: BienTransaction; status: BienStatus; position: number; data_json: string; created_at: number; updated_at: number; published_at: number | null };
export type Bien = { id: string; ref: string; handle: string; transaction: BienTransaction; status: BienStatus; position: number; data: BienData; createdAt: number; updatedAt: number; publishedAt: number | null };

const toBien = (r: BienRow): Bien => {
  const raw = json<Record<string, unknown>>(r.data_json, {});
  const data = bienDataSchema.parse(raw);
  return { id: r.id, ref: r.ref, handle: String(raw.handle ?? "") || bienHandle(data.title, r.ref), transaction: r.transaction_type, status: r.status, position: r.position, data, createdAt: r.created_at, updatedAt: r.updated_at, publishedAt: r.published_at };
};

/** Adresse de la fiche : titre puis référence (stable : fixée à la première publication). */
export const bienHandle = (title: string, ref: string) => [slugify(title).slice(0, 60), ref.toLowerCase()].filter(Boolean).join("-").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export function listBiens(projectId: string, opts: { archived?: boolean } = {}): Bien[] {
  return all<BienRow>(`SELECT * FROM biens WHERE project_id = ? ${opts.archived ? "" : "AND status != 'archived'"} ORDER BY position, created_at`, projectId).map(toBien);
}

export function getBien(projectId: string, bienId: string): Bien {
  const r = one<BienRow>("SELECT * FROM biens WHERE id = ? AND project_id = ?", bienId, projectId);
  if (!r) throw new HttpError(404, L("Bien introuvable dans ce projet.", "Property not found in this project."));
  return toBien(r);
}

/** Photos et plan : uniquement des images de CE projet, non supprimées. */
function assertMedia(projectId: string, data: BienData) {
  const ids = [...data.photos, ...(data.plan ? [data.plan] : []), ...data.neighborhood.photos].map((p) => p.assetId);
  for (const assetId of new Set(ids)) {
    const a = one<{ kind: string; mime: string }>("SELECT kind, mime FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", assetId, projectId);
    if (!a || a.kind !== "image") throw new HttpError(400, L("Une photo choisie n'appartient pas aux médias de ce projet.", "A chosen photo is not one of this project's media."));
  }
  if (new Set(data.photos.map((p) => p.assetId)).size !== data.photos.length) throw new HttpError(400, L("La même photo apparaît deux fois dans la galerie du bien.", "The same photo appears twice in the property's gallery."));
}

/** Ce qui manque pour publier (vide = publiable). */
export function missingForPublication(transaction: BienTransaction, d: BienData): string[] {
  const miss: string[] = [];
  if (!d.title) miss.push(L("le titre", "the title"));
  if (!d.city) miss.push(L("la ville", "the city"));
  if (!d.photos.length) miss.push(L("au moins une photo", "at least one photo"));
  if (!d.surface) miss.push(L("la surface", "the floor area"));
  if (transaction === "vente" && d.price == null) miss.push(L("le prix de vente", "the sale price"));
  if (transaction === "location" && d.rent == null) miss.push(L("le loyer hors charges", "the rent excluding charges"));
  return miss;
}

/** Prochaine référence libre : V-0001 (vente) ou L-0001 (location). */
function nextRef(projectId: string, transaction: BienTransaction): string {
  const prefix = transaction === "vente" ? "V" : "L";
  const used = new Set(all<{ ref: string }>("SELECT ref FROM biens WHERE project_id = ?", projectId).map((r) => r.ref));
  for (let i = 1; ; i++) { const ref = `${prefix}-${String(i).padStart(4, "0")}`; if (!used.has(ref)) return ref; }
}

export const refSchema = z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "référence : lettres, chiffres, - ou _");

export function createBien(userId: string, projectId: string, input: { transaction: BienTransaction; ref?: string; data?: unknown }): Bien {
  const data = bienDataSchema.parse(input.data ?? {});
  assertMedia(projectId, data);
  return tx(() => {
    const ref = input.ref ? refSchema.parse(input.ref) : nextRef(projectId, input.transaction);
    if (one("SELECT 1 FROM biens WHERE project_id = ? AND ref = ?", projectId, ref)) throw new HttpError(409, L(`La référence ${ref} est déjà utilisée dans ce projet.`, `Reference ${ref} is already used in this project.`));
    const id = newId(), t = now();
    const position = (one<{ p: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM biens WHERE project_id = ?", projectId)?.p ?? 0);
    run("INSERT INTO biens (id, project_id, user_id, ref, transaction_type, status, position, data_json, created_at, updated_at) VALUES (?,?,?,?,?,'draft',?,?,?,?)", id, projectId, userId, ref, input.transaction, position, JSON.stringify(data), t, t);
    return getBien(projectId, id);
  });
}

/** Modification (brouillon ou en ligne) : les champs envoyés remplacent les anciens ; l'adresse de la fiche ne change pas. */
export function updateBien(projectId: string, bienId: string, patch: { transaction?: BienTransaction; data?: Record<string, unknown> }): Bien {
  const cur = getBien(projectId, bienId);
  const data = bienDataSchema.parse({ ...cur.data, ...(patch.data ?? {}) });
  assertMedia(projectId, data);
  const transaction = patch.transaction ?? cur.transaction;
  if (["published", "sold", "rented"].includes(cur.status)) {
    const miss = missingForPublication(transaction, data);
    if (miss.length) throw new HttpError(400, L(`Ce bien est en ligne : il lui faut ${miss.join(", ")}. Retirez-le de l'affichage pour l'enregistrer incomplet.`, `This property is live: it needs ${miss.join(", ")}. Withdraw it to save it incomplete.`));
  }
  const stored = { ...data, handle: cur.publishedAt ? cur.handle : undefined };
  run("UPDATE biens SET transaction_type = ?, data_json = ?, updated_at = ? WHERE id = ? AND project_id = ?", transaction, JSON.stringify(stored), now(), bienId, projectId);
  return getBien(projectId, bienId);
}

/** Changement d'état. Publier exige une fiche complète ; « vendu » ne vaut que pour une vente, « loué » pour une location. */
export function setBienStatus(projectId: string, bienId: string, status: BienStatus): Bien {
  const cur = getBien(projectId, bienId);
  if (status === "sold" && cur.transaction !== "vente") throw new HttpError(400, L("« Vendu » concerne un bien à vendre.", "“Sold” applies to a property for sale."));
  if (status === "rented" && cur.transaction !== "location") throw new HttpError(400, L("« Loué » concerne un bien à louer.", "“Let” applies to a property for rent."));
  if (["published", "sold", "rented"].includes(status)) {
    const miss = missingForPublication(cur.transaction, cur.data);
    if (miss.length) throw new HttpError(400, L(`Pour publier ce bien, il manque : ${miss.join(", ")}.`, `To publish this property, add: ${miss.join(", ")}.`));
  }
  const t = now();
  const firstPublication = status === "published" && !cur.publishedAt;
  const data = { ...cur.data, handle: firstPublication || cur.publishedAt ? cur.handle : undefined };
  run("UPDATE biens SET status = ?, data_json = ?, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ? AND project_id = ?", status, JSON.stringify(data), firstPublication ? t : null, t, bienId, projectId);
  return getBien(projectId, bienId);
}

/** Nouvel ordre d'affichage (les biens non cités gardent leur place après les autres). */
export function reorderBiens(projectId: string, ids: string[]) {
  tx(() => ids.forEach((bid, i) => run("UPDATE biens SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?", i, now(), bid, projectId)));
}

/** Biens visibles sur le site : publiés, puis vendus / loués (fiche conservée avec la mention). */
export const VISIBLE_STATUSES: BienStatus[] = ["published", "sold", "rented"];

const ext = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/svg+xml" ? "svg" : "jpg");

/** Les biens visibles du projet, prêts pour le thème, et les fichiers de leurs photos (nom → média du projet). */
export function storeBiens(projectId: string, opts: { preview?: string | null } = {}): { biens: StoreBien[]; files: Record<string, string> } {
  const files: Record<string, string> = {};
  const mime = (assetId: string) => one<{ mime: string }>("SELECT mime FROM assets WHERE id = ?", assetId)?.mime ?? "image/jpeg";
  const file = (p: { assetId: string; alt: string }) => { const name = `es-bien-${p.assetId}.${ext(mime(p.assetId))}`; files[name] = p.assetId; return { file: name, alt: p.alt }; };
  // Aperçu d'un brouillon ou d'un bien retiré depuis l'onglet Biens : ce bien seul s'ajoute, le temps de l'aperçu.
  const biens = listBiens(projectId).filter((b) => VISIBLE_STATUSES.includes(b.status) || (opts.preview && b.id === opts.preview)).map((b): StoreBien => {
    const d = b.data;
    return {
      ref: b.ref, handle: b.handle, transaction: b.transaction, status: b.status, type: d.type, title: d.title, headline: d.headline, summary: d.summary, description: d.description,
      city: d.city, postalCode: d.postalCode, sector: d.sector, address: d.addressVisibility === "exacte" ? d.address : "", price: d.price, rent: d.rent, charges: d.charges,
      deposit: d.deposit, fees: d.fees, surface: d.surface, land: d.land, rooms: d.rooms, bedrooms: d.bedrooms, floor: d.floor, furnished: d.furnished, exteriors: d.exteriors,
      pool: d.pool, features: d.features, availability: d.availability, dpe: d.dpe, ges: d.ges, propertyTax: d.propertyTax, photos: d.photos.map(file), plan: d.plan ? file(d.plan) : null,
      neighborhood: { text: d.neighborhood.text, photos: d.neighborhood.photos.map(file), places: d.neighborhood.places }, map: d.map, featured: d.featured, exceptional: d.exceptional, demo: d.demo,
    };
  });
  return { biens, files };
}

/** Copie du thème avec les biens du projet (aperçu, export, démonstration) ; le thème enregistré n'est jamais modifié. */
export function withBiens(spec: ThemeSpec, projectId: string, opts: { preview?: string | null } = {}): ThemeSpec {
  const { biens, files } = storeBiens(projectId, opts);
  if (!biens.length && !spec.store.biens) return spec;
  return { ...spec, files: { ...spec.files, ...files }, store: { ...spec.store, biens } };
}
