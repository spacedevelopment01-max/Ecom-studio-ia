import { describe, it, expect, vi } from "vitest";
const calls = vi.hoisted(() => ({ image: vi.fn(), logo: vi.fn() }));
vi.mock("@/lib/image-v2/engine", async (orig) => ({
  ...(await orig<object>()),
  runImageEngineV2: calls.image,
}));
vi.mock("@/lib/logo-v2/engine", async (orig) => ({
  ...(await orig<object>()),
  runLogoEngineV2: calls.logo,
}));
import { realDependencies } from "@/lib/preparation/deps";
import { initialize, approve, stateOf } from "@/lib/preparation/engine";
import { loadProject, saveBrand } from "@/lib/projects";
import { localBrand } from "@/lib/engine/local";
import { buildBrief, generationPrompt, briefHash } from "@/lib/image-v2/brief";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { runContentEngineV2 } from "@/lib/seo-v2/engine";
import { exactInstructions } from "@/lib/preparation/instructions";
import { JobContext, getJob, enqueue } from "@/lib/jobs";
import { fixture, syntheticAsset } from "./preparation-fixtures";
import { mockSeoDeps } from "./seo-v2-mock";
import { runWithLang } from "@/lib/i18n-server";
async function prepared() {
  const f = await fixture();
  f.input.constraints =
    "Ne jamais changer le nom exact. " +
    "Conserver les caractéristiques fournies. ".repeat(250) +
    "FIN_CONSIGNE_LONGUE";
  initialize(f.pid, f.input);
  approve(f.pid, stateOf(f.pid)!.revision, "brief");
  let p = loadProject(f.pid);
  saveBrand(f.pid, localBrand(p.product, f.input.brandName, p).brand);
  p = loadProject(f.pid);
  const j = enqueue({
    userId: f.uid,
    projectId: f.pid,
    type: "project.prepare",
    payload: {},
    maxAttempts: 1,
  });
  return { ...f, p, ctx: new JobContext(j) };
}
describe("Préparation : raccordements aux moteurs existants (fournisseurs simulés)", () => {
  it("adaptateur images : références originales, consentement précis, pas de stock et refus du provisoire", async () => {
    const f = await prepared();
    const aid = await syntheticAsset(f.pid);
    calls.image.mockResolvedValueOnce({
      outcomes: [{ assetId: aid, verdict: "FINAL" }],
      stoppedByCostCap: false,
    });
    const slot = {
      key: "product:main:detail",
      pageKey: "product:main",
      sectionKey: "detail",
      purpose: "Le produit exact",
      required: true,
    };
    expect(
      await realDependencies.image(f.p, f.ctx, slot, f.input.photoIds, 2000000),
    ).toBe(aid);
    expect(calls.image).toHaveBeenLastCalledWith(
      f.ctx,
      f.pid,
      expect.objectContaining({
        references: f.input.photoIds,
        peopleAllowed: false,
        noStock: true,
        allowGenerate: true,
        count: 1,
        maxCostEur: 2,
        instructions: exactInstructions(f.pid),
      }),
    );
    calls.image.mockResolvedValueOnce({
      outcomes: [{ assetId: aid, verdict: "PROVISIONAL" }],
      stoppedByCostCap: false,
    });
    await expect(
      realDependencies.image(f.p, f.ctx, slot, [], 2000000),
    ).rejects.toThrow(/Aucun visuel final/);
  });
  it("adaptateur logos : seuls les candidats finaux et consignes intégrales, aucune propagation automatique", async () => {
    const f = await prepared();
    const a = await syntheticAsset(f.pid, "logo-v2");
    calls.logo.mockResolvedValue({
      shown: [
        { assetId: a, verdict: "FINAL" },
        { assetId: "refuse", verdict: "REJECTED" },
      ],
    });
    const previous = loadProject(f.pid).brand;
    expect(await realDependencies.logos(f.p, f.ctx, 3000000)).toEqual([a]);
    expect(calls.logo).toHaveBeenCalledWith(
      f.ctx,
      f.pid,
      expect.objectContaining({
        capMicro: 3000000,
        instructions: expect.stringContaining("FIN_CONSIGNE_LONGUE"),
      }),
    );
    expect(loadProject(f.pid).brand).toEqual(previous);
    const brief = brandDiscovery(f.p, {
      instructions: exactInstructions(f.pid),
    });
    expect(brief.brainContext).toContain("FIN_CONSIGNE_LONGUE");
  });
  it("consignes longues jusqu’au prompt image et empreinte de réutilisation distincte", async () => {
    const f = await prepared();
    const b = buildBrief(
      f.p,
      {
        kind: "packshot",
        references: f.input.photoIds,
        instructions: exactInstructions(f.pid),
      },
      { peopleAllowed: false },
    );
    expect(generationPrompt(b)).toContain("FIN_CONSIGNE_LONGUE");
    expect(briefHash(b)).not.toBe(
      briefHash({ ...b, instructions: "Autre consigne" }),
    );
  });
  it("SEO réel à fournisseurs injectés : consignes intégrales au rédacteur, nouvelle demande exclue de l’ancien cache", async () => {
    const f = await prepared();
    const { deps, log } = mockSeoDeps();
    const go = (request: string) =>
      runWithLang({ ui: "fr", content: "fr" }, () =>
        runContentEngineV2(
          null,
          f.pid,
          { type: "product_page", request },
          deps,
        ),
      );
    await go(exactInstructions(f.pid));
    expect(log.writes[0]).toContain("FIN_CONSIGNE_LONGUE");
    const before = log.writes.length;
    await go(exactInstructions(f.pid));
    expect(log.writes).toHaveLength(before);
    await go(exactInstructions(f.pid) + " Nouvelle consigne précise.");
    expect(log.writes.length).toBeGreaterThan(before);
  });
});
