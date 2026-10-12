/**
 * Palette verrouillée par direction : chacune des 30 directions a SES couleurs (vraiment différentes, lisibles) ;
 * choisir une direction les applique à toute la marque ; les vraies couleurs d'un client ne sont jamais perdues.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIRECTION_PALETTES, directionPalette, lockedPalette, paletteFor } from "@/lib/theme/direction-palettes";
import { colorSchemes, DIRECTIONS } from "@/lib/theme/directions";
import { paletteIssues } from "@/lib/engine/brand-check";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

describe("30 palettes de direction", () => {
  it("une palette par direction, lisible (contrôles de la marque)", () => {
    expect(Object.keys(DIRECTION_PALETTES).sort()).toEqual(DIRECTIONS.map((d) => d.id).sort());
    for (const [id, p] of Object.entries(DIRECTION_PALETTES)) expect(paletteIssues(p), id).toEqual([]);
  });

  it("vraiment différentes : deux directions n'ont jamais la même principale ET le même accent", () => {
    const ids = Object.keys(DIRECTION_PALETTES) as (keyof typeof DIRECTION_PALETTES)[];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = DIRECTION_PALETTES[ids[i]];
        const b = DIRECTION_PALETTES[ids[j]];
        // Accents nettement différents, ou principales nettement différentes (au moins l'une des deux couleurs fortes).
        expect(Math.max(dist(a.accent, b.accent), dist(a.primary, b.primary)), `${ids[i]} / ${ids[j]}`).toBeGreaterThan(60);
      }
    // Les couleurs du site (schémas) changent d'une direction à l'autre.
    const schemes = new Set(DIRECTIONS.map((d) => JSON.stringify(colorSchemes(d.id, directionPalette(d.id)))));
    expect(schemes.size).toBe(DIRECTIONS.length);
  });

  it("palette d'une marque : verrouillée par la direction, vos couleurs gardées, ancienne marque inchangée", () => {
    const old = { primary: "#123456", secondary: "#DDDDDD", accent: "#FF8800", light: "#FAFAFA", dark: "#111111" };
    // Ancienne marque (sans verrou) : rien ne change pour sa direction actuelle ; les autres montrent leurs couleurs.
    expect(paletteFor({ palette: old, direction: "nocturne" })).toEqual(old);
    expect(paletteFor({ palette: old, direction: "nocturne" }, "pop")).toEqual(DIRECTION_PALETTES.pop);
    // Verrouillée : toujours la palette de la direction.
    expect(paletteFor({ palette: directionPalette("brut"), direction: "brut", paletteMode: "direction" })).toEqual(DIRECTION_PALETTES.brut);
    // Couleurs du client : les siennes dans sa direction, celles de la direction ailleurs.
    const client = { palette: old, clientPalette: old, direction: "atelier" as const, paletteMode: "client" as const };
    expect(paletteFor(client)).toEqual(old);
    expect(paletteFor(client, "galerie")).toEqual(DIRECTION_PALETTES.galerie);
    // Changer de direction : palette de la direction ; les couleurs du client restent en réserve.
    const moved = lockedPalette(client, { direction: "pop" })!;
    expect(moved.palette).toEqual(DIRECTION_PALETTES.pop);
    expect(moved.clientPalette).toEqual(old);
    expect(lockedPalette({ ...client, ...moved, direction: "pop" }, { paletteMode: "client" })!.palette).toEqual(old);
    // Ancienne marque avec le logo ou le site du client : sa palette devient « Vos couleurs » avant d'être remplacée.
    expect(lockedPalette({ palette: old, direction: "atelier" }, { direction: "pop", hasClientLogo: true })!.clientPalette).toEqual(old);
    expect(lockedPalette({ palette: old, direction: "atelier" }, { direction: "pop" })!.clientPalette).toBeUndefined();
    // Rien ne change : null.
    expect(lockedPalette(client, {})).toBeNull();
  });
});

describe("Choisir une direction applique ses couleurs partout", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject, saveBrand, saveSettings } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { composedDirectionSpec } = await import("@/lib/theme/direction-thumb");
  const { adoptDirection } = await import("@/lib/engine/brand-direction");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const route = await import("@/app/api/projects/[id]/brand/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const patch = (pid: string, body: object) => fr(() => route.PATCH(new Request(`http://localhost:3000/api/projects/${pid}/brand`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any));

  it("vignettes : chaque direction est montrée avec ses propres couleurs", async () => {
    const u = await createUser(`pald${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "artisan");
    const a = await composedDirectionSpec(pid, "pop", "fr");
    const b = await composedDirectionSpec(pid, "velours", "fr");
    const sa = JSON.stringify(a.settings.color_schemes).toUpperCase();
    const sb = JSON.stringify(b.settings.color_schemes).toUpperCase();
    expect(sa).not.toBe(sb);
    expect(sa).toContain(DIRECTION_PALETTES.pop.primary.toUpperCase());
    expect(sb).toContain(DIRECTION_PALETTES.velours.accent.toUpperCase());
  }, 60_000);

  it("site importé : vos couleurs gardées, une autre direction prend les siennes, retour possible", async () => {
    const u = await createUser(`palc${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "dominer");
    const mine = { primary: "#7A1F2B", secondary: "#E9DCCB", accent: "#C4933F", light: "#FBF8F3", dark: "#1C1416" };
    const p = loadProject(pid);
    saveSettings(pid, { ...p.settings, existingSite: { url: "https://exemple.fr", status: "done" } as any });
    saveBrand(pid, { ...p.brand!, direction: "atelier", palette: mine, paletteMode: "client", clientPalette: mine });
    // Couleurs du client : pas de modification à la main non plus.
    expect((await patch(pid, { palette: { ...mine, accent: "#00FF00" } })).status).toBe(409);
    expect((await patch(pid, { direction: "signal" })).status).toBe(200);
    let b = loadProject(pid).brand!;
    expect(b.palette).toEqual(DIRECTION_PALETTES.signal);
    expect(b.clientPalette).toEqual(mine);
    expect((await patch(pid, { paletteMode: "client" })).status).toBe(200);
    b = loadProject(pid).brand!;
    expect(b.palette).toEqual(mine);
    expect(b.paletteMode).toBe("client");
  }, 60_000);

  it("direction appliquée depuis la Boutique ou la discussion : la marque la suit (palette, mode)", async () => {
    const u = await createUser(`pals${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "artisan");
    const from = loadProject(pid).brand!.direction;
    const to = from === "jardin" ? "horizon" : "jardin";
    expect(await adoptDirection(pid, to)).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.direction).toBe(to);
    expect(b.palette).toEqual(DIRECTION_PALETTES[to]);
    expect(await adoptDirection(pid, to)).toBe(false);
  }, 60_000);
});
