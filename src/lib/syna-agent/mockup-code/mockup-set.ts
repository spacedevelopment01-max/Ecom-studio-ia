/**
 * SINA (#492), étape 6 : une MAQUETTE = une direction graphique + une ou plusieurs images (décision du propriétaire du
 * 6 novembre 2026), chaque image couvrant une ou plusieurs pages dans UNE version (ordinateur ou téléphone). Le jeu
 * des 3 maquettes et le choix du client vivent dans la mémoire du projet (artefact `syna.mockup_set`, une ligne mise à
 * jour sur place) : aucune nouvelle table. Contrôle de couverture : aucune page ni version oubliée.
 */
import { all, now } from "../../db";
import { remember } from "../../projects";
import { pageByKey, type MockupPage, type Viewport, VIEWPORTS } from "./pages";

export type MockupImage = {
  id: string;
  viewport: Viewport;
  /** Pages montrées sur l'image, dans l'ordre de lecture (gauche à droite, haut en bas). */
  pages: string[];
  /** Image rangée dans les Fichiers (null : prévue, pas encore créée). */
  assetId: string | null;
  status: "planned" | "ready" | "failed";
  /** Consigne envoyée à l'IA d'images (étape 6), gardée pour la reprise et le contrôle. */
  prompt?: string;
  note?: string;
  /** Contrôle automatique de l'image créée (mise en page, appareil dessiné, personnes, textes) ; absent = non contrôlée. */
  check?: { ok: boolean; problems: string[]; toVerify: string[] };
};
export type MockupDirection = { key: "A" | "B" | "C"; name: string; style: string; images: MockupImage[]; /** Fond : clair, sombre ou grands aplats de la couleur de marque. */ ground?: "clair" | "sombre" | "marque" };
export type MockupSet = {
  version: 1;
  business: "products" | "services";
  /** Inventaire figé au moment de la préparation (clés et libellés). */
  pages: MockupPage[];
  directions: MockupDirection[];
  /** Maquette choisie par le client (jamais à sa place). */
  chosen?: "A" | "B" | "C";
  at: number;
};

export const MOCKUP_SET_KEY = "syna.mockup_set";

