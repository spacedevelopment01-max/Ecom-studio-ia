import { handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { estimateFor, type CostAction } from "@/lib/ai/estimate";
import { aiActiveFor } from "@/lib/ai/access";
import { aiAvailability } from "@/lib/ai/config";

const ACTIONS: CostAction[] = ["pipeline", "theme", "images", "image", "video-clip", "ugc"];

/** Part estimée des crédits de création qu'une action IA va consommer (aucun montant en euros n'est exposé). */
export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const q = new URL(req.url).searchParams;
  const action = q.get("action") as CostAction;
  if (!ACTIONS.includes(action)) throw new HttpError(400, "Action inconnue.");
  const av = aiAvailability();
  const configured = action === "video-clip" || action === "ugc" ? av.video : action === "images" || action === "image" ? av.image : av.llm || av.image;
  // ai : l'IA sera réellement utilisée (mode IA choisi, crédits disponibles, fournisseur connecté).
  return ok({ ...estimateFor(u.id, action, { beats: Number(q.get("beats")) || undefined }), ai: configured && aiActiveFor(u.id) });
});
