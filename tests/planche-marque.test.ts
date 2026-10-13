/**
 * Planche d'identité de marque « comme en agence » : un seul système (logo, secondaire, sceau, couleurs nommées,
 * typographies, icônes du métier, motif, applications) construit sans IA autour du logo choisi, versionnée, reprise
 * en page 2 de la charte, et refaite à la demande depuis le studio.
 */
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});

describe("Planche d'identité de marque", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { saveAsset, getAsset, assetData } = await import("@/lib/library");
  const { logoPng } = await import("@/lib/media/logo");
  const { brandColorName, knockoutWhite, renderIdentityBoard, BRAND_RULES } = await import("@/lib/media/identity-board");
  const { boardIcons, saveIdentityBoard } = await import("@/lib/engine/identity-board");
  const { saveBrandBook } = await import("@/lib/engine/brand");
  const { all } = await import("@/lib/db");
  const route = await import("@/app/api/projects/[id]/brand/board/route");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const setup = async () => {
    const u = await createUser(`planche${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "artisan");
    sessionUser = { ...u, role: "client" };
    return { u, pid };
  };
  const addLogo = async (pid: string, userId: string) =>
    saveAsset({ projectId: pid, userId, data: await logoPng({ name: "Atelier Lumière", family: "Cormorant", weight: 500, case: "upper", tracking: 0.1, layout: "lockup", emblem: "none", symbol: "scissors", color: "#231A1C", accent: "#C79A5B" }, 1200), name: "logo.png", mime: "image/png", role: "logo", folderKey: "brand.logos", origin: "generated", meta: {} });

  it("couleurs nommées comme sur une planche d'agence (descriptif, sans nuancier inventé)", () => {
    expect(brandColorName("#B08D57")).toBe("Or doux");
    expect(brandColorName("#F4EFE7")).toBe("Crème");
    expect(brandColorName("#231A1C")).toBe("Noir d'encre");
    expect(brandColorName("#3A3A3A")).toBe("Anthracite");
    expect(brandColorName("#2F4A43")).toBe("Vert sapin");
    expect(brandColorName("#7A3E48", "en")).toBe("Red");
    expect(BRAND_RULES.length).toBeGreaterThanOrEqual(5);
  });

  it("icônes : celles du métier d'abord, puis des icônes utiles au client, toutes du même style", () => {
    const icons = boardIcons("coiffeuse salon de coiffure", "services");
    expect(icons).toHaveLength(6);
    expect(icons[0]).toMatch(/scissors|comb|brush/);
    expect(icons.some((n) => /^file-/.test(n))).toBe(false);
    expect(boardIcons("", "products")).toEqual(["truck", "shield-check", "gift", "heart", "leaf", "sparkles"]);
  });

  it("logo sur fond blanc : le fond devient transparent (sinon le logo blanc sur couleur serait un carré)", async () => {
    const flat = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#FFFFFF" } }).composite([{ input: await sharp({ create: { width: 10, height: 10, channels: 3, background: "#222222" } }).png().toBuffer(), left: 15, top: 5 }]).png().toBuffer();
    const out = await sharp(await knockoutWhite(flat)).raw().toBuffer();
    expect(out[3]).toBe(0); // coin blanc → transparent
    expect(out[(10 * 40 + 20) * 4 + 3]).toBe(255); // dessin conservé
  });

  it("rendu complet produit et service (grille 2400 px), sans photo comme avec de vraies photos", async () => {
    const logo = await logoPng({ name: "Aurévo", family: "Cormorant", weight: 500, case: "upper", tracking: 0.1, layout: "lockup", emblem: "none", symbol: "drop", color: "#1D2724", accent: "#B08D57" }, 1000);
    const photo = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#8899AA" } }).jpeg().toBuffer();
    const palette = { primary: "#2F4A43", secondary: "#C9B79C", accent: "#B08D57", light: "#F4EFE7", dark: "#1D2724" };
    for (const business of ["products", "services"] as const) {
      const png = await fr(() => renderIdentityBoard({ name: "Aurévo", tagline: "La peau, en douceur", business, logo, palette, fonts: { heading: "Cormorant", body: "Jost" }, icons: boardIcons("", business), photos: business === "services" ? [photo] : [] }));
      const m = await sharp(png).metadata();
      expect(m.width).toBe(2400);
      expect(m.height).toBeGreaterThan(1800);
    }
  }, 60_000);

  it("après le logo : planche enregistrée, nouvelle version à chaque refonte, reprise en page 2 de la charte ; route du studio", async () => {
    const { u, pid } = await setup();
    // Sans logo : la route l'explique au lieu d'échouer.
    const post = () => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${pid}/brand/board`, { method: "POST" }), { params: Promise.resolve({ id: pid }) } as any));
    const logoAssets = all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo' AND mime = 'image/png' AND deleted_at IS NULL", pid);
    if (!logoAssets.length) expect((await post()).status).toBe(409);
    await addLogo(pid, u.id);
    const a = (await fr(() => saveIdentityBoard(pid)))!;
    expect(a.role).toBe("brand-board");
    expect((await sharp(assetData(a)).metadata()).width).toBe(2400);
    const res = await post();
    expect(res.status).toBe(200);
    const second = getAsset((await res.json()).board.id)!;
    expect(second.version_of).toBe(a.id);
    const book = (await fr(() => saveBrandBook(pid)))!;
    const pages = all<{ id: string; meta: string }>("SELECT id, meta FROM assets WHERE project_id = ? AND role = 'brand-book-page' AND source_asset_id = ?", pid, book.id);
    const meta = JSON.parse(all<{ meta: string }>("SELECT meta FROM assets WHERE id = ?", book.id)[0].meta);
    expect(pages.length).toBe(meta.pages);
    expect(meta.pages).toBeGreaterThanOrEqual(11);
  }, 120_000);
});
