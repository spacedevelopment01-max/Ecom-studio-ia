/**
 * Carte d'un restaurant (#239, phase 2) : catégories et plats saisis une fois dans le studio (onglet Carte), injectés au
 * rendu dans les sections existantes du thème TABLE SAISON (`ts-menu`, `ts-dishes`) — aperçu, export, site hébergé —
 * comme les biens immobiliers. Le thème enregistré n'est jamais modifié ; sans carte publiée, rien n'est injecté (les
 * démonstrations restent identiques au pixel).
 *
 * - États d'un plat : brouillon (studio seulement) → publié ↔ retiré ; « indisponible » le masque du site sans le
 *   supprimer ; archivé (hors de tout affichage, jamais effacé).
 * - Allergènes et mentions : déclarés par le restaurateur, affichés tels quels ; le studio ne vérifie ni ne certifie rien.
 * - Photos : uniquement des images de CE projet. Aucune commande, caisse, livraison ni paiement.
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { all, id as newId, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import type { SectionInstance, ThemeSpec } from "../theme/spec";

let ready = false;
function ensureCarteTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS carte_categories (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, position INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  run("CREATE INDEX IF NOT EXISTS carte_categories_project ON carte_categories(project_id, position)");
  run(`CREATE TABLE IF NOT EXISTS carte_items (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    price REAL, price_text TEXT NOT NULL DEFAULT '', vegetarian INTEGER NOT NULL DEFAULT 0, allergens TEXT NOT NULL DEFAULT '',
    available INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, photo TEXT, status TEXT NOT NULL, position INTEGER NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  run("CREATE INDEX IF NOT EXISTS carte_items_project ON carte_items(project_id, category_id, position)");
  ready = true;
}

export const ITEM_STATUSES = ["draft", "published", "withdrawn", "archived"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type CarteCategory = { id: string; title: string; position: number };
export type CarteItem = { id: string; categoryId: string; name: string; description: string; price: number | null; priceText: string; vegetarian: boolean; allergens: string; available: boolean; featured: boolean; photo: string | null; status: ItemStatus; position: number; updatedAt: number };
type ItemRow = { id: string; category_id: string; name: string; description: string; price: number | null; price_text: string; vegetarian: number; allergens: string; available: number; featured: number; photo: string | null; status: ItemStatus; position: number; updated_at: number };
const toItem = (r: ItemRow): CarteItem => ({ id: r.id, categoryId: r.category_id, name: r.name, description: r.description, price: r.price, priceText: r.price_text, vegetarian: !!r.vegetarian, allergens: r.allergens, available: !!r.available, featured: !!r.featured, photo: r.photo, status: r.status, position: r.position, updatedAt: r.updated_at });

export const itemSchema = z.object({
  categoryId: z.string().max(40),
  name: z.string().trim().min(1, "nom du plat").max(120),
  description: z.string().max(400).default(""),
  price: z.number().min(0).max(100000).nullable().default(null),
  priceText: z.string().max(40).default(""),
  vegetarian: z.boolean().default(false),
  allergens: z.string().max(200).default(""),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  photo: z.string().max(40).nullable().default(null),
});

export function listCarte(projectId: string, opts: { archived?: boolean } = {}) {
  ensureCarteTables();
  const categories = all<CarteCategory>("SELECT id, title, position FROM carte_categories WHERE project_id = ? ORDER BY position, created_at", projectId);
  const items = all<ItemRow>(`SELECT * FROM carte_items WHERE project_id = ? ${opts.archived ? "" : "AND status != 'archived'"} ORDER BY position, created_at`, projectId).map(toItem);
  return { categories, items };
}

function assertPhoto(projectId: string, photo: string | null) {
  if (!photo) return;
  const a = one<{ kind: string }>("SELECT kind FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", photo, projectId);
  if (!a || a.kind !== "image") throw new HttpError(400, L("La photo choisie n'appartient pas aux médias de ce projet.", "The chosen photo is not one of this project's media."));
}
function assertCategory(projectId: string, categoryId: string) {
  if (!one("SELECT 1 FROM carte_categories WHERE id = ? AND project_id = ?", categoryId, projectId)) throw new HttpError(404, L("Catégorie introuvable.", "Category not found."));
}

export function addCategory(projectId: string, title: string): CarteCategory {
  ensureCarteTables();
  const t = z.string().trim().min(1).max(60).parse(title);
  const position = one<{ p: number }>("SELECT COALESCE(MAX(position), -1) + 1 p FROM carte_categories WHERE project_id = ?", projectId)!.p;
  const cid = newId();
  run("INSERT INTO carte_categories (id, project_id, title, position, created_at, updated_at) VALUES (?,?,?,?,?,?)", cid, projectId, t, position, now(), now());
  return { id: cid, title: t, position };
}
export function renameCategory(projectId: string, categoryId: string, title: string) {
  ensureCarteTables(); assertCategory(projectId, categoryId);
  run("UPDATE carte_categories SET title = ?, updated_at = ? WHERE id = ? AND project_id = ?", z.string().trim().min(1).max(60).parse(title), now(), categoryId, projectId);
}
/** Suppression d'une catégorie vide seulement (les plats ne sont jamais effacés en cascade). */
export function deleteCategory(projectId: string, categoryId: string) {
  ensureCarteTables(); assertCategory(projectId, categoryId);
  if (one("SELECT 1 FROM carte_items WHERE category_id = ? AND project_id = ? AND status != 'archived'", categoryId, projectId)) throw new HttpError(409, L("Cette catégorie contient encore des plats : déplacez-les ou archivez-les d'abord.", "This category still has dishes: move or archive them first."));
  run("DELETE FROM carte_categories WHERE id = ? AND project_id = ?", categoryId, projectId);
}
export function reorderCategories(projectId: string, ids: string[]) {
  ensureCarteTables();
  tx(() => ids.forEach((cid, i) => run("UPDATE carte_categories SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?", i, now(), cid, projectId)));
}

