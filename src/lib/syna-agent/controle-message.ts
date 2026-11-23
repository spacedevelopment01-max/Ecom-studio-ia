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
// « nom » et « site » n'en sont pas (audit du 22 novembre 2026 : « As-tu déjà un nom, un logo ou un site ? » était réécrit).
const COORDONNEES = [/\badresse\b(?!\s+(e-?mail|électronique|mail))/i, /\be-?mail\b|\bcourriel\b/i, /\bt[ée]l[ée]phone\b|\bnum[ée]ro de t/i, /\bsiret\b|\bsiren\b/i];

/** Combien de questions un message pose (points d'interrogation, et coordonnées demandées ensemble). */
export function nombreDeQuestions(m: MessageDeSina): number {
  const text = `${m.message ?? ""}\n${m.question?.text ?? ""}`;
  const marks = (text.match(/\?/g) ?? []).length;
  const asked = m.question?.text ?? text;
  // Des coordonnées comptent comme plusieurs questions seulement quand elles sont énumérées, à donner ensemble.
  const coords = COORDONNEES.filter((r) => r.test(asked)).length, enumerees = /,|\bet\b/i.test(asked) && !/\bou\b/i.test(asked);
  return Math.max(marks, coords >= 2 && enumerees ? coords : 0);
}

/** Une annonce de départ (« C'est parti », « je lance »…). */
const DEPART = /\b(c'est parti|c’est parti|je lance|je m'y mets|je m’y mets|c'est lancé|c’est lancé|je démarre|je commence (la|ta|tes|ton) (création|marque|site|identit|logo|angles|publications))/i;

/** Le texte nomme-t-il ce nom (sans tenir compte des accents ni des majuscules, jamais au milieu d'un mot) ? */
export function nommee(texte: string, nom: string): boolean {
  const n = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`´]/g, "'").toLowerCase();
  const w = n(nom).trim();
  return !!w && new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u").test(n(texte));
}

/**
 * Les défauts d'un message, dits pour SINA. `payant` : l'outil passe-t-il par la carte d'accord ; `lance` : une création
 * a-t-elle vraiment démarré pendant cette demande.
 */
export function defautsDuMessage(m: MessageDeSina, o: { etape: number; payant: (tool: string) => boolean; lance: boolean; /** Ses mots corrigés : « jamais X, toujours Y » (règle « ce qu'il corrige une fois vaut pour toujours »). */ motsCorriges?: { avoid: string; use: string }[]; /** Les planches finies par la tâche qui vient de finir, pas encore présentées (essai réel de Nadia, 23 novembre 2026). */ aPresenter?: { name: string }[] }): string[] {
  const out: string[] = [];
  const texte = `${m.message ?? ""} ${m.question?.text ?? ""} ${(m.question?.choices ?? []).join(" ")}`;
  const bord = (w: string) => new RegExp(`(?<![\\p{L}])${w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu");
  // Le bon mot peut contenir l'ancien (« boutique en ligne » pour « boutique ») : il est retiré avant de chercher l'ancien.
  for (const r of o.motsCorriges ?? []) if (r.avoid.trim() && bord(r.avoid).test(r.use.trim() ? texte.replace(new RegExp(bord(r.use).source, "giu"), " ") : texte))
    out.push(`Le client a corrigé ce mot une fois pour toutes : jamais « ${r.avoid} », toujours « ${r.use} ». Ton message l'emploie encore.`);
  if (o.etape === 0 && nombreDeQuestions(m) > 1)
    out.push("Pendant « faire connaissance », c'est une question à la fois (règle du propriétaire) : ton message en pose plusieurs. Garde la plus utile maintenant, les autres viendront ensuite, une par une. Des coordonnées se demandent aussi une par une.");
  const text = `${m.message ?? ""} ${m.question?.text ?? ""}`;
  if (DEPART.test(text)) {
    if (m.actions.some((a) => o.payant(a.tool)))
      out.push("Rien ne démarre avant que le client accepte la carte de dépense : n'écris pas « C'est parti » ni « je lance ». Dis ce que tu vas faire et que la carte lui montre le prix ; tu annonceras le départ quand il aura accepté.");
    else if (!m.actions.length && !o.lance)
      out.push("Rien n'a été lancé pendant cette demande : n'écris pas « C'est parti » ni « je lance ».");
  }
  // Ce qu'elle annonce, elle le fait : chaque planche finie par la tâche est présentée d'elle-même, sans que le client la
  // demande (essai réel de Nadia : deux planches annoncées, une seule présentée).
  const manquent = (o.aPresenter ?? []).filter((x) => !nommee(texte, x.name));
  if (manquent.length)
    out.push(`La tâche qui vient de finir a fini ${o.aPresenter!.length > 1 ? `ces planches : ${o.aPresenter!.map((x) => `« ${x.name} »`).join(", ")}` : `la planche « ${o.aPresenter![0].name} »`}. Présente chacune d'elle-même dans ce message, sans attendre qu'il la demande : son nom, puis ce que tu en penses (la note et les mots de la relecture, jamais autre chose). Ton message ne présente pas ${manquent.map((x) => `« ${x.name} »`).join(", ")}.`);
  return out;
}

/** La remarque donnée à SINA pour réécrire son message (jamais montrée au client). */
export const noteDeControle = (defauts: string[]) =>
  `\n\n# Ton message n'est pas parti : réécris-le\nLe Studio l'a relu (sans IA) et il enfreint une règle du propriétaire :\n${defauts.map((d) => `- ${d}`).join("\n")}\nRéécris ta réponse en entier (mêmes actions si elles sont justes), en corrigeant ce point.`;
