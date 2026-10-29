/**
 * Réalisations des artisans (#239, phase 3) : saisies une fois (titre, résumé, demande, travail réalisé, catégorie, lieu,
 * date, photos du projet, « avant » facultative) → accueil, page « Réalisations » filtrable et fiche de chaque projet
 * dans les thèmes Atelier Rive, APLAT et PHASE (galerie seule dans les anciens thèmes de services) ; sans réalisation,
 * rendu identique ; brouillon, retirée et archivée absentes ; contrôles ; site hébergé V1 → V2 → restauration ; droits.
 * Aucun réseau.
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { id, now, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { saveAsset } from "@/lib/library";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { createRealisation, getRealisation, setRealisationStatus, updateRealisation } from "@/lib/contenus/realisations";
import { withContenus } from "@/lib/contenus";
import { publishSite, restorePublication, siteFreshness } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { studioAddress } from "@/lib/sites/store";
import * as route from "@/app/api/projects/[id]/realisations/route";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceProfile, serviceSpec } from "./fixtures";
import { completeSite, payingUser } from "./sites-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => { vi.stubEnv("SITES_DOMAIN", "sites.test"); vi.stubEnv("APP_URL", "https://studio.test"); vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");

type Dir = "rive" | "aplat" | "phase" | "atelier";
async function artisan(label: string, direction: Dir) {
  const u = await payingUser(label);
  const pid = seedHoldout(u.id, 2, `Artisan ${label}`);
  // Site d'un client (pas la démonstration) ; images de la fixture absentes des fichiers : retirées.
  const spec = JSON.parse(JSON.stringify(serviceSpec(direction as never, "fr", { ...serviceProfile, contactMode: "quote" })).replace(/"es-(hero|scene-\d)\.jpg"/g, '""')) as ThemeSpec;
  saveThemeVersion(pid, completeSite(spec, `Artisan ${label}`), "test", "user");
  const photo = async (color: string) => (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 400, height: 300, channels: 3, background: color } }).jpeg().toBuffer(), name: `chantier-${color.slice(1)}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { uid: u.id, pid, photo };
}
const html = async (spec: ThemeSpec, path: string) => {
  const r = await fr(() => renderPage({ spec, base: "", files: compileTheme(spec), cart: [] }, path, new URLSearchParams()));
  return { status: r.status, html: r.html };
};
/** Trois réalisations publiées ou non : peinture (avant/après, 3 photos), plâtrerie (1 photo), brouillon, retirée. */
async function trois(a: Awaited<ReturnType<typeof artisan>>) {
  const [p1, p2, p3, av, p4] = [await a.photo("#c96"), await a.photo("#69c"), await a.photo("#9c6"), await a.photo("#555"), await a.photo("#ddd")];
  const peinture = createRealisation(a.pid, { title: "Séjour repeint en vert sauge", summary: "Murs et plafond d'un séjour de 30 m².", need: "Rafraîchir un séjour sombre sans gros travaux.", work: "Rebouchage, deux couches de peinture mate, plafond blanc.", category: "Peinture", location: "Villeurbanne", period: "Mars 2026", photos: [{ assetId: p1, alt: "Séjour vert sauge" }, { assetId: p2, alt: "Détail de l'angle" }, { assetId: p3, alt: "" }], before: { assetId: av, alt: "Séjour avant les travaux" } });
  const platre = createRealisation(a.pid, { title: "Cloison de bureau", summary: "Une cloison en plaques de plâtre pour un bureau.", category: "Plâtrerie", photos: [{ assetId: p4, alt: "Cloison jointoyée" }] });
  const brouillon = createRealisation(a.pid, { title: "Chantier en cours de rédaction", summary: "Pas encore prêt.", photos: [{ assetId: p4, alt: "" }] });
  const retiree = createRealisation(a.pid, { title: "Ancienne réalisation retirée", summary: "Retirée du site.", photos: [{ assetId: p4, alt: "" }] });
  for (const r of [peinture, platre, retiree]) setRealisationStatus(a.pid, r.id, "published");
  setRealisationStatus(a.pid, retiree.id, "withdrawn");
  return { peinture, platre, brouillon, retiree };
}

describe("Sans réalisation : les thèmes ne sont pas touchés", () => {
  for (const dir of ["rive", "aplat", "phase", "atelier"] as const) it(`${dir} : même objet, rendu identique`, async () => {
    const a = await artisan(`vide-${dir}`, dir);
    const spec = currentTheme(a.pid)!.spec as ThemeSpec;
    expect(withContenus(spec, a.pid)).toBe(spec);
    // Un brouillon seul ne change rien non plus (hors aperçu de ce brouillon).
    createRealisation(a.pid, { title: "Brouillon", summary: "x", photos: [{ assetId: await a.photo("#123"), alt: "" }] });
    expect(withContenus(spec, a.pid)).toBe(spec);
  });
});

