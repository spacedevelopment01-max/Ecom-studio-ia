/**
 * MAISON & HORIZON (issue #172) : le thème immobilier et ses biens.
 *  - un bien saisi dans l'onglet « Biens » apparaît sur l'accueil, la page Acheter et sa fiche SANS modifier le thème
 *    (fichiers compilés identiques avant et après) ; retiré, il disparaît ; vendu, il reste avec la mention ;
 *  - un brouillon se prévisualise seul, sans être publié ;
 *  - formulaires honnêtes : en démonstration, rien n'est envoyé et la page le dit ; aucun prix d'estimation calculé ;
 *  - carte illustrative : repères seulement pour les biens placés, mention « Carte illustrative » ;
 *  - sections « re- » réservées à ce thème ; fiche et pages communes rendues sans erreur Liquid ;
 *  - démonstration complète (kit privé de Thomas, sauté s'il est absent) : 27 biens, aucune photo partagée entre deux
 *    biens, toutes les pages rendues.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { saveAsset } from "@/lib/library";
import { createBien, listBiens, setBienStatus, storeBiens, withBiens } from "@/lib/biens";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { sectionFitReason } from "@/lib/theme/section-fit";
import { runWithLang } from "@/lib/i18n-server";
import { cmsExport } from "@/lib/cms-v2/export";
import { unzipSync, strFromU8 } from "fflate";
import type { ThemeSpec } from "@/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { curateMaisonHorizon, MH_BIENS, MH_DIR, MH_MEDIA, MH_UNUSED, maisonHorizonProject } from "./maison-horizon-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const jpeg = (color: string) => sharp({ create: { width: 96, height: 64, channels: 3, background: color } }).jpeg().toBuffer();
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const kit = fs.existsSync(path.join(MH_DIR, "accueil-hero.webp"));

/** Projet de services composé dans le thème « maison-horizon » avec la rédaction de la démonstration, sans photos. */
async function bareProject(label: string) {
  const user = await createUser(`mh-${label}@example.invalid`, "isolated-test-only", "Agence");
  const pid = seedHoldout(user.id, 2, `Agence ${label}`);
  const p = loadProject(pid);
  saveBrand(pid, { ...p.brand!, name: "Agence test", direction: "maison-horizon" as never });
  const built = await fr(() => composeShop(pid, "maison-horizon" as never, null, false));
  curateMaisonHorizon(built.spec, {}, []);
  const photo = async (name: string, color: string) => (await saveAsset({ projectId: pid, userId: user.id, data: await jpeg(color), name, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { user, pid, spec: built.spec, photo };
}
async function page(spec: ThemeSpec, pid: string, route: string, opts: { preview?: string } = {}) {
  const s = withBiens(spec, pid, opts);
  return fr(() => renderPage({ spec: s, base: "/p", files: compileTheme(s), cart: [] }, route.split("?")[0], new URLSearchParams(route.split("?")[1] ?? "")));
}

describe("Maison & Horizon : les biens alimentent le thème", () => {
  it("un bien ajouté apparaît sur l'accueil, Acheter et sa fiche sans modifier le thème ; retiré il disparaît ; vendu il reste", async () => {
    const { user, pid, spec, photo } = await bareProject("ajout");
    const before = JSON.stringify(compileTheme(spec));
    const empty = text((await page(spec, pid, "/pages/acheter")).html);
    expect(empty).toContain("Aucun bien n'est publié pour le moment.");

    const b = createBien(user.id, pid, { transaction: "vente", data: { title: "Maison neuve test", headline: "Une maison toute neuve", city: "Nantes", postalCode: "44000", surface: 98, rooms: 4, bedrooms: 3, price: 412000, photos: [{ assetId: await photo("a.jpg", "#a55"), alt: "Façade" }, { assetId: await photo("b.jpg", "#5a5"), alt: "Séjour" }], exteriors: ["jardin"] } });
    const live = setBienStatus(pid, b.id, "published");
    // Le thème enregistré n'a pas changé : les biens sont ajoutés au rendu seulement.
    expect(JSON.stringify(compileTheme(spec))).toBe(before);
    expect(spec.store.biens).toBeUndefined();

    const home = (await page(spec, pid, "/")).html;
    expect(home).toContain('data-ref="V-0001"');
    expect(text(home)).toContain("412 000 €");
    const buy = (await page(spec, pid, "/pages/acheter")).html;
    expect(buy).toContain('data-ref="V-0001"');
    expect(buy).toContain('data-tags="vente maison exterieur disponible"');
    const fiche = await page(spec, pid, `/pages/bien/${live.handle}`);
    expect(fiche.status).toBe(200);
    const ft = text(fiche.html);
    expect(ft).toContain("Une maison toute neuve");
    expect(ft).toContain("Voir les 2 photos");
    expect(ft).toContain("1 / 2");
    expect(ft).toContain("DPE / GES à renseigner");
    expect(ft).toContain("Honoraires d'agence À préciser");

    setBienStatus(pid, b.id, "withdrawn");
    expect((await page(spec, pid, "/pages/acheter")).html).not.toContain('data-ref="V-0001"');
    expect((await page(spec, pid, `/pages/bien/${live.handle}`)).status).toBe(404);

    setBienStatus(pid, b.id, "published");
    setBienStatus(pid, b.id, "sold");
    const sold = (await page(spec, pid, "/pages/acheter")).html;
    expect(sold).toContain('data-ref="V-0001"');
    expect(text(sold)).toContain("Vendu");
  });

  it("un brouillon se prévisualise seul, sans apparaître dans les listes", async () => {
    const { user, pid, spec, photo } = await bareProject("brouillon");
    const draft = createBien(user.id, pid, { transaction: "location", data: { title: "Studio", city: "Lille", surface: 24, rent: 590, charges: 40, photos: [{ assetId: await photo("s.jpg", "#55a"), alt: "Studio" }] } });
    expect((await page(spec, pid, `/pages/bien/${draft.handle}`)).status).toBe(404);
    const prev = await page(spec, pid, `/pages/bien/${draft.handle}`, { preview: draft.id });
    expect(prev.status).toBe(200);
    expect(text(prev.html)).toContain("630 € / mois");
    expect((await page(spec, pid, "/pages/louer", { preview: draft.id })).html).toContain('data-ref="L-0001"');
    expect((await page(spec, pid, "/pages/louer")).html).not.toContain('data-ref="L-0001"');
    expect(listBiens(pid)[0].status).toBe("draft");
  });

  it("formulaires honnêtes : en démonstration rien n'est envoyé ; aucune estimation chiffrée ; carte illustrative", async () => {
    const { user, pid, spec, photo } = await bareProject("formulaires");
    for (const [i, x] of [[0, { x: 30, y: 40 }], [1, null]] as const) {
      const b = createBien(user.id, pid, { transaction: "vente", data: { title: `Maison ${i}`, city: "Aix-en-Provence", surface: 100, price: 500000 + i, map: x, photos: [{ assetId: await photo(`m${i}.jpg`, i ? "#999" : "#333"), alt: "" }] } });
      setBienStatus(pid, b.id, "published");
    }
    const estimate = await page(spec, pid, "/pages/estimer");
    const et = text(estimate.html);
    expect(estimate.html).toContain("data-demo");
    expect(et).toContain("ce formulaire vérifie votre saisie mais n'envoie rien");
    expect(et).toContain("Ce formulaire ne calcule pas de prix");
    expect(et).not.toMatch(/votre bien vaut|estimé à \d/i);
    const fiche = await page(spec, pid, `/pages/bien/${listBiens(pid)[0].handle}`);
    expect(text(fiche.html)).toContain("Aucune visite n'est réservée");
    const map = (await page(spec, pid, "/pages/carte")).html;
    expect(map.match(/data-re-pin=/g)?.length).toBe(1);
    expect(text(map)).toContain("Carte illustrative");
    expect(map).toContain('data-default-city="Aix-en-Provence"');
    for (const route of ["/pages/favoris", "/pages/mon-espace", "/pages/mon-projet", "/pages/mentions-legales", "/pages/cookies", "/pages/contact", "/pages/alertes", "/pages/vendre", "/pages/mettre-en-location", "/pages/agence", "/pages/conseils", "/pages/conseil-questions-visite"]) {
      const r = await page(spec, pid, route);
      expect(r.status, route).toBe(200);
      expect(r.html, route).not.toMatch(/Liquid error|undefined method|\[object Object\]/);
    }
    const legal = text((await page(spec, pid, "/pages/mentions-legales")).html);
    expect(legal).toContain("Carte professionnelle : [À renseigner]");
    const missing = await page(spec, pid, "/nulle-part");
    expect(missing.status).toBe(404);
    expect(text(missing.html)).toContain("Cette adresse reste à trouver");
  });

  it("export : biens joints (données, métaobjets Shopify, marche à suivre), photos dans les médias, rien créé en silence", async () => {
    const { user, pid, spec, photo } = await bareProject("export");
    const b = createBien(user.id, pid, { transaction: "vente", data: { title: "Maison export", city: "Rennes", surface: 90, price: 300000, photos: [{ assetId: await photo("e.jpg", "#a75"), alt: "Façade" }] } });
    const live = setBienStatus(pid, b.id, "published");
    const withListings = withBiens(spec, pid);
    for (const platform of ["shopify", "woocommerce", "prestashop"] as const) {
      const e = await fr(() => cmsExport(platform, withListings, () => null));
      const z = unzipSync(e.zip), names = Object.keys(z);
      const find = (suffix: string) => names.find((n) => n.endsWith(suffix));
      expect(find("biens/biens.json"), platform).toBeTruthy();
      expect(find("biens/LISEZ-MOI.md"), platform).toBeTruthy();
      expect(e.issues.some((i) => i.code === "listings_require_import"), platform).toBe(true);
      if (platform === "shopify") {
        expect(names).toContain("templates/metaobject/bien.json");
        const meta = JSON.parse(strFromU8(z[find("biens/shopify-metaobjets.json")!])) as { definition: { type: string; fieldDefinitions: { key: string; type: string }[] }; entries: { handle: string; fields: { key: string; value: string }[] }[] };
        expect(meta.definition.type).toBe("bien");
        expect(meta.definition.fieldDefinitions.find((f) => f.key === "photos")?.type).toBe("json");
        expect(meta.entries[0].handle).toBe(live.handle);
        expect(meta.entries[0].fields.find((f) => f.key === "prix")?.value).toBe("300000");
      }
    }
  });

  it("le site immobilier se compose aussi dans le navigateur (onglet Marque) : aucun module serveur importé", () => {
    // directions.ts → real-estate-site.ts est chargé côté client ; un import de spec.ts y tirerait la base de données.
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/theme/real-estate-site.ts"), "utf8");
    const imports = [...src.matchAll(/^import\s+(?!type\b).*$/gm)].map((m) => m[0]);
    expect(imports).toEqual([]);
  });

  it("les sections immobilières sont réservées au thème Maison & Horizon", () => {
    for (const type of ["re-hero", "re-listings", "re-tiles", "re-feature", "re-form", "re-favorites", "re-account"]) {
      expect(sectionFitReason(type, { kind: "services", theme: "rive", settings: { editorial_profile: "journal" } }), type).not.toBe("");
      expect(sectionFitReason(type, { kind: "services", theme: "maison-horizon", settings: { editorial_profile: "horizon" } }), type).toBe("");
    }
  });
});

describe.skipIf(!kit)("Maison & Horizon : démonstration complète (kit privé)", () => {
  it("27 biens publiés, une série de photos par bien, aucune photo partagée, pages rendues", async () => {
    const user = await createUser("mh-demo@example.invalid", "isolated-test-only", "Démo");
    const f = await fr(() => maisonHorizonProject(user.id));
    expect(f.missing).toEqual([]);
    expect(f.biens).toHaveLength(MH_BIENS.length);
    expect(MH_BIENS.length).toBe(27);
    const used = new Map<string, string>();
    for (const b of listBiens(f.pid)) for (const p of [...b.data.photos, ...(b.data.plan ? [b.data.plan] : []), ...b.data.neighborhood.photos]) {
      expect(used.get(p.assetId), `${b.ref} partage une photo avec ${used.get(p.assetId)}`).toBeUndefined();
      used.set(p.assetId, b.ref);
    }
    for (const file of Object.keys(MH_MEDIA)) expect(fs.existsSync(path.join(MH_DIR, file)), file).toBe(true);
    expect(MH_UNUSED.every((x) => MH_MEDIA[x])).toBe(true);
    const visible = storeBiens(f.pid).biens;
    expect(visible).toHaveLength(27);
    const v1 = visible.find((b) => b.ref === "V-0001")!, l1 = visible.find((b) => b.ref === "L-0001")!;
    const sale = text((await page(f.spec, f.pid, `/pages/bien/${v1.handle}`)).html);
    expect(sale).toContain("Une maison ouverte sur le jardin");
    expect(sale).toContain("Voir les 4 photos");
    expect(sale).toContain("Lyon — secteur de démonstration");
    const rent = text((await page(f.spec, f.pid, `/pages/bien/${l1.handle}`)).html);
    expect(rent).toContain("1 290 € / mois");
    expect(rent).toContain("Loyer hors charges 1 200 € / mois");
    expect(rent).toContain("Autres biens à louer à Lyon");
    for (const pg of f.spec.store.pages) expect((await page(f.spec, f.pid, `/pages/${pg.handle}`)).status, pg.handle).toBe(200);
  });
});
