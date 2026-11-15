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
import { saveBrand } from "../../projects";

const kitTool: AgentTool<Record<string, never>> = {
  name: "brand.kit", module: "marque", kind: "write", needsProject: true,
  description: "Étape 3 : prépare l'image de marque complète du logo CHOISI : déclinaisons (fond sombre, noir, blanc, symbole seul, SVG si le dessin s'y prête), favicons 32 et 512 px, avatar rond des réseaux, planche de marque et charte PDF. GRATUIT (rendu par le Studio, sans IA). Le résultat s'affiche dans le fil.",
  args: z.object({}).strict(),
  run: async (ctx) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    // Logo choisi à l'étape 2, ou logo GARDÉ par le client en refonte (étape 2 sans objet) : audit du 10 novembre 2026,
    // le logo gardé bloquait l'étape 3 pour toujours.
    const logoReady = (j.steps[2]?.status === "done" && !!j.logoChoice) || (j.steps[2]?.status === "skipped" && j.keep.includes("logo"));
    if (!logoReady || !p.brand?.logo.assetId) return { ok: false, summary: L("Le logo doit être choisi avant l'image de marque (étape 2).", "Choose the logo first (step 2).") };
    if (j.steps[3]?.status === "done") return { ok: false, summary: L("L'image de marque est déjà validée.", "The brand kit is already validated.") };
    // Le slogan choisi à l'étape 1 est validé par le client : la planche et la charte l'écrivent (audit du 10 novembre
    // 2026 : il n'était verrouillé qu'après coup, la planche sortait sans lui). Le logo est déjà dessiné : aucun risque
    // de le voir écrit dans le logo.
    if (p.brand?.tagline?.trim() && !(p.brand.validated ?? []).includes("tagline")) saveBrand(p.id, { ...p.brand, validated: [...(p.brand.validated ?? []), "tagline"] });
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
    // Jamais une image de marque faite avec un ANCIEN logo (le client a changé de logo depuis).
    if (j.logoChoice && j.brandKit.at < j.logoChoice.at) return { ok: false, summary: L("L'image de marque a été faite avec l'ancien logo : je la refais d'abord avec le nouveau.", "The brand kit uses the old logo."), hint: "Relance brand.kit (gratuit), montre-la, puis demande sa validation." };
    updateJourney(ctx.conversationId, (x) => { setStep(x, 3, "done"); setStep(x, 4, "todo"); });
    return { ok: true, summary: L("Image de marque validée. Étape 3 terminée. Prochaine étape : les 5 angles marketing.", "Brand kit validated."), changes: [{ module: "marque", object: "image de marque", summary: "validée par le client", verified: true }] };
  },
};

export const brandKitTools: AgentTool[] = [kitTool, validateTool];
