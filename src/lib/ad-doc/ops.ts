/**
 * Opérations d'édition d'un document publicitaire : pures, sérialisables, déterministes, GRATUITES (aucun appel
 * d'IA). Elles servent à l'éditeur visuel (glisser, redimensionner, saisir un texte, changer une image…), aux
 * retouches simples demandées en langage naturel (local-edit.ts) et à l'historique (annuler / rétablir).
 * Un calque verrouillé refuse toute modification de position, de taille ou de contenu.
 */
import type { AdDocument, ButtonLayer, Fill, ImageLayer, Layer, ShapeLayer, TextLayer } from "./types";

export type DocOp =
  | { op: "update"; id: string; patch: Partial<Omit<Layer, "id" | "kind">> }
  | { op: "move"; id: string; x: number; y: number }
  | { op: "resize"; id: string; x: number; y: number; w: number; h: number }
  | { op: "rotate"; id: string; rotation: number }
  | { op: "text"; id: string; text: string }
  | { op: "image"; id: string; assetId: string; crop?: ImageLayer["crop"] }
  | { op: "crop"; id: string; crop: ImageLayer["crop"] }
  | { op: "fill"; id: string; fill: Fill }
  | { op: "color"; id: string; color: string }
  | { op: "font"; id: string; font: Partial<TextLayer["font"]> }
  | { op: "add"; layer: Layer; index?: number }
  | { op: "remove"; id: string }
  | { op: "reorder"; id: string; index: number }
  | { op: "visible"; id: string; visible: boolean }
  | { op: "lock"; id: string; locked: boolean }
  | { op: "duplicate"; id: string; newId: string };

export class LockedLayerError extends Error {
  constructor(public layerId: string) {
    super(`calque verrouillé : ${layerId}`);
    this.name = "LockedLayerError";
  }
}

const touch = <T extends Layer>(l: T, patch: Partial<T>): T => ({ ...l, ...patch, userEdited: true });

/** Applique une opération ; renvoie un NOUVEAU document (l'ancien reste intact pour l'historique). */
export function applyOp(doc: AdDocument, o: DocOp): AdDocument {
  const layers = doc.layers.slice();
  const at = "id" in o ? layers.findIndex((l) => l.id === o.id) : -1;
  if ("id" in o && at < 0) throw new Error(`calque introuvable : ${o.id}`);
  const cur = at >= 0 ? layers[at] : null;
  // Verrou : seuls la visibilité et le déverrouillage restent possibles.
  if (cur?.locked && o.op !== "lock" && o.op !== "visible") throw new LockedLayerError(cur.id);
  const set = (l: Layer) => {
    layers[at] = l;
    return { ...doc, layers, meta: { ...doc.meta, source: "user" as const } };
  };
  switch (o.op) {
    case "update":
      return set(touch(cur!, o.patch as Partial<Layer>));
    case "move":
      return set(touch(cur!, { x: o.x, y: o.y }));
    case "resize":
      return set(touch(cur!, { x: o.x, y: o.y, w: Math.max(4, o.w), h: Math.max(4, o.h) }));
    case "rotate":
      return set(touch(cur!, { rotation: ((o.rotation % 360) + 360) % 360 }));
    case "text":
      if (cur!.kind !== "text" && cur!.kind !== "button") throw new Error("ce calque n'a pas de texte");
      return set(touch(cur as TextLayer | ButtonLayer, { text: o.text }));
    case "image":
      if (cur!.kind !== "image") throw new Error("ce calque n'est pas une image");
      return set(touch(cur as ImageLayer, { assetId: o.assetId, crop: o.crop ?? null }));
    case "crop":
      if (cur!.kind !== "image") throw new Error("ce calque n'est pas une image");
      return set(touch(cur as ImageLayer, { crop: o.crop }));
    case "fill":
      if (cur!.kind !== "shape" && cur!.kind !== "button") throw new Error("ce calque n'a pas de remplissage");
      return set(touch(cur as ShapeLayer | ButtonLayer, { fill: o.fill } as never));
    case "color":
      if (cur!.kind !== "text" && cur!.kind !== "button") throw new Error("ce calque n'a pas de couleur de texte");
      return set(touch(cur as TextLayer | ButtonLayer, { color: o.color }));
    case "font":
      if (cur!.kind !== "text" && cur!.kind !== "button") throw new Error("ce calque n'a pas de police");
      return set(touch(cur as TextLayer | ButtonLayer, { font: { ...(cur as TextLayer).font, ...o.font } }));
    case "add": {
      if (layers.some((l) => l.id === o.layer.id)) throw new Error(`identifiant déjà utilisé : ${o.layer.id}`);
      layers.splice(o.index ?? layers.length, 0, { ...o.layer, userEdited: true });
      return { ...doc, layers, meta: { ...doc.meta, source: "user" } };
    }
    case "remove":
      layers.splice(at, 1);
      return { ...doc, layers, meta: { ...doc.meta, source: "user" } };
    case "reorder": {
      const [l] = layers.splice(at, 1);
      layers.splice(Math.max(0, Math.min(layers.length, o.index)), 0, l);
      return { ...doc, layers, meta: { ...doc.meta, source: "user" } };
    }
    case "visible":
      return set({ ...cur!, visible: o.visible, userEdited: true });
    case "lock":
      return set({ ...cur!, locked: o.locked, userEdited: true });
    case "duplicate": {
      const copy = { ...cur!, id: o.newId, name: `${cur!.name} (copie)`, x: cur!.x + 24, y: cur!.y + 24, locked: false, userEdited: true };
      layers.splice(at + 1, 0, copy);
      return { ...doc, layers, meta: { ...doc.meta, source: "user" } };
    }
  }
}

