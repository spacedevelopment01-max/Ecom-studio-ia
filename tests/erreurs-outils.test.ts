/**
 * ffmpeg absent : au lieu de « spawn ffmpeg ENOENT », le client lit une phrase simple de SINA ; la marche à suivre pour
 * l'installer (commande, Codespace) reste au Studio (26 novembre 2026). Le reste est inchangé.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { detailOutilManquant, friendlyToolError } from "@/lib/tool-errors";
import { runWithLang } from "@/lib/i18n-server";

describe("erreurs d'outils système", () => {
  it("ffmpeg ou ffprobe manquant : explication en français et en anglais", () => {
    const fr = runWithLang({ ui: "fr", content: "fr" }, () => friendlyToolError("spawn ffmpeg ENOENT"));
    expect(fr).toMatch(/Je n'ai pas pu préparer la vidéo : un outil du Studio manque/);
    expect(fr).not.toMatch(/ffmpeg|sudo|Codespace|vous|votre/i);
    expect(runWithLang({ ui: "en", content: "en" }, () => friendlyToolError("spawn ffprobe ENOENT"))).toMatch(/one of the Studio's tools is missing/);
    // Pour le Studio seulement : la marche à suivre.
    expect(detailOutilManquant("spawn ffmpeg ENOENT")).toMatch(/sudo apt-get install -y ffmpeg/);
  });
  it("les autres erreurs restent telles quelles", () => {
    expect(friendlyToolError("Délai dépassé")).toBe("Délai dépassé");
  });
  it("le Codespace installe ffmpeg au démarrage s'il manque", () => {
    const dc = JSON.parse(fs.readFileSync(".devcontainer/devcontainer.json", "utf8"));
    expect(dc.postStartCommand).toMatch(/command -v ffmpeg .*apt-get install -y .*ffmpeg/);
  });
});
