/**
 * SINA (#492) — étape 5 du parcours : l'activité complète (gratuite). Coordonnées de l'entreprise avec les mots du
 * client, stratégie de l'angle choisi, offre, produits créés dans l'onglet Produits, validation du client.
 */
import { describe, expect, it } from "vitest";
import { withoutLaterForRequired } from "@/lib/syna-agent/loop";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 5 : l'activité complète", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView, modelFor } = await import("@/lib/syna-agent/loop");
  const { listProducts } = await import("@/lib/products/catalog");
  const J = await import("@/lib/syna-agent/journey");
  const Act = await import("@/lib/syna-agent/activity");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  /** Fil à l'étape 5 : fiche de départ confirmée, étapes 1 à 4 validées, angle « Le goût du vrai fruit » choisi. */
  async function stepFive() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des confitures artisanales : abricot, figue-lavande, fraise-basilic, pêche de vigne." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Des gourmands de 30 à 60 ans." }, { field: "image", value: "Solaire." },
      { field: "setup", value: "4 parfums et un coffret" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "7,90 € le pot, coffret de 3 pots à 22 €" }, { field: "difference", value: "65 % de fruits." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    J.updateJourney(cid, (x) => {
      for (const n of [1, 2, 3, 4]) J.setStep(x, n, "done");
      J.setStep(x, 5, "todo");
      x.angles = { list: [{ id: "reassurance", title: "Le goût du vrai fruit", goal: "Rassurer sur ce qu'il y a dans le pot", why: "", message: "Lis l'étiquette : le fruit passe en premier.", story: "", show: "", organicExample: "", cta: "Lis les étiquettes.", audience: "", motivation: "", emotion: "", proofsToConfirm: [], arguments: [], sources: [] }], recommendedId: null, recommendation: "", sourceCount: 0, at: 1 };
      x.angleChoice = { id: "reassurance", ids: ["reassurance"], at: 1 };
    });
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("parcours complet : plan affiché, questions une par une, produits avec les prix du client, validation", async () => {
    const { user, cid, ctx, pid } = await stepFive();
    expect(J.READY_STEPS).toContain(5);
    expect(J.currentStep(J.journeyOf(cid))).toBe(5);
    expect(modelFor(5)?.model).toMatch(/haiku/); // tout est gratuit, le fil reste léger
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/Étape 5 \(activité complète, GRATUITE\)[^]*activity\.plan[^]*UNE par UNE[^]*SES prix, sans en inventer aucun[^]*catalogue\.create/);
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/y compris les facultatives \(téléphone, SIRET\), une fois chacune ; « Plus tard » se propose SEULEMENT pour le téléphone et le SIRET, JAMAIS pour le nom/);
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/poids ou contenance qu'il a cités dans sa fiche de départ/);
    // 1) Plan : tout ce qui manque devient une question.
    const r1 = await call("activity.plan", ctx, {});
    expect(r1.ok).toBe(true);
    expect(r1.summary).toBe("Plan de l'activité affiché."); // la carte montre ce qui manque, sans doublon
    expect(r1.hint).toMatch(/Encore à compléter : nom de l.entreprise[^]*aucun produit créé[^]*Questions à poser au client, UNE par UNE/);
    expect(J.journeyOf(cid).steps[5].status).toBe("doing");
    expect((await call("activity.validate", ctx, {})).ok).toBe(false); // jamais validé avec des manques
    // 2) Coordonnées avec les mots du client ; une coordonnée obligatoire ne se reporte jamais.
    expect((await call("activity.company", ctx, { later: ["email"] })).ok).toBe(false);
    expect(getTool("activity.company")!.description).toMatch(/MOT POUR MOT \(rien d'ajouté/);
    const c = await call("activity.company", ctx, { fields: { legalName: "Heure Dorée SAS", email: "bonjour@heuredoree.fr", address: "12 rue des Vergers, 26000 Valence", shipping: "Colissimo, 48 h, 5,90 €, offerte dès 45 €", returns: "Pas de retour une fois le pot ouvert ; 14 jours sinon." }, later: ["phone", "siret"] });
    expect(c.summary).toMatch(/^Coordonnées enregistrées : nom de l'entreprise, e-mail de contact, adresse, livraison, retours ; à donner plus tard : téléphone, siret\.$/);
    // « Pas de téléphone sur le site » n'est pas « plus tard » (essai réel du 7 novembre).
    const sans = await call("activity.company", ctx, { none: ["phone"] });
    expect(sans.summary).toBe("Pas sur le site (ton choix) : téléphone.");
    expect(Act.activityPlan(pid, J.journeyOf(cid)).none).toEqual(["phone"]);
    expect((await call("activity.company", ctx, { none: ["email"] })).ok).toBe(false); // jamais une coordonnée obligatoire
    expect(c.ok).toBe(true);
    expect(Act.companyOf(pid)).toMatchObject({ legalName: "Heure Dorée SAS", email: "bonjour@heuredoree.fr" });
    // 3) Produits créés dans l'onglet Produits avec les prix du client.
    await call("catalogue.create", ctx, { title: "Confiture d'abricot", price: 7.9 });
    await call("catalogue.create", ctx, { title: "Coffret 3 pots", price: 22 });
    expect(listProducts(pid).map((x) => x.data.title)).toEqual(["Confiture d'abricot", "Coffret 3 pots"]);
    // 4) Plan complet : la carte le montre, le client valide ; l'étape 6 s'ouvre.
    const r2 = await call("activity.plan", ctx, {});
    expect(r2.summary).toMatch(/Plan de l'activité complet/);
    const view = await fr(() => threadView(user, cid));
    expect(view.journey.activity!.gaps).toEqual([]);
    expect(view.journey.activity!.products.map((x) => x.price)).toEqual([7.9, 22]);
    expect(view.journey.activity!.angle!.title).toBe("Le goût du vrai fruit");
    // Prix de la fiche en centimes : « 7,90 € », jamais « 790 € » (essai réel).
    const { saveProduct, loadProject } = await import("@/lib/projects");
    saveProduct(pid, { ...loadProject(pid).product, price: { amount: 790, currency: "EUR", status: "confirmed" } });
    expect(Act.activityPlan(pid, J.journeyOf(cid)).offer.price).toBe("7,90 €");
    expect((await call("activity.validate", ctx, {})).ok).toBe(true);
    expect(J.journeyOf(cid).steps[5].status).toBe("done");
    expect(J.currentStep(J.journeyOf(cid))).toBe(6);
  });

  it("refusé avant le choix de l'angle ; un prix manquant bloque la validation", async () => {
    const { cid, ctx, pid } = await stepFive();
    J.updateJourney(cid, (x) => J.setStep(x, 4, "review"));
    expect((await call("activity.plan", ctx, {})).ok).toBe(false);
    J.updateJourney(cid, (x) => J.setStep(x, 4, "done"));
    Act.saveCompany(pid, { legalName: "X", email: "a@b.fr", address: "Y", shipping: "Z", returns: "W" });
    await call("catalogue.create", ctx, { title: "Confiture de figue" });
    const gaps = Act.activityGaps(Act.activityPlan(pid, J.journeyOf(cid)));
    expect(gaps).toEqual(["prix manquant pour « Confiture de figue »"]);
    expect((await call("activity.validate", ctx, {})).summary).toMatch(/prix manquant/);
  });
  it("faits de l'offre lisibles : jamais la question du moteur comme titre", () => {
    expect(Act.factLine({ label: "Pouvez-vous recopier la liste des ingrédients de chaque parfum ? (ex. abricots 65 %)", value: "Abricot : abricots 65 %…" })).toBe("Abricot : abricots 65 %…");
    expect(Act.factLine({ label: "Matière", value: "cuivre" })).toBe("Matière : cuivre");
    // Compositions de plusieurs produits d'un bloc : une ligne par produit (essai réel du 7 novembre).
    expect(Act.factItems("Thé vert jasmin : Sencha 85 %, jasmin 15 %. Thé noir aux agrumes : Assam 80 %. Rooibos vanille : rooibos 92 %. Tout est bio.")).toEqual(["Thé vert jasmin : Sencha 85 %, jasmin 15 %.", "Thé noir aux agrumes : Assam 80 %.", "Rooibos vanille : rooibos 92 %. Tout est bio."]);
    expect(Act.factItems("Matière : cuivre")).toEqual(["Matière : cuivre"]);
    // « Plus tard » jamais proposé pour une coordonnée obligatoire (essai réel du 7 novembre : la livraison).

    expect(withoutLaterForRequired({ text: "Comment livres-tu tes sachets : quel transporteur, quel délai, quel prix de livraison, et proposes-tu la livraison offerte à partir d'un montant ?", choices: ["Plus tard"] }).choices).toEqual([]);
    expect(withoutLaterForRequired({ text: "Veux-tu afficher un numéro de téléphone sur le site ? Si oui, lequel ?", choices: ["Plus tard"] }).choices).toEqual(["Plus tard"]);
  });
  it("essai réel : « cuites au chaudron en cuivre » ne fait jamais du cuivre la matière du produit vendu", async () => {
    const { factsFromDescription } = await import("@/lib/engine/local");
    const mat = (d: string) => factsFromDescription(d).find((f) => f.key === "materials")?.value ?? null;
    expect(mat("Confitures artisanales cuites au chaudron en cuivre, avec des fruits de la Drôme.")).toBeNull();
    expect(mat("Pain cuit au four en pierre.")).toBeNull();
    // La matière du produit lui-même reste lue, mot pour mot.
    expect(mat("Montre en acier et cuir véritable.")).toMatch(/acier/);
    expect(mat("Bassine à confiture en cuivre martelé.")).toMatch(/cuivre/); // ici le produit vendu EST la bassine
  });
});
