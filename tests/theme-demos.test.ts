/**
 * Démos intégrales des thèmes avant le choix (revue de la PR #149) : fichiers servis uniquement depuis le dossier de la
 * démo, état « prête / périmée » lu sans base de projet, aucune préparation lancée pendant les tests, et un choix de thème
 * demandé deux fois (double-clic, deux onglets) ne crée qu'une seule tâche.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { enqueue, pendingJob } from "@/lib/jobs";
import { DEMO_THEMES, prepareThemeDemos, themeDemoFile, themeDemoStatus, themeDemoStatuses } from "@/lib/theme/theme-demos";
import { ACTIVE_THEMES } from "@/lib/theme/theme-fit";
import { seedHoldout } from "./lot1-holdout-fixtures";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-theme-demos-"));
const saved = { dir: process.env.THEME_DEMOS_DIR, version: process.env.THEME_DEMOS_VERSION };
beforeAll(() => {
  process.env.THEME_DEMOS_DIR = dir;
  process.env.THEME_DEMOS_VERSION = "v2";
  const sillon = path.join(dir, "sillon");
  fs.mkdirSync(path.join(sillon, "assets"), { recursive: true });
  fs.writeFileSync(path.join(sillon, "accueil.html"), "<!doctype html><title>SILLON</title>");
  fs.writeFileSync(path.join(sillon, "produit.html"), "<!doctype html><title>Fiche</title>");
  fs.writeFileSync(path.join(sillon, "assets", "theme.css"), "body{}");
  fs.writeFileSync(path.join(sillon, "pages.json"), JSON.stringify({ title: "SILLON", services: false, pages: [{ file: "accueil.html", label: "Accueil" }, { file: "produit.html", label: "Machine" }, { file: "absente.html", label: "Absente" }, { file: "../secret.html", label: "Hors démo" }] }));
  fs.writeFileSync(path.join(sillon, "demo.json"), JSON.stringify({ version: "v1", date: "2026-10-20T00:00:00.000Z" }));
  fs.writeFileSync(path.join(dir, "secret.html"), "secret");
});
afterAll(() => {
  if (saved.dir === undefined) delete process.env.THEME_DEMOS_DIR; else process.env.THEME_DEMOS_DIR = saved.dir;
  if (saved.version === undefined) delete process.env.THEME_DEMOS_VERSION; else process.env.THEME_DEMOS_VERSION = saved.version;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("démos intégrales des thèmes", () => {
  it("une démo par thème du catalogue actif, rien d'autre", () => {
    expect([...DEMO_THEMES].sort()).toEqual([...ACTIVE_THEMES].sort());
    expect(themeDemoFile("arven", "accueil.html")).toBeNull();
  });

  it("état : prête avec ses pages existantes, périmée quand le code a changé, absente sinon", () => {
    const s = themeDemoStatus("sillon");
    expect(s).toMatchObject({ id: "sillon", ready: true, stale: true, title: "SILLON", version: "v1" });
    expect(s.pages).toEqual([{ file: "accueil.html", label: "Accueil" }, { file: "produit.html", label: "Machine" }]);
    expect(themeDemoStatus("sillon", "v1").stale).toBe(false);
    expect(themeDemoStatus("fraise")).toMatchObject({ ready: false, pages: [] });
    expect(themeDemoStatuses().map((x) => x.id)).toEqual([...DEMO_THEMES]);
  });

  it("fichiers : seulement dans le dossier de la démo, types connus", () => {
    expect(themeDemoFile("sillon", "")!.body.toString()).toContain("SILLON");
    expect(themeDemoFile("sillon", "assets/theme.css")!.type).toMatch(/^text\/css/);
    for (const bad of ["../secret.html", "assets/../../secret.html", "..%2Fsecret.html", ".preparation.json", "pages.json/..", "/etc/passwd", "assets//theme.css"]) expect(themeDemoFile("sillon", bad), bad).toBeNull();
    expect(themeDemoFile("sillon", "demo.json")).not.toBeNull(); // données publiques de la démo (version, date)
    expect(themeDemoFile("sillon", "absente.html")).toBeNull();
  });

  it("aucune préparation lancée pendant les tests (jamais de processus ni de base touchée)", () => {
    expect(prepareThemeDemos()).toBe(false);
    expect(fs.existsSync(path.join(dir, ".preparation.json"))).toBe(false);
  });
});

describe("choix d'un thème demandé deux fois", async () => {
  const user = await createUser("double-choix@example.invalid", "isolated-test-only", "Double");
  it("la tâche encore en attente est retrouvée : la seconde demande ne crée rien", () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    expect(pendingJob(pid, "shop.direction", { direction: "sillon" })).toBeNull();
    const job = enqueue({ userId: user.id, projectId: pid, type: "shop.direction", payload: { projectId: pid, direction: "sillon" } });
    expect(pendingJob(pid, "shop.direction", { direction: "sillon" })?.id).toBe(job.id);
    // Un autre thème reste une autre demande.
    expect(pendingJob(pid, "shop.direction", { direction: "onde" })).toBeNull();
  });

  it("la route d'application renvoie la tâche existante avant d'en créer une", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "projects", "[id]", "theme", "build", "route.ts"), "utf8");
    expect(src.indexOf("pendingJob(p.id, \"shop.direction\"")).toBeGreaterThan(0);
    expect(src.indexOf("pendingJob(p.id, \"shop.direction\"")).toBeLessThan(src.indexOf("enqueue({"));
  });

  it("la galerie garde le choix derrière une garde synchrone et la démo n'appelle aucune route du projet", () => {
    const gallery = fs.readFileSync(path.join(process.cwd(), "src", "components", "studio", "theme-gallery.tsx"), "utf8");
    expect(gallery).toMatch(/if \(picking\.current\) return;\s*picking\.current = true;/);
    const viewer = fs.readFileSync(path.join(process.cwd(), "src", "components", "studio", "theme-demo-viewer.tsx"), "utf8");
    expect(viewer).not.toMatch(/\/api\/projects\//);
    expect(viewer).toContain("/api/theme-demos/");
  });
});
