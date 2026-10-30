import {grantProjectPlan} from './communication-choice-fixture';
import {chooseGeneralistForTest} from './strategy-choice-fixture';
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { campaignCopy, campaignVerdict } from "./publication-fixtures";
import { createUser } from "@/lib/auth";
import { loadProject, saveBrand, saveStrategy } from "@/lib/projects";
import { seedImageFixture } from "./image-v2-fixtures";
import {
  designPostWithAi,
  aiPostAccepted,
  realAiPostDeps,
  projectForSubject,
  type AiPostDeps,
} from "@/lib/social-v2/ai-post";
import { getAsset, saveAsset, assetMeta, assetData } from "@/lib/library";
import {
  artDirectionFor,
  briefScenePrompt,
  buildGenerationBrief,
} from "@/lib/image-v2/art-direction";
import { FORMATS } from "@/lib/image-v2/formats";
import { publicationRendition } from "@/lib/social-v2/publication-quality";
import { publicationStage } from "@/lib/social-v2/publication-recipe";
import { withClientTexts } from "@/lib/engine/ai-post-image";
import { reformatAiImage, redoRequest } from "@/lib/media/ai-image-variants";
import { isAutoUsable } from "@/lib/quality/usable";
import {run}from '@/lib/db';
const post = {
  id: "isolated-campaign",
  network: "instagram",
  format: "image",
  title: "Un usage concret",
  headline: "Un usage concret",
  caption: "",
  pillar: null,
  objective: "convert",
  scheduled_at: null,
};
const png = (w = 1080, h = 1350, c = "#267644") =>
  sharp({ create: { width: w, height: h, channels: 3, background: c } })
    .png()
    .toBuffer();
