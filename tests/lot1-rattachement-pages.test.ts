/** Régression de la revue indépendante : aucun mock du stockage, de la sélection ou de la livraison. */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { loadProject } from "@/lib/projects";
import { sitePages } from "@/lib/seo-v2/pages";
import { servicePair, TARGETS } from "./lot1-rattachement-fixtures";
beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit dans cette régression isolée"); }));
describe("Lot 1 — rattachement des pages", async () => {
  const user = await createUser(`association-${Date.now()}@example.invalid`, "isolated-test-only", "Test synthétique");
  it("deux prestations Diagnostic conservent chacune leur URL stable", async () => {
    const { pid } = await servicePair(user.id);
    const refs = sitePages(loadProject(pid));
    expect(TARGETS.map((k) => refs.find((p) => p.key === k)?.url)).toEqual(["/pages/prestation-1", "/pages/prestation-2"]);
  });
});