export const applyOps = (doc: AdDocument, ops: DocOp[]) => ops.reduce(applyOp, doc);

/** Historique local de l'éditeur : annuler / rétablir sans limite pratique (50 pas gardés). */
export class History {
  private past: AdDocument[] = [];
  private future: AdDocument[] = [];
  constructor(public current: AdDocument, private limit = 50) {}
  private lastMerge: { key: string; at: number } | null = null;
  /**
   * Applique une opération. `merge` : les réglages continus (curseur, saisie) sur la même propriété du même calque
   * en moins d'une seconde forment un seul pas d'historique (un « annuler » ne défait pas lettre par lettre).
   */
  apply(o: DocOp, merge?: string) {
    const next = applyOp(this.current, o);
    const now = Date.now();
    const same = merge && this.lastMerge && this.lastMerge.key === merge && now - this.lastMerge.at < 1000;
    if (!same) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.lastMerge = merge ? { key: merge, at: now } : null;
    this.future = [];
    this.current = next;
    return next;
  }
  /** Plusieurs opérations en UN seul pas d'historique (retouche en langage naturel, alignement multiple). */
  applyAll(ops: DocOp[]) {
    const next = applyOps(this.current, ops);
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.lastMerge = null;
    this.future = [];
    this.current = next;
    return next;
  }
  /** Remplace l'état courant sans créer de pas (chargement, enregistrement). */
  reset(doc: AdDocument) {
    this.past = [];
    this.future = [];
    this.lastMerge = null;
    this.current = doc;
  }
  undo() {
    this.lastMerge = null;
    const prev = this.past.pop();
    if (!prev) return this.current;
    this.future.push(this.current);
    this.current = prev;
    return prev;
  }
  redo() {
    const next = this.future.pop();
    if (!next) return this.current;
    this.past.push(this.current);
    this.current = next;
    return next;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
}

/** Calques par rôle (le premier trouvé), pour les retouches ciblées. */
export const byRole = (doc: AdDocument, role: Layer["role"]) => doc.layers.find((l) => l.role === role);