export function loadMockupSet(projectId: string): MockupSet | null {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' ORDER BY updated_at DESC LIMIT 1", projectId, MOCKUP_SET_KEY)[0];
  if (!row) return null;
  try {
    const s = JSON.parse(row.value) as MockupSet;
    return s?.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function saveMockupSet(projectId: string, set: MockupSet): MockupSet {
  const value = { ...set, at: now() };
  remember(projectId, { kind: "artifact", key: MOCKUP_SET_KEY, value: JSON.stringify(value), source: "local", origin: "system" });
  return value;
}

export type Coverage = {
  complete: boolean;
  /** Pages et versions sans image prête. */
  missing: { page: string; label: string; viewport: Viewport }[];
  /** Pages et versions couvertes : identifiant de l'image. */
  covered: { page: string; viewport: Viewport; image: string }[];
  /** Pages citées par une image mais absentes de l'inventaire (erreur de préparation). */
  unknown: string[];
};

/**
 * Couverture d'une maquette : chaque page de l'inventaire, dans chacune de ses versions, doit figurer sur une image
 * PRÊTE. Une variante (panier vide, recherche sans résultat…) est couverte seulement si une image la montre : un état
 * oublié reste un oubli. `ready: false` compte aussi les images seulement prévues (plan de l'étape 6).
 */
export function coverageOf(direction: Pick<MockupDirection, "images">, pages: MockupPage[], opts: { ready?: boolean } = {}): Coverage {
  const ready = opts.ready !== false;
  const usable = direction.images.filter((i) => (ready ? i.status === "ready" && !!i.assetId : i.status !== "failed"));
  const covered: Coverage["covered"] = [], missing: Coverage["missing"] = [];
  for (const p of pages) for (const v of p.viewports) {
    const img = usable.find((i) => i.viewport === v && i.pages.includes(p.key));
    if (img) covered.push({ page: p.key, viewport: v, image: img.id });
    else missing.push({ page: p.key, label: p.fr, viewport: v });
  }
  const unknown = [...new Set(direction.images.flatMap((i) => i.pages).filter((k) => !pageByKey(pages, k)))];
  return { complete: missing.length === 0 && unknown.length === 0, missing, covered, unknown };
}

/**
 * Découpage des images d'une maquette, comme les planches de Thomas : en version ordinateur, chaque page clé (accueil,
 * fiche produit ou prestation) sur sa propre image, puis les autres pages par groupes ; en version téléphone, des
 * écrans côte à côte par groupes. Les variantes suivent leur page d'origine (même image).
 */
export function planImages(pages: MockupPage[], opts: { desktopPerImage?: number; phonePerImage?: number } = {}): Omit<MockupImage, "id" | "status" | "assetId">[] {
  const per: Record<Viewport, number> = { desktop: opts.desktopPerImage ?? 4, phone: opts.phonePerImage ?? 5 };
  const out: Omit<MockupImage, "id" | "status" | "assetId">[] = [];
  for (const v of VIEWPORTS) {
    const list = pages.filter((p) => p.viewports.includes(v));
    const groups: string[][] = [];
    // Une page et ses variantes restent ensemble.
    const units = list.filter((p) => !p.variantOf || !pageByKey(list, p.variantOf)).map((p) => [p.key, ...list.filter((x) => x.variantOf === p.key).map((x) => x.key)]);
    let cur: string[] = [];
    for (const u of units) {
      // Pages clés seules aussi en téléphone (essai réel du 8 novembre : l'accueil serré avec trois autres écrans, textes
      // trop petits pour être écrits juste).
      const isKey = !!pageByKey(list, u[0])?.key_page;
      if (isKey) { groups.push(u); continue; }
      if (cur.length && cur.length + u.length > per[v]) { groups.push(cur); cur = []; }
      cur.push(...u);
    }
    if (cur.length) groups.push(cur);
    for (const g of groups) out.push({ viewport: v, pages: g });
  }
  return out;
}

/** Nouvelle maquette (direction) avec ses images prévues, identifiants stables par position. */
export function plannedDirection(key: MockupDirection["key"], name: string, style: string, pages: MockupPage[], prompts?: (img: Omit<MockupImage, "id" | "status" | "assetId">, index: number) => string, ground?: MockupDirection["ground"]): MockupDirection {
  return {
    key, name, style, ...(ground ? { ground } : {}),
    images: planImages(pages).map((img, i) => ({ ...img, id: `${key}${String(i + 1).padStart(2, "0")}`, assetId: null, status: "planned", ...(prompts ? { prompt: prompts(img, i) } : {}) })),
  };
}

/** Enregistre une image créée (ou fournie) pour une maquette ; refuse une page inconnue. */
export function attachImage(set: MockupSet, key: MockupDirection["key"], img: { id?: string; viewport: Viewport; pages: string[]; assetId: string; note?: string }): { set: MockupSet; image: MockupImage } {
  const d = set.directions.find((x) => x.key === key);
  if (!d) throw new Error(`maquette ${key} inconnue`);
  const bad = img.pages.filter((k) => !pageByKey(set.pages, k));
  if (bad.length) throw new Error(`pages inconnues : ${bad.join(", ")}`);
  const existing = img.id ? d.images.find((i) => i.id === img.id) : null;
  const image: MockupImage = { ...(existing ?? {}), id: existing?.id ?? `${key}${String(d.images.length + 1).padStart(2, "0")}`, viewport: img.viewport, pages: img.pages, assetId: img.assetId, status: "ready", check: undefined, ...(img.note ? { note: img.note } : {}) };
  const images = existing ? d.images.map((i) => (i.id === image.id ? image : i)) : [...d.images, image];
  return { set: { ...set, directions: set.directions.map((x) => (x.key === key ? { ...x, images } : x)) }, image };
}
