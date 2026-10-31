/**
 * SYNA lot 0 (#282) : les fondations sont enfermées. Rien ne s'applique hors du conteneur `.syna-ui`, aucun écran du
 * Studio ne les utilise encore, les primitives ne font aucune requête, et la vitrine interne est fermée en production.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { synaVitrineEnabled, parseSynaVitrineParams } from "@/lib/syna-ui/vitrine";
import { SYNA_CSS, VITRINE_CSS, readCss } from "./syna-lot0-css";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
function walk(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : /\.(tsx?|css|mjs)$/.test(e.name) ? [rel] : [];
  });
}

describe.each([["syna.css", SYNA_CSS], ["vitrine.css", VITRINE_CSS]])("%s reste enfermé dans .syna-ui", (_name, file) => {
  const sheet = readCss(file);
  it("chaque sélecteur passe par .syna-ui, sans combinateur de voisin", () => {
    expect(sheet.rules.length).toBeGreaterThan(10);
    const leaks = sheet.rules.flatMap((r) => r.selectors).filter((s) => !s.includes(".syna-ui") || /\.syna-ui[^\s,]*\s*[~+]/.test(s));
    expect(leaks).toEqual([]);
  });
  it("aucun style sur html, body, :root ou * seuls, aucun @import", () => {
    const bare = sheet.rules.flatMap((r) => r.selectors).filter((s) => /^(html|body|:root|\*)(\s|$|\[|:)/.test(s) && !s.includes(".syna-ui"));
    expect(bare).toEqual([]);
    expect(sheet.imports).toEqual([]);
  });
  it("animations préfixées sy-", () => {
    for (const k of sheet.keyframes) expect(k).toMatch(/^@keyframes sy-/);
  });
});

describe("polices", () => {
  const sheet = readCss(SYNA_CSS);
  it("déclarées sous des noms propres à SYNA, fichiers présents, licence OFL jointe", () => {
    expect(sheet.fontFaces.length).toBe(6);
    for (const f of sheet.fontFaces) {
      expect(f).toMatch(/font-family:\s*"Syna [^"]+"/);
      const url = /url\("([^"]+)"\)/.exec(f)![1];
      expect(url).toMatch(/^\/(syna\/fonts\/[\w-]+|fonts\/bricolage)\.woff2$/);
      expect(fs.existsSync(path.join(root, "public", url)), url).toBe(true);
    }
    const ofl = read("public/syna/fonts/OFL.txt");
    expect(ofl).toContain("SIL OPEN FONT LICENSE Version 1.1");
    for (const name of ["Newsreader", "Geist", "Onest", "Bricolage"]) expect(ofl).toContain(name);
  });
});

describe("aucun écran actuel n'est touché", () => {
  const allowed = [/^src\/components\/syna\//, /^src\/lib\/syna-ui\//, /^src\/app\/syna-fondations\//];
  it("seules la vitrine et les fondations importent les primitives SYNA", () => {
    const users = walk("src").filter((f) => !allowed.some((a) => a.test(f.split(path.sep).join("/")))).filter((f) => /components\/syna["/]|lib\/syna-ui|syna\.css/.test(read(f)));
    expect(users).toEqual([]);
  });
  it("les variables globales du Studio ne contiennent rien de SYNA", () => {
    const g = read("src/app/globals.css");
    expect(g).not.toMatch(/--sy-|syna-ui|Syna /);
  });
  it("les primitives sont présentatives : ni requête, ni stockage, ni euros", () => {
    for (const f of walk("src/components/syna").concat(walk("src/lib/syna-ui"))) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|useApi|document\.cookie|€|EUR\b/);
    }
  });
});

describe("vitrine interne", () => {
  it("fermée en production sauf demande explicite", () => {
    expect(synaVitrineEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(synaVitrineEnabled({ NODE_ENV: "production", SYNA_VITRINE: "1" })).toBe(true);
    expect(synaVitrineEnabled({ NODE_ENV: "development" })).toBe(true);
  });
  it("ne garde que les paramètres connus", () => {
    expect(parseSynaVitrineParams({ mode: "plein", appearance: "dark", accent: "prusse", text: "large", view: "conversation", lang: "en", width: "999", x: "y" }))
      .toEqual({ mode: "plein", appearance: "dark", accent: "prusse", textSize: "large", convoWidth: 560, view: "conversation", lang: "en" });
    expect(parseSynaVitrineParams({ mode: "rose", appearance: ["light", "dark"] })).toEqual({ appearance: "light", view: undefined, lang: undefined });
  });
  it("la page est exclue des moteurs de recherche", () => {
    expect(read("src/app/syna-fondations/page.tsx")).toMatch(/robots: \{ index: false, follow: false \}/);
  });
});
