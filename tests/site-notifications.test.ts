/**
 * Demandes des sites publiés envoyées par e-mail au professionnel (#232, lot A). Serveur SMTP LOCAL de test uniquement
 * (127.0.0.1, rien n'est relayé) : enregistrement avant tout envoi, adresse du compte par défaut, nouvelle adresse
 * active seulement après confirmation, Répondre-à = visiteur, expéditeur = studio, contenu échappé, panne puis reprise
 * sans perte ni doublon, refus définitif, envoi interrompu repris, expiration, droits.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { id, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { setSetting } from "@/lib/settings";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { publishSite } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { siteRequests, deleteRequest } from "@/lib/sites/requests";
import { studioAddress } from "@/lib/sites/store";
import { addRecipient, buildNotification, confirmRecipient, LEASE_MS, processOutbox, recipients, removeRecipient, retryNotification } from "@/lib/sites/notify";
import * as route from "@/app/api/projects/[id]/site-publication/route";
import * as confirmRoute from "@/app/api/site-notify/confirm/route";
import { payingUser, servicesSite } from "./sites-fixtures";
import { decodeHeader, mimePart, SmtpSink } from "./smtp-sink";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
const sink = new SmtpSink();
let ipN = 0;

beforeAll(async () => { await sink.start(); });
afterAll(async () => { await sink.stop(); });
beforeEach(() => {
  vi.stubEnv("SITES_DOMAIN", "sites.test");
  vi.stubEnv("APP_URL", "https://studio.test");
  sink.messages = [];
  sink.mode = "ok";
  jar.token = "";
});
afterEach(() => { vi.unstubAllEnvs(); smtp(false); });

function smtp(on: boolean) {
  setSetting("smtp.host", on ? "127.0.0.1" : null);
  setSetting("smtp.port", on ? String(sink.port) : null);
  setSetting("smtp.from", on ? "Studio Test <notifications@studio.test>" : null);
}
async function waitFor(cond: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (!cond()) { if (Date.now() > end) throw new Error("délai dépassé"); await new Promise((r) => setTimeout(r, 25)); }
}
/** Laisse finir l'envoi lancé sans attendre après la demande (aucune ligne « en cours »). */
const settled = () => waitFor(() => !one("SELECT 1 FROM site_request_outbox WHERE status = 'sending'"));
function send(host: string, fields: Record<string, string>) {
  const ip = `198.51.100.${++ipN % 250}`;
  return scoped(() => serveSite(new Request(`https://${host}/contact`, { method: "POST", headers: { host, origin: `https://${host}`, referer: `https://${host}/pages/devis`, "content-type": "application/json", accept: "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ form_type: "contact", ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [`contact[${k}]`, v])) }) }), host, "/contact"));
}
async function site() {
  const u = await payingUser("notif");
  const s = await fr(() => servicesSite(u.id, "aplat"));
  await fr(() => publishSite(s.pid, u.id));
  const email = one<{ email: string }>("SELECT email FROM users WHERE id = ?", u.id)!.email;
  return { uid: u.id, pid: s.pid, host: studioAddress(s.pid)!.hostname, account: email };
}
const devis = { name: "Camille Fictive", email: "camille@example.test", phone: "06 00 00 00 00", service: "Accord", body: "Bonjour,\nun devis pour un piano droit.\n<script>alert(1)</script>" };

describe("Sans SMTP : la demande est gardée, l'e-mail attend", () => {
  it("enregistrée, notification en attente et signalée ; rien n'est perdu ni envoyé", async () => {
    const { pid, host, account } = await site();
    expect((await send(host, devis)).status).toBe(200);
    const [r] = siteRequests(pid);
    expect(r).toMatchObject({ kind: "devis", notification: "smtp_not_configured" });
    expect(recipients(pid).map((x) => [x.email, x.status, x.source])).toEqual([[account, "verified", "account"]]);
    expect(await processOutbox()).toMatchObject({ skipped: "smtp_not_configured" });
    expect(one<{ status: string }>("SELECT status FROM site_request_outbox WHERE request_id = ?", r.id)!.status).toBe("pending");
    // SMTP configuré ensuite : l'e-mail en attente part.
    smtp(true);
    await processOutbox();
    expect(sink.messages).toHaveLength(1);
    expect(siteRequests(pid)[0].notification).toBe("sent");
  });

  it("au-delà de 7 jours, l'e-mail n'est plus envoyé : la demande reste dans le studio", async () => {
    const { pid, host } = await site();
    await send(host, devis);
    run("UPDATE site_request_outbox SET created_at = ? WHERE project_id = ?", now() - 8 * 24 * 3600_000, pid);
    smtp(true);
    await processOutbox();
    expect(sink.messages).toHaveLength(0);
    expect(siteRequests(pid)[0]).toMatchObject({ notification: "failed", notification_error: "EXPIRE" });
  });
});

describe("Avec un SMTP local de test", () => {
  it("e-mail au professionnel : Répondre-à = visiteur, expéditeur = studio, contenu complet et échappé, lien vers le studio", async () => {
    smtp(true);
    const { pid, host, account } = await site();
    await send(host, devis);
    await waitFor(() => sink.messages.length === 1);
    await settled();
    const m = sink.messages[0];
    expect(m.to).toEqual([account]);
    expect(m.from).toBe("notifications@studio.test");
    expect(m.headers["reply-to"]).toBe("camille@example.test");
    expect(decodeHeader(m.headers.from)).toMatch(/via E-COM STUDIO IA.*<notifications@studio\.test>/);
    expect(decodeHeader(m.headers.subject)).toMatch(/^Nouvelle demande de devis de Camille Fictive — /);
    expect(m.headers["message-id"]).toMatch(/^<site-demande-[\w-]+@studio\.test>$/);
    expect(m.headers["auto-submitted"]).toBe("auto-generated");
    const text = mimePart(m.raw, "text/plain"), html = mimePart(m.raw, "text/html");
    for (const s of ["Camille Fictive", "camille@example.test", "06 00 00 00 00", "Accord", "un devis pour un piano droit.", `https://studio.test/studio/${pid}/boutique?demande=`]) expect(text).toContain(s);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(siteRequests(pid)[0].notification).toBe("sent");
  });

  it("nom avec saut de ligne : aucun en-tête injecté ; adresse invalide : pas de Répondre-à", async () => {
    smtp(true);
    const { host } = await site();
    await send(host, { name: "Eve\r\nBcc: espion@example.test", email: "pas-une-adresse", body: "Bonjour" });
    // E-mail du visiteur invalide : la demande est refusée par le site (422) ; aucun e-mail.
    expect(sink.messages).toHaveLength(0);
    await send(host, { name: "Eve\r\nBcc: espion@example.test", email: "eve@example.test", body: "Bonjour" });
    await waitFor(() => sink.messages.length === 1);
    expect(sink.messages[0].to).toHaveLength(1);
    expect(sink.messages[0].raw.split("\r\n\r\n")[0]).not.toMatch(/^Bcc:/im);
    expect(decodeHeader(sink.messages[0].headers.subject)).toContain("Eve Bcc: espion@example.test");
  });

  it("panne temporaire puis reprise : la demande n'est jamais perdue, l'e-mail part une seule fois", async () => {
    smtp(true);
    sink.mode = "tempfail";
    const { pid, host } = await site();
    await send(host, devis);
    await settled();
    const row = () => one<{ status: string; attempts: number; last_error: string; next_at: number }>("SELECT status, attempts, last_error, next_at FROM site_request_outbox WHERE project_id = ?", pid)!;
    expect(row()).toMatchObject({ status: "pending", attempts: 1, last_error: "SMTP_451_MAIL" });
    expect(row().next_at).toBeGreaterThan(now());
    expect(siteRequests(pid)).toHaveLength(1);
    expect(siteRequests(pid)[0].notification).toBe("pending");
    // Pas encore l'heure du nouvel essai : rien.
    await processOutbox();
    expect(row().attempts).toBe(1);
    sink.mode = "ok";
    run("UPDATE site_request_outbox SET next_at = 0 WHERE project_id = ?", pid);
    // Deux passages simultanés (site et worker) : un seul envoi.
    await Promise.all([processOutbox(), processOutbox(), processOutbox({ projectId: pid })]);
    await processOutbox();
    expect(sink.messages).toHaveLength(1);
    expect(row()).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("5 échecs temporaires → « échouée », visible ; « Renvoyer » repart et réussit", async () => {
    smtp(true);
    sink.mode = "tempfail";
    const { pid, host } = await site();
    await send(host, devis);
    await settled();
    for (let i = 0; i < 4; i++) { run("UPDATE site_request_outbox SET next_at = 0 WHERE project_id = ?", pid); await processOutbox(); }
    expect(siteRequests(pid)[0]).toMatchObject({ notification: "failed", notification_error: "SMTP_451_MAIL" });
    sink.mode = "ok";
    const r = siteRequests(pid)[0];
    await withAccessScope({ kind: "http" }, async () => retryNotification(pid, r.id));
    await waitFor(() => sink.messages.length === 1);
    await settled();
    expect(siteRequests(pid)[0].notification).toBe("sent");
  });

  it("refus définitif (550) : échouée tout de suite, sans essais inutiles", async () => {
    smtp(true);
    sink.mode = "permfail";
    const { pid, host } = await site();
    await send(host, devis);
    await settled();
    expect(one<{ status: string; attempts: number; last_error: string }>("SELECT status, attempts, last_error FROM site_request_outbox WHERE project_id = ?", pid)).toMatchObject({ status: "failed", attempts: 1, last_error: "SMTP_550_MAIL" });
  });

  it("envoi interrompu (processus arrêté pendant l'envoi) : repris après le bail, une seule fois", async () => {
    smtp(true);
    const { pid, host } = await site();
    sink.mode = "tempfail";
    await send(host, devis);
    await settled();
    sink.mode = "ok";
    run("UPDATE site_request_outbox SET status = 'sending', lease_until = ? WHERE project_id = ?", now() + LEASE_MS, pid);
    await processOutbox();
    expect(sink.messages).toHaveLength(0);
    run("UPDATE site_request_outbox SET lease_until = ? WHERE project_id = ?", now() - 1, pid);
    await processOutbox();
    await processOutbox();
    expect(sink.messages).toHaveLength(1);
  });

  it("champ piège rempli : rien n'est enregistré ni envoyé", async () => {
    smtp(true);
    const { pid, host } = await site();
    await send(host, { ...devis, site_web: "http://spam.example" });
    expect(siteRequests(pid)).toHaveLength(0);
    expect(one("SELECT 1 FROM site_request_outbox WHERE project_id = ?", pid)).toBeUndefined();
    expect(sink.messages).toHaveLength(0);
  });

  it("effacement d'une demande : ses e-mails en attente sont supprimés avec elle", async () => {
    const { pid, host } = await site();
    await send(host, devis);
    const r = siteRequests(pid)[0];
    deleteRequest(pid, r.id);
    expect(one("SELECT 1 FROM site_request_outbox WHERE request_id = ?", r.id)).toBeUndefined();
  });
});

describe("Adresses qui reçoivent les demandes", () => {
  it("nouvelle adresse : rien avant confirmation (clic + bouton), puis reçoit ; retrait : plus rien ; 3 au plus", async () => {
    smtp(true);
    const { pid, host, account } = await site();
    await withAccessScope({ kind: "http" }, async () => addRecipient(pid, "Atelier@Example.test"));
    await waitFor(() => sink.messages.length === 1);
    const verify = sink.messages[0];
    expect(verify.to).toEqual(["atelier@example.test"]);
    const link = mimePart(verify.raw, "text/plain").match(/https:\/\/studio\.test\/confirmer-notifications\?jeton=([\w%-]+)/)!;
    expect(link).toBeTruthy();
    expect(recipients(pid).find((r) => r.email === "atelier@example.test")!.status).toBe("pending");
    sink.messages = [];
    await send(host, devis);
    await waitFor(() => sink.messages.length === 1);
    await settled();
    expect(sink.messages.map((m) => m.to[0])).toEqual([account]);
    // Confirmation par le bouton de la page (le simple chargement du lien ne confirme rien).
    const res = await confirmRoute.POST(new Request("https://studio.test/api/site-notify/confirm", { method: "POST", headers: { "content-type": "application/json", origin: "https://studio.test" }, body: JSON.stringify({ token: decodeURIComponent(link[1]) }) }));
    expect(res.status).toBe(200);
    expect(confirmRecipient(decodeURIComponent(link[1]))).toBeNull();
    sink.messages = [];
    await send(host, { ...devis, email: "autre@example.test" });
    await waitFor(() => sink.messages.length === 2);
    await settled();
    expect(sink.messages.map((m) => m.to[0]).sort()).toEqual([account, "atelier@example.test"].sort());
    expect(new Set(sink.messages.map((m) => m.headers["message-id"])).size).toBe(2);
    // Retrait : plus aucun envoi vers elle.
    removeRecipient(pid, recipients(pid).find((r) => r.email === "atelier@example.test")!.id);
    sink.messages = [];
    await send(host, { ...devis, email: "trois@example.test" });
    await waitFor(() => sink.messages.length === 1);
    await settled();
    expect(sink.messages.map((m) => m.to[0])).toEqual([account]);
    await withAccessScope({ kind: "http" }, async () => { addRecipient(pid, "b@example.test"); addRecipient(pid, "c@example.test"); });
    expect(() => addRecipient(pid, "d@example.test")).toThrow(/3 adresses au plus/);
  });

  it("sans SMTP, une autre adresse ne peut pas être ajoutée (aucun lien ne partirait) ; l'adresse du compte, si", async () => {
    const { pid, account } = await site();
    removeRecipient(pid, recipients(pid)[0].id);
    expect(recipients(pid)).toHaveLength(0);
    expect(() => addRecipient(pid, "x@example.test")).toThrow(/pas encore configuré/);
    expect(addRecipient(pid, account)).toEqual({ status: "verified" });
  });

  it("aucune adresse confirmée : la demande est gardée, signalée « aucune adresse »", async () => {
    smtp(true);
    const { pid, host } = await site();
    removeRecipient(pid, recipients(pid)[0].id);
    await send(host, devis);
    expect(siteRequests(pid)[0].notification).toBe("no_recipient");
    expect(sink.messages).toHaveLength(0);
  });

  it("contenu de l'e-mail : photos choisies mais non transmises, signalées honnêtement", async () => {
    const { pid, host } = await site();
    await send(host, { ...devis, photos: "2" });
    const r = one<{ id: string; project_id: string; hostname: string; page: string; fields: string; email: string; created_at: number; kind: string }>("SELECT id, project_id, hostname, page, fields, email, created_at, kind FROM site_requests WHERE project_id = ?", pid)!;
    const m = withAccessScope({ kind: "http" }, () => buildNotification(r, "pro@example.test", "x"));
    expect(m.text).toContain("2 photo(s)");
    expect(m.text).toContain("ne sont pas transmises");
  });
});

describe("Droits", () => {
  const req = (pid: string, payload: unknown) => new Request(`http://localhost/api/projects/${pid}/site-publication`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify(payload) });
  const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) });
  const login = (uid?: string) => { jar.token = uid ? id() : ""; if (uid) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), uid, now() + 3600000, now()); };

  it("compte étranger et visiteur : ni adresses, ni demandes, ni renvoi ; le propriétaire, si", async () => {
    smtp(true);
    const { uid, pid, host } = await site();
    await send(host, devis);
    const r = siteRequests(pid)[0];
    const other = await payingUser("etranger");
    for (const who of [undefined, other.id]) {
      login(who);
      for (const payload of [{ action: "recipient-add", email: "pirate@example.test" }, { action: "request-handled", id: r.id, handled: true }, { action: "recipient-remove", id: recipients(pid)[0].id }]) {
        const res = await scoped(() => route.POST(req(pid, payload), ctx(pid)));
        expect([401, 403, 404]).toContain(res.status);
      }
    }
    expect(recipients(pid)).toHaveLength(1);
    login(uid);
    const res = await scoped(() => route.POST(req(pid, { action: "request-handled", id: r.id, handled: true }), ctx(pid)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests[0].handled_at).toBeTruthy();
    expect(body.notifications.recipients).toHaveLength(1);
  });
});
