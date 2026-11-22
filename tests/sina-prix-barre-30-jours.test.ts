/**
 * Le prix barré avec sa preuve (22 novembre 2026, règle européenne des 30 jours) : sans la confirmation datée du client,
 * aucun prix barré ; avec elle, c'est le prix le plus bas des 30 jours qui est barré et le pourcentage se calcule dessus.
 * Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("le prix barré et la preuve des 30 jours", async () => {
  const P = await import("@/lib/syna-agent/prix-anterieur");
  const { createProduct, listProducts } = await import("@/lib/products/catalog");
  const { decideBuyFeatures, loadShopOffers } = await import("@/lib/syna-agent/product-features");
  const { addMessage } = await import("@/lib/syna-agent/store");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { account, project } = await import("./conversation209-fixtures");
  const { runWithLang } = await import("@/lib/i18n-server");

  it("sans preuve : aucun prix barré ; avec la preuve : le plus bas des 30 jours barré, la remise calculée dessus", async () => {
    const u = await account(), pid = project(u) as string, cid = threadFor(u, pid);
    createProduct(pid, { title: "Bougie Cèdre", price: 3000, compareAt: 4500, variants: [{ options: [], sku: "BC-1", stock: 5 }] } as never);
    const prod = listProducts(pid)[0];
    expect(P.prixBarresSansPreuve(pid).map((x) => x.titre)).toEqual(["Bougie Cèdre"]);
    const sans = P.avecPrixProuve(pid, prod);
    expect(sans.data.compareAt).toBeNull();
    expect(decideBuyFeatures(sans, loadShopOffers(pid)).promo).toBeNull();
    // Le client donne son prix le plus bas des 30 jours : 40 €. SINA le note avec ses mots.
    addMessage(cid, "user", { text: "Le plus bas ces 30 derniers jours, c'était 40 euros." }, null);
    const t = P.preuvePrixTool, ctx: any = { user: u, conversationId: cid, projectId: pid };
    const faux = await runWithLang({ ui: "fr", content: "fr" }, async () => t.run(ctx, t.args.parse({ product: "Bougie Cèdre", plusBas: 35, mots: "c'était 35 euros" })));
    expect(faux.ok).toBe(false); // jamais un prix qu'il n'a pas dit
    const ok = await runWithLang({ ui: "fr", content: "fr" }, async () => t.run(ctx, t.args.parse({ product: "Bougie Cèdre", plusBas: 40, mots: "c'était 40 euros" })));
    expect(ok.ok).toBe(true);
    expect(ok.summary).toMatch(/−25 %/);
    const avec = P.avecPrixProuve(pid, listProducts(pid)[0]);
    expect(avec.data.compareAt).toBe(4000);
    expect(decideBuyFeatures(avec, loadShopOffers(pid)).promo).toEqual({ kind: "compareAt", pct: 25 });
    expect(P.prixBarresSansPreuve(pid)).toEqual([]);
  });

  it("une nouvelle promotion (autre prix de comparaison) redemande la preuve", async () => {
    const u = await account(), pid = project(u) as string;
    const prod = createProduct(pid, { title: "Savon", price: 800, compareAt: 1200, variants: [{ options: [], sku: "S-1", stock: 5 }] } as never);
    P.noterPreuve(pid, prod.id, { compareAt: 1000, plusBas: 1000, at: Date.now(), mots: "10 euros" });
    expect(P.avecPrixProuve(pid, listProducts(pid)[0]).data.compareAt).toBeNull();
    expect(P.prixBarresSansPreuve(pid)).toHaveLength(1);
  });

  it("le site de SINA et le bloc d'achat passent par la preuve ; SINA a l'outil à l'étape de l'activité et du site", async () => {
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/buy-block.ts", "utf8").match(/avecPrixProuve\(projectId,/g)).toHaveLength(2);
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/tenue-data.ts", "utf8")).toContain("const p = avecPrixProuve(projectId, p0, preuves);");
    const C = await import("@/lib/syna-agent/conversation");
    expect(C.toolInFocus("prix.preuve", 5)).toBe(true);
    expect(C.toolInFocus("prix.preuve", 6)).toBe(true);
  });
});

describe("la mise en boutique dit le prix barré sans preuve", () => {
  it("une note « à savoir » à l'envoi du thème", async () => {
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/install.ts", "utf8")).toContain("const sansPreuve = prixBarresSansPreuve(projectId);");
  });
});
