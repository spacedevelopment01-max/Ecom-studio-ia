import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INTRO_HTML } from "@/components/intro/intro-source";

describe("intro animée", () => {
  it("le code intégré est la copie exacte du fichier fourni", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "src/components/intro/ecom-studio-ia-intro-site.html"), "utf8");
    expect(INTRO_HTML).toBe(file);
  });
  it("garde les réglages demandés (identifiants ecs-, z-index, une fois par visite)", () => {
    expect(INTRO_HTML).toContain("z-index:2147483000");
    expect(INTRO_HTML).toContain("sessionStorage.getItem('ecsSeen')");
    expect(INTRO_HTML).toContain('id="ecs-splash"');
  });
});
