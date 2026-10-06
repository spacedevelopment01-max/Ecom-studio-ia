/**
 * Onglet Prompts : « Compléter avec le projet » remplit vraiment les variables (et dit ce qui manque) ;
 * « Lancer avec l'IA » exécute le prompt sur le projet (forfaits), avec un refus clair en découverte (aucun appel).
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/auth")>()), requireUser: async () => sessionUser }));
let aiOn = false;
const calls: any[] = [];
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/llm")>()),
  llmConfigured: () => aiOn,
  llmText: async (c: any) => (calls.push(c), "## Positionnement\\nProposition…\\nOù l'utiliser dans le studio : onglet Marque, champ Positionnement."),
}));

import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { libraryPrompts } from "@/lib/prompts-library";

const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as any;
const post = (url: string, body: unknown) => new Request(`http://x${url}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

async function project() {
  const u = await createUser(`pr${Date.now()}${Math.random()}@test.fr`, "motdepasse-test", "P");
  run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
  sessionUser = { ...u, role: "client" };
  const pid = id();
  const { emptyProduct } = await import("@/lib/project-types");
  const { localBrand } = await import("@/lib/engine/local");
  const { runWithLang } = await import("@/lib/i18n-server");
  const product = { ...emptyProduct(), name: "Psychologue à Cormatin", summary: "Consultations individuelles", facts: [{ key: "x", label: "Séance", value: "50 min", status: "confirmed" as const, source: "user" as const }] };
  const { brand: b0 } = runWithLang({ ui: "fr", content: "fr" }, () => localBrand(product as any, "Espace Ancrage"));
  const brand = { ...b0, name: "Espace Ancrage", audience: "" };
  run("INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Espace Ancrage", "ready", "woocommerce", JSON.stringify(product), JSON.stringify(brand), "{}", "[]", now(), now());
  return pid;
}

describe("prompts : compléter et lancer", () => {
  const sample = libraryPrompts("fr").find((p) => p.category === "positionnement")!;

  it("compléter : variables remplies avec le projet, et ce qui manque est signalé", async () => {
    const pid = await project();
    const { POST } = await import("@/app/api/projects/[id]/prompt-fill/route");
    const r = await (await POST(post(`/api/projects/${pid}/prompt-fill`, { body: sample.body }), ctx({ id: pid }))).json();
    expect(r.body).toContain("Espace Ancrage");
    expect(r.body).not.toMatch(/\{\{marque\}\}|\{\{produit\}\}/);
    expect(r.missing).toContain("cible");
  });

  it("lancer avec l'IA : refus clair sans IA (découverte), réponse avec le projet sinon", async () => {
    const pid = await project();
    const { POST } = await import("@/app/api/projects/[id]/prompt-run/route");
    aiOn = false;
    const off = await POST(post(`/api/projects/${pid}/prompt-run`, { body: sample.body }), ctx({ id: pid }));
    expect(off.status).toBe(402);
    expect((await off.json()).error).toMatch(/forfaits/);
    expect(calls).toHaveLength(0);
    aiOn = true;
    const on = await (await POST(post(`/api/projects/${pid}/prompt-run`, { body: sample.body }), ctx({ id: pid }))).json();
    expect(on.answer).toMatch(/Positionnement/);
    expect(calls[0].prompt).toContain("Espace Ancrage");
    expect(calls[0].context).toBeTruthy();
  });
});
