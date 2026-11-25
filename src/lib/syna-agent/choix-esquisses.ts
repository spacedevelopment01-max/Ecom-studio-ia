/**
 * Le message envoyé par la carte des esquisses (« Je choisis les esquisses 3, 7 et 11 ») et la règle de la sélection :
 * au plus N cases cochées (2, 3 ou 4 selon le forfait), moins est permis. Sans rien du serveur : lu par la carte (client)
 * et par l'outil logo.choisir (serveur), pour que les deux disent la même chose.
 */
export function messageDuChoix(numeros: readonly number[], lang: "fr" | "en" = "fr"): string {
  const n = [...new Set(numeros)].sort((a, b) => a - b);
  if (lang === "en") return n.length === 1 ? `I choose sketch ${n[0]}` : `I choose sketches ${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  return n.length === 1 ? `Je choisis l'esquisse ${n[0]}` : `Je choisis les esquisses ${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`;
}
/** La sélection après un clic : décocher, ou cocher tant qu'il reste de la place (jamais plus de `max`). */
export function basculer(selection: readonly number[], numero: number, max: number): number[] {
  if (selection.includes(numero)) return selection.filter((x) => x !== numero);
  return selection.length >= max ? [...selection] : [...selection, numero].sort((a, b) => a - b);
}

/**
 * Ce que le client choisit sur la carte pour la phrase sous le nom d'un logo (24 novembre 2026 au soir) : rien (la règle
 * d'avant, SINA décide), la phrase d'une esquisse (`de`, seulement une phrase proposable), aucune, ou la sienne.
 */
export type PhraseSurLaCarte = { de: number; texte: string } | { aucune: true } | { sienne: string };

/**
 * Le message de la carte avec les phrases : exactement « Je choisis les esquisses 3, 7 et 11 » quand il ne touche à
 * aucune phrase ; sinon, une phrase de plus par logo (« Pour le logo 1 : la phrase de l'esquisse 5, « … ». »). Sa phrase à
 * lui est reprise telle quelle, entre guillemets.
 */
export function messageDuChoixAvecPhrases(numeros: readonly number[], phrases: Readonly<Record<number, PhraseSurLaCarte | undefined>>, lang: "fr" | "en" = "fr"): string {
  const n = [...new Set(numeros)].sort((a, b) => a - b);
  const parts = n.flatMap((logo) => {
    const p = phrases[logo];
    if (!p || ("sienne" in p && !p.sienne.trim())) return [];
    if ("aucune" in p) return [lang === "en" ? `For logo ${logo}: no line.` : `Pour le logo ${logo} : sans phrase.`];
    if ("de" in p) return [lang === "en" ? `For logo ${logo}: the line from sketch ${p.de}, “${p.texte}”.` : `Pour le logo ${logo} : la phrase de l'esquisse ${p.de}, « ${p.texte} ».`];
    return [lang === "en" ? `For logo ${logo}: my line “${p.sienne.trim()}”.` : `Pour le logo ${logo} : ma phrase « ${p.sienne.trim()} ».`];
  });
  const base = messageDuChoix(n, lang);
  return parts.length ? `${base}. ${parts.join(" ")}` : base;
}
