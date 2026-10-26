/**
 * Theme Check (outil officiel de Shopify) avec des documents Shopify vérifiés et gardés en mémoire.
 *
 * Sans cela, @shopify/theme-check-docs-updater retélécharge les documents (theme-liquid-docs) depuis
 * raw.githubusercontent.com dans chaque processus, enregistre la réponse sans regarder son statut (un « 429: Too Many
 * Requests » devient un schéma) et partage son cache entre processus. Le schéma illisible est utilisé tel quel :
 * « Unable to parse content from …/preset.json: Parse error at offset 0 », puis des centaines de fausses erreurs
 * ValidSchema. Constaté en CI (suivi #194) ; au studio, une section valide écrite par l'IA était refusée à tort (et
 * corrigée par l'IA pour rien).
 *
 * Ici : les documents livrés avec la version installée de la dépendance sont lus une fois par processus, chacun relu
 * en JSON, puis servis directement par les deux lecteurs du module (loadResource, loadSchema). Aucun téléchargement,
 * aucun cache sur disque, aucune variable d'environnement modifiée. Un document illisible arrête la vérification
 * (ShopifyDocsError) : il n'est jamais pris pour un outil absent.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

type ThemeCheckNode = typeof import("@shopify/theme-check-node");
type Docs = { revision: string; resources: Map<string, string>; schemas: Map<string, string> };

/** Document Shopify illisible : la vérification s'arrête, elle ne passe pas pour « outil indisponible ». */
export class ShopifyDocsError extends Error {}

const RESOURCES = ["filters", "objects", "tags", "latest", "shopify_system_translations", "manifest_theme", "manifest_theme_app_extension"];

/** Dossier des documents livrés avec la dépendance installée (ou ES_SHOPIFY_DOCS_DIR, réservé aux essais). */
function installedDocsDir() {
  if (process.env.ES_SHOPIFY_DOCS_DIR) return process.env.ES_SHOPIFY_DOCS_DIR;
  const req = createRequire(path.join(process.cwd(), "package.json"));
  return path.join(path.dirname(req.resolve("@shopify/theme-check-docs-updater/package.json")), "data");
}

/** Lit et vérifie tous les documents attendus par le module (données, manifestes, schémas cités). */
export function readShopifyDocs(dir = installedDocsDir()): Docs {
  const read = (file: string) => {
    let text: string;
    try {
      text = fs.readFileSync(path.join(dir, file), "utf8");
      JSON.parse(text);
    } catch (e) {
      throw new ShopifyDocsError(`Document Shopify de Theme Check illisible (${file}) : ${(e as Error).message}`);
    }
    return text;
  };
  const resources = new Map(RESOURCES.map((r) => [r, read(`${r}.json`)]));
  const schemas = new Map<string, string>();
  for (const m of ["manifest_theme", "manifest_theme_app_extension"])
    for (const s of JSON.parse(resources.get(m)!).schemas as { uri: string }[]) schemas.set(s.uri, read(path.basename(s.uri)));
  return { revision: JSON.parse(resources.get("latest")!).revision, resources, schemas };
}

let active: Docs | null = null;
let loading: Promise<ThemeCheckNode> | null = null;

/** Le module Theme Check, servi par les documents vérifiés de ce processus. Rejette avec ShopifyDocsError si l'un est illisible. */
export function loadThemeCheck(): Promise<ThemeCheckNode> {
  return (loading ??= (async () => {
    const docs = readShopifyDocs();
    const { ThemeLiquidDocsManager } = (await import("@shopify/theme-check-docs-updater")) as any;
    const proto = ThemeLiquidDocsManager.prototype;
    if (!proto.__esLocalDocs) {
      // Les seuls lecteurs du module : ressources (filtres, objets, balises, manifestes…) et schémas JSON.
      proto.loadResource = async (name: string) => {
        const text = active?.resources.get(name);
        if (text === undefined) throw new ShopifyDocsError(`Document Shopify inconnu : ${name}`);
        return text;
      };
      proto.loadSchema = async (uri: string) => {
        const text = active?.schemas.get(uri);
        if (text === undefined) throw new ShopifyDocsError(`Schéma Shopify inconnu : ${uri}`);
        return text;
      };
      proto.__esLocalDocs = true;
    }
    active = docs;
    return (await import("@shopify/theme-check-node")) as ThemeCheckNode;
  })().catch((e) => {
    loading = null;
    throw e;
  }));
}

/** Révision des documents en service (rapport, essais). */
export const shopifyDocsRevision = () => active?.revision ?? null;

/** Essais seulement : oublie les documents chargés (pour en servir d'autres, ex. ES_SHOPIFY_DOCS_DIR). */
export function resetThemeCheckForTests() {
  loading = null;
  active = null;
}