describe("Une saisie : accueil, galerie filtrable et fiches (Rive, APLAT, PHASE)", () => {
  for (const dir of ["rive", "aplat", "phase"] as const) it(dir, async () => {
    const a = await artisan(`galerie-${dir}`, dir);
    const r = await trois(a);
    const saved = currentTheme(a.pid)!.spec as ThemeSpec;
    const spec = withContenus(saved, a.pid);
    expect(JSON.stringify(currentTheme(a.pid)!.spec)).toBe(JSON.stringify(saved));
    // Page « Réalisations » ajoutée et liée depuis le menu, après les prestations.
    const gallery = spec.store.pages.find((p) => p.handle === "realisations")!;
    expect(gallery).toBeTruthy();
    expect(Object.values(spec.store.menus).some((m) => m.links.some((l) => l.url === "/pages/realisations"))).toBe(true);
    const g = await html(spec, "/pages/realisations");
    expect(g.status).toBe(200);
    for (const s of ["Séjour repeint en vert sauge", "Cloison de bureau"]) expect(visible(g.html), s).toContain(s);
    for (const s of ["Chantier en cours de rédaction", "Ancienne réalisation retirée", "[À compléter"]) expect(visible(g.html), s).not.toContain(s);
    // Filtres par catégorie, dans le mécanisme du thème.
    expect(g.html).toMatch(dir === "aplat" ? /data-ap-filter="peinture"/ : dir === "phase" ? /data-ph-chip="peinture"|value="peinture"/ : /data-folio-filter="peinture"/);
    expect(g.html).toContain(`/pages/${r.peinture.handle}`);
    // Accueil : la section de réalisations du thème, avec le projet.
    const home = await html(spec, "/");
    expect(visible(home.html)).toContain("Séjour repeint en vert sauge");
    expect(visible(home.html)).not.toContain("[À compléter");
    // Fiche : tout ce qui a été saisi, rien d'autre ; photo « avant » ; le brouillon n'a pas de fiche.
    const d = await html(spec, `/pages/${r.peinture.handle}`);
    expect(d.status).toBe(200);
    for (const s of ["Séjour repeint en vert sauge", "Rafraîchir un séjour sombre", "Rebouchage, deux couches", "Villeurbanne", "Mars 2026"]) expect(visible(d.html), s).toContain(s);
    expect(visible(d.html)).not.toContain("[À compléter");
    expect(d.html).toMatch(new RegExp(`es-real-${r.peinture.before!.assetId}`));
    expect(spec.store.pages.some((p) => p.handle === r.brouillon.handle)).toBe(false);
    expect((await html(spec, `/pages/${r.brouillon.handle}`)).status).toBe(404);
    const d2 = await html(spec, `/pages/${r.platre.handle}`);
    expect(d2.status).toBe(200);
    expect(visible(d2.html)).not.toMatch(/Lieu\s*:?\s*$|Villeurbanne/);
    // Aperçu d'un brouillon depuis l'onglet : ce projet seul s'ajoute.
    const prev = withContenus(saved, a.pid, { realisation: r.brouillon.id });
    expect(visible((await html(prev, "/pages/realisations")).html)).toContain("Chantier en cours de rédaction");
  }, 120_000);

  it("ancien thème de services : la galerie du thème est remplie, sans fiche inventée", async () => {
    const a = await artisan("galerie-atelier", "atelier");
    await trois(a);
    const spec = withContenus(currentTheme(a.pid)!.spec as ThemeSpec, a.pid);
    const home = await html(spec, "/");
    expect(visible(home.html)).toContain("Séjour repeint en vert sauge");
    expect(visible(home.html)).not.toContain("[À compléter : nom du projet]");
    expect(spec.store.pages.some((p) => p.handle.startsWith("realisation-"))).toBe(false);
    expect((await html(spec, "/pages/realisations")).status).toBe(200);
  });
});

