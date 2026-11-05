/**
 * Choix de l'interface du Studio (mission #282, lot 1) : nouvelle coquille SYNA ou interface actuelle.
 *
 * - La nouvelle coquille n'existe sur une installation que si `STUDIO_SYNA_SHELL=1` est posé (variable d'environnement,
 *   décidée par le propriétaire). Sans elle, le Studio est exactement celui d'aujourd'hui.
 * - Quand elle existe, chacun peut revenir à l'interface actuelle et en repartir (cookie `ecs-syna-shell`, sur cet
 *   appareil) : retour arrière immédiat pendant la transition. Les préférences de compte et de projet (mode Encre ou
 *   Plein cadre, personnalisation) relèvent du lot 1 bis.
 * - Aucune fonction n'est retirée : mêmes routes, mêmes espaces, même conversation SYNA, mêmes drapeaux.
 */
export const SYNA_SHELL_COOKIE = "ecs-syna-shell";
export type StudioShellVariant = "syna" | "classic";

export function synaShellAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return env.STUDIO_SYNA_SHELL === "1";
}

export function studioShellVariant(env: Record<string, string | undefined>, cookie: string | undefined): { available: boolean; variant: StudioShellVariant } {
  const available = synaShellAvailable(env);
  return { available, variant: available && cookie !== "classic" ? "syna" : "classic" };
}

/** Cookie posé par le bouton « Interface actuelle » / « Nouvelle interface » (un an, tout le site). */
export function synaShellCookie(variant: StudioShellVariant): string {
  return `${SYNA_SHELL_COOKIE}=${variant}; path=/; max-age=31536000; samesite=lax`;
}
