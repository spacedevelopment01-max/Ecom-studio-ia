/**
 * Tableau de bord du projet : ce que le client voit de son projet à côté de SINA. C'est sa constellation : neuf étoiles
 * (ses neuf étapes) et, dans chacune, seulement ce qui existe vraiment (sa fiche, ses notes, sa marque, son angle).
 * Aucun appel d'IA ni réseau.
 */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
vi.mock("next/navigation", () => ({ usePathname: () => "/studio/p1/pilote", useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));

describe("SINA — tableau de bord du projet", async () => {
  const { run, json, one } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  /** Un compte abonné et son projet. */
  const setup = async (business: "products" | "services" = "products") => { const user = await account(); return { user, projectId: project(user, business) as string }; };
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const { dashboardOf, PHASE_PROMISE } = await import("@/lib/syna-agent/dashboard");
  const { CielProjet } = await import("@/components/studio/ciel/ciel-projet");
  const { cielDuProjet } = await import("@/lib/ciel/ciel-projet");
  /** L'écran du projet, avec une étoile ouverte ou non. */
  const page = (projectId: string, userId: string, ouverte: number | null = null) => renderToStaticMarkup(h(CielProjet, { ciel: cielDuProjet(projectId, userId)!, projectId, ouverte }));

  const answered = (value: string) => ({ value, status: "answered" as const, source: "client" as const, at: 1 });

  it("un projet que SINA n'a pas encore commencé : neuf étapes à faire, rien d'inventé", async () => {
    const { user, projectId } = await setup();
    const d = dashboardOf(projectId)!;
    expect(d.started).toBe(false);
    expect(d.building).toBe(false);
    expect(d.steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(d.steps.every((s) => s.status === "todo")).toBe(true);
    expect(d.fiche).toEqual([]);
    expect(d.angle).toBeNull();
    const html = page(projectId, user.id, 1);
    expect(html).toContain("Rien n&#x27;a encore commencé");
    expect(html).toContain("Parle-moi de ton projet");
    // Les neuf étoiles sont là, avec leur nom et leur état écrits ; aucune n'est allumée.
    expect(html.match(/data-etoile="\d"/g)).toHaveLength(9);
    expect(html.match(/data-etat="avenir"/g)!.length).toBeGreaterThanOrEqual(9);
    expect(html).toContain("La communication");
    expect(html).not.toContain("data-dashboard-fiche");
    expect(html).not.toContain("data-dashboard-angle");
    // Une étoile à venir dit ce qu'elle apportera.
    expect(html).toContain(PHASE_PROMISE[1].fr.replace("'", "&#x27;"));
  });

  it("pendant qu'ils font connaissance : la fiche et les notes du client s'affichent, avec ses mots, et la page se dit « en direct »", async () => {
    const { user, projectId } = await setup("services");
    const cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => {
      J.setStep(j, 0, "doing");
      j.start.business = answered("services");
      j.start.offer = answered("Dépannage et salles de bain clé en main");
      j.start.audience = { value: "", status: "later", source: "client", at: 1 };
      j.notes = [{ sujet: "objectifs", value: "Deux salles de bain par mois", at: 1 }];
    });
    const d = dashboardOf(projectId)!;
    expect(d.started).toBe(true);
    expect(d.building).toBe(true);
    expect(d.current).toBe(1);
    expect(d.steps[0].status).toBe("doing");
    expect(d.fiche.map((f) => [f.fr, f.value, f.later])).toEqual([
      [J.FIELD_LABEL.business.fr, "Des services", false],
      [J.FIELD_LABEL.offer.fr, "Dépannage et salles de bain clé en main", false],
      [J.FIELD_LABEL.audience.fr, "Plus tard", true],
    ]);
    expect(d.notes).toEqual([{ sujet: "objectifs", value: "Deux salles de bain par mois" }]);
    // Sans étoile ouverte : le ciel seul, SINA sur « Faire connaissance », et la fiche reste dans son étoile.
    let html = page(projectId, user.id);
    expect(html).toContain('data-building="1"');
    expect(html).toContain("Ton projet, en direct");
    expect(html).toMatch(/data-etoile="1"[^>]*data-etat="cours"[^>]*data-ici=""/);
    expect(html).toContain("On avance ensemble sur « Faire connaissance »");
    expect(html).not.toContain("data-dashboard-fiche");
    expect(html).toMatch(/Étape 1 sur 9/);
    // L'étoile ouverte : la fiche du client, avec ses mots.
    html = page(projectId, user.id, 1);
    expect(html).toContain("data-dashboard-fiche");
    expect(html).toContain("Dépannage et salles de bain clé en main");
    expect(html).toContain("Deux salles de bain par mois");
    // Une étoile à venir dit ce qu'elle apportera ; aucun repère interne (« étape 0 ») n'est montré.
    expect(page(projectId, user.id, 2)).toContain(PHASE_PROMISE[2].fr);
    expect(html).not.toMatch(/[ÉEée]tape 0\b/);
  });

  it("fiche validée : l'étape 1 est cochée, la fiche se replie, la marque devient l'étape en cours ; la marque et l'angle n'apparaissent que s'ils existent", async () => {
    const { user, projectId } = await setup();
    const cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { J.setStep(j, 0, "done"); j.start.business = answered("products"); j.start.offer = answered("Bougies"); });
    let d = dashboardOf(projectId)!;
    expect(d.current).toBe(2);
    expect(d.steps[0].status).toBe("done");
    let html = page(projectId, user.id);
    expect(html).toMatch(/data-step="1"[^>]*data-etat="fait"/);
    expect(html).toMatch(/data-step="2"[^>]*aria-current="step"/);
    // Rien n'est en cours sur la marque tant que SINA n'y travaille pas : elle reste au cœur, sans phrase inventée.
    expect(html).not.toContain("data-ici");
    expect(html).not.toContain("ciel-dit");

    // La marque enregistrée dans le projet (nom, slogan, couleurs) s'affiche sous l'étape 2 ; l'angle choisi sous la 3.
    const brand = json<any>(one<{ brand_json: string | null }>("SELECT brand_json FROM projects WHERE id=?", projectId)?.brand_json ?? "{}", {});
    run("UPDATE projects SET brand_json=? WHERE id=?", JSON.stringify({ ...brand, name: "Lueur", tagline: "La flamme lente", palette: { primary: "#1B2A4A", accent: "#E8C27A", note: "pas une couleur" } }), projectId);
    J.updateJourney(cid, (j) => {
      j.angles = { list: [{ id: "a1", title: "Le soir qui ralentit", message: "Une heure rien que pour toi" } as any], recommendedId: "a1", recommendation: "", sourceCount: 0, at: 1 };
      j.angleChoice = { id: "a1", at: 1 };
    });
    d = dashboardOf(projectId)!;
    expect(d.name).toBe("Lueur");
    expect(d.brand).toEqual({ name: "Lueur", slogan: "La flamme lente", logo: null, colors: ["#1B2A4A", "#E8C27A"] });
    expect(d.angle).toEqual({ title: "Le soir qui ralentit", promise: "Une heure rien que pour toi" });
    html = page(projectId, user.id, 2);
    expect(html).toContain("data-dashboard-brand");
    expect(html).toContain("La flamme lente");
    expect(html).not.toContain("data-dashboard-angle");
    html = page(projectId, user.id, 3);
    expect(html).toContain("data-dashboard-angle");
    expect(html).toContain("Le soir qui ralentit");
  });

  it("la page d'accueil du projet est sa constellation, pour tous les projets", async () => {
    const fs = await import("node:fs"), path = await import("node:path");
    const page = fs.readFileSync(path.resolve(import.meta.dirname, "../src/app/studio/[projectId]/[tab]/page.tsx"), "utf8");
    expect(page).toContain('if (tab === "pilote")');
    expect(page).toContain("<CielProjet ciel={ciel} projectId={projectId} />");
    expect(page).not.toMatch(/ChantierView|underConstruction/);
    expect(dashboardOf("projet-inconnu")).toBeNull();
  });
});
