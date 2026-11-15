/**
 * Intégration (#276) : les sections remplies par un onglet métier sont repérées pour qu'une composition ne les retouche
 * ni ne les retire (P1) ; l'effacement d'un compte supprime aussi les fichiers de ses sites publiés (R4). Aucun réseau.
 * Les cas C1 et P2 vérifiaient l'ancien assistant : ils sont partis avec lui.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAsset } from "@/lib/library";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { managedSections, withContenus } from "@/lib/contenus";
import { addCategory, createItem, setItemStatus } from "@/lib/contenus/carte";
import { createRealisation, setRealisationStatus } from "@/lib/contenus/realisations";
import { eraseIsolatedAccountFixture, planAccountErasure } from "@/lib/privacy";
import { unsupportedSitesHostname } from "@/lib/sites/launch-check";
import { sitesRoot } from "@/lib/sites/store";
import { assembleComposition } from "@/lib/theme/composition/assemble";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceProfile, serviceSpec } from "./fixtures";
import { completeSite, payingUser } from "./sites-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

beforeEach(() => { vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function site(label: string, direction: string) {
  const u = await payingUser(label);
  const pid = seedHoldout(u.id, 2, `Entreprise ${label}`);
  const spec = JSON.parse(JSON.stringify(serviceSpec(direction as never, "fr", { ...serviceProfile, contactMode: "quote" })).replace(/"es-(hero|scene-\d)\.jpg"/g, '""')) as ThemeSpec;
  saveThemeVersion(pid, completeSite(spec, `Entreprise ${label}`), "test", "user");
  const photo = async () => (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 300, height: 200, channels: 3, background: "#7a6" } }).jpeg().toBuffer(), name: "chantier.jpg", mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { u, pid, photo };
}

describe("P1 — sections remplies par un onglet métier", () => {
  it("carte : repérée seulement quand un plat est publié (SINA ne la retouche pas)", async () => {
    const resto = await site("p1-resto", "table-saison");
    const spec = currentTheme(resto.pid)!.spec as ThemeSpec;
    expect(managedSections(spec, resto.pid).size).toBe(0);
    const c = addCategory(resto.pid, "Entrées");
    setItemStatus(resto.pid, createItem(resto.pid, { categoryId: c.id, name: "Velouté fictif", price: 9 }).id, "published");
    const managed = managedSections(spec, resto.pid);
    const keys = [...managed.keys()].filter((k) => managed.get(k) === "carte");
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) { const [t, id] = k.split(":"); expect(spec.templates[t].sections[id].type).toMatch(/^ts-(menu|dishes)$/); }
  });

  it("réalisations : la galerie générique (portfolio) est conservée par une composition SINA, comme une section fonctionnelle", async () => {
    const a = await site("p1-atelier", "atelier");
    const spec = currentTheme(a.pid)!.spec as ThemeSpec;
    const sid = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "portfolio")!;
    expect(sid).toBeTruthy();
    const plan = { schema: 1, mode: "hybrid", versionId: "v-test", summary: "Recomposer l'accueil sans la galerie", pages: [{ template: "index", sections: spec.templates.index.order.filter((id) => id !== sid).map((id) => ({ kind: "existing", section: id, bindings: [], layout: [] })) }] };
    const deps = { versionId: "v-test", scope: () => "home", source: () => undefined, authorize: () => {}, media: () => null };
    const managedNow = () => { const m = managedSections(spec, a.pid); return (t: string, s: string) => m.has(`${t}:${s}`); };
    // Sans réalisation publiée : la galerie d'exemple peut être retirée (comportement inchangé).
    expect(managedSections(spec, a.pid).size).toBe(0);
    expect(() => assembleComposition(spec, plan, { ...deps, managed: managedNow() })).not.toThrow();
    const r = createRealisation(a.pid, { title: "Séjour repeint", summary: "Murs et plafond.", photos: [{ assetId: await a.photo(), alt: "" }] });
    setRealisationStatus(a.pid, r.id, "published");
    expect(managedSections(spec, a.pid).get(`index:${sid}`)).toBe("realisations");
    expect(() => assembleComposition(spec, plan, { ...deps, managed: managedNow() })).toThrow(/section fonctionnelle ou verrouillée à conserver/);
    // Relier un texte dans la galerie gérée par l'onglet : refusé aussi.
    const keep = { ...plan, pages: [{ template: "index", sections: spec.templates.index.order.map((id) => ({ kind: "existing", section: id, bindings: id === sid ? [{ key: "heading", source: "source.1" }] : [], layout: [] })) }] };
    expect(() => assembleComposition(spec, keep, { ...deps, managed: managedNow() })).toThrow(/contenu métier géré dans son onglet/);
  });
});

describe("R4 — effacement : fichiers des sites publiés", () => {
  it("le dossier du site publié du compte effacé disparaît ; celui d'un autre compte reste", async () => {
    const a = await site("r4-a", "aplat");
    const b = await site("r4-b", "aplat");
    for (const p of [a.pid, b.pid]) { const d = path.join(sitesRoot(), p, "pub-test", "files"); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "index.html"), "<p>site</p>"); }
    expect(planAccountErasure(a.u.id)).toMatchObject({ automaticEnabled: false, hostedSiteFilesIncluded: true });
    const res = eraseIsolatedAccountFixture(a.u.id, { financial: "retain", support: "retain", backups: "manual_pending", externalProviders: "manual_pending", legacyCaches: "manual_pending" });
    expect(res.hostedSiteDirectoriesRemoved).toBe(1);
    expect(fs.existsSync(path.join(sitesRoot(), a.pid))).toBe(false);
    expect(fs.existsSync(path.join(sitesRoot(), b.pid, "pub-test", "files", "index.html"))).toBe(true);
  });
});

describe("Contre-vérification #277 — adresse d'écoute des sites hébergés", () => {
  it("signale -H 127.0.0.1 / ::1 avec SITES_DOMAIN ; accepte sans -H, localhost, 0.0.0.0, ou sans hébergement", () => {
    const D = "sites.recette.test";
    for (const argv of [["next", "start", "-H", "127.0.0.1", "-p", "3000"], ["next", "start", "--hostname=127.0.0.2"], ["next", "start", "--hostname", "::1"], ["next", "start", "-H127.0.0.1"]]) expect(unsupportedSitesHostname(argv, D), argv.join(" ")).not.toBeNull();
    for (const argv of [["next", "start", "-p", "3000"], ["next", "start", "-H", "localhost"], ["next", "start", "-H", "0.0.0.0"], ["next", "start", "--hostname", "studio.exemple.fr"]]) expect(unsupportedSitesHostname(argv, D), argv.join(" ")).toBeNull();
    expect(unsupportedSitesHostname(["next", "start", "-H", "127.0.0.1"], undefined)).toBeNull();
  });
});
