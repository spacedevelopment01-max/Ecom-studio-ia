/** Politique centrale : recherche documentaire explicite, ou création IA sans banque de substitution. */
import type { ImageRequestV2 } from "./engine";
export const MEDIA_POLICY = "ai-creation-v1";
export function imagePolicy(req: ImageRequestV2): ImageRequestV2 {
  const documentary = req.kind === "stock_photo" || !!req.bankSearch || req.allowGenerate === false;
  if (documentary) return { ...req, allowGenerate: false };
  return { ...req, noStock: true, allowGenerate: true };
}
