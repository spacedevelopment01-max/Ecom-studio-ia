/** Le site, audit du 22 novembre 2026 : règles du propriétaire et petites économies, vérifiées sans aucun appel. */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import { PHOTO_REVIEW_MODEL } from "@/lib/syna-agent/custom-theme/gallery";
import { SitePlanSchema } from "@/lib/syna-agent/custom-theme/brand";
import { bandesDeLaCapture } from "@/lib/syna-agent/custom-theme/shots";

describe("le site : relecture des photos, plan, regard en image", () => {
  it("chaque photo du site est relue par le modèle le plus fort, au niveau élevé (règle du propriétaire)", () => {
    expect(PHOTO_REVIEW_MODEL).toEqual({ provider: "anthropic", model: "claude-opus-5-5", effort: "high" });
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/gallery.ts", "utf8");
    expect(src).not.toMatch(/prefer: CHECK_MODEL/);
  });

  it("le plan des textes garde jusqu'à 90 sections (un site en a 43 à 70)", () => {
    const section = (n: number) => ({ uid: `s${n}`, message: "Un message clair.", titre: null, bouton: null, faits: [] });
    const r = SitePlanSchema.safeParse({ promesse: "Une promesse.", voix: "Une voix.", menu: [], sections: Array.from({ length: 70 }, (_, i) => section(i)) });
    expect(r.success).toBe(true);
  });

  it("le regard sur une page reçoit des bandes lisibles, de haut en bas, quatre au plus", async () => {
    const page = await sharp({ create: { width: 390, height: 3600, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const bandes = await bandesDeLaCapture(page);
    expect(bandes).toHaveLength(3);
    for (const b of bandes) expect((await sharp(b).metadata()).width).toBe(390);
    const courte = await sharp({ create: { width: 390, height: 800, channels: 3, background: "#ffffff" } }).png().toBuffer();
    expect(await bandesDeLaCapture(courte)).toEqual([courte]);
  });

  it("les relectures servies une seule fois n'écrivent pas de mémoire d'une heure", () => {
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    for (const n of ["SITE_PLAN_SYSTEM", "COPY_REVIEW_SYSTEM", "PHOTO_REVIEW_SYSTEM"]) expect(brand).toContain(`teteUnique: true, system: educated(${n}`);
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8")).toMatch(/role === DESIGN_SYSTEM \? \{\} : \{ teteUnique: true \}/);
  });
});

describe("le site : photos créées trois à la fois", () => {
  it("chaque photo est lancée dans l'ordre, trois au plus en même temps, et toutes sont attendues", async () => {
    const { enMemeTemps, PHOTOS_EN_MEME_TEMPS } = await import("@/lib/syna-agent/custom-theme/brand");
    expect(PHOTOS_EN_MEME_TEMPS).toBe(3);
    const debut: number[] = [], fin: number[] = [];
    let actives = 0, max = 0;
    await enMemeTemps([0, 1, 2, 3, 4, 5, 6], 3, async (i) => {
      debut.push(i); actives++; max = Math.max(max, actives);
      await new Promise((r) => setTimeout(r, 5 + (i % 3) * 5));
      actives--; fin.push(i);
    });
    expect(debut).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(max).toBe(3);
    expect([...fin].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("le site : le juge de l'ordre et la reprise ne rendent que leurs changements", () => {
  it("une page rendue remplace la sienne, les autres restent ; les partitions se fondent ; rien rendu = rien changé", async () => {
    const { applyDesignPatch, DesignPatchSchema, DESIGN_REVIEW_SYSTEM } = await import("@/lib/syna-agent/custom-theme/design");
    const page = (key: string, ids: string[]) => ({ key, label: key, journey: "Le visiteur arrive, comprend, achète sans hésiter.", sections: ids.map((id) => ({ section: id, why: "Parce que le visiteur le demande.", says: "Ce que la section dit.", photos: "aucune" })) });
    const base = { pages: [page("home", ["a", "b"]), page("product", ["c"])], partitions: [{ page: "home", partition: "x" }, { page: "product", partition: "y" }], famille: "f1", corrections: [] } as any;
    const p = DesignPatchSchema.parse({ pages: [page("home", ["b", "a"])], partitions: [{ page: "home", partition: "z" }], corrections: ["home : l'offre avant la preuve"] });
    const d = applyDesignPatch(base, p);
    expect(d.pages.map((x: any) => [x.key, x.sections.map((s: any) => s.section)])).toEqual([["home", ["b", "a"]], ["product", ["c"]]]);
    expect(d.partitions).toEqual([{ page: "product", partition: "y" }, { page: "home", partition: "z" }]);
    expect(d.famille).toBe("f1");
    expect(applyDesignPatch(base, DesignPatchSchema.parse({ corrections: [] })).pages).toEqual(base.pages);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/rends SEULEMENT ce que tu changes/);
    expect(DESIGN_REVIEW_SYSTEM).not.toMatch(/rends la conception CORRIGÉE et complète/);
  });
});

describe("le site : la partie commune du plan des textes, une fois, en mémoire", () => {
  it("chaque section ne reçoit plus la promesse, la voix, le menu, les titres ni les pages : ils sont dans la partie commune", async () => {
    const B = await import("@/lib/syna-agent/custom-theme/brand");
    const site = { promesse: "Une promesse claire.", voix: "Une voix chaleureuse.", menu: ["Boutique"], sections: [{ uid: "a1", message: "Dire l'offre.", titre: "Le titre A", bouton: null, faits: [] }, { uid: "b2", message: "Rassurer.", titre: "Le titre B", bouton: null, faits: [] }], seo: [] };
    const commun = B.planCommun(site as any, "home : Accueil");
    expect(commun).toMatch(/Promesse : Une promesse claire\./);
    expect(commun).toMatch(/« Le titre A », « Le titre B »/);
    expect(commun).toMatch(/PAGES DU SITE \(clé : nom\) : home : Accueil/);
    const p = B.sectionWritePrompt("", "Accueil", "Ouverture", "ouvre", "<h1>x</h1>", { site: site as any, uid: "a1" }, { pages: "home : Accueil", communAPart: true });
    expect(p).not.toMatch(/Promesse :|Titres des autres sections|PAGES DU SITE/);
    expect(p).toMatch(/CETTE section : message : Dire l'offre\. ; titre : « Le titre A »/);
  });
});

describe("le site : les textes écrits page par page", () => {
  it("les sections sont rangées par page, huit au plus par appel ; les pièces pratiques ensemble", async () => {
    const B = await import("@/lib/syna-agent/custom-theme/brand");
    const sec = (uid: string, page?: string) => ({ s: { uid }, page: page ? { key: page } : undefined });
    const list = [sec("h1"), ...Array.from({ length: 11 }, (_, i) => sec(`a${i}`, "home")), sec("p1", "product"), sec("f1")];
    const m = B.morceauxParPage(list as any).map((g) => g.map((x: any) => x.s.uid));
    expect(m).toEqual([["h1", "f1"], ["a0", "a1", "a2", "a3", "a4", "a5"], ["a6", "a7", "a8", "a9", "a10"], ["p1"]]);
    expect(Math.max(...m.map((g) => g.length))).toBeLessThanOrEqual(B.PAGE_SECTIONS_MAX);
  });

  it("la demande d'une page donne une fois le parcours et la fiche, puis chaque section avec son uid ; la réponse a une entrée par section", async () => {
    const B = await import("@/lib/syna-agent/custom-theme/brand");
    const p = B.pageWritePrompt({ page: "Accueil", journey: "Il arrive, il comprend, il achète.", product: null, sections: [{ uid: "a1", prompt: "Section à adapter : A" }, { uid: "b2", prompt: "Section à adapter : B" }] });
    expect(p.match(/PARCOURS DU VISITEUR SUR CETTE PAGE/g)).toHaveLength(1);
    expect(p).toMatch(/══ SECTION uid « a1 » ══\nSection à adapter : A[\s\S]*══ SECTION uid « b2 » ══/);
    expect(B.PageWriteSchema.parse({ sections: [{ uid: "a1", edits: [], links: [], photos: [] }] }).sections[0].uid).toBe("a1");
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8")).toMatch(/promptKey: "syna-custom-page-1"[^\n]*PageWriteSchema, \{ strict: true \}/);
  });
});
