/**
 * Retouche de la mise en page demandée à l'IA quand le moteur local ne la comprend pas (demande composée, ambiguë,
 * créative : « remonte tout le bloc et aère le texte »). L'IA ne reçoit que la liste des calques (position, taille,
 * police, texte) et rend des modifications bornées, vérifiées ici puis appliquées comme des opérations ordinaires
 * de l'éditeur (« Annuler » les défait). Payant (texte, quelques centimes) : accord demandé dans le studio.
 */
import crypto from "node:crypto";
import { z } from "zod";
import { llmJson } from "../ai/llm";
import { L } from "../i18n-server";
import type { DocOp } from "./ops";
import type { AdDocument, Layer } from "./types";

const ChangeSchema = z.object({
  id: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  fontSize: z.number().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  text: z.string().max(300).optional(),
  visible: z.boolean().optional(),
});
export const AiEditSchema = z.object({ changes: z.array(ChangeSchema).max(30), summary: z.string().max(300) });
export type AiEditAnswer = z.infer<typeof AiEditSchema>;

/** Description compacte des calques envoyée à l'IA (aucune image, aucun identifiant de fichier). */
export function describeLayers(doc: AdDocument): string {
  const r = (n: number) => Math.round(n);
  return doc.layers
    .filter((l) => l.role !== "background")
    .map((l) => {
      const base = `${l.id} | ${l.kind}/${l.role} | x=${r(l.x)} y=${r(l.y)} w=${r(l.w)} h=${r(l.h)}${l.visible ? "" : " | hidden"}${l.locked ? " | locked" : ""}`;
      if (l.kind === "text") return `${base} | font=${r(l.font.size)}px align=${l.align} color=${l.color} | "${l.text.slice(0, 120)}"`;
      if (l.kind === "button") return `${base} | font=${r(l.font.size)}px color=${l.color} fill=${typeof l.fill === "string" ? l.fill : "gradient"} | "${l.text.slice(0, 60)}"`;
      return base;
    })
    .join("\n");
}

/** Réponse de l'IA → opérations sûres : calques existants et non verrouillés, valeurs bornées à l'affiche. */
export function aiChangesToOps(doc: AdDocument, a: AiEditAnswer): DocOp[] {
  const ops: DocOp[] = [];
  const W = doc.width;
  const H = doc.height;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  for (const c of a.changes) {
    const l = doc.layers.find((x) => x.id === c.id);
    if (!l || l.locked || l.role === "background") continue;
    const patch: Partial<Layer> & Record<string, unknown> = {};
    if (c.w !== undefined) patch.w = clamp(c.w, 8, W);
    if (c.h !== undefined) patch.h = clamp(c.h, 8, H);
    const w = (patch.w as number | undefined) ?? l.w;
    const h = (patch.h as number | undefined) ?? l.h;
    if (c.x !== undefined) patch.x = clamp(c.x, 0, W - Math.min(w, W));
    if (c.y !== undefined) patch.y = clamp(c.y, 0, H - Math.min(h, H));
    if ((l.kind === "text" || l.kind === "button") && c.fontSize !== undefined) patch.font = { ...l.font, size: clamp(Math.round(c.fontSize), 12, 600) };
    if (l.kind === "text" && c.align) patch.align = c.align;
    if (Object.keys(patch).length) ops.push({ op: "update", id: l.id, patch });
    if ((l.kind === "text" || l.kind === "button") && c.color) ops.push({ op: "color", id: l.id, color: c.color });
    if (l.kind === "button" && c.fill) ops.push({ op: "fill", id: l.id, fill: c.fill });
    if ((l.kind === "text" || l.kind === "button") && c.text !== undefined && c.text.trim()) ops.push({ op: "text", id: l.id, text: c.text.trim() });
    if (c.visible !== undefined) ops.push({ op: "visible", id: l.id, visible: c.visible });
  }
  return ops;
}

export async function aiAdEdit(ctx: { userId: string; projectId: string }, doc: AdDocument, instruction: string): Promise<{ ops: DocOp[]; summary: string }> {
  const a = (await llmJson(
    {
      task: "ad_creative",
      userId: ctx.userId,
      projectId: ctx.projectId,
      // Clé stable : la même demande sur la même création n'est pas facturée deux fois (double clic, reprise).
      usageKey: `ad-edit:${ctx.projectId}:${crypto.createHash("sha256").update(JSON.stringify([doc.layers, instruction])).digest("hex").slice(0, 24)}`,
      promptKey: "ad-doc-ai-edit",
      routing: { difficulty: "standard", deliverable: "ad_v2" },
      system: "You are the layout assistant of an ad editor. You receive the list of layers of one ad (pixel coordinates) and the client's request. Return only the changes needed to fulfil the request, as JSON. Keep every element inside the canvas and inside the safe margins, never make texts overlap each other or the button, keep text readable (font size >= 22 px). Never invent facts in texts: change a text only if the client asks for it. Answer in JSON only.",
      prompt: `Canvas: ${doc.width} x ${doc.height} px, safe margins: top ${Math.round(doc.safe.top)}, bottom ${Math.round(doc.safe.bottom)}, sides ${Math.round(doc.safe.side)}.
Layers (id | kind/role | geometry | details):
${describeLayers(doc)}

Client request: "${instruction.replace(/"/g, "'").slice(0, 400)}"

Reply { "changes": [{ "id": "title", "fontSize": 96, "x": 80, "w": 920, "align": "center" }], "summary": "${L("ce qui a été fait, en une phrase en français", "what was done, in one sentence in English")}" }. Only include the fields that change.`,
      maxTokens: 1500,
    } as Parameters<typeof llmJson>[0],
    AiEditSchema,
  )) as AiEditAnswer;
  return { ops: aiChangesToOps(doc, a), summary: a.summary };
}
