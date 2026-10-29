/**
 * Hébergement natif des sites de services (#232, prototype) : publication figée, service par nom d'hôte, restauration,
 * vraies demandes de contact, refus (texte à compléter, hôte inconnu, compte étranger, forfait inactif), domaines
 * personnalisés préparés. Comptes, projets et domaines fictifs ; aucun appel réseau, aucun DNS réel.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { NextRequest } from "next/server";
import { id, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { renderPage } from "@/lib/theme/render";
import { currentTheme } from "@/lib/projects";
import { siteHostOf } from "@/lib/sites/host-match";
import { bookingBlockers, publishBlockers, publishSite, restorePublication, unpublishSite, manifestOf, PublishBlocked } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { siteRequests } from "@/lib/sites/requests";
import { addCustomDomain, verifyCustomDomain } from "@/lib/sites/domains";
import { updatePolicy } from "@/lib/sites/policies";
import { history, livePublication, publicationDir, studioAddress } from "@/lib/sites/store";
import { middleware } from "@/middleware";
import * as route from "@/app/api/projects/[id]/site-publication/route";
import { composeShop } from "@/lib/engine/shop";
import { saveThemeVersion } from "@/lib/projects";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { completeSite, fictiveContact, payingUser, servicesSite } from "./sites-fixtures";
import { setRdvLive } from "@/lib/rendez-vous";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => {
  vi.stubEnv("SITES_DOMAIN", "sites.test");
  vi.stubEnv("SITES_CUSTOM_DOMAINS", "");
  vi.stubEnv("APP_URL", "https://studio.test");
  vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); });
  jar.token = "";
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function get(host: string, p: string, headers: Record<string, string> = {}) {
  return scoped(() => serveSite(new Request(`https://${host}${p}`, { headers: { host, ...headers } }), host, p.split("?")[0]));
}
function contact(host: string, payload: Record<string, string>, origin = `https://${host}`, ip = "203.0.113.7") {
  return scoped(() => serveSite(new Request(`https://${host}/contact`, { method: "POST", headers: { host, origin, referer: `https://${host}/pages/contact`, "content-type": "application/json", accept: "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ form_type: "contact", ...payload }) }), host, "/contact"));
}
async function published(direction: "aplat" | "rive" = "aplat") {
  const u = await payingUser();
  const site = await fr(() => servicesSite(u.id, direction));
  const pub = await fr(() => publishSite(site.pid, u.id));
  const host = studioAddress(site.pid)!.hostname;
  return { u, ...site, pub, host };
}

describe("Nom d'hôte : site ou studio", () => {
  it("désactivé sans SITES_DOMAIN ; seuls les noms du domaine des sites sont des sites", () => {
    vi.stubEnv("SITES_DOMAIN", "");
    expect(siteHostOf("atelier.sites.test")).toBeNull();
    vi.stubEnv("SITES_DOMAIN", "sites.test");
    expect(siteHostOf("Atelier.Sites.Test:8443")).toBe("atelier.sites.test");
    expect(siteHostOf("sites.test")).toBeNull();
    expect(siteHostOf("studio.test")).toBeNull();
    expect(siteHostOf("atelier.sites.test.attaquant.example")).toBeNull();
    expect(siteHostOf("www.client.example")).toBeNull();
    vi.stubEnv("SITES_CUSTOM_DOMAINS", "1");
    expect(siteHostOf("www.client.example")).toBe("www.client.example");
    expect(siteHostOf("studio.test")).toBeNull();
    expect(siteHostOf("localhost:3000")).toBeNull();
  });

  it("middleware : un nom de site est réécrit vers la route des sites ; l'en-tête interne n'est jamais repris d'une requête", () => {
    const site = middleware(new NextRequest("https://atelier.sites.test/studio", { headers: { host: "atelier.sites.test", "x-ecs-site-host": "autre.sites.test" } }));
    expect(site.headers.get("x-middleware-rewrite")).toMatch(/\/api\/site-host\/studio$/);
    expect(site.headers.get("x-middleware-request-x-ecs-site-host")).toBe("atelier.sites.test");
    const studio = middleware(new NextRequest("https://studio.test/api/site-host/", { headers: { host: "studio.test", "x-ecs-site-host": "atelier.sites.test" } }));
    expect(studio.headers.get("x-middleware-rewrite")).toBeNull();
    expect(studio.headers.get("x-middleware-request-x-ecs-site-host")).toBeNull();
    expect(studio.headers.get("x-middleware-override-headers") ?? "").not.toContain("x-ecs-site-host");
  });
});

describe("Publication figée et service public", () => {
  it("toutes les pages et leurs fichiers sont figés, avec des empreintes exactes ; le rendu public n'a rien de l'aperçu", async () => {
    const { pid, pub, host } = await published();
    expect(host).toMatch(/\.sites\.test$/);
    expect(pub.pages).toBeGreaterThanOrEqual(8);
    const manifest = manifestOf(pid, pub.id)!;
    expect(manifest.pages).toEqual(expect.arrayContaining(["/", "/pages/contact", "/pages/mentions-legales"]));
    for (const [rel, e] of Object.entries(manifest.files)) {
      const data = fs.readFileSync(path.join(publicationDir(pid, pub.id), "files", rel));
      expect(sha256(data)).toBe(e.sha256);
    }
    const home = fs.readFileSync(path.join(publicationDir(pid, pub.id), "files", "index.html"), "utf8");
    expect(home).not.toMatch(/name="robots" content="noindex/);
    expect(home).not.toMatch(/apercu|Aperçu du studio/);
    expect(home).not.toMatch(/\[(À|A) compléter/);
    const contactPage = fs.readFileSync(path.join(publicationDir(pid, pub.id), "files", "pages/contact/index.html"), "utf8");
    expect(contactPage).toContain('name="contact[site_web]"');
    expect(contactPage).toContain("window.__esContactTransport");
    // L'aperçu du studio garde son comportement (noindex) : le mode public n'est qu'une option du moteur.
    const preview = await fr(() => scoped(() => renderPage({ spec: currentTheme(pid)!.spec, base: "/p", cart: [] }, "/", new URLSearchParams())));
    expect(preview.html).toMatch(/name="robots" content="noindex/);
  });

  it("le site répond sous son nom : pages, fichiers, 404 du thème, robots et plan du site ; rien d'autre", async () => {
    const { host } = await published();
    const home = await get(host, "/");
    expect(home.status).toBe(200);
    expect(home.headers.get("cache-control")).toBe("public, max-age=60, must-revalidate");
    const html = await home.text();
    const asset = html.match(/\/assets\/([^"'?\s)]+\.css)/)![1];
    const css = await get(host, `/assets/${asset}`);
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toMatch(/text\/css/);
    expect((await get(host, "/pages/contact")).status).toBe(200);
    const missing = await get(host, "/pages/inexistante");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toMatch(/<html/);
    expect((await get(host, "/assets/../../manifest.json")).status).toBe(404);
    expect((await get(host, "/studio")).status).toBe(404);
    expect(await (await get(host, "/robots.txt")).text()).toContain(`Sitemap: https://${host}/sitemap.xml`);
    expect(await (await get(host, "/sitemap.xml")).text()).toContain(`<loc>https://${host}/pages/contact</loc>`);
    expect((await get("inconnu.sites.test", "/")).status).toBe(404);
  });

  it("correction → V2 en ligne, puis restauration exacte de V1 sans nouveau rendu", async () => {
    const { u, pid, pub, host } = await published();
    const before = await (await get(host, "/policies/legal-notice")).text();
    fr(() => updatePolicy(pid, "legal-notice", "Mentions légales", "Version 2 des mentions légales (fictive)."));
    const v2 = await fr(() => publishSite(pid, u.id));
    expect(v2.number).toBe(2);
    expect(await (await get(host, "/policies/legal-notice")).text()).toContain("Version 2 des mentions légales");
    fr(() => restorePublication(pid, pub.id, u.id));
    expect(livePublication(pid)!.id).toBe(pub.id);
    expect(await (await get(host, "/policies/legal-notice")).text()).toBe(before);
    expect(history(pid).map((h) => h.action)).toEqual(["restore", "publish", "publish"]);
  });

  it("textes à compléter : publication refusée avec les raisons, aucun artefact ni publication", async () => {
    const u = await payingUser();
    const pid = seedHoldout(u.id, 2, "Atelier brut");
    const { spec } = await fr(() => composeShop(pid, "aplat", null, false));
    fr(() => saveThemeVersion(pid, spec, "Site non complété", "user"));
    const err = await fr(() => publishSite(pid, u.id)).catch((e) => e);
    expect(err).toBeInstanceOf(PublishBlocked);
    expect((err as PublishBlocked).reasons.join(" ")).toMatch(/à compléter/);
    expect(one("SELECT COUNT(*) n FROM site_publications WHERE project_id = ?", pid).n).toBe(0);
    expect(fs.existsSync(path.join(publicationDir(pid, "x"), ".."))).toBe(false);
  });

  it("retrait, forfait inactif, projet archivé : le site n'est plus servi", async () => {
    const { u, pid, host } = await published();
    run("UPDATE subscriptions SET status='canceled' WHERE owner_user_id = ?", u.id);
    expect((await get(host, "/")).status).toBe(503);
    run("UPDATE subscriptions SET status='active' WHERE owner_user_id = ?", u.id);
    run("UPDATE projects SET archived = 1 WHERE id = ?", pid);
    expect((await get(host, "/")).status).toBe(404);
    run("UPDATE projects SET archived = 0 WHERE id = ?", pid);
    fr(() => unpublishSite(pid, u.id));
    expect((await get(host, "/")).status).toBe(404);
  });
});

describe("Réservation native (cabinet, salon, restaurant)", () => {
  it("jamais publiée en démonstration ; une fois le service réel activé, le site publié appelle l'API publique du studio", async () => {
    const u = await payingUser();
    const pid = seedHoldout(u.id, 3, "Cabinet fictif");
    fictiveContact(pid);
    const { spec } = await fr(() => composeShop(pid, "parenthese", null, false));
    fr(() => saveThemeVersion(pid, completeSite(spec, "Cabinet fictif"), "Site fictif", "user"));
    const err = await fr(() => publishSite(pid, u.id)).catch((e) => e);
    expect((err as PublishBlocked).reasons.join(" ")).toMatch(/mode démonstration/);
    fr(() => setRdvLive(pid, true));
    const pub = await fr(() => publishSite(pid, u.id));
    const files = manifestOf(pid, pub.id)!.files;
    const pages = Object.keys(files).filter((f) => f.endsWith(".html")).map((f) => fs.readFileSync(path.join(publicationDir(pid, pub.id), "files", f), "utf8")).join("");
    expect(pages).toContain(`https://studio.test/api/public/cabinet/${pid}`);
  });
});

describe("Règles de blocage", () => {
  it("toutes les marques de texte à compléter des thèmes bloquent, y compris « [À renseigner] » et « [À confirmer] »", () => {
    for (const mark of ["[À compléter : vos horaires]", "[À renseigner]", "[À confirmer : délai]", "[À définir]", "[To complete: hours]", "À compléter dans Shopify : Paramètres"]) {
      expect(publishBlockers({ pages: new Map([["/", `<p>${mark}</p>`]]) }).length, mark).toBe(1);
    }
    expect(publishBlockers({ pages: new Map([["/", "<dt>Nom ou raison sociale</dt><dd>À renseigner</dd>"]]) })).toHaveLength(1);
    expect(publishBlockers({ pages: new Map([["/", "<li><strong>Téléphone</strong><em>À renseigner</em></li>"]]) })).toHaveLength(1);
    expect(publishBlockers({ pages: new Map([["/", "<p>Texte complet.</p><script>var x='[À compléter]'</script><input placeholder=\"À renseigner\">"]]) })).toEqual([]);
    expect(publishBlockers({ pages: new Map([["/", "<p>Les informations à renseigner sont listées ci-dessous.</p>"]]) })).toEqual([]);
  });

  it("réservation réelle sans aucun horaire : refusée (le calendrier ne proposerait aucun créneau)", async () => {
    const u = await payingUser();
    const pid = seedHoldout(u.id, 3, "Cabinet sans horaires");
    fictiveContact(pid);
    const { spec } = await fr(() => composeShop(pid, "parenthese", null, false));
    fr(() => saveThemeVersion(pid, spec, "Cabinet sans horaires", "user"));
    fr(() => setRdvLive(pid, true));
    expect(bookingBlockers(pid, currentTheme(pid)!.spec).join(" ")).toMatch(/Aucun horaire de réservation/);
  });
});

describe("Vraies demandes reçues par le site", () => {
  it("enregistrée seulement depuis le site, validée ; champ piège ignoré ; limite par visiteur", async () => {
    const { pid, host } = await published();
    const ok = await contact(host, { "contact[name]": "Visiteur fictif", "contact[email]": "visiteur@example.test", "contact[body]": "Bonjour, un devis pour un accord ?" });
    expect(ok.status).toBe(200);
    const saved = siteRequests(pid);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ email: "visiteur@example.test", notified: "smtp_not_configured", hostname: host });
    expect(saved[0].fields.body).toContain("devis");
    expect((await contact(host, { "contact[email]": "robot@example.test", "contact[body]": "spam", "contact[site_web]": "http://spam.example" })).status).toBe(200);
    expect((await contact(host, { "contact[email]": "x@example.test", "contact[body]": "Bonjour" }, "https://autre.example")).status).toBe(403);
    expect((await contact(host, { "contact[body]": "Sans e-mail" })).status).toBe(422);
    expect(siteRequests(pid)).toHaveLength(1);
    for (let i = 0; i < 4; i++) await contact(host, { "contact[email]": `v${i}@example.test`, "contact[body]": "Bonjour" }, `https://${host}`, "198.51.100.9");
    expect((await contact(host, { "contact[email]": "v5@example.test", "contact[body]": "Bonjour" }, `https://${host}`, "198.51.100.9")).status).toBe(200);
    expect((await contact(host, { "contact[email]": "v6@example.test", "contact[body]": "Bonjour" }, `https://${host}`, "198.51.100.9")).status).toBe(429);
  });
});

describe("Droits : propriétaire seulement", () => {
  const req = (pid: string, method = "GET", payload?: unknown) => new Request(`http://localhost/api/projects/${pid}/site-publication`, { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) });
  const login = (uid?: string) => { jar.token = uid ? id() : ""; if (uid) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), uid, now() + 3600000, now()); };

  it("visiteur et compte étranger refusés sans rien révéler ni publier ; le propriétaire voit son site", async () => {
    const { pid } = await published();
    const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", pid)!.user_id;
    const other = await payingUser("etranger");
    login();
    expect((await route.GET(req(pid), ctx(pid))).status).toBe(401);
    login(other.id);
    expect((await route.GET(req(pid), ctx(pid))).status).toBe(404);
    expect((await route.POST(req(pid, "POST", { action: "unpublish" }), ctx(pid))).status).toBe(404);
    expect(livePublication(pid)).not.toBeNull();
    login(owner);
    const view = await (await route.GET(req(pid), ctx(pid))).json();
    expect(view.live.number).toBe(1);
    expect(view.addresses[0].hostname).toMatch(/\.sites\.test$/);
  });
});

describe("Domaines personnalisés (préparés)", () => {
  it("preuve TXT exacte requise ; servi seulement si activé ; jamais le domaine d'un autre ni celui du studio", async () => {
    const { pid, host } = await published();
    const a = addCustomDomain(pid, "https://www.atelier-fictif.example/");
    expect(a).toMatchObject({ hostname: "www.atelier-fictif.example", status: "pending_dns" });
    const wrong = await verifyCustomDomain(pid, a.hostname, { txt: async () => [["autre-jeton"]], cname: async () => [host] });
    expect(wrong.status).toBe("pending_dns");
    const right = await verifyCustomDomain(pid, a.hostname, { txt: async () => [[a.verify_token!]], cname: async () => [host] });
    expect(right).toMatchObject({ status: "verified", check_error: null });
    expect((await get(a.hostname, "/")).status).toBe(404);
    vi.stubEnv("SITES_CUSTOM_DOMAINS", "1");
    expect((await get(a.hostname, "/")).status).toBe(200);
    const other = await published();
    expect(() => addCustomDomain(other.pid, "www.atelier-fictif.example")).toThrow(/déjà relié/);
    expect(() => addCustomDomain(other.pid, "studio.test")).toThrow(/studio/);
    expect(() => addCustomDomain(other.pid, `x.${"sites.test"}`)).toThrow(/studio/);
  });
});
