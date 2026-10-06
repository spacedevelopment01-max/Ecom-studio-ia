import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { fillPrompt } from "@/lib/prompts-library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { promptVars } from "@/lib/prompt-vars";
import { runForUser } from "@/lib/ai/access";
import { llmConfigured, llmText } from "@/lib/ai/llm";
import { projectContext } from "@/lib/ai/context";
import { charter } from "@/lib/ai/prompts";
import { contentLang, L } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Exécute un prompt de la bibliothèque avec l'IA, sur le projet actif : le prompt est complété avec le projet,
 * puis l'IA y répond (positionnement, noms, scripts, campagnes…). La réponse s'affiche dans l'onglet Prompts.
 * Réservé aux forfaits (la découverte gratuite n'appelle jamais l'IA).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ body: z.string().min(10).max(12000) }));
  const prompt = fillPrompt(b.body, promptVars(p));
  const answer = await runForUser(user.id, async () => {
    if (!llmConfigured()) {
      throw new HttpError(402, L("Lancer un prompt utilise l'IA : c'est inclus dans les forfaits. En découverte gratuite, copiez-le et utilisez-le dans votre propre assistant IA.", "Running a prompt uses AI, which comes with the plans. In the free discovery, copy it and use it in your own AI assistant."));
    }
    return llmText({
      task: "copywriting",
      userId: user.id,
      projectId: p.id,
      system: `${charter(contentLang())}

Rôle : directeur de création et stratège e-commerce qui exécute la demande du client sur SON projet.
- Réponds directement à la demande, de façon concrète et prête à l'emploi (propositions, textes, scripts, plans), structurée avec des titres courts.
- Appuie-toi uniquement sur le contexte du projet et sur les informations de la demande ; n'invente aucun fait, chiffre, avis, label ou promesse. Ce qui manque s'écrit « [À compléter : …] ».
- Termine par une ligne « Où l'utiliser dans le studio : … » qui dit dans quel onglet et quel champ reporter le résultat.`,
      context: projectContext(p),
      prompt,
      maxTokens: 6000,
    });
  });
  return ok({ prompt, answer });
});
