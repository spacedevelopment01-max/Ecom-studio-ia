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
import { DEMO_THEMES, codeVersion, demoFailureFile, demosToPrepare, prepareThemeDemos, themeDemoFile, themeDemoStatus, themeDemoStatuses } from "@/lib/theme/theme-demos";
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

  it("état : prête avec ses pages existantes, périmée (jamais prête) quand le code a changé, absente sinon", () => {
    const s = themeDemoStatus("sillon");
    // #280 : une démo d'une version précédente n'est jamais annoncée « prête » (l'ancien thème s'ouvrait depuis la galerie).
    expect(s).toMatchObject({ id: "sillon", ready: false, stale: true, title: "SILLON", version: "v1" });
    expect(themeDemoStatus("sillon", "v1")).toMatchObject({ ready: true, stale: false });
    expect(s.pages).toEqual([{ file: "accueil.html", label: "Accueil" }, { file: "produit.html", label: "Machine" }]);
    expect(themeDemoStatus("fraise")).toMatchObject({ ready: false, pages: [] });
    expect(themeDemoStatuses().map((x) => x.id)).toEqual([...DEMO_THEMES]);
  });

  it("démo préparée sans ses visuels (kit privé absent, ex. ONDE) : jamais servie comme prête, sans préparation en boucle", () => {
    const onde = path.join(dir, "onde");
    fs.mkdirSync(onde, { recursive: true });
    fs.writeFileSync(path.join(onde, "accueil.html"), "<!doctype html><title>ONDE</title>");
    fs.writeFileSync(path.join(onde, "pages.json"), JSON.stringify({ title: "ONDE", missing: ["onde-01.webp", "onde-02.webp"], pages: [{ file: "accueil.html", label: "Accueil" }] }));
    fs.writeFileSync(path.join(onde, "demo.json"), JSON.stringify({ version: "v2", date: new Date(Date.now() + 60_000).toISOString() }));
    const s = themeDemoStatus("onde");
    expect(s).toMatchObject({ ready: false, stale: false, missing: ["onde-01.webp", "onde-02.webp"] });
    // Démo périmée ou kit copié depuis : reprise ; sinon rien (le kit n'a pas bougé depuis la préparation).
    expect(themeDemoStatus("sillon").missing).toBeUndefined();
  });

  it("#280 : échec de mise à jour noté, montré, et pas relancé à chaque ouverture ; une autre version relance", () => {
    expect(demosToPrepare([themeDemoStatus("sillon")])).toEqual(["sillon"]);
    fs.writeFileSync(demoFailureFile("sillon"), JSON.stringify({ version: "v2", date: new Date().toISOString(), message: "export incomplet (accueil absent)" }));
    const s = themeDemoStatus("sillon");
    expect(s).toMatchObject({ ready: false, stale: true, failed: { version: "v2", message: "export incomplet (accueil absent)" } });
    expect(demosToPrepare([s])).toEqual([]);
    expect(themeDemoStatus("sillon", "v3").failed).toBeUndefined();
    expect(demosToPrepare([themeDemoStatus("sillon", "v3")])).toEqual(["sillon"]);
    fs.writeFileSync(demoFailureFile("sillon"), JSON.stringify({ version: "v2", date: new Date(Date.now() - 2 * 3600_000).toISOString(), message: "échec ancien" }));
    expect(demosToPrepare([themeDemoStatus("sillon")])).toEqual(["sillon"]);
    expect(themeDemoFile("sillon", "../.echec-sillon.json")).toBeNull();
    fs.rmSync(demoFailureFile("sillon"));
  });

  it("#280 : version du code lue aussi dans un worktree git (sinon une démo ancienne ne serait jamais vue périmée)", () => {
    const saved = process.env.THEME_DEMOS_VERSION;
    delete process.env.THEME_DEMOS_VERSION;
    try {
      const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-git-")), common = path.join(repo, "main.git"), wt = path.join(repo, "wt"), gitdir = path.join(common, "worktrees", "wt");
      fs.mkdirSync(path.join(common, "refs", "heads"), { recursive: true });
      fs.mkdirSync(gitdir, { recursive: true });
      fs.mkdirSync(wt);
      fs.writeFileSync(path.join(wt, ".git"), `gitdir: ${gitdir}\n`);
      fs.writeFileSync(path.join(gitdir, "HEAD"), "ref: refs/heads/main\n");
      fs.writeFileSync(path.join(gitdir, "commondir"), "../..\n");
      fs.writeFileSync(path.join(common, "packed-refs"), "# pack-refs\n1111111111111111111111111111111111111111 refs/heads/main\n");
      expect(codeVersion(wt)).toBe("1111111111111111111111111111111111111111");
      fs.writeFileSync(path.join(common, "refs", "heads", "main"), "2222222222222222222222222222222222222222\n");
      expect(codeVersion(wt)).toBe("2222222222222222222222222222222222222222");
      fs.writeFileSync(path.join(gitdir, "HEAD"), "3333333333333333333333333333333333333333\n");
      expect(codeVersion(wt)).toBe("3333333333333333333333333333333333333333");
      fs.rmSync(repo, { recursive: true, force: true });
    } finally {
      if (saved === undefined) delete process.env.THEME_DEMOS_VERSION; else process.env.THEME_DEMOS_VERSION = saved;
    }
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
