/**
 * Opérations d'édition d'un document texte : toutes déterministes, locales et gratuites (aucun appel d'IA).
 * Chaque opération est validée (bloc existant, texte borné, adresse de lien sûre) et ne touche que sa cible.
 */
import { z } from "zod";
import { blockId, safeUrl, stripInline } from "./doc";
import { fit } from "./write";
import type { Block, ContentDoc } from "./types";

const BlockIn = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["h1", "h2", "h3", "p"]), text: z.string().max(4000) }),
  z.object({ kind: z.enum(["ul", "ol"]), items: z.array(z.string().max(600)).max(40) }),
  z.object({ kind: z.literal("faq"), q: z.string().max(300), a: z.string().max(2000) }),
  z.object({ kind: z.literal("cta"), text: z.string().max(120), url: z.string().max(500).nullable() }),
]);

export const ContentOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_text"), blockId: z.string(), text: z.string().max(4000) }),
  z.object({ op: z.literal("set_items"), blockId: z.string(), items: z.array(z.string().max(600)).max(40) }),
  z.object({ op: z.literal("set_faq"), blockId: z.string(), q: z.string().max(300), a: z.string().max(2000) }),
  z.object({ op: z.literal("set_kind"), blockId: z.string(), kind: z.enum(["h1", "h2", "h3", "p"]) }),
  z.object({ op: z.literal("insert"), after: z.string().nullable(), block: BlockIn }),
  z.object({ op: z.literal("delete"), blockId: z.string() }),
  z.object({ op: z.literal("move"), blockId: z.string(), to: z.number().int().min(0) }),
  z.object({ op: z.literal("set_meta"), field: z.enum(["seoTitle", "metaDescription", "slug"]), value: z.string().max(400) }),
  z.object({ op: z.literal("shorten"), blockId: z.string(), maxWords: z.number().int().min(5).max(400) }),
  z.object({ op: z.literal("replace"), find: z.string().min(1).max(200), with: z.string().max(400), blockId: z.string().nullable() }),
  z.object({ op: z.literal("bold"), blockId: z.string(), text: z.string().min(1).max(200) }),
  z.object({ op: z.literal("italic"), blockId: z.string(), text: z.string().min(1).max(200) }),
  z.object({ op: z.literal("link"), blockId: z.string(), text: z.string().min(1).max(200), url: z.string().max(500) }),
]);
export type ContentOp = z.infer<typeof ContentOpSchema>;

/** Insertion en fin de document (`after: END`). */
export const END = "__end__";

const find = (doc: ContentDoc, id: string) => {
  const i = doc.blocks.findIndex((b) => b.id === id);
  if (i < 0) throw new Error("bloc introuvable");
  return i;
};

/** Garde les premières phrases entières jusqu'à N mots (jamais une phrase coupée au milieu, jamais rien d'ajouté). */
export function shortenText(text: string, maxWords: number): string {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.split(/\s+/).length > maxWords) break;
    out = next;
  }
  // Une seule phrase trop longue : coupée à la limite sur une fin de mot.
  return out || fit(text, maxWords * 7);
}

const mark = (s: string, needle: string, wrap: (x: string) => string) => {
  const i = s.indexOf(needle);
  if (i < 0) throw new Error("texte introuvable dans le bloc");
  return s.slice(0, i) + wrap(needle) + s.slice(i + needle.length);
};

function withText(b: Block, f: (s: string) => string): Block {
  if (b.kind === "ul" || b.kind === "ol") return { ...b, items: b.items.map(f) };
  if (b.kind === "faq") return { ...b, q: f(b.q), a: f(b.a) };
  return { ...b, text: f(b.text) } as Block;
}

