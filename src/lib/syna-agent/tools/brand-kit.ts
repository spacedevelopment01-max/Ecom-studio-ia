/**
 * Étape « La marque » du parcours SINA : la validation de sa marque complète par le client. La charte elle-même est
 * préparée par la fin de marque (`brand-finish.ts`, qui appelle `buildBrandKit` de ../brand-kit.ts) ; l'ancien outil
 * `brand.kit` appelé à la main a été retiré le 17 novembre 2026.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { project } from "./common";

const validateTool: AgentTool<Record<string, never>> = {
  name: "brand.kit_validate", module: "marque", kind: "write", needsProject: true,
  description: "Étape « La marque » : enregistre la validation de sa marque complète PAR LE CLIENT (jamais à sa place), une fois qu'il l'a vue. Ouvre l'étape suivante (les angles). Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (!j.brandKit) return { ok: false, summary: L("Ta marque n'est pas encore finie.", "Your brand is not finished yet."), hint: "Lance d'abord brand.finish (sans argument)." };
    // Jamais une image de marque faite avec un ANCIEN logo (le client a changé de logo depuis).
    if (j.logoChoice && j.brandKit.at < j.logoChoice.at) return { ok: false, summary: L("L'image de marque a été faite avec l'ancien logo : je la refais d'abord avec le nouveau.", "The brand kit uses the old logo."), hint: "Relance brand.finish (sans argument, gratuit quand aucune image ne manque), montre-la, puis demande sa validation." };
    updateJourney(ctx.conversationId, (x) => { setStep(x, 3, "done"); setStep(x, 4, "todo"); });
    return { ok: true, summary: L("Ta marque est validée. Prochaine étape : les angles.", "Your brand is validated."), changes: [{ module: "marque", object: "marque", summary: "validée par le client", verified: true }] };
  },
};

export const brandKitTools: AgentTool[] = [validateTool];
