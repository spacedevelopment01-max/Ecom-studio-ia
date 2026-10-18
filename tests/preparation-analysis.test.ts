import { it, expect, vi } from "vitest";
const analysis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/tasks", async (original) => ({
  ...(await original<object>()),
  aiAnalyzeService: analysis,
}));
import { fixture } from "./preparation-fixtures";
import { inspectBrief } from "@/lib/preparation/inspect";
import { analyzeLocally } from "@/lib/preparation/brief";
import { loadProject } from "@/lib/projects";
import { enqueue, JobContext } from "@/lib/jobs";
it("analyse de service : conserve les faits nouveaux et les saisies, sans confirmer une inférence IA", async () => {
  const f = await fixture("services");
  analysis.mockResolvedValue({
    name: "Ne remplace pas le nom donné",
    nameStatus: "detected",
    category: "Conseil",
    sector: "conseil",
    summary: "Analyse proposée",
    facts: [
      {
        key: "method",
        label: "Méthode",
        value: "Organisation participative",
        status: "confirmed",
        source: "ai",
      },
    ],
    services: [
      { name: "Service ajouté par hypothèse", description: "À vérifier" },
    ],
    area: "Autre zone",
    address: "",
    phone: "",
    email: "",
    hours: "",
    bookingUrl: "",
    contactMode: "unknown",
    questions: [],
    claimsToAvoid: [],
  });
  const ctx = new JobContext(
    enqueue({
      userId: f.uid,
      projectId: f.pid,
      type: "project.prepare",
      payload: {},
    }),
  );
  const b = await inspectBrief(
    loadProject(f.pid),
    analyzeLocally(f.input),
    ctx,
    true,
  );
  expect(b.profile.name).toBe(f.input.offerName);
  expect(b.profile.facts).toContainEqual(
    expect.objectContaining({ key: "method", status: "inferred" }),
  );
  expect(b.services.area).toBe(f.input.services.area);
  expect(b.services.services[0].name).toBe("Diagnostic");
  expect(analysis).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      photos: [expect.objectContaining({ data: expect.any(Buffer) })],
      description: expect.stringContaining(f.input.constraints),
    }),
  );
});
