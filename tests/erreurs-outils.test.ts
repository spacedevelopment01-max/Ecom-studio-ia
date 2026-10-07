/** ffmpeg absent : message clair (comment l'installer) au lieu de « spawn ffmpeg ENOENT » ; le reste est inchangé. */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { friendlyToolError } from "@/lib/tool-errors";
import { runWithLang } from "@/lib/i18n-server";

describe("erreurs d'outils système", () => {
  it("ffmpeg ou ffprobe manquant : explication en français et en anglais", () => {
    const fr = runWithLang({ ui: "fr", content: "fr" }, () => friendlyToolError("spawn ffmpeg ENOENT"));
    expect(fr).toMatch(/ffmpeg n'est pas installé/);
    expect(fr).toMatch(/sudo apt-get install -y ffmpeg/);
    expect(runWithLang({ ui: "en", content: "en" }, () => friendlyToolError("spawn ffprobe ENOENT"))).toMatch(/isn't installed/);
  });
  it("les autres erreurs restent telles quelles", () => {
    expect(friendlyToolError("Délai dépassé")).toBe("Délai dépassé");
  });
  it("le Codespace installe ffmpeg au démarrage s'il manque", () => {
    const dc = JSON.parse(fs.readFileSync(".devcontainer/devcontainer.json", "utf8"));
    expect(dc.postStartCommand).toMatch(/command -v ffmpeg .*apt-get install -y .*ffmpeg/);
  });
});
