/**
 * LA DÉPENSE ANNONCÉE SUR L'ÉCRAN DE CONFIRMATION D'UNE CRÉATION (26 novembre 2026). Une image lancée par la route des
 * images (devis exact, puis confirmation : cost-confirm.tsx) emporte le coût probable montré ; avant l'appel qui ferait
 * dépasser le double, elle s'arrête, attend l'accord du client, et la phrase de SINA est dans son message (l'écran qui la
 * suit et le suivi des tâches la montrent ; « Reprendre » est son oui). Route, devis et tâche réels ; aucun fournisseur.
 */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => session.user, currentUser: async () => session.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: vi.fn(() => "FAUX FOURNISSEUR DE TEST") }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { json, run } from "@/lib/db";
import { POST } from "@/app/api/projects/[id]/images/v2/route";
import { seedImageFixture } from "./image-v2-fixtures";
import { activeStrategy } from "@/lib/marketing-strategy";
import { setJsonSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { activeProviderKey } from "@/lib/ai/config";
import * as billing from "@/lib/billing";
import { getJob, annonceDe, resumeJob } from "@/lib/jobs";
import { withTrace, CostCapReached } from "@/lib/ai/trace";
import { attendreLAccordDeLaTache, phraseDuDepassement } from "@/lib/syna-agent/depense-annoncee";
import { runWithLang } from "@/lib/i18n-server";

beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP fournisseur interdit"); })); vi.mocked(activeProviderKey).mockReturnValue("FAUX FOURNISSEUR DE TEST"); setJsonSetting("billing.markup", 1); setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.filter((m) => m.kind === "image").map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }]))); });
afterEach(() => { run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running','paused')"); vi.unstubAllGlobals(); });

it("une image confirmée emporte le coût probable montré ; avant de dépasser le double, elle s'arrête et le client est prévenu par la phrase de SINA", async () => {
  const u = await createUser(`annonce-images-${crypto.randomUUID()}@example.invalid`, "test-fictif-seulement", "Fictif"); session.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "restaurant"); grantProjectPlan(pid, "dominer"); activeStrategy(pid);
  const operationId = crypto.randomUUID(), request = { kind: "ambiance", aspect: "4:5", count: 1, allowGenerate: true };
  const post = (body: unknown) => POST(new Request(`http://localhost/api/projects/${pid}/images/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) });
  const q = await (await post({ action: "quote", operationId, request })).json();
  expect(q.estimateMicro).toBeGreaterThan(0);
  const r = await post({ action: "generate", operationId, request, approvalToken: q.approvalToken, confirmation: true });
  expect(r.status).toBe(200);
  const jobId = (await r.json()).jobId as string, payload = json<Record<string, unknown>>(getJob(jobId)!.payload, {});
  expect(annonceDe(payload)).toBe(q.estimateMicro);
  // La tâche, comme le worker la suit : la part du client, l'annonce de sa demande.
  const meta = { task: "image_generation", provider: "openai", model: "simule", projectId: pid, jobId }, annonce = q.estimateMicro as number;
  await withTrace({ jobId, costCapMicro: 100 * annonce, annonceMicro: annonceDe(payload) }, async () => {
    const rid = billing.reserve(u.id, Math.ceil(1.5 * annonce), meta); billing.settle(rid, Math.ceil(1.5 * annonce), null, "image");
    expect(() => billing.reserve(u.id, annonce, meta)).toThrow(CostCapReached);
  });
  expect(attendreLAccordDeLaTache(jobId)).toBe(true);
  const j = getJob(jobId)!;
  expect(j.status).toBe("paused");
  expect(j.message).toBe(runWithLang({ ui: "fr", content: "fr" }, () => phraseDuDepassement(u.id, pid, { depenseMicro: Math.ceil(1.5 * annonce), annonceMicro: annonce })));
  expect(j.message).toMatch(/tu veux que je continue \?$/);
  // « Reprendre » : son oui ; la tâche repart, l'annonce relevée.
  resumeJob(jobId);
  expect(getJob(jobId)!.status).toBe("queued");
  expect(annonceDe(json(getJob(jobId)!.payload, {}))).toBe(Math.ceil(1.5 * annonce) + annonce);
});
