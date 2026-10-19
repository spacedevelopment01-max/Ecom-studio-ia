import { z } from "zod";
import { id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { currentTheme } from "@/lib/projects";
import { L } from "@/lib/i18n-server";
import { llmConfigured } from "@/lib/ai/llm";
import { runForUser } from "@/lib/ai/access";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { assertSectionGeneration } from "@/lib/theme/custom-access";
import { projectKind } from "@/lib/theme/project-kind";
import { FAMILY_LABEL } from "@/lib/theme/section-families";

/** Message de retouche : enregistré puis traité en arrière-plan (résistant aux coupures). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!currentTheme(p.id)) throw new HttpError(409, L("La boutique n'est pas encore créée.", "The store hasn't been created yet."));
  const b = await body(
    req,
    z.object({
      message: z.string().trim().min(1).max(4000),
      selection: z.object({ template: z.string(), section: z.string(), block: z.string().optional(), text: z.string().max(400).optional(), tag: z.string().max(20).optional(), type: z.string().max(60).optional(), kind: z.string().max(20).optional(), path: z.string().max(600).optional(), role: z.enum(["heading", "text", "button", "other"]).optional(), src: z.string().max(600).optional() }).nullable().optional(),
      attachments: z.array(z.string()).max(6).default([]),
      page: z.string().max(40).default("index"),
      /** « Générer » de la bibliothèque : créer une section sur mesure et l'ajouter à cet endroit. */
      generate: z.object({ template: z.string().max(80), index: z.number().int().min(0).optional() }).optional(),
    }),
  );
  // Sections sur mesure écrites par l'IA : forfaits Vendre et Dominer (Créer compose avec la bibliothèque).
  if (b.generate) assertSectionGeneration(user, p.id);
  if (b.generate && !(await runForUser(user.id, async () => llmConfigured(), "normal", p.id))) throw new HttpError(402, L("La génération de section demande l'IA : passez sur « IA » en haut du studio.", "Section generation requires AI: switch to “AI” at the top of the studio."));
  // Consigne complète pour l'IA ; la discussion affiche seulement la demande du client.
  const instruction = b.generate
    ? L(
        `Crée une NOUVELLE section sur mesure d'après cette demande du client : « ${b.message} ». Écris-la avec custom_section (Liquid Shopify valide, schéma avec réglages modifiables, blocs si utile, préréglage, styles préfixés, animations respectueuses de prefers-reduced-motion, accessibilité), dans le style visuel de la boutique (variables du thème installé : couleurs --c-*, polices --font-*, arrondis --radius-*, largeur --page-width ; mêmes boutons et espacements), pour un projet « ${FAMILY_LABEL[projectKind(p)].fr} »${projectKind(p) === "services" ? " (aucun panier, prix produit ni offre groupée)" : ""}, avec la marque, les textes et le ton du projet (aucune identité de démonstration), en utilisant si possible les images et vidéos du projet, lisible sur téléphone et ordinateur sans débordement ; aucun avis, chiffre ou affirmation inventés (espaces réservés à la place). Puis ajoute-la avec add_section dans le gabarit « ${b.generate.template} »${b.generate.index === undefined ? "" : ` à la position ${b.generate.index}`}. Ne modifie rien d'autre.`,
        `Create a NEW custom section from this customer request: “${b.message}”. Write it with custom_section (valid Shopify Liquid, schema with editable settings, blocks if useful, preset, prefixed styles, animations that respect prefers-reduced-motion, accessible), in the store's visual style (installed theme variables: colours --c-*, fonts --font-*, radii --radius-*, width --page-width; same buttons and spacing), for a “${FAMILY_LABEL[projectKind(p)].en}” project${projectKind(p) === "services" ? " (no cart, product price or bundle)" : ""}, with the project's brand, copy and tone (no demo identity), using the project's images and videos where possible, readable on phone and desktop without overflow; no invented reviews, figures or claims (placeholders instead). Then add it with add_section in the “${b.generate.template}” template${b.generate.index === undefined ? "" : ` at position ${b.generate.index}`}. Change nothing else.`,
      )
    : b.message;
  const mid = id();
  run("INSERT INTO chat_messages (id, project_id, thread, role, content, attachments, selection, created_at) VALUES (?,?,?,?,?,?,?,?)", mid, p.id, "shop", "user", b.generate ? `✨ ${L("Générer", "Generate")} : ${b.message}` : b.message, JSON.stringify(b.attachments), b.selection ? JSON.stringify(b.selection) : null, now());
  const job = enqueue({ userId: user.id, projectId: p.id, type: "shop.chat", label: b.generate ? L("Génération d'une section", "Generating a section") : L("Retouche de la boutique", "Store edit"), payload: { projectId: p.id, messageId: mid, message: instruction, selection: b.selection ?? null, attachments: b.attachments, page: b.page }, maxAttempts: 2 });
  run("UPDATE chat_messages SET job_id = ? WHERE id = ?", job.id, mid);
  return ok({ messageId: mid, jobId: job.id });
});
