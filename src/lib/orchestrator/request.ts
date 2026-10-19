/** Périmètre d'une demande : le texte cité reste une donnée, jamais une autorisation. */
export const MAX_REQUEST_CHARS = 32000;
export type ChoiceReference = { kind: string; id: string; version: string | number; ordinal?: number; selected?: boolean };
export type RequestScope = {
  choiceRequested?: boolean;
  renewDirections?: boolean;
  original: string;
  actionable: string;
  restrictions: string[];
  preserved: string[];
  references: ChoiceReference[];
  clarification?: string;
  informational: boolean;
  narrow: boolean;
  titleEdit?: { pageKey: "home"; text: string };
};
export const normalizeRequest = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").toLowerCase();
const objects = (s: string) => [...new Set((s.match(/\b(logo|marque|identite|palette|style|direction|titre|textes?|images?|photos?|site|boutique|video|publier|publication)\b/g) || []).map(x => x === "direction" ? "style" : x))];
export function requestScope(original: string, choices: ChoiceReference[] = []): RequestScope {
  const scope: RequestScope = { original, actionable: "", restrictions: [], preserved: [], references: [], informational: false, narrow: false };
  if (original.length > MAX_REQUEST_CHARS) return { ...scope, clarification: `Votre demande dépasse ${MAX_REQUEST_CHARS} caractères. Divisez-la en demandes explicites ; aucune consigne n’a été exécutée ni tronquée.` };
  // Guillemets français/anglais, code, extraits importés : la phrase extérieure seule commande.
  const visible = normalizeRequest(original.replace(/```[\s\S]*?```|`[^`]*`|«[^»]*»|“[^”]*”|"[^"]*"|<source[\s\S]*?<\/source>/gi, " "));
  const clauses = visible.split(/(?:[,;.!?\n]+|\s+(?=(?:ne |n['’]|sans ))|\bmais\b|\bbut\b|\b(?:et|and)\s+(?=(?:ne |n'|garde|preserve|conserve|change|reecris|modifie|publie|cree|redige)))/).map(s => s.trim()).filter(Boolean);
  const active: string[] = [];
  for (const c of clauses) {
    if (/^(je|tu|vous|i|we|merci)$/.test(c)) continue;
    if (/^(?:et |and )?(?:si|if)\b/.test(c) || /\b(explique|expliquer|explication|comment|pourquoi|explain|explanation|how|supposons|hypothese|hypothetique|si je|si on|si tu|si vous|if i|would happen|que se passerait)\b/.test(c)) { scope.informational = true; continue; }
    if (/\b(ne|pas|jamais|sans|aucun|interdit|evite|preserve|conserve|garde|keep|preserve|never|without|don't|do not)\b|\bn['’]/.test(c)) {
      // Une négation partielle autorisant un autre objet exige une précision plutôt qu'une portée devinée.
      if (/\b(pas seulement|pas uniquement|non seulement|not only)\b/.test(c)) scope.clarification = "Précisez séparément ce qui doit changer et ce qui doit être conservé.";
      scope.restrictions.push(c); scope.preserved.push(...objects(c)); continue;
    }
    if (/\b(document|source|capture|exemple|citation)\b.*\b(indique|dit|contient|mentionne)\b/.test(c)) continue;
    active.push(c);
  }
  scope.preserved = [...new Set(scope.preserved)];
  scope.actionable = active.join(". ");
  if (/\b(renouvelle|renouveler|recree|regenere|nouvelle serie|nouvelles directions)\b/.test(scope.actionable) && /\b(directions?|logos?|identite|serie)\b/.test(scope.actionable)) scope.renewDirections = true;
  const referenceText = [scope.actionable, ...scope.restrictions].join(" ");
  if (!scope.renewDirections && (/\b(proposition|option|piste|direction)\b/.test(referenceText) || (/\b(ce style|cette identite|ce logo)\b/.test(referenceText) && /\b(utilise|choisis|prends|selectionne|applique|garde|keep|use|select)\b/.test(referenceText)))) {
    const numbered = /\b(?:direction|logo|proposition|option|piste)\s*(?:n[°o]\s*)?([1-5])\b/.exec(referenceText);
    const ordinal = numbered ? Number(numbered[1]) : /\b(cinquieme|fifth|5e)\b/.test(referenceText) ? 5 : /\b(quatrieme|fourth|4e)\b/.test(referenceText) ? 4 : /\b(deuxieme|seconde|second|2e|2eme)\b/.test(referenceText) ? 2 : /\b(premiere|premier|first|1ere)\b/.test(referenceText) ? 1 : /\b(troisieme|third|3e)\b/.test(referenceText) ? 3 : undefined;
    const kind = /\b(style|identite|direction)\b/.test(referenceText) ? "style" : /\blogo\b/.test(referenceText) ? "logo" : /\b(strategie|angle)\b/.test(referenceText) ? "strategy" : undefined;
    const candidates = choices.filter(c => (!kind || c.kind === kind) && (ordinal ? c.ordinal === ordinal : c.selected));
    if (candidates.length === 1) { scope.references = candidates; if (/\b(choisis|choisir|selectionne|applique|prends|choose|select|use|utilise)\b/.test(scope.actionable)) scope.choiceRequested = true; }
    else scope.clarification = "À quelle proposition faites-vous référence ? Choisissez son identifiant et sa version dans le projet.";
    // Réutiliser un choix est distinct d'en générer un nouveau : aucune nouvelle génération implicite.
    if (/\b(utilise|choisis|prends|selectionne|applique|garde|keep|use|select)\b/.test(referenceText) && !/\b(cree|genere|reecris|redige)\b/.test(scope.actionable)) {
      scope.actionable = "";
      scope.clarification ||= "La proposition est identifiée avec sa version. Confirmez ce choix dans l’étape correspondante ; aucune création n’a été relancée.";
    }
  }
  scope.narrow = /\b(titre|title|uniquement|seulement|only)\b/.test(scope.actionable) || scope.preserved.length > 0;
  if (/\b(titre|title)\b/.test(scope.actionable)) {
    const exact = /(?:remplace|change|modifie)\s+(?:uniquement\s+|seulement\s+)?le titre (?:de la page d['’]accueil|de l['’]accueil)\s+par\s*[«"]([^»"]+)[»"]/i.exec(original);
    if (exact && clauses.filter(c => /\b(cree|genere|publie|redige|reecris)\b/.test(c)).length === 0) scope.titleEdit = { pageKey: "home", text: exact[1] };
    else scope.clarification ||= "Quel titre précis souhaitez-vous modifier et par quel texte ? La réécriture complète est bloquée pour préserver les autres éléments.";
  }
  if (scope.titleEdit && scope.preserved.includes("titre")) scope.clarification = "Le même titre est à la fois conservé et modifié : précisez votre choix.";
  if (scope.informational && active.length === 0) scope.actionable = "";
  return scope;
}

/** Garde avant effets : une étape composite ne doit pas contourner un élément conservé. */
export function scopeAllowsStep(scope: RequestScope, kind: string): boolean {
  if (scope.clarification || !scope.actionable) return false;
  const p = scope.preserved;
  const hits = (xs: string[]) => p.some(x => xs.includes(x));
  if (hits(["logo", "marque", "identite", "palette", "style"]) && ["brand_strategy", "logo", "mockups", "theme", "theme_edit"].includes(kind)) return false;
  if (hits(["site", "boutique"]) && ["theme", "theme_edit", "publish"].includes(kind)) return false;
  if (hits(["image", "images", "photo", "photos"]) && ["image_generate", "mockups"].includes(kind)) return false;
  if (hits(["texte", "textes", "titre"]) && ["copy", "seo", "blog", "theme", "theme_edit"].includes(kind)) return false;
  if (scope.titleEdit) return kind === "copy";
  return true;
}
