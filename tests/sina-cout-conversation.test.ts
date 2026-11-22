/**
 * Le coût de la conversation de Nadia (21 réponses, relevé du 22 novembre 2026), recalculé avant et après la mise en
 * mémoire du fil, sur les jetons relevés appel par appel. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";
import { coutConversation, type AppelReleve } from "@/lib/ai/memoire";

const NADIA: AppelReleve[] = [
  [2282, 0, 8342, 828], [10199, 5531, 7849, 1035], [4458, 13380, 0, 427], [5058, 13380, 0, 786], [5744, 13380, 0, 901],
  [6380, 13380, 0, 785], [6925, 13380, 0, 796], [7599, 13380, 0, 851], [8251, 13380, 0, 813], [8948, 13380, 0, 700],
  [9143, 13380, 0, 400], [9322, 13380, 0, 411], [9543, 13380, 0, 924], [9932, 13380, 0, 706], [10211, 13380, 0, 1020],
  [10793, 13380, 0, 587], [11233, 13380, 0, 795], [11634, 13380, 0, 2214], [12735, 13380, 0, 78], [12915, 5531, 6900, 828],
  [13137, 12431, 0, 161],
].map(([entree, lu, ecrit, sortie]) => ({ entree, lu, ecrit, sortie }));

// Tarifs du relevé (taux 0,90) : ce que le Studio comptait (lecture à 0,1 fois l'entrée) et le vrai tarif (0,05 fois).
const STUDIO_AVANT = { entree: 3.6, lu: 0.36, ecrit: 4.5, sortie: 18 };
const VRAI = { entree: 3.6, lu: 0.18, ecrit: 4.5, sortie: 18 };
// Hypothèse : la fiche, le parcours et l'état font environ 3 600 jetons au début et 5 000 à la fin.
const contexte = (i: number) => 3600 + (1400 * i) / 20;

describe("le coût d'une conversation de 21 réponses, avant et après", () => {
  it("recalcule le relevé de Nadia (1,154 €), puis le même fil repris de mémoire", () => {
    const r = coutConversation(NADIA, STUDIO_AVANT, contexte);
    expect(r.avant).toBeCloseTo(1.154, 2); // le calcul retrouve le relevé
    const vrai = coutConversation(NADIA, VRAI, contexte);
    // Après : le fil n'est plus repayé plein tarif ; au vrai tarif de lecture.
    expect(vrai.apres).toBeLessThan(r.avant * 0.75);
    // Sans la réécriture des notices à la création du projet (2e réponse) : elles sont lues au lieu d'être réécrites.
    const sansReecriture = NADIA.map((a, i) => (i === 1 ? { ...a, lu: a.lu + a.ecrit, ecrit: 0 } : a));
    const final = coutConversation(sansReecriture, VRAI, contexte);
    expect(final.apres).toBeLessThan(vrai.apres);
    console.log(`détail : fil en mémoire seul ${coutConversation(NADIA, STUDIO_AVANT, contexte).apres} € ; + vrai tarif ${vrai.apres} € ; + notices non réécrites ${final.apres} €`);
    console.log(`Nadia, 21 réponses : avant ${r.avant} € ; après (fil en mémoire, vrai tarif de lecture) ${vrai.apres} €`);
  });
});
