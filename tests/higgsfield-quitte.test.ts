/**
 * Higgsfield quitté (décision du propriétaire, 22 novembre 2026 : Runware le remplace comme seul intermédiaire de
 * secours). Il n'est plus ni dans le catalogue de l'administration ni dans le code ; un réglage déjà enregistré en
 * base qui le choisit est ignoré et le Studio retombe sur le réglage par défaut, sans rien changer à la base.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getJsonSetting, setJsonSetting } from "@/lib/settings";
import { PROVIDERS, routeFor } from "@/lib/ai/config";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { mediaBackup, mediaPrimary, usageBackup, usageExplicit, usagePrimary } from "@/lib/ai/media-routing";
import { OUTILS, OUTILS_ECARTES } from "@/lib/atelier/outils";

afterEach(() => { for (const k of ["ai.routes", "ai.media.usage", "ai.media.backup"]) setJsonSetting(k, {}); });

describe("Higgsfield quitté", () => {
  it("plus aucun modèle, fournisseur, outil ni fichier", () => {
    expect(MEDIA_MODELS.some((m) => (m.provider as string) === "higgsfield")).toBe(false);
    expect(Object.keys(PROVIDERS)).not.toContain("higgsfield");
    expect(OUTILS.some((o) => /higgs/i.test(o.id))).toBe(false);
    expect(Object.keys(OUTILS_ECARTES)).not.toContain("higgsfield");
    for (const f of ["src/lib/ai/higgsfield", "src/components/admin-higgsfield.tsx", "src/app/api/admin/higgsfield"]) expect(fs.existsSync(path.resolve(f)), f).toBe(false);
  });

  it("un réglage enregistré qui le choisit retombe sur le réglage par défaut", () => {
    const defaut = { primary: mediaPrimary("video"), route: routeFor("video_generation"), usage: usagePrimary("product_video"), backup: usageBackup("product_video") };
    setJsonSetting("ai.routes", { video_generation: { provider: "higgsfield", model: "higgsfield-ai/dop/standard" } });
    setJsonSetting("ai.media.usage", { product_video: { primary: "higgsfield:higgsfield-ai/dop/standard", backup: "higgsfield:higgsfield-ai/dop/lite" } });
    setJsonSetting("ai.media.backup", { video: "higgsfield:higgsfield-ai/dop/lite" });
    expect(mediaPrimary("video")).toEqual(defaut.primary);
    expect(routeFor("video_generation")).toEqual(defaut.route);
    expect(usagePrimary("product_video")).toEqual(defaut.usage);
    expect(usageBackup("product_video")).toEqual(defaut.backup);
    expect(mediaBackup("video")).toBeNull();
    expect(usageExplicit("product_video")).toBe(false);
    // La base n'est pas réécrite : le réglage reste tel quel, il est seulement ignoré.
    expect(getJsonSetting<any>("ai.media.backup", {}).video).toBe("higgsfield:higgsfield-ai/dop/lite");
  });
});
