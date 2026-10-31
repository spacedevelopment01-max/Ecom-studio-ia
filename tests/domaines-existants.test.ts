/**
 * Domaine déjà possédé relié au site publié (#232, lot C). DNS simulé par un résolveur injecté (aucune requête réelle) :
 * preuve TXT, pointage CNAME (sous-domaine) ou A (domaine nu), états lisibles, désactivation réversible, retrait,
 * revérification quotidienne → « perdu », changement de propriétaire → à revérifier, demande non prouvée qui cède la
 * place après 7 jours, question du proxy avant certificat (« ask »), unicité entre clients, droits.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { id, now, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { publishSite } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { studioAddress } from "@/lib/sites/store";
import { addCustomDomain, askDomain, customDomains, dnsInstructions, isApex, LOST_AFTER, PENDING_CLAIM_MS, recheckDomains, removeCustomDomain, setCustomDomainEnabled, verifyCustomDomain, type Resolver } from "@/lib/sites/domains";
import * as route from "@/app/api/projects/[id]/site-publication/route";
import * as ask from "@/app/api/site-domains/ask/route";
import { payingUser, servicesSite } from "./sites-fixtures";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => {
  vi.stubEnv("SITES_DOMAIN", "sites.test");
  vi.stubEnv("SITES_CUSTOM_DOMAINS", "1");
  vi.stubEnv("APP_URL", "https://studio.test");
  vi.stubEnv("SITES_PUBLIC_IPS", "203.0.113.10");
  vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); });
  jar.token = "";
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const get = (host: string, p = "/") => scoped(() => serveSite(new Request(`https://${host}${p}`, { headers: { host } }), host, p));
/** DNS simulé : table { nom → { txt, cname, a } } modifiable pendant le test. */
function fakeDns(zone: Record<string, { txt?: string[]; cname?: string[]; a?: string[] }>): Resolver {
  const miss = () => Promise.reject(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
  return {
    txt: (n) => (zone[n]?.txt ? Promise.resolve(zone[n].txt!.map((t) => [t])) : miss()),
    cname: (n) => (zone[n]?.cname ? Promise.resolve(zone[n].cname!) : miss()),
    a: (n) => (zone[n]?.a ? Promise.resolve(zone[n].a!) : miss()),
    aaaa: () => miss(),
  };
}
async function site(label = "domaine") {
  const u = await payingUser(label);
  const s = await fr(() => servicesSite(u.id, "aplat", `Atelier ${label}`));
  await fr(() => publishSite(s.pid, u.id));
  return { uid: u.id, pid: s.pid, host: studioAddress(s.pid)!.hostname };
}
const state = (pid: string, h: string) => customDomains(pid).find((d) => d.hostname === h)!.state;

describe("Parcours : preuve, pointage, mise en service", () => {
  it("sous-domaine : TXT puis CNAME → actif et servi ; HTTPS demandé au proxy seulement alors", async () => {
    const { pid, host } = await site();
    const d = fr(() => addCustomDomain(pid, "www.atelier-fictif.example"));
    const ins = dnsInstructions(d);
    expect(ins).toMatchObject({ apex: false, txt: { name: "_ecs-verif.www.atelier-fictif.example", value: d.verify_token }, pointing: { type: "CNAME", values: [host] } });
    expect(state(pid, d.hostname)).toBe("pending_dns");
    expect(askDomain(d.hostname, null)).toBe(false);
    const zone: Record<string, { txt?: string[]; cname?: string[]; a?: string[] }> = {};
    zone[`_ecs-verif.${d.hostname}`] = { txt: [d.verify_token!] };
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("pointing");
    expect(customDomains(pid)[0].checkError).toMatch(/ne pointe pas encore/);
    zone[d.hostname] = { cname: [`${host}.`] };
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("active");
    expect((await get(d.hostname)).status).toBe(200);
    expect(askDomain(d.hostname, null)).toBe(true);
    expect(askDomain(host, null)).toBe(true);
    expect(askDomain("inconnu.example", null)).toBe(false);
    // Mise en service globale absente : prêt mais non servi, aucun certificat.
    vi.stubEnv("SITES_CUSTOM_DOMAINS", "");
    expect(state(pid, d.hostname)).toBe("not_served");
    expect(askDomain(d.hostname, null)).toBe(false);
  }, 120_000);

  it("domaine nu : instructions A vers le serveur ; pointage ailleurs refusé ; jeton du proxy exigé s'il est réglé", async () => {
    const { pid } = await site();
    expect(isApex("atelier-nu.example")).toBe(true);
    expect(isApex("www.atelier-nu.example")).toBe(false);
    expect(isApex("atelier.co.uk")).toBe(true);
    const d = fr(() => addCustomDomain(pid, "atelier-nu.example"));
    expect(dnsInstructions(d).pointing).toMatchObject({ type: "A/AAAA", values: ["203.0.113.10"] });
    const zone = { [`_ecs-verif.${d.hostname}`]: { txt: [d.verify_token!] }, [d.hostname]: { a: ["198.51.100.99"] } };
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("pointing");
    zone[d.hostname] = { a: ["203.0.113.10"] };
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("active");
    vi.stubEnv("SITES_ASK_TOKEN", "jeton-proxy-de-test");
    expect(askDomain(d.hostname, null)).toBe(false);
    expect(askDomain(d.hostname, "mauvais-jeton-de-test")).toBe(false);
    expect(askDomain(d.hostname, "jeton-proxy-de-test")).toBe(true);
    const res = await ask.GET(new Request(`http://127.0.0.1:3000/api/site-domains/ask?domain=${d.hostname}&token=jeton-proxy-de-test`));
    expect(res.status).toBe(200);
    expect((await ask.GET(new Request("http://127.0.0.1:3000/api/site-domains/ask?domain=autre.example&token=jeton-proxy-de-test"))).status).toBe(404);
  }, 120_000);
});

describe("Désactivation, retrait, perte, changement de propriétaire", () => {
  let n = 0;
  async function active() {
    const s = await site();
    const d = fr(() => addCustomDomain(s.pid, `www.atelier-actif-${++n}.example`));
    const zone: Record<string, { txt?: string[]; cname?: string[] }> = { [`_ecs-verif.${d.hostname}`]: { txt: [d.verify_token!] }, [d.hostname]: { cname: [s.host] } };
    await fr(() => verifyCustomDomain(s.pid, d.hostname, fakeDns(zone)));
    return { ...s, d, zone };
  }

  it("désactiver : plus servi, sans certificat ; réactiver = revérifier ; retirer : libéré, l'adresse du studio reste servie", async () => {
    const { pid, host, d, zone } = await active();
    await fr(() => setCustomDomainEnabled(pid, d.hostname, false));
    expect(state(pid, d.hostname)).toBe("disabled");
    expect((await get(d.hostname)).status).toBe(404);
    expect(askDomain(d.hostname, null)).toBe(false);
    // Vérifier ne réactive pas un domaine désactivé.
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("disabled");
    await fr(() => setCustomDomainEnabled(pid, d.hostname, true, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("active");
    removeCustomDomain(pid, d.hostname);
    expect((await get(d.hostname)).status).toBe(404);
    expect((await get(host)).status).toBe(200);
  }, 120_000);

  it("preuve disparue 3 jours de suite (domaine expiré) → « perdu », plus servi ; rétablie + Vérifier → actif", async () => {
    const { pid, d, zone } = await active();
    delete zone[`_ecs-verif.${d.hostname}`];
    for (let i = 1; i <= LOST_AFTER; i++) {
      run("UPDATE site_addresses SET checked_at = 0 WHERE hostname = ?", d.hostname);
      await fr(() => recheckDomains(fakeDns(zone)));
      expect(state(pid, d.hostname)).toBe(i < LOST_AFTER ? "active" : "lost");
    }
    expect((await get(d.hostname)).status).toBe(404);
    expect(customDomains(pid)[0].checkError).toMatch(/domaine expiré ou DNS modifié/);
    zone[`_ecs-verif.${d.hostname}`] = { txt: [d.verify_token!] };
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("active");
  }, 120_000);

  it("le site change de propriétaire : domaine non servi tant que le nouveau propriétaire n'a pas revérifié", async () => {
    const { pid, d, zone } = await active();
    const next = await payingUser("repreneur");
    run("UPDATE projects SET user_id = ? WHERE id = ?", next.id, pid);
    expect(state(pid, d.hostname)).toBe("reverify");
    expect((await get(d.hostname)).status).toBe(404);
    await fr(() => verifyCustomDomain(pid, d.hostname, fakeDns(zone)));
    expect(state(pid, d.hostname)).toBe("active");
  }, 120_000);
});

describe("Conflits entre clients", () => {
  it("domaine prouvé ailleurs : refusé ; demande jamais prouvée : bloque 7 jours au plus", async () => {
    const a = await site("client-a");
    const b = await site("client-b");
    const d = fr(() => addCustomDomain(a.pid, "www.convoite.example"));
    expect(() => fr(() => addCustomDomain(b.pid, "www.convoite.example"))).toThrow(/en cours de liaison/);
    run("UPDATE site_addresses SET created_at = ? WHERE hostname = ?", now() - PENDING_CLAIM_MS - 1000, d.hostname);
    const taken = fr(() => addCustomDomain(b.pid, "www.convoite.example"));
    expect(taken.project_id).toBe(b.pid);
    expect(taken.verify_token).not.toBe(d.verify_token);
    const zone = { [`_ecs-verif.${taken.hostname}`]: { txt: [taken.verify_token!] }, [taken.hostname]: { cname: [b.host] } };
    await fr(() => verifyCustomDomain(b.pid, taken.hostname, fakeDns(zone)));
    expect(() => fr(() => addCustomDomain(a.pid, "www.convoite.example"))).toThrow(/déjà relié/);
    // L'ancienne preuve du client A ne vaut rien pour le client B (jeton propre à chaque demande).
    expect(state(b.pid, taken.hostname)).toBe("active");
  }, 180_000);
});

describe("Droits", () => {
  it("compte étranger : ni lecture, ni ajout, ni désactivation ; le propriétaire voit l'état et les instructions", async () => {
    const { uid, pid } = await site();
    fr(() => addCustomDomain(pid, "www.prive.example"));
    const req = (payload?: unknown) => new Request(`http://localhost/api/projects/${pid}/site-publication`, { method: payload ? "POST" : "GET", headers: { "content-type": "application/json", origin: "http://localhost" }, body: payload ? JSON.stringify(payload) : undefined });
    const ctx = { params: Promise.resolve({ id: pid }) };
    const login = (u?: string) => { jar.token = u ? id() : ""; if (u) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
    const other = await payingUser("etranger");
    login(other.id);
    expect([403, 404]).toContain((await scoped(() => route.GET(req(), ctx))).status);
    expect([403, 404]).toContain((await scoped(() => route.POST(req({ action: "domain-enable", hostname: "www.prive.example", enabled: false }), ctx))).status);
    expect([403, 404]).toContain((await scoped(() => route.POST(req({ action: "domain-add", hostname: "www.vole.example" }), ctx))).status);
    login(uid);
    const body = await (await scoped(() => route.GET(req(), ctx))).json();
    expect(body.domains).toEqual([expect.objectContaining({ hostname: "www.prive.example", state: "pending_dns", dns: expect.objectContaining({ apex: false }) })]);
  }, 120_000);
});
