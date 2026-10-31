/**
 * Biens immobiliers et site hébergé par le studio (#239, phase 1) : une agence FICTIVE (thème Maison & Horizon composé
 * pour un client) publie, modifie, retire et vend ses biens. Le site public ne change qu'à la publication suivante ;
 * « Remettre en ligne » restaure aussi les biens d'alors ; adresse de fiche stable ; brouillon jamais public ; bien de
 * démonstration refusé ; plus de 80 fiches publiables ; état « modifications non publiées ». Aucun réseau.
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { saveAsset } from "@/lib/library";
import { createBien, setBienStatus, updateBien, getBien } from "@/lib/biens";
import { manifestOf, publishSite, restorePublication, siteFreshness } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { studioAddress } from "@/lib/sites/store";
import { payingUser, servicesSite } from "./sites-fixtures";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => { vi.stubEnv("SITES_DOMAIN", "sites.test"); vi.stubEnv("APP_URL", "https://studio.test"); vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const get = (host: string, p: string) => scoped(() => serveSite(new Request(`https://${host}${p}`, { headers: { host } }), host, p));
const text = async (host: string, p: string) => { const r = await get(host, p); return { status: r.status, html: await r.text() }; };

async function agence(label: string) {
  const u = await payingUser(label);
  const s = await fr(() => servicesSite(u.id, "maison-horizon", `Agence ${label}`));
  const photo = async (color: string) => (await saveAsset({ projectId: s.pid, userId: u.id, data: await sharp({ create: { width: 320, height: 240, channels: 3, background: color } }).jpeg().toBuffer(), name: `bien-${color}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  const bien = async (transaction: "vente" | "location", title: string, extra: Record<string, unknown>, status: "draft" | "published" = "published") => {
    const assetId = await photo(["#335", "#553", "#355", "#535"][title.length % 4]);
    const b = fr(() => createBien(u.id, s.pid, { transaction, data: { title, city: "Lyon", surface: 80, dpe: "C", ges: "B", photos: [{ assetId, alt: title }], ...extra } }));
    return status === "published" ? fr(() => setBienStatus(s.pid, b.id, "published")) : b;
  };
  return { uid: u.id, pid: s.pid, bien, photo };
}

describe("Agence : biens et site hébergé", () => {
  it("publication V1 → modification → V2 → restauration V1 ; brouillon, retiré, vendu ; adresse de fiche stable", async () => {
    const a = await agence("lumiere");
    const maison = await a.bien("vente", "Maison familiale avec jardin", { price: 485000 });
    const appart = await a.bien("location", "Appartement lumineux", { rent: 950 });
    const loft = await a.bien("vente", "Loft sous les toits", { price: 320000 });
    const brouillon = await a.bien("vente", "Villa en préparation", { price: 900000 }, "draft");
    const v1 = await fr(() => publishSite(a.pid, a.uid));
    const host = studioAddress(a.pid)!.hostname;
    expect(siteFreshness(a.pid)).toMatchObject({ live: true, upToDate: true, changedBiens: 0 });
    const m1 = manifestOf(a.pid, v1.id)!;
    for (const b of [maison, appart, loft]) expect(m1.pages).toContain(`/pages/bien/${b.handle}`);
    expect(m1.pages).not.toContain(`/pages/bien/${brouillon.handle}`);
    expect((await get(host, `/pages/bien/${brouillon.handle}`)).status).toBe(404);
    const fiche = await text(host, `/pages/bien/${maison.handle}`);
    expect(fiche.status).toBe(200);
    expect(fiche.html).toContain("485");
    expect((await text(host, "/sitemap.xml")).html).toContain(`/pages/bien/${maison.handle}`);

    // Modifications dans le studio : prix, titre (adresse inchangée), loft vendu, appartement retiré.
    fr(() => updateBien(a.pid, maison.id, { data: { price: 465000, title: "Maison familiale rénovée avec jardin" } }));
    fr(() => setBienStatus(a.pid, loft.id, "sold"));
    fr(() => setBienStatus(a.pid, appart.id, "withdrawn"));
    expect(getBien(a.pid, maison.id).handle).toBe(maison.handle);
    const fresh = siteFreshness(a.pid);
    expect(fresh).toMatchObject({ live: true, upToDate: false });
    expect(fresh.changedBiens).toBeGreaterThanOrEqual(3);
    // Le site public n'a pas bougé.
    expect((await text(host, `/pages/bien/${maison.handle}`)).html).toContain("485");
    expect((await get(host, `/pages/bien/${appart.handle}`)).status).toBe(200);

    const v2 = await fr(() => publishSite(a.pid, a.uid));
    expect(siteFreshness(a.pid).upToDate).toBe(true);
    const f2 = await text(host, `/pages/bien/${maison.handle}`);
    expect(f2.html).toContain("465");
    expect(f2.html).toContain("rénovée");
    expect((await get(host, `/pages/bien/${appart.handle}`)).status).toBe(404);
    expect((await text(host, `/pages/bien/${loft.handle}`)).html).toMatch(/[Vv]endu/);
    expect(manifestOf(a.pid, v2.id)!.pages).not.toContain(`/pages/bien/${appart.handle}`);

    // Restauration de V1 : les biens d'alors reviennent tels quels (prix, appartement visible).
    await fr(async () => restorePublication(a.pid, v1.id, a.uid));
    expect((await text(host, `/pages/bien/${maison.handle}`)).html).toContain("485");
    expect((await get(host, `/pages/bien/${appart.handle}`)).status).toBe(200);
    expect(siteFreshness(a.pid).upToDate).toBe(false);
  }, 240_000);

  it("DPE / GES manquants : refus clair par bien (référence et titre), pas de refus de page en double", async () => {
    const a = await agence("energie");
    const loc = await a.bien("location", "Studio sans diagnostic", { rent: 600, dpe: null, ges: null });
    const err = await fr(() => publishSite(a.pid, a.uid)).catch((e) => e);
    expect(err.reasons).toEqual([expect.stringContaining(`Bien ${loc.ref} « Studio sans diagnostic » : classes DPE et GES à renseigner`)]);
  }, 120_000);

  it("bien de démonstration visible : publication refusée avec la raison", async () => {
    const a = await agence("demo");
    await a.bien("vente", "Bien d'exemple", { price: 100000, demo: true });
    await expect(fr(() => publishSite(a.pid, a.uid))).rejects.toMatchObject({ reasons: [expect.stringMatching(/bien\(s\) de démonstration/)] });
  }, 120_000);

  it("une agence avec 90 biens publie toutes ses fiches (comptées à part des pages du site)", async () => {
    const a = await agence("grande");
    const shared = await a.photo("#446");
    for (let i = 0; i < 90; i++) {
      const b = fr(() => createBien(a.uid, a.pid, { transaction: i % 3 ? "vente" : "location", data: { title: `Bien fictif ${i + 1}`, city: "Lyon", surface: 40 + i, dpe: "D", ges: "C", price: i % 3 ? 150000 + i * 1000 : null, rent: i % 3 ? null : 600 + i, photos: [{ assetId: shared, alt: `Bien ${i + 1}` }] } }));
      fr(() => setBienStatus(a.pid, b.id, "published"));
    }
    const pub = await fr(() => publishSite(a.pid, a.uid));
    const details = manifestOf(a.pid, pub.id)!.pages.filter((p) => p.startsWith("/pages/bien/"));
    expect(details.length).toBe(90);
  }, 300_000);
});
