/**
 * #420 — Liste d'attente : réception signée, enregistrement avant e-mail, notification interne unique, doublons,
 * panne SMTP et reprise, import sans e-mail, accès réservé aux administrateurs. Données fictives seulement ;
 * le serveur SMTP est local (tests/smtp-sink.ts) : aucun e-mail ne sort de la machine.
 */
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
import { id, now, one, run, all } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { setSetting } from "@/lib/settings";
import { account } from "./conversation209-fixtures";
import * as ingest from "@/app/api/waitlist/ingest/route";
import * as admin from "@/app/api/admin/waitlist/route";
import { DEFAULT_NOTIFY_TO, LEASE_MS, parseCsv, processWaitlistOutbox, readSignup, rotateIngestSecret, signPayload, SECRET_KEY } from "@/lib/waitlist";
import { decodeHeader, mimePart, SmtpSink } from "./smtp-sink";

const sink = new SmtpSink();
let secret = "";
let ipN = 0;
beforeAll(async () => { await sink.start(); });
afterAll(async () => { await sink.stop(); });
beforeEach(() => {
  vi.stubEnv("APP_URL", "https://studio.test");
  sink.messages = []; sink.mode = "ok"; jar.token = "";
  run("DELETE FROM waitlist_signups WHERE 1"); // table créée au premier appel
  secret = rotateIngestSecret();
  smtp(true);
});
afterEach(() => { vi.unstubAllEnvs(); smtp(false); });
// Première création de la table pour le DELETE ci-dessus.
import { ensureWaitlistTables } from "@/lib/waitlist";
ensureWaitlistTables();

function smtp(on: boolean) {
  setSetting("smtp.host", on ? "127.0.0.1" : null);
  setSetting("smtp.port", on ? String(sink.port) : null);
  setSetting("smtp.from", on ? "Studio Test <notifications@studio.test>" : null);
}
async function waitFor(cond: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (!cond()) { if (Date.now() > end) throw new Error("délai dépassé"); await new Promise((r) => setTimeout(r, 25)); }
}
const settled = () => waitFor(() => !one("SELECT 1 FROM waitlist_signups WHERE notify_status = 'sending'"));
const fake = (n: number, extra: Record<string, unknown> = {}) => ({ id: `d1-${n}`, firstName: `Prénom${n}`, email: `inscrit.fictif.${n}@exemple.test`, category: "Boutique en ligne", description: `Projet fictif n°${n}`, consent: true, consentAt: "2026-11-04T18:00:00Z", createdAt: "2026-11-04T18:00:00Z", ...extra });
function post(payload: unknown, opts: { sig?: string | null; t?: number } = {}) {
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": `203.0.113.${++ipN % 250}` };
  const sig = opts.sig === undefined ? signPayload(raw, secret, opts.t) : opts.sig;
  if (sig) headers["x-waitlist-signature"] = sig;
  return ingest.POST(new Request("https://studio.test/api/waitlist/ingest", { method: "POST", headers, body: raw }));
}
const rows = () => all<{ id: string; email: string; notify_status: string; notify_attempts: number; notify_error: string | null; consent: string; source: string; resubmissions: number }>("SELECT * FROM waitlist_signups ORDER BY received_at");
async function as(role: "admin" | "user" | null) {
  if (!role) { jar.token = ""; return; }
  const u = await account();
  if (role === "admin") run("UPDATE users SET role = 'admin' WHERE id = ?", u.id);
  jar.token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u.id, now() + 3600000, now());
}
const adminReq = (body?: unknown) => new Request("https://studio.test/api/admin/waitlist", body ? { method: "POST", headers: { origin: "https://studio.test", "content-type": "application/json" }, body: JSON.stringify(body) } : {});

it("inscription signée : enregistrée, visible dans l'administration, une seule notification à l'adresse interne", async () => {
  const r = await post({ kind: "signup", signup: fake(1) });
  expect(r.status).toBe(201);
  const json = await r.json();
  expect(json).toMatchObject({ ok: true, status: "created" });
  expect(JSON.stringify(json)).not.toContain("exemple.test"); // la réponse ne renvoie jamais les coordonnées
  await waitFor(() => rows()[0]?.notify_status === "sent");
  expect(sink.messages).toHaveLength(1);
  const m = sink.messages[0];
  expect(m.to).toEqual([DEFAULT_NOTIFY_TO]);
  expect(decodeHeader(m.headers["subject"])).toBe("Liste d'attente — nouvelle inscription : Boutique en ligne");
  const text = mimePart(m.raw, "text/plain");
  for (const s of ["Prénom1", "inscrit.fictif.1@exemple.test", "Boutique en ligne", "Projet fictif n°1", "Consentement donné", "aucun e-mail n'a été envoyé à la personne inscrite"]) expect(text).toContain(s);
  await as("admin");
  const view = await (await admin.GET()).json();
  expect(view.total).toBe(1);
  expect(view.signups[0]).toMatchObject({ firstName: "Prénom1", email: "inscrit.fictif.1@exemple.test", category: "Boutique en ligne", description: "Projet fictif n°1", consent: "given", notify: { status: "sent" } });
});

