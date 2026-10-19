/** Réutilisation/versionnement réels, rédaction et plan éditorial simulés, aucun appel payant. */
import { it, expect, vi } from "vitest";
const control = vi.hoisted(() => ({ written: [] as string[], failPlan: true, write: null as null | ((...args: any[]) => Promise<any>) }));
vi.mock("@/lib/ai/llm", async original => ({ ...await original<object>(), llmConfigured: () => true }));
vi.mock("@/lib/seo-v2/engine", async original => ({ ...await original<object>(), runContentEngineV2: (...args: any[]) => control.write!(...args) }));
vi.mock("@/lib/preparation/editorial", async original => ({ ...await original<object>(), prepareEditorial: async (_p: unknown, _ctx: unknown, c: object) => {
  if (control.failPlan) throw new Error("Plan éditorial simulé incomplet après rédaction des pages.");
  return { ...c, execution: { provider: "injected", model: "simulation", usageKey: "fake-plan", vision: false, at: 1 } };
} }));
import { fixture, initializeSynthetic } from "./preparation-fixtures";
import { validatedBrand } from "./preparation-mission-fixtures";
import { realDependencies } from "@/lib/preparation/deps";
import { loadProject } from "@/lib/projects";
import { JobContext, enqueue } from "@/lib/jobs";
import { saveContentVersion, contentKey, latestContent, listContentVersions } from "@/lib/seo-v2/store";
import { runForUser } from "@/lib/ai/access";
import { all } from "@/lib/db";
import type { ContentDoc } from "@/lib/seo-v2/types";

it.each(["products", "services"] as const)("%s : échec tardif du plan sans repayer les pages, Contact inclus ; correction d'une seule page", async business => {
  const f = await fixture(business); initializeSynthetic(f.pid, f.input); validatedBrand(f.pid, f.input);
  control.written = []; control.failPlan = true;
  control.write = async (_ctx, pid, req) => {
    const page = req.target.page; control.written.push(page.key);
    const doc: ContentDoc = { version: 1, type: req.type, lang: "fr", page, primaryKeyword: null, meta: { seoTitle: `Page ${page.title}`, metaDescription: "Description de test du contenu de cette page.", slug: page.key, canonical: null, robots: "index,follow" }, blocks: [{ id: "h1", kind: "h1", text: page.title }, { id: "p", kind: "p", text: `Texte API injecté de ${page.key}, version ${control.written.length}, non évalué sur un fournisseur réel.` }], links: [], schema: [], meta2: { source: "engine", by: "ai", runId: "test-only", createdFrom: null } };
    const docKey = contentKey(pid, req.type, page.key, "fr");
    saveContentVersion(pid, docKey, doc, { verdict: "FINAL", note: "Verdict injecté, pas preuve réelle de qualité" });
    return { doc, docKey, by: "ai", verdict: "FINAL", notes: [] };
  };
  const ctx = (correction?: string) => new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { projectId: f.pid, correction }, maxAttempts: 1 }));
  const first = await runForUser(f.uid, () => realDependencies.contents(loadProject(f.pid), ctx(), true), "normal", f.pid);
  expect(first.pending).toMatch(/Plan éditorial incomplet/);
  expect(first.documents).toHaveLength(first.pages.length);
  expect(first.documents.some(d => d.doc.type === "contact_page")).toBe(true);
  const writes = control.written.length;
  control.failPlan = false;
  const second = await runForUser(f.uid, () => realDependencies.contents(loadProject(f.pid), ctx("Corriger seulement le plan médias incomplet."), true, { previous: first, correction: "Corriger seulement le plan médias incomplet." }), "normal", f.pid);
  expect(second.pending).toBeUndefined(); expect(control.written).toHaveLength(writes);
  expect(second.documents).toEqual(first.documents);
  const fixed = await runForUser(f.uid, () => realDependencies.contents(loadProject(f.pid), ctx("Clarifier uniquement les informations de contact."), true, { previous: second, pageKey: "contact", correction: "Clarifier uniquement les informations de contact." }), "normal", f.pid);
  expect(control.written.slice(writes)).toEqual(["contact"]);
  for (const doc of second.documents.filter(d => d.doc.page.key !== "contact")) expect(fixed.documents.find(x => x.docKey === doc.docKey)).toEqual(doc);
  const key = fixed.documents.find(d => d.doc.page.key === "contact")!.docKey;
  expect(listContentVersions(f.pid, key)).toHaveLength(2);
  const current = latestContent(f.pid, key)!;
  saveContentVersion(f.pid, key, { ...current.doc, meta2: { ...current.doc.meta2, source: "user" } }, { verdict: "PROVISIONAL", note: "Modification manuelle simulée" });
  const before = control.written.length;
  const manual = await runForUser(f.uid, () => realDependencies.contents(loadProject(f.pid), ctx("Reprendre le plan sans toucher mes modifications."), true, { previous: fixed }), "normal", f.pid);
  expect(manual.pending).toMatch(/modifié par vous/); expect(control.written).toHaveLength(before);
  expect(listContentVersions(f.pid, key)).toHaveLength(3);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
  expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
});
