/**
 * Logo complet par IA (point d'accès) : création réactivée en tâche de fond « brand.fulllogo » ; refusée en Découverte
 * (0 € d'IA) ou sans modèle d'images utilisable pour « Logos » ; jamais deux créations en même temps.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { ai: true, provider: "openai" as string | null, running: false, enqueued: [] as any[] };
vi.mock("@/lib/route-helpers", () => ({
  projectFromCtx: async () => ({ user: { id: "u" }, project: { id: "p", userId: "u", brand: { name: "Sébastien Blanc", logo: {} } } }),
}));
vi.mock("@/lib/ai/access", () => ({ aiActiveFor: () => state.ai }));
vi.mock("@/lib/ai/llm", () => ({ llmConfigured: () => true }));
vi.mock("@/lib/ai/media-providers", () => ({ imageProviderAvailable: () => state.provider, imageUnavailableReason: () => "aucun modèle d'images choisi pour « Logos »" }));
vi.mock("@/lib/db", async (orig) => ({ ...(await orig<object>()), one: () => (state.running ? { 1: 1 } : undefined) }));
vi.mock("@/lib/jobs", () => ({ enqueue: (j: any) => (state.enqueued.push(j), { id: "job1" }) }));
vi.mock("@/lib/engine/full-logo", () => ({ fullLogos: () => [], rejectedFullLogos: () => 0, useFullLogo: async () => {} }));

const route = await import("@/app/api/projects/[id]/brand/full-logo/route");
const post = (b: unknown) => route.POST(new Request("http://x/api/projects/p/brand/full-logo", { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "p" }) } as any);

describe("logo complet par IA : création", () => {
  beforeEach(() => Object.assign(state, { ai: true, provider: "openai", running: false, enqueued: [] }));

  it("forfait avec IA et modèle d'images disponible → tâche « brand.fulllogo » créée", async () => {
    const r = await post({ action: "create" });
    expect(r.status).toBe(200);
    expect(state.enqueued).toEqual([expect.objectContaining({ type: "brand.fulllogo", projectId: "p", userId: "u", payload: { projectId: "p" } })]);
  });

  it("Découverte (IA inactive) → refus 403, aucune tâche", async () => {
    state.ai = false;
    expect((await post({ action: "create" })).status).toBe(403);
    expect(state.enqueued).toHaveLength(0);
  });

  it("aucun modèle d'images pour « Logos » → refus 409 avec la raison, aucune tâche", async () => {
    state.provider = null;
    const r = await post({ action: "create" });
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).toContain("Logos");
    expect(state.enqueued).toHaveLength(0);
  });

  it("création déjà en cours → refus 409, pas de seconde tâche", async () => {
    state.running = true;
    expect((await post({ action: "create" })).status).toBe(409);
    expect(state.enqueued).toHaveLength(0);
  });
});