it("doublon : même adresse (casse différente) ou même identifiant du site → aucune seconde ligne, aucun second e-mail", async () => {
  await post({ kind: "signup", signup: fake(2) });
  await waitFor(() => rows()[0]?.notify_status === "sent");
  const again = await post({ kind: "signup", signup: fake(2, { email: "INSCRIT.Fictif.2@Exemple.test" }) });
  expect(again.status).toBe(200);
  expect(await again.json()).toMatchObject({ status: "duplicate" });
  const sameId = await post({ kind: "signup", signup: fake(2, { email: "autre.adresse@exemple.test" }) });
  expect(await sameId.json()).toMatchObject({ status: "duplicate" });
  // Même requête rejouée telle quelle (nouvelle tentative du site) : toujours un doublon.
  const raw = JSON.stringify({ kind: "signup", signup: fake(2) }), sig = signPayload(raw, secret);
  for (let i = 0; i < 2; i++) await ingest.POST(new Request("https://studio.test/api/waitlist/ingest", { method: "POST", headers: { "x-waitlist-signature": sig }, body: raw }));
  await settled();
  expect(rows()).toHaveLength(1);
  expect(rows()[0].resubmissions).toBe(4);
  expect(sink.messages).toHaveLength(1);
});

it("deux envois simultanés de la même nouvelle inscription : une ligne, un e-mail", async () => {
  await Promise.all([post({ kind: "signup", signup: fake(3) }), post({ kind: "signup", signup: fake(3) }), processWaitlistOutbox(), processWaitlistOutbox()]);
  await waitFor(() => rows()[0]?.notify_status === "sent");
  await Promise.all([processWaitlistOutbox(), processWaitlistOutbox()]);
  expect(rows()).toHaveLength(1);
  expect(sink.messages).toHaveLength(1);
});

