/**
 * Non-régression de l'audit du serveur (paiements, quotas, tâches, sécurité). Chaque test rejoue un défaut corrigé.
 * Stripe est simulé (fetch remplacé) : aucun appel réseau réel.
 */
import http from "node:http";
import zlib from "node:zlib";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Clé Stripe factice pour ce fichier uniquement (les autres fichiers de tests n'en voient rien).
vi.mock("@/lib/settings", async (orig) => {
  const real = await orig<typeof import("@/lib/settings")>();
  return { ...real, getSetting: (k: string) => (k === "stripe.secretKey" ? "sk_test_audit" : real.getSetting(k)) };
});
// Utilisateur « connecté » des routes appelées directement.
let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return {
    ...real,
    requireUser: async () => {
      if (!sessionUser) throw new real.HttpError(401, "Connexion requise.");
      return sessionUser;
    },
  };
});

import { createUser } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { currentPeriod, getSubscription, syncAllowance } from "@/lib/billing";
import { consumeQuota, creditPack, quotaMessage, quotaView, userPlan } from "@/lib/quotas";

const DAY = 86400_000;

// ------------------------------------------------------------------ Stripe simulé

type Remote = { status: string; start: number; end: number; metadata?: Record<string, string> };
const remote = new Map<string, Remote>();
const calls: { method: string; path: string }[] = [];
let failDeletes = 0;

function stripeFetch(input: any, init?: any): Promise<Response> {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  calls.push({ method, path: url.pathname });
  const m = url.pathname.match(/^\/v1\/subscriptions\/([^/]+)$/);
  const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  if (!m) return json(404, { error: { code: "resource_missing" } });
  const sid = decodeURIComponent(m[1]);
  const s = remote.get(sid);
  if (method === "DELETE") {
    if (failDeletes > 0) {
      failDeletes--;
      return json(500, { error: { message: "panne simulée" } });
    }
    if (!s) return json(404, { error: { code: "resource_missing" } });
    s.status = "canceled";
    return json(200, { id: sid, status: "canceled" });
  }
  if (!s) return json(404, { error: { code: "resource_missing" } });
  return json(200, { id: sid, status: s.status, current_period_start: Math.floor(s.start / 1000), current_period_end: Math.floor(s.end / 1000), metadata: s.metadata ?? {} });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(stripeFetch));
  calls.length = 0;
  failDeletes = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionUser = null;
});

const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const newUser = (tag: string) => createUser(`audit-${tag}-${uniq()}@test.fr`, "motdepasse-test", "Audit");

let evtSeq = 0;
function checkout(userId: string, o: { session: string; sub: string; plan: string; created: number; paid?: string; replaces?: string; evtId?: string; type?: string }) {
  return {
    id: o.evtId ?? `evt_${++evtSeq}_${uniq()}`,
    type: o.type ?? "checkout.session.completed",
    created: o.created + 5,
    data: { object: { id: o.session, created: o.created, client_reference_id: userId, customer: "cus_x", subscription: o.sub, payment_status: o.paid ?? "paid", amount_total: 9990, metadata: { kind: "subscription", plan: o.plan, billing: "month", ...(o.replaces ? { replaces: o.replaces } : {}) } } },
  };
}
function subEvent(userId: string, sub: string, status: string, created: number, type = "customer.subscription.updated") {
  return { id: `evt_${++evtSeq}_${uniq()}`, type, created, data: { object: { id: sub, status, metadata: { user_id: userId, plan: "dominer", billing: "month" } } } };
}

// ------------------------------------------------------------------ B1, B2, I1, I2

