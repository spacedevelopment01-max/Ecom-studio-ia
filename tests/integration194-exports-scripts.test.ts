/**
 * Intégration #194 — exports CMS sans script dans les contenus (constat de Codex, PR #196, commentaire 6409417245) :
 * PrestaShop rejetait TABLE SAISON, ATELIER NUANCE et PARENTHÈSE (balises des scripts du thème dans l'en-tête), et
 * APLAT (petit script du formulaire). Les scripts du thème restent exécutés (assets/js/es-theme.js) ; tout autre
 * script dans un contenu reste refusé. Données de démonstration fictives, aucun réseau, aucune installation de CMS.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { createUser } from "@/lib/auth";
import { saveThemeVersion } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { cmsExport, checkCmsExport } from "@/lib/cms-v2/export";
import { executableContentScript } from "@/lib/cms-v2/checks";
import { toSmarty } from "@/lib/cms-v2/adapters/prestashop";
import { libraryLoader } from "@/lib/theme/loader";
import { demoProject } from "./demo-fixtures";

let uid = "";
beforeAll(async () => {
  vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); });
  uid = (await createUser(`integ194-exports-${Date.now()}@example.invalid`, "isolated-test-only", "Exports")).id;
});

describe("exports PrestaShop des thèmes à scripts propres", () => {
  for (const theme of ["table-saison", "atelier-nuance", "parenthese", "aplat"] as const) {
    it(`${theme} : export non rejeté, aucun script exécutable dans les gabarits, scripts du thème livrés`, async () => {
      await runWithLang({ content: "fr", ui: "fr" }, async () => {
        const f = await demoProject(uid, theme as never);
        saveThemeVersion(f.pid, f.spec, "Export #194", "user");
        const ex = await cmsExport("prestashop", f.spec, libraryLoader, { projectId: f.pid });
        const c = await checkCmsExport("prestashop", ex, f.spec, { projectId: f.pid });
        expect(c.static.codes).not.toContain("dangerous_script");
        expect((c.gate.decision as { verdict: string }).verdict).not.toBe("REJECTED");
        const z = unzipSync(new Uint8Array(ex.zip));
        const tpl = Object.entries(z).filter(([n]) => /^templates\/es\/.+\.tpl$/.test(n));
        expect(tpl.length).toBeGreaterThan(0);
        for (const [n, d] of tpl) expect(executableContentScript(strFromU8(d)), n).toBe(false);
        const bundle = strFromU8(z["assets/js/es-theme.js"]);
        const own = theme === "aplat" ? "aplat.js" : `${theme}.js`;
        const src = fs.readFileSync(path.join("theme-base/assets", own), "utf8");
        expect(bundle).toContain(src.slice(0, 200));
      });
    }, 120_000);
  }
});

describe("garde-fous conservés", () => {
  it("seules les balises des scripts du thème déjà livrés sont retirées ; tout autre script reste et est refusé", () => {
    const bundled = new Set(["table-saison.js"]);
    const html = '<div><script src="/assets/table-saison.js" defer="defer"></script><script src="/assets/autre.js"></script><script>alert(1)</script><script type="application/json" id="cfg">{"a":1}</script></div>';
    const out = toSmarty(html, "theme-genere", bundled);
    expect(out).not.toContain("table-saison.js");
    expect(out).toContain("autre.js");
    expect(out).toContain("alert(1)");
    expect(out).toContain('{"a":1}');
    expect(executableContentScript(out)).toBe(true);
    expect(executableContentScript(toSmarty('<script src="/assets/table-saison.js"></script><script type="application/json">{"a":1}</script>', "t", bundled))).toBe(false);
    // Sans liste de scripts livrés (appel par défaut), rien n'est retiré.
    expect(toSmarty('<script src="/assets/table-saison.js"></script>', "t")).toContain("table-saison.js");
  });

  it("APLAT : le formulaire n'emporte plus qu'un bloc de données JSON (démonstration et site publié)", () => {
    const liquid = fs.readFileSync("theme-base/sections/ap-form.liquid", "utf8");
    const tags = [...liquid.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t).toMatch(/type="application\/json"/);
    const js = fs.readFileSync("theme-base/assets/aplat.js", "utf8");
    expect(js).toContain("data-ap-form-config");
  });
});
