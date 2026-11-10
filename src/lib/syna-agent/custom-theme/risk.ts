/**
 * Contrôle du HTML d'une section du thème sur mesure (audit du 10 novembre 2026) : une modification ne doit jamais AJOUTER
 * de code (balise de script, cadre, formulaire, attribut d'événement, lien javascript:). Les formulaires de la
 * bibliothèque (« onsubmit="return false" ») sont déjà là et comptés : seul un ajout est refusé.
 */
export function riskCount(html: string): number {
  const h = html.replace(/on(?:click|submit)="return false"/g, "");
  return (h.match(/<\s*(?:script|iframe|frame|object|embed|link|meta|base|style|form)\b/gi)?.length ?? 0)
    + (h.match(/[\s/"']on[a-z]+\s*=/gi)?.length ?? 0)
    + (h.match(/(?:href|src|action|formaction|xlink:href)\s*=\s*["']?\s*(?:javascript:|vbscript:|data:text)/gi)?.length ?? 0);
}
