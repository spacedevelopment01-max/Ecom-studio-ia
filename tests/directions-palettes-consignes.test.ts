/** Contrat des consignes : réponses injectées, aucune requête fournisseur. */
import { expect, it, vi } from "vitest";
vi.mock("@/lib/ai/llm", () => ({ llmJson: vi.fn() }));
import { llmJson } from "@/lib/ai/llm";
import { realLogoV2Ai } from "@/lib/logo-v2/ai";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { loadProject, saveBrand } from "@/lib/projects";
import { all } from "@/lib/db";
import { fixture } from "./preparation-fixtures";
import { validatedBrand, directionIdentity, syntheticDirections } from "./preparation-mission-fixtures";

it("renouveler propose trois nouvelles palettes sans imposer celle du choix précédent ni modifier ce choix", async () => {
  const f = await fixture(), brand = validatedBrand(f.pid, f.input), identity = directionIdentity();
  saveBrand(f.pid, { ...brand, palette: identity.palette, fonts: identity.fonts, validated: ["name", "palette", "fonts"], artIdentity: { ...identity, seriesId: "previous", directionId: "t1" } });
  const before = loadProject(f.pid).brand!, pack = await syntheticDirections(f.pid);
  vi.mocked(llmJson).mockResolvedValue({ territories: pack.territories });
  await realLogoV2Ai(null, { userId: f.uid, projectId: f.pid }).territories(brandDiscovery(loadProject(f.pid)), 3, []);
  const [request, schema] = vi.mocked(llmJson).mock.calls.at(-1)!;
  expect(request.context).toContain("NOUVELLES PROPOSITIONS");
  expect(request.prompt).toContain("Ne recopie pas la palette du choix précédent");
  expect(request.prompt).not.toContain("Palette validée par le client (à garder");
  expect(schema.safeParse({ territories: pack.territories }).success).toBe(true);
  const copied = pack.territories.map(t => ({ ...t, identity: { ...t.identity!, palette: { ...t.identity!.palette, secondary: identity.palette.secondary, accent: identity.palette.accent } } }));
  expect(schema.safeParse({ territories: copied }).success).toBe(false);
  expect(loadProject(f.pid).brand).toEqual(before);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
});
it("une palette fournie et verrouillée hors choix de direction reste une contrainte, sans remplacement silencieux", async () => {
  const f = await fixture(), brand = validatedBrand(f.pid, f.input);
  saveBrand(f.pid, { ...brand, validated: ["name", "palette", "fonts"] });
  const before = loadProject(f.pid).brand!, pack = await syntheticDirections(f.pid);
  vi.mocked(llmJson).mockResolvedValue({ territories: pack.territories });
  await realLogoV2Ai(null, { userId: f.uid, projectId: f.pid }).territories(brandDiscovery(loadProject(f.pid)), 3, []);
  const request = vi.mocked(llmJson).mock.calls.at(-1)![0];
  expect(request.prompt).toContain("Palette validée par le client (à garder");
  expect(request.prompt).toContain("ne pas la contourner");
  expect(request.context).not.toContain("NOUVELLES PROPOSITIONS");
  expect(loadProject(f.pid).brand).toEqual(before);
});