describe("webhook Stripe", () => {
  it("B1 : le rejeu d'un ancien paiement ne rétablit pas l'ancien forfait et n'arrête jamais l'abonnement en cours", async () => {
    const { handleStripeEvent } = await import("@/lib/payments");
    const u = await newUser("b1");
    const t = Math.floor(Date.now() / 1000);
    remote.set("sub_b1_1", { status: "active", start: Date.now(), end: Date.now() + 30 * DAY });
    remote.set("sub_b1_2", { status: "active", start: Date.now(), end: Date.now() + 30 * DAY });
    const first = checkout(u.id, { session: "cs_b1_1", sub: "sub_b1_1", plan: "creer", created: t - 100 });
    await handleStripeEvent(first);
    expect(getSubscription(u.id)).toMatchObject({ plan: "creer", stripe_subscription_id: "sub_b1_1" });
    // Passage à Dominer : l'ancien abonnement (et lui seul) est arrêté.
    await handleStripeEvent(checkout(u.id, { session: "cs_b1_2", sub: "sub_b1_2", plan: "dominer", created: t - 50, replaces: "sub_b1_1" }));
    expect(getSubscription(u.id)).toMatchObject({ plan: "dominer", stripe_subscription_id: "sub_b1_2" });
    expect(remote.get("sub_b1_1")!.status).toBe("canceled");
    // Stripe relivre le premier événement (même identifiant), puis une copie sous un autre identifiant.
    await handleStripeEvent(first);
    await handleStripeEvent({ ...first, id: `evt_copie_${uniq()}` });
    expect(getSubscription(u.id)).toMatchObject({ status: "active", plan: "dominer", stripe_subscription_id: "sub_b1_2" });
    expect(calls.some((c) => c.method === "DELETE" && c.path.endsWith("/sub_b1_2"))).toBe(false);
    expect(remote.get("sub_b1_2")!.status).toBe("active");
    expect(one("SELECT 1 FROM stripe_events WHERE id = ?", first.id)).toBeTruthy();
  });

  it("B2 : des événements reçus dans le désordre ne laissent pas un statut périmé", async () => {
    const { handleStripeEvent } = await import("@/lib/payments");
    const u = await newUser("b2");
    const t = Math.floor(Date.now() / 1000);
    remote.set("sub_b2", { status: "active", start: Date.now(), end: Date.now() + 30 * DAY });
    await handleStripeEvent(checkout(u.id, { session: "cs_b2", sub: "sub_b2", plan: "dominer", created: t - 1000 }));
    // Renouvellement : échec (past_due, t-200) puis succès (active, t-100) ; « active » arrive en premier.
    await handleStripeEvent(subEvent(u.id, "sub_b2", "active", t - 100));
    await handleStripeEvent(subEvent(u.id, "sub_b2", "past_due", t - 200));
    expect(getSubscription(u.id).status).toBe("active");
    expect(userPlan(u.id)).toBe("dominer");
    // Même seconde : l'état réel est relu chez Stripe.
    remote.get("sub_b2")!.status = "active";
    await handleStripeEvent(subEvent(u.id, "sub_b2", "past_due", t - 100));
    expect(getSubscription(u.id).status).toBe("active");
    expect(calls.some((c) => c.method === "GET" && c.path.endsWith("/sub_b2"))).toBe(true);
    // Événement d'un autre abonnement (ancien) : sans effet.
    await handleStripeEvent(subEvent(u.id, "sub_autre", "canceled", t, "customer.subscription.deleted"));
    expect(getSubscription(u.id).status).toBe("active");
  });

  it("I1 : un abonnement n'est activé que si la session est payée (paiement différé : à la confirmation)", async () => {
    const { handleStripeEvent } = await import("@/lib/payments");
    const u = await newUser("i1");
    const t = Math.floor(Date.now() / 1000);
    remote.set("sub_i1", { status: "incomplete", start: Date.now(), end: Date.now() + 30 * DAY });
    await handleStripeEvent(checkout(u.id, { session: "cs_i1", sub: "sub_i1", plan: "dominer", created: t - 10, paid: "unpaid" }));
    expect(userPlan(u.id)).toBe(null);
    expect(one("SELECT 1 FROM payments WHERE stripe_id = 'cs_i1'")).toBeFalsy();
    remote.get("sub_i1")!.status = "active";
    await handleStripeEvent(checkout(u.id, { session: "cs_i1", sub: "sub_i1", plan: "dominer", created: t - 10, type: "checkout.session.async_payment_succeeded" }));
    expect(userPlan(u.id)).toBe("dominer");
    expect(one<{ status: string }>("SELECT status FROM payments WHERE stripe_id = 'cs_i1'")?.status).toBe("paid");
  });

  it("I2 : l'arrêt de l'ancien abonnement est réessayé, journalisé et signalé à l'administration en cas d'échec", async () => {
    const { handleStripeEvent, retryStripeCancellations } = await import("@/lib/payments");
    const admin = await newUser("i2admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    const u = await newUser("i2");
    const t = Math.floor(Date.now() / 1000);
    remote.set("sub_i2_1", { status: "active", start: Date.now(), end: Date.now() + 30 * DAY });
    remote.set("sub_i2_2", { status: "active", start: Date.now(), end: Date.now() + 30 * DAY });
    await handleStripeEvent(checkout(u.id, { session: "cs_i2_1", sub: "sub_i2_1", plan: "creer", created: t - 100 }));
    failDeletes = 3; // Stripe en panne pendant les 3 essais immédiats
    await handleStripeEvent(checkout(u.id, { session: "cs_i2_2", sub: "sub_i2_2", plan: "vendre", created: t - 50 }));
    expect(getSubscription(u.id).stripe_subscription_id).toBe("sub_i2_2");
    expect(calls.filter((c) => c.method === "DELETE" && c.path.endsWith("/sub_i2_1")).length).toBe(3);
    const row = one<{ done_at: number | null; last_error: string }>("SELECT * FROM stripe_cancellations WHERE subscription_id = 'sub_i2_1'")!;
    expect(row.done_at).toBe(null);
    expect(one("SELECT 1 FROM error_log WHERE scope = 'stripe:cancel' AND user_id = ?", u.id)).toBeTruthy();
    expect(one("SELECT 1 FROM notifications WHERE user_id = ? AND body LIKE '%sub_i2_1%'", admin.id)).toBeTruthy();
    // Le worker réessaie : cette fois Stripe répond.
    run("UPDATE stripe_cancellations SET next_at = 0 WHERE subscription_id = 'sub_i2_1'");
    await retryStripeCancellations();
    expect(one<{ done_at: number | null }>("SELECT done_at FROM stripe_cancellations WHERE subscription_id = 'sub_i2_1'")!.done_at).toBeGreaterThan(0);
    expect(remote.get("sub_i2_1")!.status).toBe("canceled");
    expect(remote.get("sub_i2_2")!.status).toBe("active");
  });

  it("mineur 7 : le pack Lancement payé deux fois n'est crédité qu'une fois", async () => {
    const u = await newUser("launch");
    run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
    expect(creditPack(u.id, "launch", "stripe:cs_l1")).toBe("credited");
    expect(creditPack(u.id, "launch", "stripe:cs_l2")).toBe("already_bought");
    expect(creditPack(u.id, "launch", "stripe:cs_l1")).toBe("duplicate");
    expect(all("SELECT 1 FROM pack_purchases WHERE user_id = ?", u.id).length).toBe(1);
  });

  it("mineur 8 : tolérance de signature de 300 s", async () => {
    const { verifyStripeSignature } = await import("@/lib/payments");
    const crypto = await import("node:crypto");
    const { setSetting } = await import("@/lib/settings");
    // Secret de webhook propre à ce test (réglage partagé : restauré ensuite).
    const prev = one<{ value: string }>("SELECT value FROM settings WHERE key = 'stripe.webhookSecret'");
    setSetting("stripe.webhookSecret", "whsec_audit");
    try {
      const sign = (t: number) => `t=${t},v1=${crypto.createHmac("sha256", "whsec_audit").update(`${t}.{}`).digest("hex")}`;
      const t = Math.floor(Date.now() / 1000);
      expect(verifyStripeSignature("{}", sign(t - 200))).toBe(true);
      expect(verifyStripeSignature("{}", sign(t - 400))).toBe(false);
    } finally {
      if (prev) run("UPDATE settings SET value = ? WHERE key = 'stripe.webhookSecret'", prev.value);
      else run("DELETE FROM settings WHERE key = 'stripe.webhookSecret'");
    }
  });
});

// ------------------------------------------------------------------ I3

describe("I3 : période des quotas alignée sur la facturation", () => {
  it("activation quelques jours avant la date d'inscription : pas de second quota deux jours plus tard, une seule date", async () => {
    const { handleStripeEvent } = await import("@/lib/payments");
    const T0 = Date.UTC(2026, 9, 5, 9, 0, 0);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const u = await newUser("i3");
    quotaView(u.id, "visuals"); // période née à l'inscription : 5/10 → 5/11
    // Abonnement Vendre payé le 3/11 (Stripe : période 3/11 → 3/12).
    const paidAt = T0 + 29 * DAY;
    vi.setSystemTime(paidAt);
    remote.set("sub_i3", { status: "active", start: paidAt, end: paidAt + 30 * DAY });
    await handleStripeEvent(checkout(u.id, { session: "cs_i3", sub: "sub_i3", plan: "vendre", created: Math.floor(paidAt / 1000) - 60 }));
    expect(quotaView(u.id, "visuals")).toMatchObject({ included: 80, rollover: 0, left: 80 });
    // 5/11 : l'ancienne période (inscription) aurait renouvelé les quotas avec un report de 80 (160 visuels).
    vi.setSystemTime(T0 + 31 * DAY);
    expect(quotaView(u.id, "visuals")).toMatchObject({ included: 80, rollover: 0, left: 80 });
    const p = currentPeriod(u.id);
    expect(p.start).toBe(Math.floor(paidAt / 1000) * 1000);
    expect(p.end).toBe(Math.floor((paidAt + 30 * DAY) / 1000) * 1000);
    // La date du message de quota est celle de la période (la même que « Mon compte »).
    consumeQuota(u.id, "visuals", 80, "i3-all");
    const date = new Date(p.end).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    expect(quotaMessage(u.id, "visuals")).toContain(date);
  });

  it("le report ne vient que de la période immédiatement précédente", async () => {
    const u = await newUser("i3b");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    const { start } = currentPeriod(u.id);
    // Ligne d'il y a trois mois, inutilisée (abonné revenu après une résiliation) : pas de report.
    run("INSERT INTO quota_usage (user_id, period_start, key, included, rollover, used) VALUES (?,?,?,?,?,?)", u.id, start - 90 * DAY, "visuals", 80, 0, 0);
    run("UPDATE wallets SET prev_period_start = ? WHERE user_id = ?", start - 31 * DAY, u.id);
    expect(quotaView(u.id, "visuals").rollover).toBe(0);
  });
});

// ------------------------------------------------------------------ I4, I5, mineur 1

describe("tâches", () => {
  it("I4 : seule la première création est hors décompte ; une relance pendant une création est refusée", async () => {
    const { enqueue, jobQuotaScope, pipelineActive } = await import("@/lib/jobs");
    const u = await newUser("i4");
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Projet I4", "draft", "shopify", "mono", "{}", "[]", now(), now());
    const first = enqueue({ userId: u.id, projectId: pid, type: "pipeline.run", payload: { projectId: pid, initial: true, input: {} } });
    expect(jobQuotaScope(first)).toBe("creation");
    // Le calendrier de 7 jours lancé par la première création en fait partie ; un calendrier lancé à part décompte.
    const cal = enqueue({ userId: u.id, projectId: pid, type: "calendar.plan", payload: {}, parentId: first.id });
    expect(jobQuotaScope(cal)).toBe("creation");
    expect(jobQuotaScope(enqueue({ userId: u.id, projectId: pid, type: "calendar.plan", payload: {} }))).toBe("normal");
    // Relance de la route resume pendant la création : 409.
    sessionUser = u;
    const resume = await import("@/app/api/projects/[id]/resume/route");
    const r = await resume.POST(new Request("http://localhost/api/projects/x/resume", { method: "POST", body: JSON.stringify({ from: "images" }), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: pid }) });
    expect(r.status).toBe(409);
    expect(pipelineActive(pid)).toBe(true);
    run("UPDATE jobs SET status = 'done' WHERE id = ?", first.id);
    // Après la première création : relance et nouveau départ décomptent les visuels.
    const r2 = await resume.POST(new Request("http://localhost/api/projects/x/resume", { method: "POST", body: JSON.stringify({ from: "images" }), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: pid }) });
    expect(r2.status).toBe(200);
    const resumed = one<any>("SELECT * FROM jobs WHERE id = ?", ((await r2.json()) as any).jobId);
    expect(jobQuotaScope(resumed)).toBe("normal");
    const again = enqueue({ userId: u.id, projectId: pid, type: "pipeline.run", payload: { projectId: pid, initial: true, input: {} } });
    expect(jobQuotaScope(again)).toBe("normal");
  });

  it("I5 : une tâche longue n'est pas reprise en double par le même worker ; le bail est prolongé", async () => {
    const { enqueue, claimNext, markRunning, markFinished, renewLease, getJob } = await import("@/lib/jobs");
    const u = await newUser("i5");
    const type = `audit.lease.${uniq()}`;
    const j = enqueue({ userId: u.id, type });
    const claimed = claimNext([type])!;
    expect(claimed.id).toBe(j.id);
    markRunning(j.id);
    run("UPDATE jobs SET locked_until = ? WHERE id = ?", Date.now() - 1000, j.id); // appel de plus de 90 s
    expect(claimNext([type])).toBeNull();
    expect(renewLease(j.id)).toBe(true);
    expect(getJob(j.id)!.locked_until!).toBeGreaterThan(Date.now() + 60_000);
    // Worker arrêté (plus en cours dans ce processus) et bail expiré : la tâche est bien reprise.
    markFinished(j.id);
    run("UPDATE jobs SET locked_until = ? WHERE id = ?", Date.now() - 1000, j.id);
    expect(claimNext([type])?.id).toBe(j.id);
  });

  it("mineur 1 : une tâche annulée pendant un appel puis en erreur ne revient pas en file", async () => {
    const { enqueue, claimNext, cancelJob, failJob, getJob } = await import("@/lib/jobs");
    const u = await newUser("m1");
    const type = `audit.cancel.${uniq()}`;
    const j = enqueue({ userId: u.id, type });
    claimNext([type]);
    cancelJob(j.id);
    failJob(getJob(j.id)!, new Error("ECONNRESET"));
    expect(getJob(j.id)!.status).toBe("cancelled");
  });
});

