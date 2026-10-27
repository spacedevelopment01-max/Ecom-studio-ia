/**
 * Recette VANS, étape 1 (#204) : défauts relevés sur le studio servi à Thomas.
 *  - /api/version annonçait « compiled-build » en dur, alors que le serveur tournait en mode développement ;
 *  - kit privé de démonstration absent (public/demo/…, hors dépôt) : l'accueil gardait FRAISE en vedette avec des
 *    images vides (cinq alertes React « src vide », badge rouge de Next) ; l'inscription décrivait un visuel absent ;
 *  - « npm run studio » : construction arrêtée faute de mémoire JavaScript dans un Codespace de 8 Go.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/version/route";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("/api/version : version et mode réellement exécutés", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("en développement : jamais « compiled-build », commit lu au démarrage", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STUDIO_BUILD_COMMIT", "a".repeat(40));
    vi.stubEnv("STUDIO_BUILD_TREE", "clean");
    const v = await GET().json();
    expect(v).toEqual({ commit: "a".repeat(40), commitOrigin: "dev-start", mode: "development", tree: "clean", source: "dev-server" });
  });

  it("en production : « compiled-build », commit de la construction, arbre inconnu si non mesuré", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STUDIO_BUILD_COMMIT", "b".repeat(40));
    vi.stubEnv("STUDIO_BUILD_TREE", "");
    const v = await GET().json();
    expect(v).toEqual({ commit: "b".repeat(40), commitOrigin: "build", mode: "production", tree: "unknown", source: "compiled-build" });
  });

  it("aucune autre information publiée (chemin, configuration, compte)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STUDIO_BUILD_TREE", "/home/secret");
    const v = await GET().json();
    expect(Object.keys(v).sort()).toEqual(["commit", "commitOrigin", "mode", "source", "tree"]);
    expect(v.tree).toBe("unknown");
  });

  it("l'état de l'arbre est mesuré au même moment que le commit (next.config.ts)", () => {
    const cfg = read("next.config.ts");
    expect(cfg).toMatch(/"status","--porcelain","--untracked-files=no"/);
    expect(cfg).toMatch(/STUDIO_BUILD_TREE:buildTree/);
  });
});

describe("Kit privé de démonstration absent", () => {
  const page = read("src/app/page.tsx");

  it("accueil : la vedette sans détourage est une démonstration dont le logo et la photo sont installés", () => {
    expect(page).toMatch(/\?\? productDemos\.find\(\(d\) => d\.logo && d\.photo\) \?\? productDemos\[0\]/);
  });

  it("accueil : l'atelier de marque ne liste que les démonstrations avec logo et photo", () => {
    expect(page).toMatch(/const brands: BrandDemo\[\] = list\.filter\(\(d\) => d\.logo && d\.photo\)/);
  });

  it("inscription : la légende du visuel n'apparaît qu'avec le visuel", () => {
    expect(read("src/components/auth-form.tsx")).toMatch(/\{background && <p className="mt-3 text-sm text-white\/75">/);
  });
});

describe("npm run studio : construction avec assez de mémoire", () => {
  it("4 Go pour next build, sauf limite déjà fixée par NODE_OPTIONS", () => {
    const s = read("scripts/studio.mjs");
    expect(s).toMatch(/--max-old-space-size=4096/);
    expect(s).toMatch(/spawnSync\(bin\("next"\), \["build"\], \{ stdio: "inherit", env: \{ \.\.\.process\.env, NODE_OPTIONS: nodeOptions \} \}\)/);
  });
});
