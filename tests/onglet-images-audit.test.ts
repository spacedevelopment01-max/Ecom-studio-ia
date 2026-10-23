vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/**
 * Audit de l'onglet Images : images finales 100 % IA (jamais une photo libre en secours d'une image demandée à l'IA),
 * IA d'images indisponible dite clairement (raison, aucun bouton payant qui échouerait), modèle du studio
 * (Qwen-Image 3.0 Pro) remplacé → signalé à l'administration, consignes au modèle d'images en français avec le
 * produit entier exigé. Aucun appel payant : clés et fournisseurs simulés.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let keys: Record<string, string | null> = {};
let sessionUser: any = null;
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/plan-gates", async (orig) => ({ ...(await orig<any>()), requireCreationPlan: () => "vendre" }));

describe("onglet Images — audit", async () => {
  const { createUser } = await import("@/lib/auth");
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting } = await import("@/lib/settings");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const v2 = await import("@/app/api/projects/[id]/images/v2/route");
  const images = await import("@/app/api/projects/[id]/images/route");
  const { mediaRoutingOverview } = await import("@/lib/ai/media-routing-admin");
  const { loadProject } = await import("@/lib/projects");
  const { buildBrief, generationPrompt } = await import("@/lib/image-v2/brief");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`onglet-images-${Date.now()}@test.fr`, "motdepasse-test", "I");
  run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, "vendre");
  const ctx = { params: Promise.resolve({ id: pid }) } as any;
  const postV2 = (b: unknown) => fr(() => v2.POST(new Request(`http://localhost:3000/api/projects/${pid}/images/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), ctx));
  const payloadOf = async (res: Response) => JSON.parse(one<{ payload: string }>("SELECT payload FROM jobs WHERE id = ?", (await res.json()).jobId)!.payload);

  beforeEach(() => {
    sessionUser = { ...u, role: "client" };
    keys = {};
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.media.usage"]) setJsonSetting(k, {});
  });

  it("une image demandée à l'IA n'est jamais remplacée par une photo libre (même sans « noStock »)", async () => {
    const r = await postV2({ action: "generate", request: { kind: "ambiance", topic: "table en bois", aspect: "4:5", count: 1, allowGenerate: true } });
    expect(r.status).toBe(200);
    expect((await payloadOf(r)).request).toMatchObject({ allowGenerate: true, noStock: true });
    // Demande par défaut (aucun indicateur) : génération seule, elle aussi.
    const d = await postV2({ action: "generate", request: { kind: "ambiance" } });
    expect((await payloadOf(d)).request).toMatchObject({ allowGenerate: true, noStock: true });
    // « Chercher des photos libres » (recherche seule, gratuite) : toujours possible, jamais de génération.
    const s = await postV2({ action: "generate", request: { kind: "ambiance", allowGenerate: false } });
    const sp = (await payloadOf(s)).request;
    expect(sp.allowGenerate).toBe(false);
    expect(sp.noStock).toBeUndefined();
  });

  it("IA d'images indisponible : « ai » faux et raison dite (aucun bouton payant voué à l'échec)", async () => {
    const res = await fr(() => images.GET(new Request(`http://localhost:3000/api/projects/${pid}/images`), ctx));
    const body = await res.json();
    expect(body.ai).toBe(false);
    expect(body.reason).toMatch(/Alibaba|Qwen/);
    expect(body.quote.ai_image).toBeGreaterThan(0);
    // Clé Alibaba active : Qwen-Image 3.0 Pro utilisable, l'IA d'images est disponible.
    keys = { alibaba: "sk-alibaba-test-123456", anthropic: "sk-ant-test-1234567890abcdef" };
    const ok = await (await fr(() => images.GET(new Request(`http://localhost:3000/api/projects/${pid}/images`), ctx))).json();
    expect(ok.ai).toBe(true);
    expect(ok.reason).toBeNull();
  });

  it("administration : Qwen-Image 3.0 Pro inutilisable et remplacé par un autre modèle → signalé", async () => {
    keys = { openai: "sk-openai-test-123456" };
    const img = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(img.studioDefault).toMatchObject({ key: "alibaba:qwen-image-3.0-pro", usable: false, replacedBy: "openai:gpt-image-1" });
    expect(img.studioDefault!.reasons.join(" ")).toMatch(/clé/);
    keys = { openai: "sk-openai-test-123456", alibaba: "sk-alibaba-test-123456" };
    const okImg = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(okImg.primary).toBe("alibaba:qwen-image-3.0-pro");
    expect(okImg.studioDefault).toMatchObject({ usable: true, replacedBy: null });
    // Choix fait par l'administration : prioritaire, aucun avertissement.
    keys = { openai: "sk-openai-test-123456" };
    setJsonSetting("ai.routes", { image_generation: { provider: "openai", model: "gpt-image-1" } });
    const own = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(own.studioDefault!.replacedBy).toBeNull();
  });

  it("photo du vrai produit : structure du propriétaire, en français, produit entier, sans contradiction", async () => {
    const { PRODUCT_SCENE_END } = await import("@/lib/image-v2/still-life");
    const p = loadProject(pid);
    const b = buildBrief(p, { kind: "usage_scene", support: "site", aspect: "4:5", references: ["ref"] });
    const prompt = generationPrompt(b);
    expect(prompt).toMatch(/^Photographie publicitaire haut de gamme, photoréaliste, au format vertical 4:5\. Vue de face/);
    expect(prompt).toMatch(/La scène se déroule sur .+\n\nAu centre de l’image se trouve le produit de l’image de référence, reproduit exactement à l’identique/s);
    expect(prompt).toContain("Le produit est entier dans le cadre : aucune partie coupée, cachée ou manquante");
    expect(prompt).toContain("La scène contient exactement un objet : le produit de la référence.");
    expect(prompt).toContain("Le bas de l’image laisse une zone dégagée");
    expect(prompt).toMatch(/Mise au point précise sur le produit/);
    // Phrase finale sans contradiction : les inscriptions réelles du produit restent.
    expect(prompt.trim().endsWith(PRODUCT_SCENE_END)).toBe(true);
    expect(PRODUCT_SCENE_END).toMatch(/en dehors de ce qui figure déjà sur le produit/);
    expect(prompt).not.toMatch(/Never show|Lighting:|Camera:|accessoires|#[0-9A-F]{6}/);
    // Aucun texte voulu entre guillemets dans une image de la banque.
    expect(prompt).not.toMatch(/«[^»]+»/);
    // L'enveloppe du studio n'ajoute rien à une consigne complète.
    const { productScenePrompt } = await import("@/lib/ai/media-providers");
    expect(productScenePrompt({ prompt, aspect: "4:5", textZone: "en bas du cadre" })).toBe(prompt.trim());
  });

  it("vocabulaire du client appliqué à la consigne du modèle d'images (ex. « montre », jamais « chronographe »)", async () => {
    const { addWordingRule } = await import("@/lib/client-wording");
    const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
    const { mockDeps, review } = await import("./image-v2-mock");
    const q = seedImageFixture(u.id, "artisan");
    addWordingRule(q, { avoid: "chronographe", use: "montre" });
    const { deps, log } = mockDeps({ providers: [], reviewFor: () => review(9) });
    await fr(() => runImageEngineV2(null, q, { kind: "trade_photo", aspect: "16:9", topic: "un chronographe posé sur l'établi", allowGenerate: true, noStock: true }, deps));
    expect(log.prompts.length).toBeGreaterThan(0);
    for (const x of log.prompts) {
      expect(x).not.toMatch(/chronographe/i);
      expect(x).toContain("une montre posée sur l'établi");
    }
  });

  it("consigne entièrement en français : chaque décor et interdit des familles de produits a sa traduction", async () => {
    const { PROMPT_FR, untranslated } = await import("@/lib/image-v2/prompt-fr");
    const { GLOBAL_NEGATIVES } = await import("@/lib/brain/trade");
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/image-v2/categories.ts"), "utf8");
    const phrases = [...src.matchAll(/(?:environments|negative): \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
    const common = /COMMON_NEGATIVE = \[([^\]]*)\]/.exec(src)![1].match(/"([^"]+)"/g)!.map((x) => x.slice(1, -1));
    expect(phrases.length).toBeGreaterThan(40);
    expect(untranslated([...phrases, ...common, ...GLOBAL_NEGATIVES])).toEqual([]);
    expect(Object.keys(PROMPT_FR).length).toBeGreaterThan(80);
    // Consigne d'une image produit et d'une image d'univers : aucun mot anglais du brief.
    const p = loadProject(pid);
    for (const kind of ["usage_scene", "ambiance", "lifestyle"] as const) {
      const prompt = generationPrompt(buildBrief(p, { kind, support: "site", aspect: "4:5", ...(kind === "ambiance" ? {} : { references: ["ref"] }) }));
      expect(prompt, kind).not.toMatch(/\b(the|of|with|without|nobody|frame|product|real|world|objects only|ready to use)\b/i);
    }
  });

  it("leçons de l'essai réel ARVEN (univers raté : personne, faux texte, faux logo) : consigne positive et concrète", async () => {
    const { negativePrompt, qwenImageBody, NO_TEXT_NEGATIVE } = await import("@/lib/ai/alibaba");
    const { ambiancePrompt, productScenePrompt } = await import("@/lib/ai/media-providers");
    const { NO_PEOPLE_FR } = await import("@/lib/people-policy");
    const p = loadProject(pid);
    const univ = generationPrompt(buildBrief(p, { kind: "ambiance", support: "site", aspect: "4:5" }));
    const scene = generationPrompt(buildBrief(p, { kind: "usage_scene", support: "site", aspect: "4:5", references: ["ref"] }));
    for (const x of [univ, scene, ambiancePrompt({ prompt: univ, aspect: "4:5" }), productScenePrompt({ prompt: scene, aspect: "4:5", textZone: "en bas du cadre" })]) {
      // 1. Aucune énumération de parties du corps (elle amorçait l'apparition d'une personne).
      expect(x).not.toMatch(/visage|mains|silhouette|corps|mannequin/);
      // 2. Jamais « zone gardée pour un texte / un titre » (Qwen y écrivait un faux texte).
      expect(x).not.toMatch(/pour un (texte|titre)|texte ajouté|titre ajouté/);
      // 3. Interdits nommés absents de la consigne (« faux logos de luxe » amorçait un faux logo).
      expect(x).not.toMatch(/Ne jamais montrer|logos de luxe|marque concurrente/);
      // Une seule fois la phrase sur l'absence de personne.
      expect(x.split(/présence humaine|aucune personne/).length - 1).toBe(1);
    }
    // 4. Univers : une nature morte d'objets précis, jamais « porté » ni une famille vague seule.
    expect(univ).toMatch(/nature morte/);
    expect(univ).not.toMatch(/porté|chaque jour/);
    expect(NO_PEOPLE_FR).toMatch(/^Scène sans aucune présence humaine/);
    // 5. Le négatif du modèle exclut personnes, et texte/logo quand aucun texte n'est voulu (pas avec un produit en
    //    référence : ses inscriptions réelles restent).
    expect(negativePrompt(false, true)).toContain(NO_TEXT_NEGATIVE);
    expect(negativePrompt(false, false)).not.toContain("typography");
    expect(negativePrompt(false)).toMatch(/person.*face.*hands/);
    const body = qwenImageBody({ model: "qwen-image-3.0-pro", prompt: univ, aspect: "4:5", references: [], people: false, noText: true });
    expect(JSON.stringify(body.input).split(/présence humaine|aucune personne/).length - 1).toBe(1);
  });

  it("chaque famille respecte la structure de la consigne du propriétaire (essai réel v4 réussi)", async () => {
    const { STILL_LIFE, stillLifeFor, stillLifePrompt, STILL_LIFE_END } = await import("@/lib/image-v2/still-life");
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/image-v2/categories.ts"), "utf8");
    const ids = [...src.matchAll(/\n    id: "([a-z_]+)",/g)].map((m) => m[1]);
    expect(ids).toContain("generic");
    for (const id of ids) {
      expect(STILL_LIFE[id]?.length, id).toBeGreaterThan(0);
      for (const sc of STILL_LIFE[id]) {
        // 1. Point de vue et cadrage ; 2. surface et fond (part de l'image, flou).
        expect(sc.view, id).toMatch(/Vue .+cadrage/);
        expect(sc.setting, id).toMatch(/^La scène se déroule sur .+occupe .+de l’image.+flou/);
        // 3. Trois objets au plus, chacun dans une phrase complète qui commence par sa position.
        expect(sc.objects.length, id).toBeGreaterThanOrEqual(2);
        expect(sc.objects.length, id).toBeLessThanOrEqual(3);
        for (const o of sc.objects) {
          expect(o.text, `${id}: ${o.name}`).toMatch(/^(Au centre|Au premier plan|À l’arrière-plan|À gauche|À droite)/);
          expect(o.text.trim().endsWith("."), o.name).toBe(true);
        }
        // 6. Lumière, ombres, mise au point, ambiance.
        expect(sc.light, id).toMatch(/[Ll]umière|[ÉE]clairage/);
        expect(sc.light, id).toMatch(/Ombres/);
        expect(sc.light, id).toMatch(/Mise au point/);
        expect(sc.light, id).toMatch(/Ambiance/);
        // Rien qui appelle une personne, une écriture ou le produit lui-même.
        const all = [sc.setting, ...sc.objects.map((o) => o.text), sc.light].join(" ").replace(/sans étiquette|ni étiquette|ni broderie|sans (aucun )?marquage|sans aucune inscription|aucune lettre, aucun chiffre/g, "");
        expect(all, id).not.toMatch(/personne|\bmains?\b|porté|texte|logo|étiquette|gravé|monogramme|livre ouvert|écran allumé/i);
      }
    }
    // Consigne complète : 4. compte exact, 5. zone dégagée, 7. phrase finale ; phrases logiques, sans code couleur.
    const watch = stillLifeFor("accessories", "Montre acier et cuir Montres");
    const t = stillLifePrompt(watch, { aspect: "4:5", zone: "bottom" });
    expect(t).toMatch(/^Photographie de nature morte haut de gamme, photoréaliste, au format vertical 4:5\. Vue de face/);
    expect(t).toContain("La scène contient exactement trois objets : l’écrin ouvert avec son coussin vide, le sablier et le rouleau de cuir.");
    expect(t).toContain("Le bas de l’image laisse une zone dégagée de marbre devant l’écrin.");
    expect(t.trim().endsWith(STILL_LIFE_END)).toBe(true);
    expect(t).not.toMatch(/#[0-9A-F]{6}|acier poli|matières? (et couleurs )?du produit/i);
    expect(t.split("\n\n").length).toBeGreaterThanOrEqual(7);
    expect(stillLifePrompt(watch, { aspect: "16:9", zone: "left" })).toMatch(/format horizontal 16:9.+Le côté gauche de l’image laisse une zone dégagée de marbre/s);
    expect(stillLifeFor("accessories", "Sac en cuir").match).toBeUndefined();
  });

  it("consigne d'univers produite par le studio : structure du propriétaire, envoyée telle quelle à Qwen", async () => {
    const { NO_TEXT_NEGATIVE, qwenImageBody } = await import("@/lib/ai/alibaba");
    const { ambiancePrompt } = await import("@/lib/ai/media-providers");
    const { STILL_LIFE_END } = await import("@/lib/image-v2/still-life");
    const p = loadProject(pid);
    const univ = generationPrompt(buildBrief(p, { kind: "ambiance", support: "site", aspect: "4:5" }));
    expect(univ).toMatch(/^Photographie de nature morte haut de gamme/);
    expect(univ).not.toMatch(/accessoires raffinés|Composition :|Touches de couleur/);
    // L'enveloppe d'ambiance n'ajoute rien ; Qwen ne reçoit pas une seconde phrase « sans personne ».
    expect(ambiancePrompt({ prompt: univ, aspect: "4:5" })).toBe(univ);
    const body = qwenImageBody({ model: "qwen-image-3.0-pro", prompt: univ, aspect: "4:5", references: [], people: false, noText: true });
    expect((body.input.messages[0].content.at(-1) as any).text.trim().endsWith(STILL_LIFE_END)).toBe(true);
    for (const w of ["embossed text", "engraving", "monogram"]) expect(NO_TEXT_NEGATIVE).toContain(w);
  });

  it("essai v3 (montre inventée dans l'écrin) : le contenant est dit vide et le produit est exclu par le négatif", async () => {
    const { STILL_LIFE, stillLifeFor } = await import("@/lib/image-v2/still-life");
    const { qwenImageBody } = await import("@/lib/ai/alibaba");
    const watch = stillLifeFor("accessories", "Montre acier et cuir Montres");
    expect(watch.objects[0].text).toMatch(/L’écrin ne contient aucun objet : aucune montre, aucun cadran/);
    expect(watch.exclude).toMatch(/watch.*wristwatch.*dial/);
    for (const id of ["cosmetics", "beauty_tools", "tech"]) expect(STILL_LIFE[id][0].exclude, id).toBeTruthy();
    const p = loadProject(pid);
    const b = buildBrief(p, { kind: "ambiance", support: "site", aspect: "4:5" });
    // Projet de test : un soin du visage → le flacon du produit est exclu de l'univers.
    expect(b.fr?.sceneExclude).toMatch(/skincare bottle/);
    expect(generationPrompt(b)).not.toMatch(/matières et couleurs du produit|Sérum|Éclat/i);
    const body = qwenImageBody({ model: "qwen-image-3.0-pro", prompt: "x", aspect: "4:5", references: [], people: false, noText: true, extraNegative: watch.exclude });
    expect(body.parameters.negative_prompt).toMatch(/monogram, initials, stamp, watch, wristwatch/);
  });

  it("écran : plus de « forfait Découverte », IA indisponible expliquée, tâche sans image ou bloquée signalée", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/studio/tab-images.tsx"), "utf8");
    expect(src).not.toMatch(/forfait Découverte|Discovery plan/);
    // Découverte est un compte sans abonnement, pas un forfait (même règle dans le choix du visuel).
    expect(fs.readFileSync(path.join(process.cwd(), "src/components/studio/visual-choice.tsx"), "utf8")).not.toMatch(/forfait Découverte|Discovery plan/);
    expect(src).not.toMatch(/EngineNotice/);
    expect(src).toContain("data-image-ai-notice");
    expect(src).toMatch(/job\.status === "blocked"\) toast\("bad"/);
    expect(src).toMatch(/!outcomes\.some\(\(o\) => o\.assetId\)\) toast\("bad", noneMessage\)/);
    // Le bouton payant reste désactivé tant que l'IA d'images n'est pas utilisable.
    expect(src).toMatch(/disabled=\{busy \|\| !ai \|\| !price\}/);
  });
});
