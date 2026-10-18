/** Palettes et persistance réelles ; dessins synthétiques, aucun fournisseur sollicité. */
import { expect, it } from "vitest";
import sharp from "sharp";
import { contrast, hexToRgb } from "@/lib/color";
import { PALETTE_ROLES, directionPaletteIssues, directionSeriesPaletteIssues, palettePresentation } from "@/lib/logo-v2/direction-palette";
import { DirectionIdentitySchema, currentSeries, reserveDirectionSeries, updateDirectionSeries, writeSeries } from "@/lib/logo-v2/direction-series";
import { saveDirectionPreview } from "@/lib/logo-v2/direction-preview";
import { assetData, getAsset } from "@/lib/library";
import { all, json } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { chooseLogoV2 } from "@/lib/logo-v2/choose";
import { fixture } from "./preparation-fixtures";
import { directionIdentity, syntheticDirections, validatedBrand } from "./preparation-mission-fixtures";

const identities = () => [0, 1, 2].map(directionIdentity);
it("refuse le défaut signalé : seules les principales changent, secondaire/accent communs", () => {
  const old = identities().map(d => ({ ...d, palette: { ...d.palette, secondary: "#e3ddcc", accent: "#b47b42" } }));
  const issues = directionSeriesPaletteIssues(old);
  expect(issues.filter(x => /secondary répété/.test(x))).toHaveLength(3);
  expect(issues.filter(x => /accent répété/.test(x))).toHaveLength(3);
});
it("une variation HEX imperceptible ou une nouvelle étiquette ne contourne pas le refus", () => {
  const values = identities();
  values[1].palette.secondary = "#bfd0b5";
  values[1].palette.accent = "#9b4f2d";
  values[1].colorRoles.secondary = "Une autre surface";
  expect(directionSeriesPaletteIssues(values).join("\n")).toMatch(/secondary répété/);
  expect(directionSeriesPaletteIssues(values).join("\n")).toMatch(/accent répété/);
});
it("trois palettes complètes distinctes peuvent partager la même base neutre", () => {
  const values = identities().map(d => ({ ...d, palette: { ...d.palette, light: "#fcfaf5", dark: "#171f20" } }));
  expect(directionSeriesPaletteIssues(values)).toEqual([]);
  for (const value of values) expect(DirectionIdentitySchema.safeParse(value).success).toBe(true);
});
it.each(["secondary", "accent"] as const)("une seule direction ne peut donner la même couleur à primary et %s", role => {
  const d = directionIdentity(); d.palette[role] = d.palette.primary;
  expect(DirectionIdentitySchema.safeParse(d).success).toBe(false);
});
it.each(["light", "dark"] as const)("le rôle %s reste un neutre, pas un accent saturé", role => {
  const d = directionIdentity(); d.palette[role] = role === "light" ? "#ffff00" : "#0000ff";
  expect(directionPaletteIssues(d.palette).join(" ")).toContain(`${role} : une base neutre`);
});
it.each(["primary", "secondary", "accent"] as const)("association réellement utilisée illisible : %s est refusée sans recoloration", role => {
  const d = directionIdentity(); d.palette[role] = role === "primary" ? "#c0c0c0" : "#777777";
  const before = { ...d.palette };
  expect(DirectionIdentitySchema.safeParse(d).success).toBe(false);
  expect(d.palette).toEqual(before);
});
it("les quatre associations réellement rendues atteignent 4.5:1 dans chaque fixture, sans noir/blanc inventé", () => {
  for (const { palette } of identities()) {
    expect(directionPaletteIssues(palette)).toEqual([]);
    const v = palettePresentation(palette);
    for (const [fg, bg] of [[v.text, v.background], [v.heading, v.background], [v.surfaceText, v.surface], [v.buttonText, v.button]]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      expect(Object.values(palette)).toContain(fg); expect(Object.values(palette)).toContain(bg);
    }
  }
});
it("série historique invalide relue comme partielle, sélection refusée, marque/fichiers conservés", async () => {
  const f = await fixture(); const brand = validatedBrand(f.pid, f.input);
  const pack = await syntheticDirections(f.pid), s = reserveDirectionSeries(f.pid, "historical-colours");
  const old = { ...s, territories: pack.territories, directions: pack.directions.map(d => ({ ...d, identity: { ...d.identity, palette: { ...d.identity.palette, secondary: "#e3ddcc", accent: "#b47b42" } } })), status: "complete" as const };
  writeSeries(old); // Reproduit le stockage d'avant ce contrôle, sans normaliser ses données.
  expect(currentSeries(f.pid)?.status).toBe("partial");
  expect(currentSeries(f.pid)?.paletteIssues?.join(" ")).toContain("accent répété");
  const assets = all("SELECT id FROM assets WHERE project_id=?", f.pid);
  await expect(chooseLogoV2(null, f.pid, pack.directions[0].logoId)).rejects.toThrow(/incomplète/);
  expect(loadProject(f.pid).brand).toEqual(brand);
  expect(all("SELECT id FROM assets WHERE project_id=?", f.pid)).toEqual(assets);
  expect(currentSeries(f.pid)?.directions).toHaveLength(3);
});
it("la complétude persistée exige la palette entière, pas uniquement trois fichiers", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input);
  const pack = await syntheticDirections(f.pid), s = reserveDirectionSeries(f.pid, "three-packs");
  updateDirectionSeries(f.pid, s.id, x => { x.territories = pack.territories; x.directions = pack.directions; });
  expect(currentSeries(f.pid)?.status).toBe("complete");
  updateDirectionSeries(f.pid, s.id, x => { x.directions[2].identity.palette.accent = x.directions[1].identity.palette.accent; });
  expect(currentSeries(f.pid)?.status).toBe("partial");
  expect(currentSeries(f.pid)?.paletteIssues?.join(" ")).toMatch(/accent répété/);
});
it("les planches natives appliquent et sauvegardent exactement les cinq couleurs et leurs rôles", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input);
  const { directions } = await syntheticDirections(f.pid);
  for (const d of directions) {
    const id = await saveDirectionPreview(f.pid, f.uid, loadProject(f.pid).brand!.name, d), asset = getAsset(id)!;
    const meta = json<any>(asset.meta, {});
    expect(meta.palette).toEqual(d.identity.palette);
    expect(meta.colorRoles).toEqual(d.identity.colorRoles);
    expect(meta.presentation).toEqual(palettePresentation(d.identity.palette));
    const image = await sharp(assetData(asset)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => Array.from(image.data.subarray((y * image.info.width + x) * 3, (y * image.info.width + x) * 3 + 3));
    expect(pixel(0, 0)).toEqual(hexToRgb(d.identity.palette.light));
    for (const [i, role] of PALETTE_ROLES.entries()) expect(pixel(80 + i * 248, 810), role).toEqual(hexToRgb(d.identity.palette[role]));
    expect(pixel(80, 1031)).toEqual(hexToRgb(d.identity.palette.secondary));
    // CTA et titre doivent réellement exister dans les pixels, pas seulement dans les métadonnées.
    for (const role of ["primary", "accent", "dark"] as const) {
      const rgb = hexToRgb(d.identity.palette[role]); let count = 0;
      for (let p = 960 * image.info.width * 3; p < image.data.length; p += 3) if (rgb.every((v, i) => v === image.data[p + i])) count++;
      expect(count, role).toBeGreaterThan(250);
    }
  }
}, 60000);