describe("Contrôles", () => {
  it("photo et texte pour publier, photos du projet seulement, adresse stable, archivée et média supprimé absents", async () => {
    const a = await artisan("controles", "aplat");
    const other = await artisan("controles-autre", "aplat");
    const sans = createRealisation(a.pid, { title: "Sans photo", summary: "x" });
    expect(() => setRealisationStatus(a.pid, sans.id, "published")).toThrow(/au moins une photo/);
    const ph = await a.photo("#a0a");
    const muet = createRealisation(a.pid, { title: "Sans texte", photos: [{ assetId: ph, alt: "" }] });
    expect(() => setRealisationStatus(a.pid, muet.id, "published")).toThrow(/résumé ou la description/);
    const foreign = await other.photo("#000");
    expect(() => createRealisation(a.pid, { title: "Photo d'ailleurs", photos: [{ assetId: foreign, alt: "" }] })).toThrow(/n'appartient pas/);
    const ok = createRealisation(a.pid, { title: "Façade enduite", summary: "Enduit taloché.", photos: [{ assetId: ph, alt: "" }] });
    setRealisationStatus(a.pid, ok.id, "published");
    expect(() => updateRealisation(a.pid, ok.id, { photos: [] })).toThrow(/en ligne/);
    // Renommer ne change pas l'adresse de la fiche (liens partagés stables) ; deux titres identiques, deux adresses.
    updateRealisation(a.pid, ok.id, { title: "Façade enduite à la chaux" });
    expect(getRealisation(a.pid, ok.id).handle).toBe(ok.handle);
    expect(createRealisation(a.pid, { title: "Façade enduite" }).handle).not.toBe(ok.handle);
    // Archivée : hors du site ; photo supprimée de la médiathèque : la réalisation n'est plus montrée (aucun fichier manquant).
    const spec0 = currentTheme(a.pid)!.spec as ThemeSpec;
    expect(withContenus(spec0, a.pid).store.pages.some((p) => p.handle === ok.handle)).toBe(true);
    run("UPDATE assets SET deleted_at = ? WHERE id = ?", now(), ph);
    expect(withContenus(spec0, a.pid)).toBe(spec0);
    run("UPDATE assets SET deleted_at = NULL WHERE id = ?", ph);
    setRealisationStatus(a.pid, ok.id, "archived");
    expect(withContenus(spec0, a.pid)).toBe(spec0);
  });

  it("texte saisi : aucun balisage repris sur le site", async () => {
    const a = await artisan("balisage", "rive");
    const r = createRealisation(a.pid, { title: "Cuisine <script>alert(1)</script>", summary: "Plan de travail <b>chêne</b>", work: "Pose <img src=x onerror=alert(1)>", photos: [{ assetId: await a.photo("#777"), alt: "\"><svg onload=alert(1)>" }] });
    setRealisationStatus(a.pid, r.id, "published");
    const spec = withContenus(currentTheme(a.pid)!.spec as ThemeSpec, a.pid);
    for (const path of ["/", "/pages/realisations", `/pages/${r.handle}`]) {
      const h = (await html(spec, path)).html;
      expect(h, path).not.toMatch(/<script>alert|<img src=x|<svg onload|<b>chêne/);
    }
  });
});

describe("Site hébergé et droits", () => {
  it("V1 → réalisation modifiée (site inchangé, « non publié ») → V2 → restauration V1 ; fiches publiées", async () => {
    const a = await artisan("heberge", "aplat");
    const r = await trois(a);
    const v1 = await fr(() => publishSite(a.pid, a.uid));
    const host = studioAddress(a.pid)!.hostname;
    const get = async (path: string) => { const res = await scoped(() => serveSite(new Request(`https://${host}${path}`, { headers: { host } }), host, path)); return { status: res.status, text: await res.text() }; };
    expect((await get("/pages/realisations")).text).toContain("Murs et plafond");
    expect((await get(`/pages/${r.peinture.handle}`)).status).toBe(200);
    expect((await get(`/pages/${r.brouillon.handle}`)).status).toBe(404);
    updateRealisation(a.pid, r.peinture.id, { summary: "Murs, plafond et boiseries d'un séjour." });
    expect(siteFreshness(a.pid)).toMatchObject({ upToDate: false, changedRealisations: 1 });
    expect((await get("/pages/realisations")).text).toContain("Murs et plafond");
    await fr(() => publishSite(a.pid, a.uid));
    expect((await get("/pages/realisations")).text).toContain("Murs, plafond et boiseries");
    await fr(async () => restorePublication(a.pid, v1.id, a.uid));
    expect((await get("/pages/realisations")).text).toContain("Murs et plafond");
  }, 180_000);

  it("compte étranger : ni lecture ni modification des réalisations", async () => {
    const a = await artisan("droits", "phase");
    const other = await payingUser("etranger-real");
    const ctx = { params: Promise.resolve({ id: a.pid }) };
    const login = (u: string) => { jar.token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
    const req = (method: string, body?: unknown) => new Request(`http://localhost/api/projects/${a.pid}/realisations`, { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: body ? JSON.stringify(body) : undefined });
    login(other.id);
    expect([403, 404]).toContain((await scoped(() => route.GET(req("GET"), ctx))).status);
    expect([403, 404]).toContain((await scoped(() => route.POST(req("POST", { action: "create", realisation: { title: "Pirate" } }), ctx))).status);
    login(a.uid);
    const ok = await scoped(() => route.POST(req("POST", { action: "create", realisation: { title: "Salle de bains" } }), ctx));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { realisations: unknown[] }).realisations).toHaveLength(1);
  });
});
