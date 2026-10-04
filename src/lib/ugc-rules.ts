/**
 * Règles des scripts UGC, partagées par le studio (vérification en direct) et le serveur.
 * La personne à l'écran est générée par IA : elle présente le produit, elle ne témoigne pas.
 */
import { pick, type Lang } from "./i18n";

export type UgcBeat = { line: string; caption: string; action: string };
export type UgcScriptLike = { concept: string; persona: string; setting: string; beats: UgcBeat[] };

/** Répliques interdites : une personne générée ne peut pas témoigner d'un usage ou d'un résultat. */
const TESTIMONIAL: Record<Lang, RegExp[]> = {
  fr: [
    /\bje (l'|les )?(utilise|porte|bois|mange|prends|teste|ai test|ai essay|adore|recommande)/i,
    /\bdepuis (que|\d|des (jours|semaines|mois|années)|un (mois|an))/i,
    /\bj'ai (test|essay|adoré|vu la différence|remarqué|eu)/i,
    /\b(ma|mon|mes) (peau|cheveux|clients?|résultats?|vie a changé)/i,
    /\ben \d+ ?(jours|semaines|nuits|minutes)\b|\d+ ?% (de|des|en|plus|moins)/i,
    /\b(meilleur|révolutionnaire|miracle)/i,
  ],
  en: [
    /\bi(['’]ve| have)? (use|used|wear|wore|drink|eat|take|took|test|tested|tried|love|loved|recommend|swear by)\b/i,
    /\bi(['’]m| am) (using|wearing|loving|obsessed)\b/i,
    /\b(since i|for (days|weeks|months|years)|after (a|one|\d+) (day|week|month|year)s?)\b/i,
    /\bi(['’]ve| have)? (noticed|seen (a|the) difference|had)\b/i,
    /\bmy (skin|hair|clients?|customers?|results?|life (has )?changed)\b/i,
    /\bin \d+ ?(days|weeks|nights|minutes)\b|\d+ ?% (of|more|less|in|fewer)\b/i,
    /\b(best|revolutionary|miracle)\b/i,
  ],
};

/**
 * Points à corriger avant génération (réplique vide, trop longue, témoignage, tirets).
 * `lang` : langue du script (règles de détection) ; `msgLang` : langue des messages (par défaut la même).
 */
export function ugcIssues(script: Pick<UgcScriptLike, "beats">, lang: Lang = "fr", msgLang: Lang = lang): string[] {
  const out: string[] = [];
  const t = (fr: string, en: string) => pick(msgLang, fr, en);
  // Les règles françaises restent toujours appliquées (scripts existants) ; les anglaises s'ajoutent pour un script anglais.
  const rules = lang === "en" ? [...TESTIMONIAL.fr, ...TESTIMONIAL.en] : TESTIMONIAL.fr;
  script.beats.forEach((b, i) => {
    const words = b.line.trim().split(/\s+/).filter(Boolean).length;
    if (!words) out.push(t(`Plan ${i + 1} : la réplique est vide.`, `Shot ${i + 1}: the line is empty.`));
    else if (words > 22) out.push(t(`Plan ${i + 1} : réplique trop longue pour 8 secondes (${words} mots, 22 au plus).`, `Shot ${i + 1}: line too long for 8 seconds (${words} words, 22 max).`));
    if (rules.some((r) => r.test(b.line) || r.test(b.caption)))
      out.push(
        t(
          `Plan ${i + 1} : la personne est générée par IA, elle ne peut pas témoigner d'un usage, d'un résultat ou d'une recommandation. Reformulez en présentation (« Regardez… », « Voici… »).`,
          `Shot ${i + 1}: the person is AI-generated and cannot give a testimonial about use, results or a recommendation. Rephrase it as a presentation ("Take a look…", "Here's…").`,
        ),
      );
  });
  return out;
}

/** Nettoyage typographique (tirets longs, espaces) sans changer le sens. */
export function cleanUgcScript<T extends UgcScriptLike>(s: T): T {
  const tidy = (t: string) => t.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
  return { ...s, beats: s.beats.map((b) => ({ line: tidy(b.line), caption: tidy(b.caption || b.line), action: b.action.trim() })) };
}

