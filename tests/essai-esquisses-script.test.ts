/**
 * Le script de l'essai réel des 12 esquisses (scripts/syna-recette/essai-esquisses.mts), avec des appels SIMULÉS
 * (`graphistesDeps.ai`) : aucun appel payant. Les planches simulées passent par la réservation du Studio, comme les vraies,
 * pour que le garde-fou de l'essai les voie. Rien ne part après la découpe ; un appel au-dessus du plafond est refusé.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const W = 1536, H = 1024;
type Bloc = { x: number; y: number; w: number; h: number; c?: string };
const dessin = (cx: number, cy: number): Bloc[] => [{ x: cx - 40, y: cy - 100, w: 80, h: 80, c: "#E0703A" }, ...Array.from({ length: 5 }, (_v, i) => ({ x: cx - 150 + i * 62, y: cy + 10, w: 44, h: 80 }))];
/** Une planche de six esquisses ; `vide` : une case laissée blanche (refusée par la découpe). */
const planche = (vide?: number) => sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
  .composite([0, 1].flatMap((r) => [0, 1, 2].filter((c) => r * 3 + c !== vide).flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))
    .map((b) => ({ input: { create: { width: b.w, height: b.h, channels: 3 as const, background: b.c ?? "#1F3D5B" } }, left: b.x, top: b.y }))).png().toBuffer();

describe("le script de l'essai des esquisses (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { graphistesDeps } = await import("@/lib/syna-agent/logo-graphistes");
  const { PlafondDeLEssaiAtteint } = await import("@/lib/ai/plafond-essai");
  const { withTrace } = await import("@/lib/ai/trace");
  const { CLIENT, essaiDesEsquisses } = await import("../scripts/syna-recette/essai-esquisses-outil");
  const { all } = await import("@/lib/db");

  const appels: string[] = [];
  const PLANCHE = 300_000, METIER = 20_000;
  /** Un appel simulé, réservé puis réglé comme un vrai (le garde-fou le contrôle à la réservation). */
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string; capMicro: number }) => ({
    metier: async () => { appels.push("metier"); await paye(q, METIER, "strategy"); return { metier: "une pépinière qui vend des plantes en ligne", court: "les plantes", piste: "univers" as const }; },
    planche: async (modele: string, prompt: string) => { appels.push(`planche:${modele}`); expect(prompt).toContain("Racine"); await paye(q, PLANCHE, "image_generation"); return { png: await planche(modele.includes("2.6") ? 4 : undefined), recu: { requestId: `req-${modele}`, usage: null, coutMicro: PLANCHE / 2 } as never }; },
    relireEsquisses: async () => { appels.push("relireEsquisses"); throw new Error("interdit"); },
    rediger: async () => { appels.push("rediger"); throw new Error("interdit"); },
    finaliser: async () => { appels.push("finaliser"); throw new Error("interdit"); },
    relireLogo: async () => { appels.push("relireLogo"); throw new Error("interdit"); },
  });
  const sortie = () => fs.mkdtempSync(path.join(os.tmpdir(), "essai-esquisses-"));
  afterEach(() => { appels.length = 0; delete graphistesDeps.ai; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

  it("métier, demande exacte, deux planches, découpe, planche-contact, rapport ; rien ne part après la découpe", async () => {
    const dir = sortie();
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "0.80", ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.slice().sort()).toEqual(["metier", "planche:gpt-image-2.5-sunburst", "planche:gpt-image-2.6-flare"]);
    expect(r.texte).toBe((await import("@/lib/syna-agent/logo-recherche")).demandeDeRecherche({ nom: CLIENT.nom, metier: { metier: "une pépinière qui vend des plantes en ligne", court: "les plantes", piste: "univers" } }));
    expect(r.esquisses).toBe(11); // 6 + 5, une case vide refusée
    expect(r.refusees).toHaveLength(1);
    const fichiers = fs.readdirSync(dir).sort();
    expect(fichiers).toEqual(expect.arrayContaining(["planche-gpt-image-2.5-sunburst.png", "planche-gpt-image-2.6-flare.png", "planche-contact.png", "rapport.txt", "esquisse-01.png", "esquisse-11.png"]));
    expect(fichiers).not.toContain("esquisse-12.png");
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toContain("Phrase du métier : une pépinière qui vend des plantes en ligne");
    expect(rapport).toContain(r.texte!);
    expect(rapport).toMatch(/gpt-image-2\.6-flare, case 5 : /);
    // La dépense réelle comptée par le Studio : ce qui a été réglé (la moitié de chaque maximum, dans la simulation).
    expect(r.depenseMicro).toBe(METIER / 2 + PLANCHE);
    expect(rapport).toContain("Dépense réelle comptée par le Studio : 0,3100 €");
  });

  it("le garde-fou refuse la planche au-dessus du plafond : elle ne part pas, n'est pas relancée, et le script le dit", async () => {
    const dir = sortie();
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "0.40", ai: simule as never });
    // Le métier (0,02 € au plus) et une planche (0,30 € au plus) tiennent ; la seconde ferait dépasser 0,40 €.
    expect(appels.filter((a) => a.startsWith("planche"))).toHaveLength(2);
    expect(r.planches).toHaveLength(1);
    expect(r.manquees).toHaveLength(1);
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé/);
    expect(r.esquisses).toBe(6);
    expect(all("SELECT 1 FROM ai_reservations WHERE model='simule' AND task='image_generation'")).toBeTruthy();
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toMatch(/ARRÊT : le garde-fou de l'essai a refusé la planche/);
    expect(rapport).toMatch(/Planches manquées \(jamais relancées\)/);
    expect(appels).not.toContain("relireEsquisses");
  });

  it("un plafond trop bas pour le métier : le script s'arrête proprement avant toute planche", async () => {
    const dir = sortie();
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "0.01", ai: simule as never });
    expect(appels).toEqual(["metier"]);
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel/);
    expect(r.planches).toEqual([]);
    expect(r.depenseMicro).toBe(0);
    expect(fs.readFileSync(path.join(dir, "rapport.txt"), "utf8")).toMatch(/ARRÊT/);
    void PlafondDeLEssaiAtteint;
  });

  it("le script lancé seul n'écrit jamais une clé : la clé Anthropic vient de STUDIO_ANTHROPIC_KEY", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-esquisses.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-esquisses-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    // Rien après la découpe : aucune fonction de relecture ni de finalisation n'est appelée par le script.
    expect(src).not.toMatch(/ai\.(relireEsquisses|rediger|finaliser|relireLogo)\(|uneFinalisation\(|uneRecherche\(/);
  });
});