export function applyContentOp(doc: ContentDoc, op: ContentOp): ContentDoc {
  const blocks = [...doc.blocks];
  const meta = { ...doc.meta };
  switch (op.op) {
    case "set_text": {
      const i = find(doc, op.blockId);
      const b = blocks[i];
      if (b.kind === "ul" || b.kind === "ol" || b.kind === "faq") throw new Error("bloc sans texte simple");
      blocks[i] = { ...b, text: b.kind === "p" ? op.text : stripInline(op.text) } as Block;
      break;
    }
    case "set_items": {
      const i = find(doc, op.blockId);
      const b = blocks[i];
      if (b.kind !== "ul" && b.kind !== "ol") throw new Error("ce bloc n'est pas une liste");
      blocks[i] = { ...b, items: op.items.filter((x) => x.trim()) };
      break;
    }
    case "set_faq": {
      const i = find(doc, op.blockId);
      if (blocks[i].kind !== "faq") throw new Error("ce bloc n'est pas une question");
      blocks[i] = { id: op.blockId, kind: "faq", q: op.q, a: op.a };
      break;
    }
    case "set_kind": {
      const i = find(doc, op.blockId);
      const b = blocks[i];
      if (b.kind !== "h1" && b.kind !== "h2" && b.kind !== "h3" && b.kind !== "p") throw new Error("seuls titres et paragraphes changent de niveau");
      blocks[i] = { id: b.id, kind: op.kind, text: op.kind === "p" ? b.text : stripInline(b.text) } as Block;
      break;
    }
    case "insert": {
      const at = op.after === END ? blocks.length : op.after ? find({ ...doc, blocks }, op.after) + 1 : 0;
      const b = op.block;
      if (b.kind === "cta" && b.url && !safeUrl(b.url)) throw new Error("adresse de lien refusée");
      blocks.splice(at, 0, { id: blockId(), ...b } as Block);
      break;
    }
    case "delete":
      blocks.splice(find(doc, op.blockId), 1);
      break;
    case "move": {
      const i = find(doc, op.blockId);
      const [b] = blocks.splice(i, 1);
      blocks.splice(Math.min(op.to, blocks.length), 0, b);
      break;
    }
    case "set_meta":
      meta[op.field] = op.value.trim();
      break;
    case "shorten": {
      const i = find(doc, op.blockId);
      const b = blocks[i];
      if (b.kind === "faq") blocks[i] = { ...b, a: shortenText(b.a, op.maxWords) };
      else if (b.kind === "ul" || b.kind === "ol") blocks[i] = { ...b, items: b.items.slice(0, Math.max(1, Math.ceil(b.items.length / 2))) };
      else blocks[i] = { ...b, text: shortenText(b.text, op.maxWords) } as Block;
      break;
    }
    case "replace": {
      let hit = false;
      const rep = (s: string) => (s.includes(op.find) ? ((hit = true), s.split(op.find).join(op.with)) : s);
      for (let i = 0; i < blocks.length; i++) if (!op.blockId || blocks[i].id === op.blockId) blocks[i] = withText(blocks[i], rep);
      if (!hit) throw new Error("texte introuvable");
      break;
    }
    case "bold":
    case "italic":
    case "link": {
      const i = find(doc, op.blockId);
      const b = blocks[i];
      if (b.kind !== "p" && b.kind !== "ul" && b.kind !== "ol" && b.kind !== "faq") throw new Error("mise en forme possible dans les paragraphes, listes et réponses");
      if (op.op === "link" && !safeUrl(op.url)) throw new Error("adresse de lien refusée");
      const wrap = op.op === "bold" ? (x: string) => `**${x}**` : op.op === "italic" ? (x: string) => `*${x}*` : (x: string) => `[${x}](${op.url})`;
      let done = false;
      blocks[i] = withText(b, (s) => (done || !s.includes(op.text) ? s : ((done = true), mark(s, op.text, wrap))));
      if (!done) throw new Error("texte introuvable dans le bloc");
      break;
    }
  }
  return { ...doc, blocks, meta, meta2: { ...doc.meta2, source: "user" } };
}

export function applyContentOps(doc: ContentDoc, ops: ContentOp[]): ContentDoc {
  return ops.reduce(applyContentOp, doc);
}