it("signature absente, fausse, d'un autre secret ou trop ancienne → 401, rien n'est enregistré ; sans secret configuré → 503", async () => {
  const body = { kind: "signup", signup: fake(4) };
  expect((await post(body, { sig: null })).status).toBe(401);
  expect((await post(body, { sig: "t=1,v1=" + "0".repeat(64) })).status).toBe(401);
  expect((await post(body, { sig: signPayload(JSON.stringify(body), "wl_autre_secret") })).status).toBe(401);
  expect((await post(body, { t: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(401);
  // Corps modifié après signature.
  const raw = JSON.stringify(body), sig = signPayload(raw, secret);
  expect((await ingest.POST(new Request("https://studio.test/api/waitlist/ingest", { method: "POST", headers: { "x-waitlist-signature": sig }, body: raw.replace("fictif.4", "pirate.4") }))).status).toBe(401);
  expect(rows()).toHaveLength(0);
  setSetting(SECRET_KEY, null);
  expect((await post(body)).status).toBe(503);
  expect(rows()).toHaveLength(0);
  expect(sink.messages).toHaveLength(0);
});

it("panne SMTP (refus temporaire puis serveur arrêté) : l'inscription reste enregistrée et visible ; la reprise envoie un seul e-mail", async () => {
  sink.mode = "tempfail";
  expect((await post({ kind: "signup", signup: fake(5) })).status).toBe(201);
  await settled();
  expect(rows()[0]).toMatchObject({ notify_status: "pending", notify_attempts: 1, notify_error: "SMTP_451_MAIL" });
  await as("admin");
  let view = await (await admin.GET()).json();
  expect(view.signups[0]).toMatchObject({ email: "inscrit.fictif.5@exemple.test", notify: { status: "pending", attempts: 1 } });
  // Serveur SMTP injoignable : toujours enregistrée, toujours en attente.
  smtp(false); setSetting("smtp.host", "127.0.0.1"); setSetting("smtp.port", "1"); setSetting("smtp.from", "x@studio.test");
  expect((await admin.POST(adminReq({ action: "retry", id: rows()[0].id }))).status).toBe(200);
  expect(rows()[0].notify_status).toBe("pending");
  expect(rows()[0].notify_error).toMatch(/^(ECONNREFUSED|ESOCKET|ECONNECTION)$/);
  // Retour à la normale : « Retenter » envoie, une seule fois.
  smtp(true); sink.mode = "ok";
  view = await (await admin.POST(adminReq({ action: "retry", id: rows()[0].id }))).json();
  expect(view.signups[0].notify.status).toBe("sent");
  await processWaitlistOutbox();
  expect(sink.messages).toHaveLength(1);
});

it("refus définitif (550) : notification en échec, retentable depuis l'administration ; SMTP non configuré : en attente sans perte", async () => {
  sink.mode = "permfail";
  await post({ kind: "signup", signup: fake(6) });
  await settled();
  expect(rows()[0]).toMatchObject({ notify_status: "failed", notify_error: "SMTP_550_MAIL" });
  sink.mode = "ok";
  await as("admin");
  const view = await (await admin.POST(adminReq({ action: "retry-failed" }))).json();
  expect(view.signups[0].notify.status).toBe("sent");
  expect(sink.messages).toHaveLength(1);
  smtp(false);
  expect((await post({ kind: "signup", signup: fake(7) })).status).toBe(201);
  expect(await processWaitlistOutbox()).toMatchObject({ skipped: "smtp_not_configured" });
  expect(rows().find((r) => r.email.includes("fictif.7"))!.notify_status).toBe("pending");
});

it("un envoi interrompu (processus arrêté pendant l'envoi) est repris après le bail, sans double envoi", async () => {
  smtp(false);
  await post({ kind: "signup", signup: fake(8) });
  run("UPDATE waitlist_signups SET notify_status = 'sending', notify_lease_until = ?", now() - 1);
  smtp(true);
  await processWaitlistOutbox();
  expect(rows()[0].notify_status).toBe("sent");
  expect(sink.messages).toHaveLength(1);
  expect(LEASE_MS).toBeGreaterThan(0);
});

it("import des anciennes inscriptions (route signée ou administration) : aucun e-mail, consentement « non enregistré » si absent, doublons ignorés", async () => {
  const r = await post({ kind: "import", signups: [{ email: "ancien.1@exemple.test", category: "Prestations de services", created_at: "2026-10-20 09:15:00" }, { email: "ancien.2@exemple.test", prenom: "Ancien", categorie: "Boutique en ligne", consentement: "oui" }, { email: "pas-une-adresse" }] });
  expect(await r.json()).toMatchObject({ created: 2, duplicates: 0, rejected: [{ index: 2 }] });
  await as("admin");
  const csv = "created_at;prenom;email;categorie;description\n2026-10-21;Ancienne;ancien.3@exemple.test;Restaurant;\"Une description ; avec point-virgule\"\n2026-10-22;;ANCIEN.1@exemple.test;Autre;";
  const view = await (await admin.POST(adminReq({ action: "import", format: "csv", text: csv }))).json();
  expect(view.import).toMatchObject({ created: 1, duplicates: 1 });
  await processWaitlistOutbox();
  expect(sink.messages).toHaveLength(0);
  const byMail = Object.fromEntries(view.signups.map((s: { email: string }) => [s.email, s]));
  expect(byMail["ancien.1@exemple.test"]).toMatchObject({ consent: "unrecorded", source: "import", notify: { status: "skipped" } });
  expect(byMail["ancien.2@exemple.test"]).toMatchObject({ consent: "given", firstName: "Ancien" });
  expect(byMail["ancien.3@exemple.test"]).toMatchObject({ description: "Une description ; avec point-virgule", consent: "unrecorded" });
  expect(new Date(byMail["ancien.1@exemple.test"].signedUpAt).toISOString().slice(0, 10)).toBe("2026-10-20");
});

it("Administration › Liste d'attente : 401 sans session, 403 pour un client, aucune donnée ni action ; secret jamais relu", async () => {
  await post({ kind: "signup", signup: fake(9) });
  await settled();
  await as(null);
  expect((await admin.GET()).status).toBe(401);
  await as("user");
  const g = await admin.GET();
  expect(g.status).toBe(403);
  expect(await g.text()).not.toContain("exemple.test");
  for (const action of [{ action: "rotate-secret" }, { action: "retry-failed" }, { action: "notify-to", email: "pirate@exemple.test" }, { action: "import", format: "json", text: "[]" }]) expect((await admin.POST(adminReq(action))).status).toBe(403);
  await as("admin");
  const view = await (await admin.GET()).json();
  expect(view.settings.secretConfigured).toBe(true);
  expect(JSON.stringify(view)).not.toContain(secret);
  const rotated = await (await admin.POST(adminReq({ action: "rotate-secret" }))).json();
  expect(rotated.newSecret).toMatch(/^wl_/);
  expect(JSON.stringify(await (await admin.GET()).json())).not.toContain(rotated.newSecret);
});

it("adresse interne modifiable par l'administrateur ; lecture tolérante des champs du formulaire", async () => {
  await as("admin");
  expect((await admin.POST(adminReq({ action: "notify-to", email: "pas une adresse" }))).status).toBe(400);
  await admin.POST(adminReq({ action: "notify-to", email: "equipe@exemple.test" }));
  await post({ kind: "signup", signup: fake(10) });
  await waitFor(() => sink.messages.length === 1);
  expect(sink.messages[0].to).toEqual(["equipe@exemple.test"]);
  await admin.POST(adminReq({ action: "notify-to", email: null }));
  expect(readSignup({ email: "a@b.fr", type_projet: "Site vitrine", message: "x", consent: "false" })).toMatchObject({ category: "Site vitrine", description: "x", consent: "refused" });
  expect(readSignup({ email: "a@b.fr" })).toMatchObject({ category: "Non précisé", consent: "unrecorded", firstName: null });
  expect(() => readSignup({ email: "pas-une-adresse" })).toThrow();
  expect(parseCsv("email,category\r\na@b.fr,\"Boutique, en ligne\"\r\n")).toEqual([{ email: "a@b.fr", category: "Boutique, en ligne" }]);
});
