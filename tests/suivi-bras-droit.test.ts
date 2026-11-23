/**
 * Le bras droit qui informe sans consulter (recherche 08, point 11), sans aucun appel réel : domaine repéré, seules les
 * sources officielles ouvertes et datées, chaque phrase citée retrouvée sur la page, et le bon professionnel avec ses
 * questions prêtes.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("suivi : le bras droit qui informe sans consulter", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const B = await import("@/lib/suivi/bras-droit");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  afterEach(() => { delete B.brasDroitDeps.fetch; });

  it("le domaine et le professionnel : litige, contrat, déclaration, comptes ; une question de tous les jours n'en a pas", async () => {
    expect(B.domaineDe("Je dois facturer la TVA sur mes devis ?")).toBe("impots");
    expect(B.domaineDe("Mon client refuse de payer, que dit la loi ?")).toBe("droit");
    expect(B.domaineDe("Écris un message à mon fournisseur")).toBeNull();
    const p = await fr(() => B.professionnelPour("J'ai reçu une mise en demeure d'un client"));
    expect(p!.qui).toMatch(/avocat/);
    expect(p!.questions).toHaveLength(3);
    expect((await fr(() => B.professionnelPour("Je dois signer un bail commercial")))!.qui).toMatch(/notaire/);
    expect((await fr(() => B.professionnelPour("Comment faire mon bilan ?")))!.qui).toBe("un expert-comptable");
    expect(B.professionnelPour("Calcule mon prix de revient")).toBeNull();
  });

  it("seules les sources officielles de la liste s'ouvrent ; la date affichée par la page est gardée", async () => {
    expect(B.sourceOfficielle("https://entreprendre.service-public.gouv.fr/vosdroits/F31144")).toBe(true);
    expect(B.sourceOfficielle("https://www.legifrance.gouv.fr/codes/x")).toBe(true);
    expect(B.sourceOfficielle("http://www.legifrance.gouv.fr/codes/x")).toBe(false);
    expect(B.sourceOfficielle("https://blog-juridique.fr/devis")).toBe(false);
    let ouvert = 0;
    B.brasDroitDeps.fetch = (async () => { ouvert++; return new Response("<html><title>Devis : quelles mentions ?</title><body><p>Vérifié le 9 septembre 2022 - Direction de l'information légale</p><p>Le devis doit comporter la date, le nom et l'adresse de l'entreprise.</p></body></html>", { status: 200 }); }) as never;
    await expect(fr(() => B.ouvrirPage("https://blog-juridique.fr/devis"))).rejects.toThrow(/sources officielles/);
    expect(ouvert).toBe(0);
    const page = await fr(() => B.ouvrirPage("https://entreprendre.service-public.gouv.fr/vosdroits/F31144"));
    expect(page).toMatchObject({ titre: "Devis : quelles mentions ?", verifieLe: "Vérifié le 9 septembre 2022" });
  });

  it("une citation absente de la page, ou une source non ouverte, est relevée ; une réponse juste passe", async () => {
    const pages = [{ url: "https://entreprendre.service-public.gouv.fr/vosdroits/F31144", titre: "t", texte: "Le devis doit comporter la date, le nom et l'adresse de l'entreprise.", verifieLe: null }];
    expect(B.verifierCitations("La page de l'État dit : « Le devis doit comporter la date, le nom et l'adresse de l'entreprise » (https://entreprendre.service-public.gouv.fr/vosdroits/F31144).", pages)).toEqual([]);
    const d = await fr(() => B.verifierCitations("Selon « le devis est toujours gratuit pour le client » (https://www.legifrance.gouv.fr/x) et https://blog.fr/y", pages));
    expect(d).toEqual([
      "source citée sans avoir été ouverte : https://www.legifrance.gouv.fr/x",
      "source non officielle : https://blog.fr/y",
      "phrase citée introuvable sur les pages ouvertes : « le devis est toujours gratuit pour le client »",
    ]);
    expect(B.CONSIGNE_BRAS_DROIT).toMatch(/tu INFORMES, tu ne consultes pas/);
  });
});
