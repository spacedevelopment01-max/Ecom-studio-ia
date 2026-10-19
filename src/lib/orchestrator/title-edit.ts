/** Retouche explicite d'un seul titre enregistré : aucune réécriture, IA ou propagation vers la marque. */
import { listContents, latestContent, saveContentVersion } from "../seo-v2/store";
import type { RequestScope } from "./request";
export function applyTitleEdit(projectId: string, edit: NonNullable<RequestScope["titleEdit"]>) {
  const candidates = listContents(projectId, ["home_page"]).filter(v => latestContent(projectId, v.docKey)?.doc.page.key === edit.pageKey);
  if (candidates.length !== 1) throw new Error("Sélectionnez une page et une langue précises dans l’éditeur avant de modifier ce titre.");
  const current = latestContent(projectId, candidates[0].docKey)!;
  const headings = current.doc.blocks.filter(b => b.kind === "h1");
  if (headings.length !== 1) throw new Error("Le titre de cette page est ambigu : choisissez-le dans l’éditeur.");
  const doc = structuredClone(current.doc);
  const h1 = doc.blocks.find(b => b.kind === "h1")!;
  if ("text" in h1) h1.text = edit.text;
  doc.meta2.source = "user";
  return saveContentVersion(projectId, candidates[0].docKey, doc, { verdict: "PROVISIONAL", note: "Modification explicite du titre seulement ; relecture nécessaire." });
}
