/**
 * Changer seulement la palette sur la piste retenue : la même piste (même dessin) est recolorée et tout suit —
 * logo, bannières du site, charte — sans toucher aux autres pistes ; un logo validé le reste.
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { all, id, now, run } from "@/lib/db";
import { runWithLang } from "@/lib/i18n-server";
import { localBrand } from "@/lib/engine/local";
import { loadProject, saveBrand } from "@/lib/projects";
import { getAsset } from "@/lib/library";
import { effectivePalette, paletteKey, paletteSources } from "@/lib/route-palette";
import { serviceProduct, serviceProfile } from "./fixtures";

const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

async function setup(tag: string) {
  const u = await createUser(`pal${tag}${Date.now()}@test.fr`, "motdepasse-test", "P");
  const product = { ...serviceProduct, name: "AutoDim", summary: "Carrosserie et peinture automobile à Mâcon." };
  const services = { ...serviceProfile, contactMode: "call" as const, bookingUrl: "" };
  const { brand, strategy } = localBrand(product, "AutoDim", { business: "services", services } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "AutoDim", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
  );
  const identity = await import("@/lib/engine/identity");
  await identity.generateLogos(null, pid, { routeAi: null });
  return { pid, identity };
}

/** Nouvelle palette : la couleur d'accent de la piste retenue passe au rouge. */
function changeAccent(pid: string) {
  const p = loadProject(pid);
  const old = { ...p.brand!.palette };
  const src = paletteSources(p.brand);
  const next = { ...old, [src.accent]: "#C0392B" };
  saveBrand(pid, { ...p.brand!, palette: next });
  return { old, accentRole: src.accent };
}

describe("palette de la piste retenue", () => {
  it("même piste recolorée, appliquée partout, autres pistes intactes, validation conservée", async () => {
    await fr(async () => {
      const { pid, identity } = await setup("a");
      const before = loadProject(pid).brand!;
      saveBrand(pid, { ...before, logo: { ...before.logo, status: "validated" } });
      const props = identity.latestProposals(pid);
      const chosenKey = before.logo.route!.key;
      const others = props.filter((x) => x.id !== before.logo.proposalId).map((x) => x.id);
      const oldLogo = before.logo.assetId;
      const { old, accentRole } = changeAccent(pid);
      const t0 = Date.now();
      expect(await identity.recolorChosenRoute(pid, old)).toBe(true);

      const p = loadProject(pid);
      const route = p.brand!.logo.route!;
      // Même piste (même famille, mêmes typographies), aux nouvelles couleurs.
      expect(route.key).toBe(chosenKey);
      expect(route.heading).toBe(before.logo.route!.heading);
      expect(route.colors.accent.toUpperCase()).toBe(p.brand!.palette[accentRole].toUpperCase());
      expect(p.brand!.logo.assetId).not.toBe(oldLogo);
      expect(p.brand!.logo.status).toBe("validated");
      // Autres pistes intactes ; la piste retenue garde sa place (même nombre, même ordre de familles).
      const after = identity.latestProposals(pid);
      expect(after.map((x) => x.info.key)).toEqual(props.map((x) => x.info.key));
      for (const o of others) expect(after.some((x) => x.id === o)).toBe(true);
      expect(after.find((x) => x.id === p.brand!.logo.proposalId)!.info.route.colors.accent.toUpperCase()).toBe("#C0392B");
      // Charte refaite et bannières du site aux nouvelles couleurs.
      const book = all<{ created_at: number }>("SELECT created_at FROM assets WHERE project_id = ? AND role = 'brand-book' ORDER BY created_at DESC LIMIT 1", pid)[0];
      expect(book.created_at).toBeGreaterThanOrEqual(t0);
      const { collectImages } = await import("@/lib/engine/shop");
      const { slots, files } = collectImages(pid);
      expect(JSON.parse(getAsset(files[slots.banner!])!.meta).palette).toBe(paletteKey(effectivePalette(p.brand)!));
    });
  }, 180_000);

  it("piste ancienne sans rôles enregistrés : couleurs retrouvées dans l'ancienne palette", async () => {
    await fr(async () => {
      const { pid, identity } = await setup("b");
      const b = loadProject(pid).brand!;
      const row = identity.latestProposals(pid).find((x) => x.id === b.logo.proposalId)!;
      const { roles: _r, ...noRoles } = row.info.route;
      run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ ...row.info, route: noRoles }), row.id);
      const { roles: _b, ...brandRoute } = b.logo.route!;
      saveBrand(pid, { ...b, logo: { ...b.logo, route: brandRoute as any } });
      const { old } = changeAccent(pid);
      expect(await identity.recolorChosenRoute(pid, old)).toBe(true);
      expect(loadProject(pid).brand!.logo.route!.colors.accent.toUpperCase()).toBe("#C0392B");
    });
  }, 180_000);
});