async function setup(kind: "artisan" | "hightech" = "hightech") {
  const u = await createUser(
    `campaign-${crypto.randomUUID()}@test.invalid`,
    "motdepasse-test",
    "Test isolé",
  );
  const p = loadProject(seedImageFixture(u.id, kind));if(p.business==='services')grantProjectPlan(p.id,"dominer");
  const ref = await saveAsset({
    projectId: p.id,
    userId: u.id,
    data: await png(),
    name: "reference-test.png",
    mime: "image/png",
    role: "original",
    origin: "upload",
    status: "approved",
    meta: { simulation: true },
  });
  return { p, ref };
}
function deps() {
  const calls = {
    images: 0,
    copy: 0,
    review: 0,
    spent: 0,
    prompts: [] as string[],
  };
  const d: AiPostDeps = {
    copy: async (...a) => {
      calls.copy++;
      return campaignCopy(...(a.slice(0, 3) as [unknown, unknown, any]));
    },
    generate: async (prompt) => {
      calls.images++;
      calls.spent += 100;
      calls.prompts.push(prompt);
      return png();
    },
    review: async (_i, _r, texts) => {
      calls.review++;
      calls.spent += 10;
      return {
        ...campaignVerdict(),
        person: false,
        anatomyOk: true,
        productFaithful: true,
        textsExact: true,
        legible: true,
        score: 9.2,
        transcribed: texts,
        issues: [],
        fix: "",
      };
    },
    maxMicro: () => 100,
    reviewMaxMicro: () => 10,
    spentMicro: () => calls.spent,
  };
  return { d, calls };
}
describe("Campagnes — preuves de contrat simulées, pas de qualité fournisseur", () => {
  it("reprise idempotente conserve concept, image et contrôle ; changement explicite de version distinct", async () => {
    const { p, ref } = await setup();
    const { d, calls } = deps();
    const o = { aspect: "4:5" as const, maxCostEur: 1, reference: ref.id };
    const a = await designPostWithAi(p, post, o, d),
      b = await designPostWithAi(p, post, o, d);
    expect(a.assetId).toBeTruthy();
    expect(b.assetId).toBe(a.assetId);
    expect(calls).toMatchObject({ copy: 1, images: 1, review: 1 });
    const m = assetMeta<any>(getAsset(a.assetId!)!);
    expect(m.finalImage).toMatchObject({
      policy: "campaign-2",
      dimensions: { width: 1080, height: 1350 },
      mode: "one-step",
    });
    expect(getAsset(m.finalImage.nativeAssetId)).toBeTruthy();
    const c = await designPostWithAi(p, post, o, {
      ...d,
      operationId: "client-new-version",
    });
    expect(c.assetId).toBeTruthy();
    expect(calls.copy).toBe(2);
  });
  it("échec conception visible : aucune scène de secours, aucun appel image", async () => {
    const { p, ref } = await setup();
    const { d, calls } = deps();
    const r = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 1, reference: ref.id },
      {
        ...d,
        copy: async () => {
          throw new Error("conception refusée test");
        },
      },
    );
    expect(r.assetId).toBeNull();
    expect(r.note).toContain("conception refusée");
    expect(calls.images).toBe(0);
  });
  it("logo faux ou défaut critique bloque malgré 10/10 ; ancienne grille absente ne certifie rien", () => {
    const r = {
      ...campaignVerdict(),
      transcribed: [],
      person: false,
      anatomyOk: true,
      productFaithful: true,
      textsExact: true,
      legible: true,
      score: 10,
      issues: [],
      fix: "",
    };
    expect(
      aiPostAccepted({ ...r, logoFaithful: false }, true, [], false, true),
    ).toBe(false);
    expect(aiPostAccepted({ ...r, fatal: ["produit déformé"] }, true, [])).toBe(
      false,
    );
    expect(
      aiPostAccepted({ ...r, issues: ["lettres trop petites"] }, true, []),
    ).toBe(false);
    expect(aiPostAccepted({ ...r, grid: undefined }, true, [])).toBe(false);
    expect(aiPostAccepted(r, true, [], false, true)).toBe(true);
  });
  it("service sans photo avec logo : vrai logo transmis et contrôlé, pas de faux produit requis", async () => {
    const { p, ref } = await setup("artisan");
    const b = { ...p.brand!, logo: { assetId: ref.id } } as any;
    saveBrand(p.id, b);
    chooseGeneralistForTest(p.id); // Reconcile the newly supplied logo before new communication.
    const service = loadProject(p.id);
    const { d } = deps();
    let logo = false;
    const r = await designPostWithAi(
      service,
      post,
      { aspect: "4:5", maxCostEur: 1, reference: null },
      {
        ...d,
        generate: async (_p, _a, ref, _key, l) => {
          expect(ref).toBeNull();
          logo = !!l;
          return png();
        },
      },
    );
    expect(r.assetId).toBeTruthy();
    expect(logo).toBe(true);
  });
  it("une référence étrangère est bloquée avant conception", async () => {
    const { p } = await setup();
    const other = await setup();
    const { d, calls } = deps();
    const r = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 1, reference: other.ref.id },
      d,
    );
    expect(r.assetId).toBeNull();
    expect(calls.copy).toBe(0);
  });
  it("palette/typos fraîches après modification ; mémoire locale honnête et versions conservées", async () => {
    const { p } = await setup();
    const first = artDirectionFor(p);
    expect(first.source).toBe("local");
    saveBrand(p.id, {
      ...p.brand!,
      palette: { ...p.brand!.palette, secondary: "#123456" },
      fonts: { heading: "Fraunces", body: "Inter" },
    });
    const next = artDirectionFor(loadProject(p.id));
    expect(next.inputHash).not.toBe(first.inputHash);
    expect(next.version).toBe(first.version + 1);
    expect(next.palette.secondary).toBe("#123456");
    expect(next.typography).toContain("Fraunces");
    const b = buildGenerationBrief(loadProject(p.id), {
      purpose: "ad",
      subject: "activité choisie",
      aspect: "4:5",
      texts: { hook: "Message exact" },
      scene: "Une lumière rasante bleue sur outil documenté",
    });
    expect(briefScenePrompt(b, { photoOnly: false })).toContain("Fraunces");
    expect(briefScenePrompt(b)).toContain("rasante bleue");
  });
  it("limite inclut contrôle et mise en page : aucun envoi si le plafond ne couvre pas le parcours", async () => {
    const { p, ref } = await setup();
    const { d, calls } = deps();
    const r = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 0.000105, reference: ref.id },
      d,
    );
    expect(r.assetId).toBeNull();
    expect(calls.images).toBe(0);
  });
  it("étape incertaine non relancée ; étapes acquittées relues sans renvoi", async () => {
    const { p } = await setup();
    let n = 0;
    await expect(
      publicationStage(p.id, "incertain", async () => {
        n++;
        throw new Error("timeout après envoi");
      }),
    ).rejects.toThrow("timeout");
    await expect(
      publicationStage(p.id, "incertain", async () => {
        n++;
        return "payé deux fois";
      }),
    ).rejects.toThrow("double paiement");
    expect(n).toBe(1);
  });
  it("promotion exacte demandée préservée ; aucune coupe de la consigne en régénération", async () => {
    const { p, ref } = await setup();
    const { d, calls } = deps();
    p.product.price = { amount: 4900, currency: "EUR", status: "confirmed" };
    p.product.facts.push({
      key: "promo",
      label: "Promotion confirmée",
      value: "-20 %",
      status: "confirmed",
      source: "description",
    } as any);
    const a = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 1, reference: ref.id, as: "ad" },
      withClientTexts(d, { headline: "Lot à 49 €", cta: "Profiter de -20 %" }),
    );
    expect(a.assetId).toBeTruthy();
    expect(calls.prompts[0]).toContain("Lot à 49 €");
    expect(calls.prompts[0]).toContain("Profiter de -20 %");
    const request = "Contexte ".repeat(100) + "CONTRAINTE FINALE : logo intact";
    expect(
      redoRequest(
        { aiPost: { request } },
        { aspect: "2:3", instruction: "éclaircir" },
      ).request,
    ).toContain("CONTRAINTE FINALE");
  });
  it('un acquis dont le prix est faux reste conservé, sans être réaccepté ni racheté',async()=>{
    const{p,ref}=await setup(),{d,calls}=deps();p.product.price={amount:1990,currency:'EUR',status:'confirmed'};
    const ask={...post,request:'Affiche le prix fourni, sans autre promotion.'},options={aspect:'4:5' as const,maxCostEur:1,reference:ref.id,as:'ad' as const},bound=withClientTexts(d,{headline:'19,90 €'}),first=await designPostWithAi(p,ask,options,bound);expect(first.assetId).toBeTruthy();
    const asset=getAsset(first.assetId!)!,original=assetData(asset),meta=assetMeta<any>(asset);meta.aiPost.texts.headline='1990 €';run('UPDATE assets SET meta=? WHERE id=?',JSON.stringify(meta),asset.id);const before={...calls};
    const reused=await designPostWithAi(p,ask,options,bound);expect(reused.assetId).toBeNull();expect(reused.code).toBe('ACQUIRED_COPY_FACTS_REQUIRED');expect(reused.partialAssetIds).toEqual([asset.id]);expect(calls).toEqual(before);expect(assetData(getAsset(asset.id)!)).toEqual(original);expect(getAsset(asset.id)!.status).toBe(asset.status);
  });
  it("copie gratuite clairement provisoire, pas de certification héritée ; original conservé", async () => {
    const { p, ref } = await setup();
    const { d } = deps();
    const out = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 1, reference: ref.id },
      d,
    );
    const a = getAsset(out.assetId!)!;
    const copy = (await reformatAiImage(p.id, a.id, "2:3"))!;
    const m = assetMeta<any>(copy);
    expect(copy.status).toBe("draft");
    expect(m.finalImage).toBeUndefined();
    expect(isAutoUsable(copy)).toBe(false);
    expect(await sharp(assetData(copy)).metadata()).toMatchObject({
      width: 1080,
      height: 1620,
    });
    expect(getAsset(a.id)!.status).toBe("ready");
  });
  it.each(Object.keys(FORMATS) as (keyof typeof FORMATS)[])(
    "dimensions physiques finales %s, fichier PNG contrôlé sans étirement",
    async (aspect) => {
      const f = FORMATS[aspect];
      const r = await publicationRendition(
        await png(Math.max(768, f.width), Math.max(768, f.height)),
        aspect,
      );
      expect(await sharp(r.data).metadata()).toMatchObject({
        width: f.width,
        height: f.height,
        format: "png",
      });
    },
  );
  it("petite image et canevas incompatible restent bloqués, jamais upscale trompeur", async () => {
    await expect(
      publicationRendition(await png(64, 80), "4:5"),
    ).rejects.toThrow("Résolution");
    await expect(
      publicationRendition(await png(1024, 1024), "4:1"),
    ).rejects.toThrow("recomposition");
  });
  it("sujet secondaire : prix/catégorie sélectionnés, aucune variante ou description du produit principal", async () => {
    const { p } = await setup();
    p.product.price = { amount: 999, currency: "EUR", status: "confirmed" };
    p.product.variants = [{ name: "Couleur", values: ["Bleu"] }];
    p.catalog = [
      {
        key: "accessoire",
        name: "Accessoire",
        category: "Protection",
        price: 1900,
        compareAt: null,
        description: "Contexte long ".repeat(40) + "FIN DU SUJET",
        features: [],
        originalAssetId: null,
      },
    ];
    const q = projectForSubject(p, {
      kind: "product",
      key: "accessoire",
      name: "Accessoire",
      summary: p.catalog[0].description,
      referenceAssetId: null,
    });
    expect(q.product.price.amount).toBe(1900); // Contrat Project : centimes, comme le catalogue natif.
    expect(q.product.category).toBe("Protection");
    expect(q.product.variants).toEqual([]);
    expect(q.product.summary).toContain("FIN DU SUJET");
    const svc = projectForSubject(p, {
      kind: "service",
      key: "Installation",
      name: "Installation",
      summary: "",
      referenceAssetId: null,
    });
    expect(svc.business).toBe("services");
    expect(svc.product.price.status).toBe("unknown");
    expect(svc.product.summary).toBe("");
  });
  it("A/B/A : une autre publication et un autre sujet n'invalident pas une version acceptée", async () => {
    const { p, ref } = await setup();
    p.catalog = ["a", "b"].map((key) => ({
      key,
      name: key,
      category: "Accessoire",
      price: null,
      compareAt: null,
      description: `Description ${key}`,
      features: [],
      originalAssetId: ref.id,
    }));
    const { d, calls } = deps();
    d.spentMicro = () => 0;
    const subject = (key: string) => ({
      kind: "product" as const,
      key,
      name: key,
      summary: `Description ${key}`,
      referenceAssetId: ref.id,
    });
    const a = await designPostWithAi(
      p,
      { ...post, id: "a" },
      {
        aspect: "4:5",
        maxCostEur: 1,
        reference: ref.id,
        subject: subject("a"),
      },
      d,
    );
    await designPostWithAi(
      p,
      { ...post, id: "b" },
      {
        aspect: "4:5",
        maxCostEur: 1,
        reference: ref.id,
        subject: subject("b"),
      },
      d,
    );
    const again = await designPostWithAi(
      p,
      { ...post, id: "a" },
      {
        aspect: "4:5",
        maxCostEur: 1,
        reference: ref.id,
        subject: subject("a"),
      },
      d,
    );
    expect(a.assetId).toBeTruthy();
    expect(again.assetId).toBe(a.assetId);
    expect(calls.images).toBe(2);
  });
  it("reprise deux étapes : seul layout + contrôle restants sont requis et payés", async () => {
    const { p, ref } = await setup();
    let spent = 0,
      images = 0,
      layouts = 0,
      checks = 0;
    const d: AiPostDeps = {
      copy: campaignCopy,
      generate: async (_p, _a, _r, _k, _logo, options) => {
        expect(options?.photoOnly).toBe(true);
        images++;
        spent += 100;
        return png();
      },
      layout: async () => {
        layouts++;
        spent += 50;
        return png();
      },
      maxMicro: (_refs, photoOnly) => {
        expect(photoOnly).toBe(true);
        return 100;
      },
      layoutMaxMicro: () => 50,
      reviewMaxMicro: () => 10,
      spentMicro: () => spent,
      review: async (_i, _r, texts) => {
        checks++;
        spent += 10;
        const wrong = texts.length > 0 && layouts === 1;
        return {
          ...campaignVerdict(),
          transcribed: texts,
          person: false,
          anatomyOk: true,
          productFaithful: true,
          textsExact: !wrong,
          legible: true,
          score: 9.2,
          issues: wrong ? ["typo"] : [],
          fix: wrong ? "corriger le texte" : "",
        };
      },
    };
    const r = await designPostWithAi(
      p,
      post,
      { aspect: "4:5", maxCostEur: 0.00023, reference: ref.id, as: "ad" },
      d,
    );
    expect(r.assetId).toBeTruthy();
    expect({ spent, images, layouts, checks }).toEqual({
      spent: 230,
      images: 1,
      layouts: 2,
      checks: 3,
    });
  });
});
