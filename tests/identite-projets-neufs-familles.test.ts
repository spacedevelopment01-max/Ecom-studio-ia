/**
 * Identité automatique des sections de bibliothèque sur des projets NEUFS (issue #145) : pour chaque famille, deux
 * marques de contrôle (fictives, sans lien avec les démonstrations) composées dans le thème de leur famille ; TOUTES
 * les dispositions sont insérées par la vraie route « Ajouter une section ». Vérifié :
 *  - aucun contenu de démonstration (FRAISE, ONDE, ORBE, Atelier Rive, « Exemple ») ni de l'autre marque ;
 *  - seules les images du projet (aucune image d'un autre projet ni du kit de démonstration) ;
 *  - nom, produit ou prestations, coordonnées et palette du projet repris sans réglage manuel ;
 *  - une information inconnue est signalée « [À compléter : …] » (jamais inventée) ;
 *  - changement de disposition : les retouches explicites (titre, texte, réglages de style communs) sont gardées.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/identite-neufs-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
const jar = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import { createUser } from "@/lib/auth";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { getAsset } from "@/lib/library";
import { renderPage } from "@/lib/theme/render";
import { FAMILY_LIBRARY, libraryId } from "@/lib/theme/section-families";
import { sectionIncompatibility } from "@/lib/theme/section-compat";
import { run } from "@/lib/db";
import { CONTROL_BRANDS, DEMO_WORDS, controlProject } from "./control-brands-fixtures";
import { POST as addSection } from "@/app/api/projects/[id]/theme/sections/route";
import { POST as opsRoute } from "@/app/api/projects/[id]/theme/ops/route";
import { POST as dispositionRoute } from "@/app/api/projects/[id]/theme/disposition/route";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) }) as never;
const post = (body: unknown) => new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });
async function login(userId: string) {
  const token = `tok-id-${userId}-${Math.random()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), userId, Date.now() + 3600_000, Date.now());
  jar.token = token;
}

describe("identité automatique sur des projets neufs : deux marques par famille, toutes les dispositions", async () => {
  const user = await createUser("identite-neufs@example.invalid", "isolated-test-only", "Identité");
  await login(user.id);

  for (const family of ["specialty", "catalog", "services"] as const) {
    it(`${family} : chaque disposition prend l'identité du projet, sans contenu de démonstration ni d'une autre marque`, async () => {
      const pages: Record<string, string[]> = {};
      const pids: string[] = [];
      for (const b of CONTROL_BRANDS[family].brands) {
        const pid = await fr(() => controlProject(user.id, family, b));
        pids.push(pid);
        // Une page par fonction, toutes ses dispositions insérées par la route de la galerie.
        const spec = structuredClone(currentTheme(pid)!.spec);
        for (const e of FAMILY_LIBRARY[family]) {
          const key = `ctl-${e.n}`;
          spec.templates[`page.${key}`] = { sections: {}, order: [] };
          spec.store.pages = [...spec.store.pages, { handle: key, title: key, template_suffix: key, body_html: "" }];
        }
        saveThemeVersion(pid, spec, "Pages de contrôle", "user");
        for (const e of FAMILY_LIBRARY[family]) for (const d of e.dispositions) {
          // Dispositions réservées à un autre thème (immobilier Maison & Horizon, sections « cv- » de SOUPLE et « on- » d'ONDE
          // dans la famille E-commerce) : la route les refuse, la galerie les masque.
          const why = sectionIncompatibility(spec, d.type, family);
          if (why) { expect(d.type, why).toMatch(/^(re-|cv-|on-)/); continue; }
          const r = await fr(() => addSection(post({ type: libraryId(e, d), template: `page.ctl-${e.n}` }), ctx(pid)));
          expect(r.status, `${b.name} ${e.key}~${d.id} : ${r.status === 200 ? "" : JSON.stringify(await r.clone().json())}`).toBe(200);
        }
        const cur = currentTheme(pid)!.spec;
        pages[pid] = [];
        for (const e of FAMILY_LIBRARY[family]) {
          const html = (await fr(() => renderPage({ spec: cur, base: "", cart: [] }, `/pages/ctl-${e.n}`, new URLSearchParams()))).html;
          const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
          pages[pid].push(main);
          // Images : uniquement celles du projet (fichiers du thème → médias de CE projet).
          for (const m of main.matchAll(/(?:src|srcset)="\/assets\/([^"?\s]+)/g)) {
            const file = decodeURIComponent(m[1]);
            const assetId = cur.files[file];
            if (assetId) expect(getAsset(assetId)?.project_id, `${b.name} ${e.key} : ${file}`).toBe(pid);
          }
          expect(main, `${b.name} ${e.key}`).not.toMatch(/\/demo\//);
        }
      }
      const [a, b] = CONTROL_BRANDS[family].brands;
      for (const [i, brand] of [a, b].entries()) {
        const other = i === 0 ? b : a, all = pages[pids[i]].join("\n");
        for (const w of DEMO_WORDS) expect(all, `${brand.name} : ${w}`).not.toMatch(w);
        expect(all, `${brand.name} contient ${other.name}`).not.toContain(other.name);
        expect(all, `${brand.name} contient ${other.product}`).not.toContain(other.product);
        // Le projet est repris (nom, produit ou prestation) dans les pages, sans saisie.
        const own = pages[pids[i]].filter((h) => h.includes(brand.name) || h.includes(brand.product) || (brand.services ?? []).some((s) => h.includes(s.name))).length;
        expect(own, `${brand.name} : pages qui citent le projet`).toBeGreaterThanOrEqual(5);
        // Ce que le projet ne dit pas est signalé, jamais inventé.
        expect(all).toMatch(/À compléter/);
      }
      // Style du projet : palettes (schémas de couleurs) propres à chaque marque.
      expect(JSON.stringify(currentTheme(pids[0])!.spec.settings.color_schemes)).not.toBe(JSON.stringify(currentTheme(pids[1])!.spec.settings.color_schemes));
    }, 600_000);
  }

  it("changement de disposition : titre, texte et réglages de style choisis par l'utilisateur sont gardés", async () => {
    const pid = await fr(() => controlProject(user.id, "catalog", CONTROL_BRANDS.catalog.brands[0]));
    // Une fonction dont les dispositions passent d'une section du thème à une autre (conversion du contenu).
    // Seules comptent les sections que le thème installé sait rendre (les sections « cv- » de SOUPLE lui sont refusées).
    const installed = currentTheme(pid)!.spec;
    const usable = (e: (typeof FAMILY_LIBRARY.catalog)[number]) => e.dispositions.filter((d) => !sectionIncompatibility(installed, d.type, "catalog"));
    const entry = FAMILY_LIBRARY.catalog.find((e) => new Set(usable(e).map((d) => d.type)).size > 1 && e.key !== "catalog.featured")!;
    const [d1, d2] = [usable(entry)[0], usable(entry).find((d) => d.type !== usable(entry)[0].type)!];
    expect((await fr(() => addSection(post({ type: libraryId(entry, d1), template: "index", index: 1 }), ctx(pid)))).status).toBe(200);
    const sid = currentTheme(pid)!.spec.templates.index.order[1];
    const ops = [
      { op: "set_setting", template: "index", section: sid, key: "heading", value: "Titre choisi par le client" },
      { op: "set_setting", template: "index", section: sid, key: "padding_top", value: 24 },
    ];
    expect((await fr(() => opsRoute(post({ ops }), ctx(pid)))).status).toBe(200);
    expect((await fr(() => dispositionRoute(post({ template: "index", section: sid, disposition: d2.id }), ctx(pid)))).status).toBe(200);
    const s = currentTheme(pid)!.spec.templates.index.sections[sid];
    expect(s.type).toBe(d2.type);
    expect(s.settings.heading).toBe("Titre choisi par le client");
    expect(s.settings.padding_top, `${entry.key} ${d1.type} → ${d2.type}`).toBe(24);
  }, 240_000);
});
