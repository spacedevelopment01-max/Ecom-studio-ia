/**
 * Coordonnées d'une entreprise de services (téléphone, adresse, horaires…) saisies une seule fois : quand SINA
 * enregistre ce que le client vient de lui dire, elle n'efface jamais ce qui était déjà connu, et ce qui est
 * nouveau est bien enregistré. Le projet se crée en parlant à SINA (plus de formulaire de démarrage).
 */
import { describe, expect, it } from "vitest";

import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { runWithLang } from "@/lib/i18n-server";
import { loadProject } from "@/lib/projects";
import { emptyServiceProfile } from "@/lib/project-types";
import { emptyInput } from "@/lib/preparation/empty-input";
import { initialize, stateOf } from "@/lib/preparation/engine";
import { getTool } from "@/lib/syna-agent/registry";
import { grantProjectPlan } from "@/lib/project-subscriptions";

describe("coordonnées saisies une seule fois", () => {
  it("SINA garde les coordonnées connues et enregistre les nouvelles", async () => {
    const u = await createUser(`coord${Date.now()}@test.fr`, "motdepasse-test", "C");
    const pid = id();
    const known = {
      ...emptyServiceProfile(),
      phone: "03 85 00 00 00",
      address: "12 rue des Lilas, 71000 Mâcon",
      hours: "Lun–Ven 8h–18h",
      email: "contact@autodim.fr",
    };
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "AutoDim", "draft", "woocommerce", "services", JSON.stringify(known), "{}", "[]", now(), now(),
    );
    grantProjectPlan(pid, "dominer", "active");
    // Comme l'outil « project.create » de SINA : la fiche de départ reprend les coordonnées déjà connues du projet.
    initialize(pid, { ...emptyInput(), business: "services", offerName: "Carrossier", description: "Carrossier à Mâcon, débosselage, peinture", services: loadProject(pid).services });
    expect(stateOf(pid)!.stages.brief!.data.services).toMatchObject({ phone: known.phone, address: known.address, hours: known.hours, email: known.email });

    // Le client ne redonne que sa zone et une prestation : les autres coordonnées ne sont ni redemandées ni effacées.
    const tool = getTool("services.profile")!;
    const ctx = { user: u, conversationId: "fil-test", runId: "test", projectId: pid, attachment: () => null } as any;
    const r = await runWithLang({ ui: "fr", content: "fr" }, async () =>
      tool.run(ctx, tool.args.parse({ area: "Mâcon et 30 km", services: [{ name: "Débosselage", description: "Examen des impacts" }] })),
    );
    expect(r.ok).toBe(true);
    const s = loadProject(pid).services;
    expect(s).toMatchObject({
      phone: "03 85 00 00 00",
      address: "12 rue des Lilas, 71000 Mâcon",
      hours: "Lun–Ven 8h–18h",
      email: "contact@autodim.fr",
      area: "Mâcon et 30 km",
    });
    expect(s.services.map((x) => x.name)).toEqual(["Débosselage"]);
  });
});
