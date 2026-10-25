/** Export statique des démos (#194) : ressources embarquées par l'aperçu du lot 9 remises en fichiers partagés. */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { staticDeinliner, MIN_INLINE_FILE } from "../scripts/static-deinline";

const big = (seed: string) => Buffer.from(seed.repeat(Math.ceil((MIN_INLINE_FILE * 2) / seed.length)));
const uri = (mime: string, data: Buffer) => `data:${mime};base64,${data.toString("base64")}`;

describe("export statique : data: → assets/inline-*", () => {
  it("une image répétée dans plusieurs pages et réponses JSON devient UN fichier relatif, contenu identique", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deinline-"));
    const img = big("image-webp-fictive-");
    const { deinline, written } = staticDeinliner(dir);
    const page = deinline(`<img src="${uri("image/webp", img)}"><img src="${uri("image/webp", img)}">`);
    const json = JSON.parse(deinline(JSON.stringify({ "cart-drawer": `<img src="${uri("image/webp", img)}">` })));
    expect(written.size).toBe(1);
    const [name] = [...written];
    expect(name).toMatch(/^inline-[0-9a-f]{20}\.webp$/);
    expect(page).toBe(`<img src="assets/${name}"><img src="assets/${name}">`);
    expect(json["cart-drawer"]).toBe(`<img src="assets/${name}">`);
    expect(fs.readFileSync(path.join(dir, name))).toEqual(img);
  });

  it("feuille embarquée : ses polices sont écrites à côté d'elle (chemin relatif à la feuille)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deinline-"));
    const font = big("police-ttf-fictive-");
    const css = Buffer.from(`@font-face{src:url(${uri("font/ttf", font)})}body{color:#123}` + "/*".padEnd(MIN_INLINE_FILE * 2, "x") + "*/");
    const { deinline, written } = staticDeinliner(dir);
    const html = deinline(`<link rel="stylesheet" href="${uri("text/css", css)}">`);
    const files = [...written];
    const cssName = files.find((f) => f.endsWith(".css"))!, fontName = files.find((f) => f.endsWith(".ttf"))!;
    expect(html).toBe(`<link rel="stylesheet" href="assets/${cssName}">`);
    expect(fs.readFileSync(path.join(dir, cssName), "utf8")).toContain(`url(${fontName})`);
    expect(fs.readFileSync(path.join(dir, fontName))).toEqual(font);
  });

  it("très petites ressources et types non servis par le studio : laissés dans la page", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deinline-"));
    const { deinline, written } = staticDeinliner(dir);
    const tiny = uri("image/png", Buffer.from("petit"));
    const other = uri("application/x-inconnu", big("inconnu-"));
    expect(deinline(`<img src="${tiny}"><a href="${other}">`)).toBe(`<img src="${tiny}"><a href="${other}">`);
    expect(written.size).toBe(0);
  });
});
