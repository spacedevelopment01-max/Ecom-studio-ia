/**
 * Règles des scripts UGC, partagées par le studio (vérification en direct) et le serveur.
 * La personne à l'écran est générée par IA : elle présente le produit, elle ne témoigne pas.
 */
export type UgcBeat = { line: string; caption: string; action: string };
export type UgcScriptLike = { concept: string; persona: string; setting: string; beats: UgcBeat[] };

/** Répliques interdites : une personne générée ne peut pas témoigner d'un usage ou d'un résultat. */
const TESTIMONIAL = [
  /\bje (l'|les )?(utilise|porte|bois|mange|prends|teste|ai test|ai essay|adore|recommande)/i,
  /\bdepuis (que|\d|des (jours|semaines|mois|années)|un (mois|an))/i,
  /\bj'ai (test|essay|adoré|vu la différence|remarqué|eu)/i,
  /\b(ma|mon|mes) (peau|cheveux|clients?|résultats?|vie a changé)/i,
  /\ben \d+ ?(jours|semaines|nuits|minutes)\b|\d+ ?% (de|des|en|plus|moins)/i,
  /\b(meilleur|révolutionnaire|miracle)/i,
];

/** Points à corriger avant génération (réplique vide, trop longue, témoignage, tirets). */
export function ugcIssues(script: Pick<UgcScriptLike, "beats">): string[] {
  const out: string[] = [];
  script.beats.forEach((b, i) => {
    const words = b.line.trim().split(/\s+/).filter(Boolean).length;
    if (!words) out.push(`Plan ${i + 1} : la réplique est vide.`);
    else if (words > 22) out.push(`Plan ${i + 1} : réplique trop longue pour 8 secondes (${words} mots, 22 au plus).`);
    if (TESTIMONIAL.some((r) => r.test(b.line) || r.test(b.caption))) out.push(`Plan ${i + 1} : la personne est générée par IA, elle ne peut pas témoigner d'un usage, d'un résultat ou d'une recommandation. Reformulez en présentation (« Regardez… », « Voici… »).`);
  });
  return out;
}

/** Nettoyage typographique (tirets longs, espaces) sans changer le sens. */
export function cleanUgcScript<T extends UgcScriptLike>(s: T): T {
  const tidy = (t: string) => t.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
  return { ...s, beats: s.beats.map((b) => ({ line: tidy(b.line), caption: tidy(b.caption || b.line), action: b.action.trim() })) };
}

