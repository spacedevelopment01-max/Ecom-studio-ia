/**
 * SINA, seule porte pour créer un projet : le Pilote, la création en dix étapes, la demande « en une phrase », le
 * formulaire de création et les écrans de préparation sont retirés. Aucun appel d'IA ni réseau : lecture du code
 * et des tâches déclarées.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
const exists = (f: string) => fs.existsSync(path.join(root, f));
function sources(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []));
}

describe("créer un projet : une seule façon, avec SINA", () => {
  it("la page d'accueil du studio ne propose plus le formulaire, seulement le démarrage par SINA", () => {
    const home = read("src/components/studio/home.tsx");
    expect(home).toMatch(/<SynaThread key=\{freeSub\.id\} projectId=\{null\} subscriptionKey=\{freeSub\.id\}/);
    for (const gone of ["NewProject", "formulaire manuel", "manual form", "Revenir à SINA", "setManual", "name=\"photos\"", "/api/describe"]) expect(home, gone).not.toContain(gone);
    // Ce qui reste : la liste des projets et les abonnements.
    for (const kept of ["Mes projets", "NewSubscription", "ProjectSubscriptionDialog"]) expect(home, kept).toContain(kept);
  });

  it("POST /api/projects ne crée plus de projet par formulaire : la route ne fait que lister", async () => {
    const route = await import("@/app/api/projects/route");
    expect(Object.keys(route).filter((k) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(k))).toEqual(["GET"]);
  });

  it("les routes de l'ancienne création n'existent plus ; celles de SINA et de la liste restent", () => {
    for (const gone of ["start", "resume", "workflow", "preparation", "social/initial"]) expect(exists(`src/app/api/projects/[id]/${gone}`), gone).toBe(false);
    expect(exists("src/app/api/describe")).toBe(false);
    for (const kept of ["src/app/api/projects/route.ts", "src/app/api/projects/[id]/route.ts", "src/app/api/syna/open/route.ts"]) expect(exists(kept), kept).toBe(true);
  });

  it("le projet se crée par l'outil de SINA, sur un abonnement libre", () => {
    const tool = read("src/lib/syna-agent/tools/project.ts");
    expect(tool).toContain('name: "project.create"');
    expect(tool).toContain("createProjectWithSubscription(");
    expect(tool).toContain("pendingSubscriptions(");
  });

  it("les écrans du Pilote, du formulaire et de la préparation sont retirés ; l'onglet « pilote » n'affiche plus rien par TabView", () => {
    for (const gone of ["tab-pilote", "workflow-panel", "start-creation", "tab-preparation", "brief-fiche", "preparation-handoff", "initial-authorization", "initial-creatives", "analysis-retry", "ai-description"]) expect(exists(`src/components/studio/${gone}.tsx`), gone).toBe(false);
    const tabs = read("src/components/studio/tabs.tsx");
    expect(tabs).not.toContain("tab-pilote");
    expect(tabs).not.toMatch(/^\s*pilote:/m);
    expect(tabs).toContain('produit: dynamic(() => import("./tab-produit")');
  });

  it("aucun écran gardé n'appelle une route retirée ni ne renvoie vers le Pilote ou le formulaire", () => {
    const bad: string[] = [];
    for (const f of [...sources("src/components"), ...sources("src/app")]) {
      const s = read(f);
      if (/\/api\/projects\/\$\{[^}]+\}\/(start|resume|workflow|preparation|social\/initial)\b/.test(s) || /\/api\/describe\b/.test(s)) bad.push(`${f} : appelle une route retirée`);
      if (/depuis le Pilote|voir le Pilote|from the Pilot\b|see (the )?Pilot\b|formulaire de création du projet|project creation form/.test(s)) bad.push(`${f} : renvoie vers le Pilote ou le formulaire`);
    }
    expect(bad).toEqual([]);
  });
});

describe("tâches de fond : les anciennes façons de créer ne sont plus déclarées", async () => {
  const { HANDLER_TYPES, handlers } = await import("../worker/handlers");
  const { intentsFromAction } = await import("@/lib/orchestrator/intent");

  it("plus de création en dix étapes, de demande en une phrase ni de « 20 créations du départ »", () => {
    for (const gone of ["pipeline.run", "workflow.run", "plan.run", "social.initial"]) {
      expect(HANDLER_TYPES, gone).not.toContain(gone);
      expect(handlers[gone], gone).toBeUndefined();
      expect(intentsFromAction(gone), gone).toBeNull();
    }
    for (const gone of ["src/lib/engine/pipeline.ts", "src/lib/workflow/index.ts", "src/lib/project-start.ts", "src/lib/social-v2/initial.ts"]) expect(exists(gone), gone).toBe(false);
  });

  it("les tâches de SINA et le moteur de préparation dont elle se sert restent déclarés", () => {
    // La tâche des trois logos libres (« syna.logos ») a été retirée le 16 novembre 2026 : le logo vient de la planche.
    expect(HANDLER_TYPES).not.toContain("syna.logos");
    for (const kept of ["syna.agent", "syna.brand", "project.prepare", "strategy.prepare", "image.v2", "shop.build", "files.classify"]) expect(HANDLER_TYPES, kept).toContain(kept);
    // SINA lance encore la préparation (fiche, recherche, angles) : la tâche ne part pas tant qu'elle s'en sert.
    expect(read("src/lib/preparation/engine.ts")).toContain('type: "project.prepare"');
    expect(read("src/lib/syna-agent/tools/project.ts")).toContain("queuePreparation(");
  });
});