export function createItem(projectId: string, raw: unknown): CarteItem {
  ensureCarteTables();
  const d = itemSchema.parse(raw);
  assertCategory(projectId, d.categoryId);
  assertPhoto(projectId, d.photo);
  const iid = newId();
  const position = one<{ p: number }>("SELECT COALESCE(MAX(position), -1) + 1 p FROM carte_items WHERE project_id = ? AND category_id = ?", projectId, d.categoryId)!.p;
  run("INSERT INTO carte_items (id, project_id, category_id, name, description, price, price_text, vegetarian, allergens, available, featured, photo, status, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?)",
    iid, projectId, d.categoryId, d.name, d.description, d.price, d.priceText, d.vegetarian ? 1 : 0, d.allergens, d.available ? 1 : 0, d.featured ? 1 : 0, d.photo, position, now(), now());
  return getItem(projectId, iid);
}
export function getItem(projectId: string, itemId: string): CarteItem {
  ensureCarteTables();
  const r = one<ItemRow>("SELECT * FROM carte_items WHERE id = ? AND project_id = ?", itemId, projectId);
  if (!r) throw new HttpError(404, L("Plat introuvable dans ce projet.", "Dish not found in this project."));
  return toItem(r);
}
export function updateItem(projectId: string, itemId: string, raw: unknown): CarteItem {
  const cur = getItem(projectId, itemId);
  const d = itemSchema.parse({ ...cur, ...(raw as object) });
  assertCategory(projectId, d.categoryId);
  assertPhoto(projectId, d.photo);
  if (cur.status === "published" && d.price == null && !d.priceText.trim()) throw new HttpError(400, L("Ce plat est en ligne : indiquez un prix ou une mention (« selon arrivage »), ou retirez-le d'abord.", "This dish is live: enter a price or a note (“market price”), or withdraw it first."));
  run("UPDATE carte_items SET category_id = ?, name = ?, description = ?, price = ?, price_text = ?, vegetarian = ?, allergens = ?, available = ?, featured = ?, photo = ?, updated_at = ? WHERE id = ? AND project_id = ?",
    d.categoryId, d.name, d.description, d.price, d.priceText, d.vegetarian ? 1 : 0, d.allergens, d.available ? 1 : 0, d.featured ? 1 : 0, d.photo, now(), itemId, projectId);
  return getItem(projectId, itemId);
}
/** Publier exige un nom et un prix (ou une mention de prix). */
export function setItemStatus(projectId: string, itemId: string, status: ItemStatus): CarteItem {
  const cur = getItem(projectId, itemId);
  if (status === "published" && cur.price == null && !cur.priceText.trim()) throw new HttpError(400, L("Pour publier ce plat, indiquez son prix ou une mention (« selon arrivage »).", "To publish this dish, enter its price or a note (“market price”)."));
  run("UPDATE carte_items SET status = ?, updated_at = ? WHERE id = ? AND project_id = ?", status, now(), itemId, projectId);
  return getItem(projectId, itemId);
}
export function reorderItems(projectId: string, ids: string[]) {
  ensureCarteTables();
  tx(() => ids.forEach((iid, i) => run("UPDATE carte_items SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?", i, now(), iid, projectId)));
}

