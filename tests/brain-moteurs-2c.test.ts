/**
 * Project Brain 2C — chaque moteur reçoit SON scope (jamais « all », jamais une vue legacy) :
 *  - appels réels des moteurs avec une IA simulée qui enregistre l'appel (aucun crédit dépensé) ;
 *  - garde-fou sur le code : plus aucun projectContext() dans les moteurs (seul l'essai d'un prompt libre garde « all ») ;
 *  - doublons : le brief local ne répète pas ce que le Brain transmet déjà, mais garde les consignes propres à la tâche.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const calls: any[] = [];
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<object>()),
  llmConfigured: () => true,
  llmJson: vi.fn(async (call: any) => {
    calls.push(call);
    throw new Error("IA simulée : appel enregistré");
  }),
  llmText: vi.fn(async (call: any) => {
    calls.push(call);
    throw new Error("IA simulée : appel enregistré");
  }),
}));

describe("Project Brain 2C — branchement des moteurs", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { brainMetaOf, brainView } = await import("@/lib/brain/facade");
  const { ENGINE_SCOPES } = await import("@/lib/brain/measure");
  const tasks = await import("@/lib/ai/tasks");
  const { brandCraftBrief, aiCraftReview } = await import("@/lib/engine/ad-craft");
  const { draftAds } = await import("@/lib/engine/ads");
  const { suggestTopics } = await import("@/lib/engine/blog");
  const { universeQueries } = await import("@/lib/engine/stock-universe");
  const { aiServiceTips } = await import("@/lib/engine/service-media");
  const { photoLine, photoLineInput } = await import("@/lib/engine/photo-line");
  const { seedSebastienBlanc, seedSerumEclat } = await import("./brain-fixtures");
  const { sampleSpec } = await import("./fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`moteurs2c${Date.now()}@test.fr`, "motdepasse-test", "M");
  const sb = loadProject(seedSebastienBlanc(u.id));
  const serum = loadProject(seedSerumEclat(u.id));
  const b = { userId: u.id, projectId: sb.id, jobId: null, usageKey: "t" };

  /** Lance un moteur et renvoie le(s) scope(s) Brain de ses appels (trace réelle du registre). */
  const scopesOf = async (p: typeof sb, fn: () => Promise<unknown>) => {
    calls.length = 0;
    await fr(fn).catch(() => null);
    expect(calls.length, "le moteur doit appeler l'IA").toBeGreaterThan(0);
    return [...new Set(calls.map((c) => brainMetaOf(c.context, p.id)?.scope ?? "AUCUN"))];
  };

  it("chaque moteur reçoit son scope explicite (jamais « all » ni « legacy:* »)", async () => {
    const line = photoLine(photoLineInput(serum));
    const cases: [string, typeof sb, () => Promise<unknown>][] = [
      ["logo", sb, () => tasks.aiCreativeRoutes(b, sb, {})],
      ["logo", sb, () => tasks.aiCreativeRedraw(b, sb, { key: "concept", feedback: "trop générique", previous: null })],
      ["image", serum, () => tasks.aiImageBrief({ ...b, projectId: serum.id }, serum, "mise en scène produit", { line })],
      ["stock", serum, () => universeQueries({ userId: u.id, projectId: serum.id }, serum)],
      ["theme", serum, () => tasks.aiDesignHome({ ...b, projectId: serum.id }, serum, sampleSpec())],
      ["shop_copy", sb, () => tasks.aiShopCopy(b, sb)],
      ["blog", sb, () => suggestTopics(sb, { refresh: true })],
      ["social", sb, () => tasks.aiSocialPlan(b, sb, { days: 3, perDay: 1, networks: ["instagram"], goals: "", tone: "", mix: { photo: 1, video: 0, text: 0 } })],
      ["social", sb, () => tasks.aiRewritePost(b, sb, { network: "instagram", format: "photo", caption: "x", title: "x", angle: "x" }, "plus court")],
      ["social", sb, () => aiServiceTips(b, sb, "préparer un mur")],
      ["advertising", sb, () => draftAds(sb, { userId: u.id, count: 1 })],
      ["video", serum, () => tasks.aiVideoPlan({ ...b, projectId: serum.id }, serum, { format: "9:16", goal: "pub", images: [], clips: 0 })],
      ["video", serum, () => tasks.aiUgcScript({ ...b, projectId: serum.id }, serum, { beats: 3, presenter: "femme", setting: "salle de bain", tone: "naturel", angle: "présentation" })],
      ["qc", sb, () => tasks.aiQcText(b, sb, "textes", { a: 1 })],
      ["qc", sb, () => tasks.aiCopyReview(b, sb, "textes", { a: 1 })],
      ["qc", sb, () => tasks.aiSocialReview(b, sb, [])],
      ["qc", serum, () => aiCraftReview({ ...b, projectId: serum.id }, serum, "ads", { a: 1 })],
      ["brand", sb, () => tasks.aiBrand(b, sb)],
    ];
    for (const [scope, p, fn] of cases) expect(await scopesOf(p, fn), scope).toEqual([scope]);
  });

  it("table de migration : un scope précis par moteur, aucun « all » ; brainView refuse « all »", () => {
    expect(ENGINE_SCOPES.map((e) => e.engine)).toEqual(["logo", "image", "stock", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "qc", "brand"]);
    for (const e of ENGINE_SCOPES) expect(e.scope).not.toBe("all");
    expect(() => brainView(sb, "all" as never)).toThrow(/jamais « all »/);
  });

  it("garde-fou : plus aucun contexte legacy dans les moteurs ; les appels de recherche de photos et le logo complet ont leur scope", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [path.join(dir, d.name)] : []));
    const offenders = [...files(path.join(root, "src")), ...files(path.join(root, "worker"))]
      .filter((f) => /projectContext\(/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f))
      .filter((f) => f !== path.join("src", "lib", "ai", "context.ts") && f !== path.join("src", "lib", "brain", "facade.ts"));
    // Seule exception : l'essai d'un prompt libre du client (demande ouverte, pas un moteur) garde la vue complète.
    expect(offenders).toEqual([path.join("src", "app", "api", "projects", "[id]", "prompt-run", "route.ts")]);
    const media = fs.readFileSync(path.join(root, "src/lib/engine/service-media.ts"), "utf8");
    expect(media.match(/brainContext\(p, "stock"\)/g)).toHaveLength(2);
    expect(fs.readFileSync(path.join(root, "src/lib/engine/full-logo.ts"), "utf8")).toMatch(/brainView\(p, "logo"\)/);
  });

  it("logo : le brief des pistes ne répète pas nom, personnalité, cible, positionnement, activité ; garde les consignes de la tâche", async () => {
    calls.length = 0;
    await fr(() => tasks.aiCreativeRoutes(b, sb, {})).catch(() => null);
    const c = calls[0];
    expect(c.context).toContain("Marque : Sébastien Blanc");
    expect(c.prompt).not.toMatch(/^Marque : Sébastien Blanc/m);
    expect(c.prompt).not.toMatch(/^Positionnement :/m);
    expect(c.prompt).not.toContain("Cible :");
    // Personnalité absente du Brain (non renseignée) : la consigne « à déduire » reste.
    expect(c.prompt).toMatch(/^Personnalité : à déduire$/m);
    // Ce que le scope logo ne transmet pas (liste des prestations) reste dans le brief, ainsi que les consignes propres.
    expect(c.prompt).toContain("Prestations (entreprise de services) : Plâtrerie et plaques de plâtre, Enduits et lissage, Peinture intérieure");
    for (const keep of ["LIEN AVEC L'ACTIVITÉ (obligatoire)", "Palette (rôles) : primary", "Familles disponibles", "Mots INTERDITS"]) expect(c.prompt).toContain(keep);
  });

  it("publicité : la piste créative ne répète ni la palette, ni la voix, ni la ligne éditoriale du contexte ; garde la piste et la règle enfants", () => {
    const enfants = { ...serum, product: { ...serum.product, sector: "enfants" as const } };
    const full = brandCraftBrief(enfants);
    const v = brainView(enfants, "advertising");
    const lean = brandCraftBrief(enfants, v.kept);
    expect(full).toContain("Palette :");
    expect(lean).not.toContain("Palette :");
    expect(lean).not.toContain("Voix :");
    expect(v.stable).toContain("Palette");
    expect(v.stable).toContain("Ton :");
    expect(lean).toContain("Produit pour enfants");
    // Sans contexte (élément absent du Brain transmis) : rien n'est retiré.
    expect(brandCraftBrief(enfants, [])).toBe(full);
  });

  it("aucune duplication supprimée à tort : un élément écarté par le budget reste dans le brief local", () => {
    // Vue qui n'a pas gardé la palette ni la voix (budget) : la piste créative les donne.
    const lean = brandCraftBrief(serum, ["brand.name", "brand.tagline"]);
    expect(lean).toContain("Palette :");
    expect(lean).toContain("Voix :");
    expect(lean).not.toContain("Marque :");
  });
});
