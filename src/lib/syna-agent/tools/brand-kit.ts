/**
 * Étape 3 du parcours SINA (#492) : outils de l'image de marque complète (préparer, valider). Gratuits : tout est rendu
 * par le Studio à partir du logo choisi (voir ../brand-kit.ts).
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { buildBrandKit } from "../brand-kit";
import { project } from "./common";

const kitTool: AgentTool<Record<string, never>> = {
  name: "brand.kit", module: "marque", kind: "write", needsProject: true,
  description: "Étape 3 : prépare l'image de marque complète du logo CHOISI : déclinaisons (fond sombre, noir, blanc, symbole seul, SVG si le dessin s'y prête), favicons 32 et 512 px, avatar rond des réseaux, planche de marque et charte PDF. GRATUIT (rendu par le Studio, sans IA). Le résultat s'affiche dans le fil.",
  args: z.object({}).strict(),
  run: async (ctx) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[2]?.status !== "done" || !j.logoChoice || !p.brand?.logo.assetId) return { ok: false, summary: L("Le logo doit être choisi avant l'image de marque (étape 2).", "Choose the logo first (step 2).") };
    if (j.steps[3]?.status === "done") return { ok: false, summary: L("L'image de marque est déjà validée.", "The brand kit is already validated.") };
    updateJourney(ctx.conversationId, (x) => setStep(x, 3, "doing"));
    let kit;
    try { kit = await buildBrandKit(p.id); } catch (e) { updateJourney(ctx.conversationId, (x) => setStep(x, 3, "todo")); throw e; }
    updateJourney(ctx.conversationId, (x) => { x.brandKit = kit; setStep(x, 3, "review"); });
    return {
      ok: true,
      summary: L(`Image de marque prête : ${kit.items.map((x) => x.label).join(", ")}${kit.boardId ? ", planche de marque" : ""}${kit.bookId ? `, charte PDF (${kit.pageIds.length} pages)` : ""}.${kit.notes.length ? ` ${kit.notes.join(" ")}` : ""}`, "Brand kit ready."), ...(kit.notes.length ? { hint: "Dis ces remarques au client, simplement." } : {}),
      data: { elements: kit.items.map((x) => x.label), planche: !!kit.boardId, charte: !!kit.bookId, pages: kit.pageIds.length, points: kit.notes },
      changes: [{ module: "marque", object: "image de marque", summary: `${kit.items.length} déclinaisons${kit.boardId ? ", planche" : ""}${kit.bookId ? ", charte PDF" : ""}`, after: kit.items.map((x) => x.key), verified: true }],
    };
  },
};

const validateTool: AgentTool<Record<string, never>> = {
  name: "brand.kit_validate", module: "marque", kind: "write", needsProject: true,
  description: "Étape 3 : enregistre la validation de l'image de marque PAR LE CLIENT (jamais à sa place). Ouvre l'étape suivante. Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (!j.brandKit) return { ok: false, summary: L("Aucune image de marque préparée pour l'instant.", "No brand kit yet."), hint: "Lance d'abord brand.kit." };
    updateJourney(ctx.conversationId, (x) => { setStep(x, 3, "done"); setStep(x, 4, "todo"); });
    return { ok: true, summary: L("Image de marque validée. Étape 3 terminée. Prochaine étape : les 5 angles marketing.", "Brand kit validated."), changes: [{ module: "marque", object: "image de marque", summary: "validée par le client", verified: true }] };
  },
};

export const brandKitTools: AgentTool[] = [kitTool, validateTool];
