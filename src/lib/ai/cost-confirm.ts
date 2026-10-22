/** Capacités réelles de chaque action ; aucun appel fournisseur ni accès au portefeuille. */
export type CostAction = "pipeline" | "theme" | "images" | "image" | "video-clip" | "ugc" | "blog" | "edit";

export function costUsage(action: CostAction, videos?: "ai" | "edited" | "none"): { many?: boolean; ask: boolean; local: boolean } | null {
  switch (action) {
    case "pipeline":
      return videos === "ai" ? { ask: true, local: true } : null;
    // Ces images finales exigent un fournisseur IA : aucune composition locale de remplacement.
    case "images":
      return { many: true, ask: true, local: false };
    case "image":
      return { ask: false, local: false };
    case "blog":
    case "edit":
      return { ask: true, local: true };
    case "video-clip":
    case "ugc":
      return { ask: true, local: false };
    default:
      return null;
  }
}
