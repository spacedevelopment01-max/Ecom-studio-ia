/**
 * Le contrôle gratuit des questions (audit de la conversation du 22 novembre 2026) : « nom » et « site » ne comptent
 * pas comme des coordonnées ; une seule question n'est jamais réécrite ; des coordonnées énumérées le sont toujours.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { nombreDeQuestions } from "@/lib/syna-agent/controle-message";

const q = (text: string, message = "Super.") => ({ message, question: { text }, actions: [] });

describe("contrôle gratuit des questions", () => {
  it("une question unique n'est jamais comptée deux fois", () => {
    expect(nombreDeQuestions(q("As-tu déjà un nom, un logo ou un site ?"))).toBe(1);
    expect(nombreDeQuestions(q("Quelle adresse e-mail veux-tu afficher sur ton site ?"))).toBe(1);
    expect(nombreDeQuestions(q("Quel nom de domaine aimerais-tu pour ton site ?"))).toBe(1);
  });
  it("des coordonnées énumérées, à donner ensemble, comptent toujours pour plusieurs questions", () => {
    expect(nombreDeQuestions(q("Donne-moi ton adresse, ton e-mail et ton téléphone."))).toBe(3);
    expect(nombreDeQuestions(q("Quel est ton nom, ton adresse e-mail et ton téléphone ?"))).toBe(2);
    expect(nombreDeQuestions(q("Et tu livres où ?", "Tu vends en ligne ?"))).toBe(2);
  });
  it("le nettoyage gratuit passe avant le contrôle, et le contrôle avant la relectrice", () => {
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    const nettoyage = src.indexOf("Le nettoyage gratuit d'abord"), controle = src.indexOf("const defauts = defautsDuMessage(out, regle);"), relecture = src.indexOf("({ out, relu } = await reviewedReply(");
    expect(nettoyage).toBeGreaterThan(0);
    expect(nettoyage).toBeLessThan(controle);
    expect(controle).toBeLessThan(relecture);
  });
});
