/**
 * Spécialistes du thème sur mesure (carte des spécialistes de SINA, lot 8, 13 novembre 2026) : la documentaliste
 * (références du même secteur, sans IA), la comparaison contre les doublons (carte d'identité, sans IA) et le juge de
 * l'originalité (séparé du concepteur). Sans IA réelle, sans réseau.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sectionByRef } from "@/lib/syna-agent/custom-theme/library";
import type { Design } from "@/lib/syna-agent/custom-theme/design";
import * as R from "@/lib/syna-agent/custom-theme/references";
import * as C from "@/lib/syna-agent/custom-theme/identity-card";
import * as O from "@/lib/syna-agent/custom-theme/originality";

const ids = (titles: string[]) => titles.map((t) => { const s = sectionByRef(t); if (!s) throw new Error(`section « ${t} » absente`); return s.id; });
const HOME_A = ["Ouverture photo pleine", "Collection en vedette", "Histoire du produit au défilement", "Citation en grand", "Avis clients", "Grille bento", "Nos engagements", "Chiffres clés"];
const PRODUCT_A = ["Produit vedette", "Points forts du produit", "Mode d'emploi en étapes", "Résumé des avis", "Questions sur le produit", "Fiche produit à onglets", "Badges de confiance"];
const HOME_B = ["Ouverture en écran partagé", "Grand texte défilant", "Produits en onglets", "Image et texte", "Grande photo de respiration", "Garanties et assurances", "Galerie avec visionneuse", "Inscription centrée"];
const PRODUCT_B = ["Produit vedette", "Fiche produit en accordéon", "Profil du mélange", "Scène achetable", "Questions en cartes", "Mur d'avis", "Vous aimerez aussi"];
const design = (home: string[], product: string[], concept: string, shell = { header: "En-tête classique", footer: "Pied de page complet" }): Design => ({
  visitor: "Une personne qui veut une vraie pause dans sa journée chargée.", levers: ["la promesse visible", "la preuve par le savoir-faire"], objections: [],
  concept, header: sectionByRef(shell.header)!.id, footer: sectionByRef(shell.footer)!.id, search: null, corrections: [],
  pages: [["home", "Accueil", home], ["product", "Fiche produit", product]].map(([key, label, list]) => ({ key: key as string, label: label as string, journey: "Le visiteur arrive, comprend, ressent, puis agit sans hésiter.", sections: ids(list as string[]).map((section) => ({ section, why: "Le moment où le visiteur a besoin de cela.", says: "Les vrais faits de la marque, sans rien inventer.", photos: "aucune" })) })),
});
const card = (d: Design) => C.cardOf(d.pages.map((pg) => ({ key: pg.key, sections: pg.sections.map((x) => x.section) })), { header: d.header, footer: d.footer });

describe("la documentaliste du thème (sans IA)", () => {
  it("reconnaît le secteur ou le métier dans les mots du client", () => {
    expect(R.sectorOf("Des thés bio en sachet et des infusions.", "products")?.key).toBe("the-cafe");
    expect(R.sectorOf("Un fauteuil en tissu terracotta, mobilier fait main.", "products")?.key).toBe("mobilier");
    expect(R.sectorOf("Électricien à Lyon, rénovation et dépannage.", "services")?.key).toBe("batiment");
    expect(R.sectorOf("Salon de coiffure et barbier.", "services")?.key).toBe("beaute");
    expect(R.sectorOf("Un objet que personne ne connaît.", "products")).toBeNull();
    // Un mot de produit ne fait jamais reconnaître un métier de service, et l'inverse.
    expect(R.sectorOf("Des thés bio en sachet.", "services")).toBeNull();
  });

  it("donne des références proches et lointaines, sans nom de site ni de marque, avec les sections propres au secteur", () => {
    const b = R.referencesBrief({ offer: "Des thés bio en sachet.", business: "products", seed: "projet-1" });
    expect(b.sector).toBe("Thé, café, infusions");
    expect(b.near).toBeGreaterThan(2);
    expect(b.near).toBeLessThanOrEqual(6);
    expect(b.far).toBe(3);
    expect(b.text).toMatch(/G\. LE DOSSIER DE LA DOCUMENTALISTE[^]*JAMAIS une allure/);
    expect(b.text).toMatch(/CE QUE FONT LES VRAIS SITES DE CE SECTEUR : \d+ sites relevés\. Accueil : \d+ sections le plus souvent/);
    expect(b.text).toMatch(/RÉFÉRENCES PROCHES \(même secteur\) :\n- proche 1 · ouverture : /);
    expect(b.text).toMatch(/RÉFÉRENCES LOINTAINES[^]*- lointaine 3 · /);
    expect(b.text).toMatch(/SECTIONS PROPRES À CE SECTEUR[^]*La préparation en chiffres/);
    expect(b.text).toMatch(/COMMENT T'EN SERVIR : pars de plusieurs références, jamais d'une seule/);
    // Aucune adresse, aucun nom de site, aucune marque citée par le cahier.
    expect(b.text).not.toMatch(/https?:|www\.|\.com|\.fr\b|myshopify|Vu :|Kusmi|Palais des Thés|Blue Bottle|Onyx/);
    const picked = R.pickReferences({ sector: R.sectorOf("Des thés bio en sachet.", "products"), business: "products", seed: "projet-1" });
    for (const c of [...picked.near, ...picked.far]) { expect(b.text).not.toContain(c.cle); expect(c.incertain).toBeFalsy(); }
    expect(new Set(picked.far.map((c) => c.groupe)).size).toBe(picked.far.length); // une lointaine par secteur
    expect(picked.far.every((c) => c.groupe !== "the-cafe")).toBe(true);
    // Même projet, mêmes références ; autre projet, autre tirage.
    expect(R.referencesBrief({ offer: "Des thés bio en sachet.", business: "products", seed: "projet-1" }).text).toBe(b.text);
    expect(R.referencesBrief({ offer: "Des thés bio en sachet.", business: "products", seed: "projet-2" }).text).not.toBe(b.text);
    // Un service : ses références viennent des sites de services, son cahier est celui de son métier.
    const s = R.referencesBrief({ offer: "Électricien à Lyon, rénovation.", business: "services", seed: "x" });
    expect(s.sector).toBe("Artisans du bâtiment");
    expect(s.text).toMatch(/Métier reconnu : Artisans du bâtiment[^]*RÉFÉRENCES PROCHES \(même métier\)/);
    // Secteur inconnu : des références générales seulement, jamais un secteur inventé.
    const u = R.referencesBrief({ offer: "Un objet que personne ne connaît.", business: "products", seed: "x" });
    expect(u.sector).toBeNull();
    expect(u.near).toBe(0);
    expect(u.text).toMatch(/Aucun secteur reconnu/);
  });

  it("bibliothèque illisible : rien n'est donné, rien ne casse", () => {
    const before = process.env.SINA_SAVOIR_DIR, dir = fs.mkdtempSync(path.join(os.tmpdir(), "savoir-vide-"));
    process.env.SINA_SAVOIR_DIR = dir;
    try {
      expect(R.referenceCards()).toEqual([]);
      expect(R.referencesBrief({ offer: "Des thés bio en sachet.", business: "products", seed: "x" })).toMatchObject({ near: 0, far: 0, text: "" });
    } finally { if (before == null) delete process.env.SINA_SAVOIR_DIR; else process.env.SINA_SAVOIR_DIR = before; }
  });
});

describe("la carte d'identité d'un thème et la comparaison contre les doublons (sans IA)", () => {
  it("deux concepts identiques sont refusés, deux concepts vraiment différents passent", () => {
    const a = card(design(HOME_A, PRODUCT_A, "A")), same = card(design(HOME_A, PRODUCT_A, "A bis")), b = card(design(HOME_B, PRODUCT_B, "B", { header: "En-tête au logo centré", footer: "Pied de page minimal centré" }));
    expect(a.opening).toBe(sectionByRef("Ouverture photo pleine")!.id);
    expect(C.conceptGaps(a, same)[0]).toMatch(/ce concept ressemble trop au premier \(\d+ lignes communes sur \d+ : l'ouverture, /);
    expect(C.conceptGaps(a, b)).toEqual([]);
    // Deux sections changées ne font pas un autre site.
    const tweaked = card(design([...HOME_A.slice(0, 6), "Garanties et assurances", "Galerie avec visionneuse"], PRODUCT_A, "A retouché"));
    expect(C.conceptGaps(a, tweaked).length).toBe(1);
  });

  it("un concept trop proche d'un thème déjà monté pour une autre marque est refusé", () => {
    const a = card(design(HOME_A, PRODUCT_A, "A")), b = card(design(HOME_B, PRODUCT_B, "B", { header: "En-tête au logo centré", footer: "Pied de page minimal centré" }));
    expect(C.registryGaps(a, [])).toEqual([]);
    expect(C.registryGaps(a, [b])).toEqual([]);
    expect(C.registryGaps(a, [b, a])[0]).toMatch(/même ouverture, même en-tête et même ordre d'accueil qu'un thème déjà monté pour une autre marque/);
    // Même ouverture et même ordre, autre en-tête : encore trop proche (lignes communes).
    const otherShell = card(design(HOME_A, PRODUCT_A, "A", { header: "En-tête au logo centré", footer: "Pied de page complet" }));
    expect(C.registryGaps(a, [otherShell])[0]).toMatch(/trop proche d'un thème déjà monté pour une autre marque \(\d+ lignes communes sur \d+/);
  });
});

describe("le juge de l'originalité (séparé du concepteur)", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const fr = <X,>(fn: () => Promise<X> | X) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  async function project() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés bio en sachet." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 produit" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    await call("theme.family", ctx, { family: "classique" });
    await call("theme.ambiance", ctx, { ambiance: "clair" });
    return ctx;
  }
  const A = () => design(HOME_A, PRODUCT_A, "Concept A : l'éclat du matin.");
  // Dans la famille Classique, un seul en-tête et un seul « Produit vedette » se posent dans un thème : B change tout le reste.
  const B = () => design(HOME_B, PRODUCT_B, "Concept B : la pause du soir.", { header: "En-tête classique", footer: "Pied de page minimal centré" });
  const isB = (prompt: string) => prompt.includes("UN PREMIER CONCEPT EXISTE");

  it("le concepteur reçoit le dossier de la documentaliste ; un concept refusé par le juge est repris une fois, puis relu", async () => {
    const ctx = await project();
    const prompts: string[] = [], judged: string[] = [];
    T.customDesignDeps.call = async (_system, prompt) => { prompts.push(prompt); return isB(prompt) ? B() : A(); };
    T.customDesignDeps.judge = async (prompt) => {
      judged.push(prompt);
      const j = JSON.parse(prompt);
      if (!j.premierConcept) return { verdict: "garde", why: "L'idée du matin se voit dans l'ouverture et dans les scènes.", fixes: [] };
      // Concept B : refusé au premier avis, gardé après la reprise.
      return judged.filter((x) => JSON.parse(x).premierConcept).length === 1
        ? { verdict: "reprendre", why: "Ce site irait aussi bien à une autre marque de thé.", fixes: ["Ouverture : montre le geste du soir propre à cette marque, pas une tasse posée."] }
        : { verdict: "garde", why: "La pause du soir se reconnaît maintenant dès l'ouverture.", fixes: [] };
    };
    try {
      const est = await fr(() => getTool("custom.concepts")!.estimate!(ctx, {}));
      const design3 = (await import("@/lib/syna-agent/custom-theme/design"));
      // Le devis compte le juge : deux avis au plus par concept.
      expect(est.maxMicro).toBe((design3.DESIGN_CAP_MICRO * design3.DESIGN_CALLS_MAX + O.ORIGINALITY_CAP_MICRO * O.ORIGINALITY_CALLS_MAX) * 2);
      const r = await call("custom.concepts", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      // La documentaliste : secteur reconnu dans les mots du client, références sans nom de site.
      expect(prompts[0]).toMatch(/G\. LE DOSSIER DE LA DOCUMENTALISTE[^]*Secteur reconnu : Thé, café, infusions[^]*RÉFÉRENCES PROCHES/);
      expect(prompts[0]).not.toMatch(/myshopify|Vu :/);
      expect(r.data.A.references).toMatch(/secteur reconnu : Thé, café, infusions ; \d référence\(s\) proche\(s\) et 3 lointaine\(s\) étudiées, sans en copier aucune/);
      // Le juge lit le dossier, les références et le concept ; pour B, il a le premier concept sous les yeux.
      expect(judged).toHaveLength(3);
      const first = JSON.parse(judged[0]);
      expect(first.conceptAJuger.idee).toMatch(/Concept A/);
      expect(first.conceptAJuger.pages[0].sections[0]).toMatchObject({ section: "Ouverture photo pleine", role: "ouverture" });
      expect(first.referencesDuSecteur).toMatch(/RÉFÉRENCES PROCHES/);
      expect(first.premierConcept).toBeNull();
      expect(JSON.parse(judged[1]).premierConcept.idee).toMatch(/Concept A/);
      expect(O.ORIGINALITY_SYSTEM).toMatch(/Tu ne réécris rien[^]*LE LOGO MASQUÉ[^]*LE CONCURRENT[^]*LE CLICHÉ[^]*Ne cite jamais une autre marque/);
      // Ses corrections rejoignent la seule reprise du concepteur (aucun appel de conception en plus pour A).
      const fixes = prompts.filter((x) => x.includes("- juge de l'originalité : "));
      expect(fixes).toHaveLength(1);
      expect(isB(fixes[0])).toBe(true);
      expect(fixes[0]).toMatch(/POINTS REFUSÉS PAR LE CONTRÔLE DU STUDIO[^]*- juge de l'originalité : Ouverture : montre le geste du soir/);
      expect(r.data.A.originalite).toMatch(/^jugé propre à la marque : L'idée du matin/);
      expect(r.data.B.originalite).toMatch(/^repris une fois à la demande du juge de l'originalité, puis gardé : La pause du soir/);
      expect(r.data.B.aRevoir.join(" ")).not.toMatch(/originalité/);
      expect(r.hint).toMatch(/doute du juge de l'originalité/);
    } finally { delete T.customDesignDeps.call; delete T.customDesignDeps.judge; }
  });

  it("un doute qui reste est dit ; un juge en panne ne bloque rien ; deux concepts identiques reviennent au concepteur", async () => {
    const ctx = await project();
    const prompts: string[] = [];
    // Le concepteur rend deux fois le même site : la comparaison contre les doublons le renvoie une fois.
    T.customDesignDeps.call = async (_system, prompt) => { prompts.push(prompt); return A(); };
    T.customDesignDeps.judge = async (prompt) => {
      if (!JSON.parse(prompt).premierConcept) throw new Error("modèle indisponible");
      return { verdict: "reprendre", why: "Le second concept est le premier, à deux mots près.", fixes: ["Change l'idée et le parcours de l'accueil : c'est le même site."] };
    };
    try {
      const r = await call("custom.concepts", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      expect(r.data.A.originalite).toMatch(/^originalité non jugée \(modèle indisponible\)/);
      expect(r.data.B.originalite).toMatch(/^doute du juge de l'originalité, à dire au client : Le second concept est le premier/);
      expect(r.data.B.aRevoir.join("\n")).toMatch(/originalité : Le second concept est le premier/);
      expect(r.data.B.aRevoir.join("\n")).toMatch(/ce concept ressemble trop au premier/);
      const fix = prompts.find((x) => x.includes("POINTS REFUSÉS PAR LE CONTRÔLE DU STUDIO") && isB(x))!;
      expect(fix).toMatch(/- ce concept ressemble trop au premier \(\d+ lignes communes[^]*- juge de l'originalité : Change l'idée/);
    } finally { delete T.customDesignDeps.call; delete T.customDesignDeps.judge; }
  });
});
