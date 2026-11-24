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