/** Prix affiché : « 14 € », « 14,50 € » ; la mention l'emporte si elle est saisie. */
export const carteprice = (i: Pick<CarteItem, "price" | "priceText">) => i.priceText.trim() || (i.price == null ? "" : `${i.price % 1 ? i.price.toFixed(2).replace(".", ",") : i.price} €`);
const describe = (i: CarteItem) => [i.description.trim(), i.allergens.trim() ? `Allergènes : ${i.allergens.trim()}` : ""].filter(Boolean).join(" · ");
const ext = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
/** Plats visibles : publiés et disponibles ; en aperçu d'un plat donné, celui-ci s'ajoute même en brouillon. */
const visible = (i: CarteItem, preview?: string | null) => (i.status === "published" && i.available) || (!!preview && i.id === preview && i.status !== "archived");

/** Le projet a-t-il une carte publiée (sinon rien n'est injecté) ? */
export function hasCarte(projectId: string) {
  ensureCarteTables();
  return !!one("SELECT 1 FROM carte_items WHERE project_id = ? AND status = 'published'", projectId);
}

/**
 * Copie du thème avec la carte du projet dans `ts-menu` (catégories et plats) et `ts-dishes` (sélection du moment,
 * plats mis en avant avec photo, 6 au plus) ; la page de la carte cesse d'être un brouillon. Thème enregistré intact.
 */
export function withCarte(spec: ThemeSpec, projectId: string, opts: { preview?: string | null } = {}): ThemeSpec {
  if (!hasCarte(projectId) && !opts.preview) return spec;
  const { categories, items } = listCarte(projectId);
  const shown = items.filter((i) => visible(i, opts.preview));
  if (!shown.length) return spec;
  const files: Record<string, string> = {};
  const photoFile = (assetId: string) => { const mime = one<{ mime: string }>("SELECT mime FROM assets WHERE id = ?", assetId)?.mime ?? "image/jpeg"; const name = `es-carte-${assetId}.${ext(mime)}`; files[name] = assetId; return name; };
  const templates = { ...spec.templates };
  for (const [key, tpl] of Object.entries(spec.templates)) {
    let changed = false;
    const sections: Record<string, SectionInstance> = { ...tpl.sections };
    for (const [sid, sec] of Object.entries(tpl.sections)) {
      if (sec.type === "ts-menu") {
        // Catégories : on garde l'image et la mise en page d'une catégorie du thème portant le même titre.
        const old = Object.values(sec.blocks ?? {}).filter((b) => b.type === "category");
        const blocks: [string, { type: string; settings: Record<string, unknown> }][] = [];
        for (const c of categories) {
          const its = shown.filter((i) => i.categoryId === c.id);
          if (!its.length) continue;
          const prev = old.find((b) => String(b.settings?.title ?? "").trim().toLowerCase() === c.title.trim().toLowerCase());
          blocks.push([`es-cat-${c.id}`, { type: "category", settings: { ...(prev?.settings ?? { image_asset: "", image_side: "right" }), title: c.title, anchor: "" } }]);
          for (const i of its) blocks.push([`es-plat-${i.id}`, { type: "item", settings: { name: i.name, description: describe(i), price: carteprice(i), vegetarian: i.vegetarian } }]);
        }
        sections[sid] = { ...sec, disabled: false, blocks: Object.fromEntries(blocks) as never, block_order: blocks.map(([k]) => k) };
        changed = true;
      }
      if (sec.type === "ts-dishes") {
        const featured = shown.filter((i) => i.featured && i.photo).slice(0, 6);
        if (featured.length) {
          const blocks = featured.map((i) => [`es-plat-${i.id}`, { type: "dish", settings: { image_asset: photoFile(i.photo!), image_position: "50% 50%", name: i.name, description: describe(i), price: carteprice(i), vegetarian: i.vegetarian } }] as const);
          sections[sid] = { ...sec, disabled: false, blocks: Object.fromEntries(blocks) as never, block_order: blocks.map(([k]) => k) };
          changed = true;
        }
      }
    }
    if (changed) templates[key] = { ...tpl, sections };
  }
  const pages = spec.store.pages.map((p) => (p.template_suffix === "ts-carte" && p.status === "draft" ? { ...p, status: "published" as const } : p));
  return { ...spec, templates, files: { ...spec.files, ...files }, store: { ...spec.store, pages } };
}

/** Plats modifiés depuis une date (pour « modifications non publiées »). */
export function carteChangedSince(projectId: string, at: number) {
  ensureCarteTables();
  return (one<{ n: number }>("SELECT COUNT(*) n FROM carte_items WHERE project_id = ? AND updated_at > ?", projectId, at)?.n ?? 0) + (one<{ n: number }>("SELECT COUNT(*) n FROM carte_categories WHERE project_id = ? AND updated_at > ?", projectId, at)?.n ?? 0);
}
