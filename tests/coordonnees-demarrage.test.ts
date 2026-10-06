/**
 * Coordonnées d'une entreprise de services (téléphone, adresse, horaires…) saisies une seule fois : démarrer la
 * création d'un projet déjà créé ne les efface jamais, et ce qui est saisi au démarrage est bien enregistré.
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, requireUser: async () => sessionUser };
});

import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { emptyServiceProfile } from "@/lib/project-types";

const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as any;
const start = (pid: string, fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new Request(`http://x/api/projects/${pid}/start`, { method: "POST", body: fd });
};

describe("coordonnées saisies une seule fois", () => {
  it("démarrer la création garde les coordonnées connues et enregistre les nouvelles", async () => {
    const u = await createUser(`coord${Date.now()}@test.fr`, "motdepasse-test", "C");
    sessionUser = u;
    const pid = id();
    const known = { ...emptyServiceProfile(), phone: "03 85 00 00 00", address: "12 rue des Lilas, 71000 Mâcon", hours: "Lun–Ven 8h–18h", email: "contact@autodim.fr" };
    run("INSERT INTO projects (id, user_id, name, status, platform, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", pid, u.id, "AutoDim", "draft", "woocommerce", "services", JSON.stringify(known), "{}", "[]", now(), now());
    const { POST } = await import("@/app/api/projects/[id]/start/route");
    // Formulaire de démarrage : coordonnées laissées vides, sauf la zone (nouvelle).
    const r = await POST(start(pid, { businessType: "services", description: "Carrossier à Mâcon, débosselage, peinture", area: "Mâcon et 30 km", phone: "", address: "", hours: "", email: "", services: "[]" }), ctx({ id: pid }));
    expect(r.status).toBe(200);
    const s = loadProject(pid).services;
    expect(s).toMatchObject({ phone: "03 85 00 00 00", address: "12 rue des Lilas, 71000 Mâcon", hours: "Lun–Ven 8h–18h", email: "contact@autodim.fr", area: "Mâcon et 30 km" });
  });
});
