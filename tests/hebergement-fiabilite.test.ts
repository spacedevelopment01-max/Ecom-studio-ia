/**
 * Fiabilité de l'hébergement des sites (#232, lot B) : site fictif riche en médias (24 images générées, formats et
 * tailles variés) publié, servi, redimensionné, restauré à l'identique ; média supprimé → publication refusée ; purge
 * bornée sans jamais toucher la version en ligne ; quota ; intégrité vérifiée avant restauration ; publication
 * interrompue nettoyée ; sauvegarde vérifiable puis restauration ; trafic ; diagnostic ; droits. Aucun réseau.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { id, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { manifestOf, publishSite, restorePublication } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { livePublication, publicationDir, sitesRoot, studioAddress } from "@/lib/sites/store";
import { backupSites, cleanupInterrupted, flushTraffic, purgeOldPublications, siteDiagnostics, storageUsed, traffic, verifyBackup, verifyPublication } from "@/lib/sites/maintenance";
import * as route from "@/app/api/projects/[id]/site-publication/route";
import { payingUser, servicesSite, withRichMedia } from "./sites-fixtures";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
const sha = (b: Buffer | Uint8Array) => crypto.createHash("sha256").update(b).digest("hex");
beforeEach(() => {
  vi.stubEnv("SITES_DOMAIN", "sites.test");
  vi.stubEnv("APP_URL", "https://studio.test");
  vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); });
  jar.token = "";
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const get = (host: string, p: string) => scoped(() => serveSite(new Request(`https://${host}${p}`, { headers: { host } }), host, p.split("?")[0]));

async function richSite() {
  const u = await payingUser("medias");
  const s = await fr(() => servicesSite(u.id, "aplat", "Atelier riche"));
  const media = await fr(() => withRichMedia(s.pid, u.id));
  const pub = await fr(() => publishSite(s.pid, u.id));
  return { uid: u.id, pid: s.pid, pub, host: studioAddress(s.pid)!.hostname, media };
}

describe("Site riche en médias", () => {
  it("toutes les images référencées sont figées, servies à l'identique, redimensionnables ; aucune manquante", async () => {
    const { pid, pub, host, media } = await richSite();
    expect(media.slots).toBeGreaterThanOrEqual(15);
    const m = manifestOf(pid, pub.id)!;
    const images = Object.entries(m.files).filter(([, e]) => e.type.startsWith("image/") && !e.type.includes("svg"));
    expect(images.length).toBeGreaterThanOrEqual(8);
    expect((m as unknown as { missing: string[] }).missing).toEqual([]);
    const types = new Set(images.map(([, e]) => e.type));
    expect([...types].length).toBeGreaterThanOrEqual(2);
    for (const [rel, e] of images) {
      const r = await get(host, `/${rel}`);
      expect(r.status, rel).toBe(200);
      expect(r.headers.get("content-type")).toBe(e.type);
      expect(sha(new Uint8Array(await r.arrayBuffer()))).toBe(e.sha256);
    }
    const [bigRel, big] = images.sort((a, b) => b[1].bytes - a[1].bytes)[0];
    const small = await get(host, `/${bigRel}?width=400`);
    expect(small.status).toBe(200);
    expect((await small.arrayBuffer()).byteLength).toBeLessThan(big.bytes);
    // Toute image d'une page publiée pointe vers un fichier figé.
    const html = fs.readFileSync(path.join(publicationDir(pid, pub.id), "files", "index.html"), "utf8");
    const refs = [...html.matchAll(/\/assets\/(rich-\d+\.(?:jpg|png|webp))/g)].map((x) => `assets/${x[1]}`);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(m.files[r], r).toBeDefined();
    expect(verifyPublication(pid, pub.id).ok).toBe(true);
  }, 120_000);
});

describe("Restauration et intégrité", () => {
  it("V2 puis restauration de V1 : octets identiques ; fichier altéré → restauration refusée ; diagnostic le signale", async () => {
    const { uid, pid, pub, host } = await richSite();
    const before = await (await get(host, "/")).text();
    const v2 = await fr(() => publishSite(pid, uid));
    await fr(async () => restorePublication(pid, pub.id, uid));
    expect(await (await get(host, "/")).text()).toBe(before);
    expect(livePublication(pid)!.id).toBe(pub.id);
    // Un fichier d'image de V2 est altéré sur le disque : V2 ne peut plus être remise en ligne.
    const m = manifestOf(pid, v2.id)!;
    const rel = Object.keys(m.files).find((k) => /^assets\/rich-/.test(k))!;
    fs.appendFileSync(path.join(publicationDir(pid, v2.id), "files", rel), "x");
    expect(() => fr(() => restorePublication(pid, v2.id, uid))).toThrow(/incomplets ou altérés/);
    // Version en ligne altérée : le diagnostic le dit.
    const rel1 = Object.keys(manifestOf(pid, pub.id)!.files).find((k) => /^assets\/rich-/.test(k))!;
    fs.rmSync(path.join(publicationDir(pid, pub.id), "files", rel1));
    const d = fr(() => siteDiagnostics(pid));
    expect(d.ok).toBe(false);
    expect(d.checks.find((c) => c.key === "integrity")).toMatchObject({ ok: false });
  }, 180_000);

  it("média supprimé de la bibliothèque : publication refusée avec la raison, rien n'est publié", async () => {
    const u = await payingUser("medias");
    const s = await fr(() => servicesSite(u.id, "aplat", "Atelier lacunaire"));
    await fr(() => withRichMedia(s.pid, u.id, 4));
    const aid = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? ORDER BY created_at LIMIT 1", s.pid)!.id;
    run("DELETE FROM assets WHERE id = ?", aid);
    await expect(fr(() => publishSite(s.pid, u.id))).rejects.toMatchObject({ reasons: [expect.stringMatching(/fichier\(s\) du site introuvable/)] });
    expect(livePublication(s.pid)).toBeNull();
  }, 120_000);
});

describe("Purge, quota, publications interrompues", () => {
  it("garde la version en ligne et les plus récentes ; purgée = non restaurable ; quota : plus anciennes d'abord", async () => {
    const u = await payingUser("purge");
    const s = await fr(() => servicesSite(u.id, "aplat", "Atelier purge"));
    const pubs: Awaited<ReturnType<typeof publishSite>>[] = [];
    for (let i = 0; i < 5; i++) pubs.push(await fr(() => publishSite(s.pid, u.id)));
    await fr(async () => restorePublication(s.pid, pubs[0].id, u.id));
    const purged = purgeOldPublications(s.pid, 2);
    expect(purged.sort()).toEqual([pubs[1].id, pubs[2].id].sort());
    expect(fs.existsSync(publicationDir(s.pid, pubs[0].id))).toBe(true);
    expect(fs.existsSync(publicationDir(s.pid, pubs[1].id))).toBe(false);
    expect(() => fr(() => restorePublication(s.pid, pubs[1].id, u.id))).toThrow(/purgés/);
    // Quota minuscule : purge des plus anciennes (hors version en ligne et plus récente).
    const purged2 = purgeOldPublications(s.pid, 10, 1);
    expect(purged2).toEqual([pubs[3].id]);
    expect(fs.existsSync(publicationDir(s.pid, pubs[4].id))).toBe(true);
    expect(storageUsed(s.pid)).toBe(pubs[0].bytes + pubs[4].bytes);
    // La version en ligne est toujours servie.
    expect((await get(studioAddress(s.pid)!.hostname, "/")).status).toBe(200);
  }, 240_000);

  it("publication interrompue (dossier temporaire) : nettoyée après une heure, jamais avant", async () => {
    const dir = path.join(sitesRoot(), "projet-fictif");
    fs.mkdirSync(path.join(dir, ".tmp-ancien", "files"), { recursive: true });
    fs.mkdirSync(path.join(dir, ".tmp-recent", "files"), { recursive: true });
    const old = new Date(Date.now() - 2 * 3600_000);
    fs.utimesSync(path.join(dir, ".tmp-ancien"), old, old);
    expect(cleanupInterrupted()).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(dir, ".tmp-ancien"))).toBe(false);
    expect(fs.existsSync(path.join(dir, ".tmp-recent"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("Sauvegarde", () => {
  it("sauvegarde vérifiée ; altération détectée ; perte en service puis restauration depuis la sauvegarde", async () => {
    const { pid, pub, host } = await richSite();
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "sauvegarde-sites-"));
    const report = await backupSites(dest);
    expect(report.publications).toBeGreaterThanOrEqual(1);
    // Les autres tests de ce fichier altèrent volontairement leurs propres publications : seules celles de ce site comptent ici.
    const first = verifyBackup(dest);
    expect(first.problems.filter((p) => p.includes(pid))).toEqual([]);
    expect(first.checked).toBeGreaterThanOrEqual(1);
    // Perte du dossier en service : le site n'est plus servi.
    const live = publicationDir(pid, pub.id);
    fs.rmSync(live, { recursive: true, force: true });
    expect((await get(host, "/")).status).toBe(503);
    // Restauration des fichiers depuis la sauvegarde (la base n'a pas bougé) : servi à nouveau, intact.
    fs.cpSync(path.join(dest, "sites", pid, pub.id), live, { recursive: true });
    expect(verifyPublication(pid, pub.id).ok).toBe(true);
    expect((await get(host, "/")).status).toBe(200);
    // Altération dans la sauvegarde : détectée.
    const m = manifestOf(pid, pub.id)!;
    const rel = Object.keys(m.files).find((k) => k.endsWith(".html"))!;
    fs.appendFileSync(path.join(dest, "sites", pid, pub.id, "files", rel), "<!-- altéré -->");
    const v = verifyBackup(dest);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toContain(pub.id);
    fs.rmSync(dest, { recursive: true, force: true });
  }, 180_000);
});

describe("Trafic et diagnostic", () => {
  it("requêtes et octets servis comptés ; diagnostic complet ; réservé au propriétaire", async () => {
    const { uid, pid, host } = await richSite();
    for (let i = 0; i < 5; i++) await get(host, "/");
    flushTraffic();
    const t = traffic(pid);
    expect(t.requests).toBeGreaterThanOrEqual(5);
    expect(t.bytes).toBeGreaterThan(0);
    const d = fr(() => siteDiagnostics(pid));
    expect(d.checks.map((c) => c.key)).toEqual(["live", "integrity", "address", "storage", "traffic", "smtp", "notifications"]);
    expect(d.checks.find((c) => c.key === "integrity")!.ok).toBe(true);
    const req = () => new Request(`http://localhost/api/projects/${pid}/site-publication`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ action: "diagnose" }) });
    const ctx = { params: Promise.resolve({ id: pid }) };
    const login = (u?: string) => { jar.token = u ? id() : ""; if (u) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
    const other = await payingUser("etranger");
    login(other.id);
    expect([403, 404]).toContain((await scoped(() => route.POST(req(), ctx))).status);
    login(uid);
    const res = await scoped(() => route.POST(req(), ctx));
    expect(res.status).toBe(200);
    expect((await res.json()).diagnostics.checks).toHaveLength(7);
  }, 120_000);
});