// ------------------------------------------------------------------ I6

describe("I6 : anti-SSRF", () => {
  it("refuse les adresses IPv4 encapsulées en IPv6 et les plages réservées", async () => {
    const { isPrivate, assertPublicUrl } = await import("@/lib/engine/import-link");
    for (const ip of ["::ffff:7f00:1", "::ffff:a9fe:a9fe", "::ffff:127.0.0.1", "::ffff:ac11:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::", "::1", "::", "fe80::1", "fd12::1", "198.18.0.1", "169.254.169.254", "100.64.0.1"]) expect(isPrivate(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "2606:4700::1111", "::ffff:8.8.8.8"]) expect(isPrivate(ip), ip).toBe(false);
    for (const u of ["http://[::ffff:127.0.0.1]:3000/api/health", "http://[::ffff:169.254.169.254]/latest/meta-data/", "http://[::ffff:172.17.0.1]/"]) {
      await expect(assertPublicUrl(u)).rejects.toThrow(/adresse privée|private address/);
    }
  });

  it("la connexion part vers l'adresse vérifiée (rebinding DNS) ; la lecture reste fonctionnelle (redirection, gzip)", async () => {
    const { checkedLookup, safeFetch } = await import("@/lib/engine/import-link");
    const err = await new Promise<any>((resolve) => checkedLookup("localhost", { all: true }, (e: any) => resolve(e)));
    expect(err?.code).toBe("EPRIVATEADDR");
    const server = http.createServer((req, res) => {
      if (req.url === "/r") return res.writeHead(302, { Location: "/page" }).end();
      res.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" });
      res.end(zlib.gzipSync("<title>Bonjour</title>"));
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const port = (server.address() as any).port;
    const prev = process.env.SITE_IMPORT_ALLOW_LOCAL;
    try {
      await expect(safeFetch(`http://localhost:${port}/r`)).rejects.toThrow(/adresse privée|private address/);
      process.env.SITE_IMPORT_ALLOW_LOCAL = "1";
      const r = await safeFetch(`http://localhost:${port}/r`);
      expect(r.status).toBe(200);
      expect(r.url).toContain("/page");
      expect(r.body.toString()).toBe("<title>Bonjour</title>");
    } finally {
      if (prev === undefined) delete process.env.SITE_IMPORT_ALLOW_LOCAL;
      else process.env.SITE_IMPORT_ALLOW_LOCAL = prev;
      server.close();
    }
  });
});

// ------------------------------------------------------------------ I7, I8, I9

describe("comptes et connexions", () => {
  it("I7 : pas de redirection ouverte après une connexion OAuth", async () => {
    const { safeInternalPath, internalUrl } = await import("@/lib/http");
    expect(safeInternalPath("@evil.example/phishing")).toBe("/studio");
    expect(safeInternalPath(".evil.example/x")).toBe("/studio");
    expect(safeInternalPath("//evil.example")).toBe("/studio");
    expect(safeInternalPath("/studio/@evil.example")).toBe("/studio");
    expect(safeInternalPath("/studio/abc/connexions")).toBe("/studio/abc/connexions");
    expect(new URL(internalUrl("https://studio.example.fr", "@evil.example/phishing", { a: "1" })).host).toBe("studio.example.fr");
    // Même avec un état enregistré avant la correction (chemin non vérifié), le rappel reste sur le studio.
    const { createState } = await import("@/lib/social/oauth");
    const route = await import("@/app/api/oauth/[provider]/callback/route");
    const u = await newUser("i7");
    for (const redirect of ["@evil.example/phishing", ".evil.example/phishing"]) {
      const s = createState(u.id, "meta" as any, null, redirect);
      const res = await route.GET(new Request(`http://localhost:3000/api/oauth/meta/callback?state=${s.state}&error=access_denied`), { params: Promise.resolve({ provider: "meta" }) });
      const loc = new URL(res.headers.get("location")!);
      expect(loc.host).not.toContain("evil");
      expect(loc.pathname).toBe("/studio");
    }
  });

  it("I8 : la limite des tentatives de connexion ne se contourne pas avec des espaces ou des majuscules", async () => {
    const login = await import("@/app/api/auth/login/route");
    const u = await newUser("i8");
    const post = (email: string, password: string) => login.POST(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.1` } }));
    for (let i = 0; i < 8; i++) expect((await post(`${" ".repeat(i)}${i % 2 ? u.email.toUpperCase() : u.email}`, "mauvais-mot-de-passe")).status).toBe(401);
    expect((await post(`   ${u.email}`, "motdepasse-test")).status).toBe(429);
    expect((await post(u.email.toUpperCase(), "mauvais")).status).toBe(429);
  });

  it("I8 : limite par adresse IP, toutes adresses e-mail confondues", async () => {
    const login = await import("@/app/api/auth/login/route");
    const ip = `10.8.${Math.floor(Math.random() * 250)}.7`;
    const post = (email: string) => login.POST(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "x" }), headers: { "Content-Type": "application/json", "x-forwarded-for": `1.2.3.4, ${ip}` } }));
    for (let i = 0; i < 30; i++) expect((await post(`inconnu${i}-${uniq()}@test.fr`)).status).toBe(401);
    expect((await post(`autre-${uniq()}@test.fr`)).status).toBe(429);
  });

  it("I9 : inscriptions limitées par adresse IP (par heure et par jour)", async () => {
    const { clientIp, rateHit, LIMITS } = await import("@/lib/rate-limit");
    const register = await import("@/app/api/auth/register/route");
    const ip = `10.7.${Math.floor(Math.random() * 250)}.3`;
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": `6.6.6.6, ${ip}` } }))).toBe(ip);
    for (let i = 0; i < LIMITS.registerPerIpHour.max; i++) rateHit(`register:ip:${ip}`);
    const email = `audit-i9-${uniq()}@test.fr`;
    const res = await register.POST(new Request("http://localhost/api/auth/register", { method: "POST", body: JSON.stringify({ email, password: "motdepasse-test" }), headers: { "Content-Type": "application/json", "x-forwarded-for": ip } }));
    expect(res.status).toBe(429);
    expect(one("SELECT 1 FROM users WHERE email = ?", email)).toBeFalsy();
  });
});

// ------------------------------------------------------------------ I10

describe("I10 : section Liquid écrite à la main", () => {
  it("plage littérale démesurée refusée ; boucles imbriquées interrompues par les limites du moteur", async () => {
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const schema = `{% schema %}{"name":"Boucle","settings":[],"presets":[{"name":"Boucle"}]}{% endschema %}`;
    expect(validateCustomSection(`{% for i in (1..10000) %}{% for j in (1..10000) %}x{% endfor %}{% endfor %}${schema}`)).toMatch(/plage de boucle trop grande/);
    expect(validateCustomSection(`{% for i in (1..5) %}★{% endfor %}${schema}`)).toBe(null);
    const { createEngine, isLiquidLimitError } = await import("@/lib/theme/render");
    const engine = createEngine(new Map(), "/preview/x");
    const t = Date.now();
    const err = await engine.parseAndRender("{% assign n = 20000 %}{% for i in (1..n) %}{% for j in (1..n) %}x{% endfor %}{% endfor %}").then(() => null, (e) => e);
    expect(isLiquidLimitError(err)).toBe(true);
    expect(Date.now() - t).toBeLessThan(15_000);
  });
});

// ------------------------------------------------------------------ I11

describe("I11 : image IA refusée par le contrôle qualité", () => {
  it("le visuel décompté est rendu (mois puis pack), sans effet sur les autres décomptes", async () => {
    const { refundMediaQuota } = await import("@/lib/ai/media-providers");
    const u = await newUser("i11");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    consumeQuota(u.id, "visuals", 30, "visuals:autre");
    creditPack(u.id, "visuals", `stripe:pack-${uniq()}`);
    const before = quotaView(u.id, "visuals");
    // Photo en situation : générée (décomptée sur le pack), puis refusée par le contrôle de fidélité.
    consumeQuota(u.id, "visuals", 1, "visuals:job_x:lifestyle:0:openai");
    expect(quotaView(u.id, "visuals").left).toBe(before.left - 1);
    expect(refundMediaQuota(u.id, "job_x:lifestyle:0")).toBe(1);
    expect(quotaView(u.id, "visuals")).toMatchObject({ left: before.left, pack: before.pack, used: before.used });
    expect(refundMediaQuota(u.id, "job_x:lifestyle:0")).toBe(0); // rien à rendre deux fois
    expect(one("SELECT 1 FROM quota_events WHERE ref = 'visuals:autre'")).toBeTruthy();
  });
});

// ------------------------------------------------------------------ I12

describe("I12 : publication réservée aux forfaits", () => {
  async function setupPost(plan: string | null) {
    const u = await newUser("i12");
    getSubscription(u.id);
    if (plan) run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Projet I12", "draft", "shopify", "mono", "{}", "[]", now(), now());
    const cid = id();
    run("INSERT INTO connections (id, user_id, provider, external_id, name, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", cid, u.id, "facebook", `ext-${cid}`, "Page", now(), now());
    const postId = id();
    run("INSERT INTO posts (id, project_id, connection_id, network, format, status, scheduled_at, caption, publish_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", postId, pid, cid, "facebook", "text", "review", Date.now() + 3600_000, "Bonjour", `k:${postId}`, now(), now());
    return { u, pid, postId };
  }
  const action = async (postId: string, a: string) => {
    const route = await import("@/app/api/posts/[pid]/route");
    return route.POST(new Request(`http://localhost/api/posts/${postId}`, { method: "POST", body: JSON.stringify({ action: a }), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ pid: postId }) });
  };

  it("sans forfait : programmer, valider et publier maintenant sont refusés (402)", async () => {
    const { u, postId } = await setupPost(null);
    sessionUser = u;
    for (const a of ["schedule", "approve", "publish_now"]) expect((await action(postId, a)).status).toBe(402);
    expect(one<{ status: string }>("SELECT status FROM posts WHERE id = ?", postId)!.status).toBe("review");
  });

  it("avec un forfait : la programmation reste possible", async () => {
    const { u, postId } = await setupPost("creer");
    sessionUser = u;
    expect((await action(postId, "schedule")).status).toBe(200);
    expect(one<{ status: string }>("SELECT status FROM posts WHERE id = ?", postId)!.status).toBe("scheduled");
  });

  it("forfait résilié après la programmation : rien n'est envoyé au moment de publier", async () => {
    const { planOfUserId } = await import("@/lib/plan-gates");
    const { u, postId } = await setupPost("creer");
    expect(planOfUserId(u.id)).toBe("creer");
    run("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?", u.id);
    run("UPDATE posts SET status = 'scheduled' WHERE id = ?", postId);
    expect(planOfUserId(u.id)).toBe(null);
    const { handlers } = await import("../worker/handlers");
    const { JobContext } = await import("@/lib/jobs");
    const ctx = new JobContext({ id: "j", user_id: u.id, project_id: null, type: "post.publish", payload: JSON.stringify({ postId }), checkpoint: "{}", attempts: 1, max_attempts: 3 } as any);
    expect(await handlers["post.publish"](ctx)).toMatchObject({ skipped: "sans forfait" });
    expect(one<{ status: string }>("SELECT status FROM posts WHERE id = ?", postId)!.status).toBe("review");
  });
});

// ------------------------------------------------------------------ Mineurs

describe("mineurs", () => {
  it("2 : ressortir une campagne des archives respecte la limite du forfait", async () => {
    const u = await newUser("m2");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Projet M2", "draft", "shopify", "mono", "{}", "[]", now(), now());
    sessionUser = u;
    const route = await import("@/app/api/projects/[id]/campaigns/route");
    const post = async (b: Record<string, unknown>) => route.POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ name: "C", objective: "ventes", networks: [], ...b }), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: pid }) });
    const a = (await (await post({})).json()) as any;
    expect((await post({ id: a.id, status: "archived" })).status).toBe(200);
    const b = (await (await post({})).json()) as any; // 1 campagne active (Créer)
    expect(b.id).toBeTruthy();
    expect((await post({ id: a.id, status: "draft" })).status).toBe(402);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM campaigns WHERE project_id = ? AND status != 'archived'", pid)!.n).toBe(1);
  });

  it("3 : un libellé de fait avec des caractères spéciaux ne provoque plus d'erreur", async () => {
    const { factPlaceholderRegex } = await import("@/lib/projects");
    const re = factPlaceholderRegex("poids(g) net", "weight");
    expect("Livré [À compléter : poids(g) du flacon] ici".replace(re, "50 g")).toBe("Livré 50 g ici");
    expect("[À compléter : poidsXg]".replace(factPlaceholderRegex("poids.g", "w"), "!")).toBe("[À compléter : poidsXg]");
  });

  it("4 : en-tête Range (plage de fin, plage inversée)", async () => {
    const { parseRange } = await import("@/lib/http");
    expect(parseRange("bytes=-5", 100)).toEqual({ start: 95, end: 99 });
    expect(parseRange("bytes=50-10", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=100-", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=10-", 100)).toEqual({ start: 10, end: 99 });
    expect(parseRange("bytes=0-1000", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=-", 100)).toBe(null);
  });

  it("5 : formules neutralisées dans les exports CSV", async () => {
    const { csvSafe } = await import("@/lib/accounting");
    expect(csvSafe('=HYPERLINK("http://x";"y")')).toBe(`'=HYPERLINK("http://x";"y")`);
    for (const s of ["+1", "@SUM(A1)", "-cmd", "\tx"]) expect(csvSafe(s).startsWith("'")).toBe(true);
    expect(csvSafe("-12,50")).toBe("-12,50");
    expect(csvSafe("Marie")).toBe("Marie");
  });

  it("6 : renouvellement concurrent du portefeuille (web et worker) sans double renouvellement", async () => {
    const { renewIfDue } = await import("@/lib/billing");
    const u = await newUser("m6");
    currentPeriod(u.id);
    run("UPDATE wallets SET period_start = period_start - 40*86400000, period_end = period_end - 40*86400000 WHERE user_id = ?", u.id);
    const stale = one<any>("SELECT * FROM wallets WHERE user_id = ?", u.id);
    renewIfDue(stale); // web
    consumeQuota(u.id, "visuals", 0); // sans effet
    run("UPDATE wallets SET monthly_used = 123 WHERE user_id = ?", u.id);
    renewIfDue(stale); // worker, qui avait lu l'ancienne échéance
    expect(all("SELECT 1 FROM ledger WHERE user_id = ? AND type = 'renewal'", u.id).length).toBe(1);
    expect(one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id = ?", u.id)!.monthly_used).toBe(123);
  });

  it("10 : dossier parent étranger au projet → 404", async () => {
    const { createFolder } = await import("@/lib/library");
    const u = await newUser("m10");
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Projet M10", "draft", "shopify", "mono", "{}", "[]", now(), now());
    let status = 0;
    try {
      createFolder(pid, "x", "dossier-d-un-autre-projet");
    } catch (e: any) {
      status = e.status;
    }
    expect(status).toBe(404);
  });

  it("9 : en production, pas de secret de secours pour les liens publics", async () => {
    const { signMedia } = await import("@/lib/public-url");
    const env = process.env as Record<string, string | undefined>;
    const prev = { node: env.NODE_ENV, secret: env.APP_SECRET };
    try {
      env.NODE_ENV = "production";
      delete env.APP_SECRET;
      expect(() => signMedia("asset", "abc")).toThrow(/APP_SECRET/);
    } finally {
      env.NODE_ENV = prev.node;
      if (prev.secret === undefined) delete env.APP_SECRET;
      else env.APP_SECRET = prev.secret;
    }
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});
