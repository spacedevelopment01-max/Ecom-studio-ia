/**
 * LE CONTRÔLE GRATUIT D'UN MESSAGE DE SINA, avant qu'il parte (22 novembre 2026, ratés vus par « Les essais complets »
 * sur Nadia, pendant « faire connaissance »). Sans IA : quand un message enfreint une règle du propriétaire, SINA le
 * réécrit une fois avec la remarque (jamais montrée au client).
 *  - Pendant « faire connaissance », une question à la fois (elle en avait groupé cinq fois, dont quatre coordonnées
 *    d'un coup).
 *  - Rien ne démarre avant l'accord sur la carte : jamais « C'est parti » quand la carte n'est pas encore acceptée, ni
 *    quand rien n'a été lancé.
 */
export type MessageDeSina = { message: string; question?: { text: string; choices?: string[] } | null; actions: { tool: string; args?: unknown }[] };

/** Les coordonnées qu'on ne demande jamais d'un coup. */
const COORDONNEES = [/\bnom\b/i, /\badresse\b/i, /\be-?mail\b|\bcourriel\b/i, /\bt[ée]l[ée]phone\b|\bnum[ée]ro\b/i, /\bsiret\b|\bsiren\b/i, /\bsite\b/i];

/** Combien de questions un message pose (points d'interrogation, et coordonnées demandées ensemble). */
export function nombreDeQuestions(m: MessageDeSina): number {
  const text = `${m.message ?? ""}\n${m.question?.text ?? ""}`;
  const marks = (text.match(/\?/g) ?? []).length;
  const asked = m.question?.text ?? text;
  const coords = COORDONNEES.filter((r) => r.test(asked)).length;
  return Math.max(marks, coords >= 2 ? coords : 0);
}

/** Une annonce de départ (« C'est parti », « je lance »…). */
const DEPART = /\b(c'est parti|c’est parti|je lance|je m'y mets|je m’y mets|c'est lancé|c’est lancé|je démarre|je commence (la|ta|tes|ton) (création|marque|site|identit|logo|angles|publications))/i;

/**
 * Les défauts d'un message, dits pour SINA. `payant` : l'outil passe-t-il par la carte d'accord ; `lance` : une création
 * a-t-elle vraiment démarré pendant cette demande.
 */
export function defautsDuMessage(m: MessageDeSina, o: { etape: number; payant: (tool: string) => boolean; lance: boolean }): string[] {
  const out: string[] = [];
  if (o.etape === 0 && nombreDeQuestions(m) > 1)
    out.push("Pendant « faire connaissance », c'est une question à la fois (règle du propriétaire) : ton message en pose plusieurs. Garde la plus utile maintenant, les autres viendront ensuite, une par une. Des coordonnées se demandent aussi une par une.");
  const text = `${m.message ?? ""} ${m.question?.text ?? ""}`;
  if (DEPART.test(text)) {
    if (m.actions.some((a) => o.payant(a.tool)))
      out.push("Rien ne démarre avant que le client accepte la carte de dépense : n'écris pas « C'est parti » ni « je lance ». Dis ce que tu vas faire et que la carte lui montre le prix ; tu annonceras le départ quand il aura accepté.");
    else if (!m.actions.length && !o.lance)
      out.push("Rien n'a été lancé pendant cette demande : n'écris pas « C'est parti » ni « je lance ».");
  }
  return out;
}

/** La remarque donnée à SINA pour réécrire son message (jamais montrée au client). */
export const noteDeControle = (defauts: string[]) =>
  `\n\n# Ton message n'est pas parti : réécris-le\nLe Studio l'a relu (sans IA) et il enfreint une règle du propriétaire :\n${defauts.map((d) => `- ${d}`).join("\n")}\nRéécris ta réponse en entier (mêmes actions si elles sont justes), en corrigeant ce point.`;
