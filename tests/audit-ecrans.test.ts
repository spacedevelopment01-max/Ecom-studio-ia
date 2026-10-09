/**
 * Non-régression de l'audit des écrans : mot de passe (changement, oubli, lien administrateur), découverte gratuite
 * (création d'images, de vidéos et d'UGC réservée aux forfaits), résumés d'étapes traduits à l'affichage, retour après
 * connexion, réglages SMTP et libellés de l'administration. L'envoi d'e-mails est simulé (nodemailer remplacé).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: async (m: { to: string; subject: string; text: string }) => void sent.push(m) }) } }));

import { createUser, verifyLogin } from "@/lib/auth";
import { all, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { setSetting } from "@/lib/settings";
import { getSubscription } from "@/lib/billing";
import { runWithLang } from "@/lib/i18n-server";

const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const newUser = (tag: string) => createUser(`ecrans-${tag}-${uniq()}@test.fr`, "motdepasse-test", "Écrans");
const login = (uid: string) => {
  const token = `tok-${uniq()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), uid, now() + 3600_000, now());
  return token;
};
const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://x${url}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as any;
const flush = () => new Promise((r) => setTimeout(r, 20));
const withPlan = (uid: string, plan = "vendre") => {
  getSubscription(uid);
  run("UPDATE subscriptions SET status = 'manual', plan = ? WHERE user_id = ?", plan, uid);
};
const newProject = (uid: string) => {
  const pid = `p${uniq()}`;
  run("INSERT INTO projects (id, user_id, name, status, platform, store_type, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", pid, uid, "Projet écrans", "ready", "shopify", "mono", "{}", JSON.stringify({ name: "Marque", direction: "atelier" }), JSON.stringify({ language: "fr" }), "[]", now(), now());
  return pid;
};
const smtpOn = () => {
  setSetting("smtp.host", "smtp.test.invalid", true);
  setSetting("smtp.from", "studio@test.fr", true);
};
const smtpOff = () => ["smtp.host", "smtp.from", "smtp.port", "smtp.user", "smtp.password"].forEach((k) => setSetting(k, null));

beforeEach(() => {
  sent.length = 0;
  jar.token = "";
});
afterEach(() => smtpOff());

describe("B1 — mot de passe", () => {
  it("Mon compte : l'ancien mot de passe est exigé ; le nouveau ferme les autres sessions et garde la session en cours", async () => {
    const { POST } = await import("@/app/api/me/password/route");
    const u = await newUser("change");
    const other = login(u.id);
    jar.token = login(u.id);
    expect((await POST(post("/api/me/password", { current: "mauvais-mdp", next: "nouveau-mdp-1" }))).status).toBe(403);
    expect((await POST(post("/api/me/password", { current: "motdepasse-test", next: "court" }))).status).toBe(400);
    const r = await POST(post("/api/me/password", { current: "motdepasse-test", next: "nouveau-mdp-1" }));
    expect(r.status).toBe(200);
    expect(await verifyLogin(u.email, "nouveau-mdp-1")).not.toBeNull();
    expect(await verifyLogin(u.email, "motdepasse-test")).toBeNull();
    expect(one("SELECT 1 FROM sessions WHERE id = ?", sha256(other))).toBeUndefined();
    expect(one("SELECT 1 FROM sessions WHERE id = ?", sha256(jar.token))).toBeTruthy();
  });

  it("Mon compte : changement limité en fréquence après plusieurs mauvais mots de passe", async () => {
    const { POST } = await import("@/app/api/me/password/route");
    const u = await newUser("change-rate");
    jar.token = login(u.id);
    for (let i = 0; i < 5; i++) expect((await POST(post("/api/me/password", { current: `faux-${i}-mdp`, next: "nouveau-mdp-1" }))).status).toBe(403);
    expect((await POST(post("/api/me/password", { current: "motdepasse-test", next: "nouveau-mdp-1" }))).status).toBe(429);
  });

  it("mot de passe oublié sans envoi d'e-mails configuré : 503 « contactez le support », aucun lien créé", async () => {
    smtpOff();
    const { POST } = await import("@/app/api/auth/forgot/route");
    const u = await newUser("forgot-off");
    const r = await POST(post("/api/auth/forgot", { email: u.email }, { "x-forwarded-for": "10.0.0.1" }));
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("mail_unavailable");
    expect(all("SELECT 1 FROM password_resets WHERE user_id = ?", u.id)).toHaveLength(0);
  });

  it("mot de passe oublié : même réponse que le compte existe ou non ; e-mail avec un lien seulement s'il existe", async () => {
    smtpOn();
    const { POST } = await import("@/app/api/auth/forgot/route");
    const u = await newUser("forgot");
    const a = await POST(post("/api/auth/forgot", { email: u.email.toUpperCase() }, { "x-forwarded-for": "10.0.1.1" }));
    const b = await POST(post("/api/auth/forgot", { email: `inconnu-${uniq()}@test.fr` }, { "x-forwarded-for": "10.0.1.1" }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await a.json()).toEqual(await b.json());
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(u.email);
    expect(sent[0].text).toMatch(/\/mot-de-passe\?jeton=[\w-]{20,}/);
    expect(sent[0].text).toMatch(/1 heure/);
    // Seule l'empreinte du jeton est en base, jamais le jeton lui-même.
    const token = decodeURIComponent(sent[0].text.match(/jeton=([\w%-]+)/)![1]);
    expect(one("SELECT 1 FROM password_resets WHERE token_hash = ?", token)).toBeUndefined();
  });

  it("mot de passe oublié : fréquence limitée par adresse (silencieusement) et par connexion (429)", async () => {
    smtpOn();
    const { POST } = await import("@/app/api/auth/forgot/route");
    const u = await newUser("forgot-rate");
    for (let i = 0; i < 5; i++) expect((await POST(post("/api/auth/forgot", { email: u.email }, { "x-forwarded-for": `10.1.${i}.1` }))).status).toBe(200);
    await flush();
    expect(sent.filter((m) => m.to === u.email)).toHaveLength(3);
    const ip = "10.2.0.9";
    for (let i = 0; i < 10; i++) await POST(post("/api/auth/forgot", { email: `x${i}-${uniq()}@test.fr` }, { "x-forwarded-for": ip }));
    expect((await POST(post("/api/auth/forgot", { email: u.email }, { "x-forwarded-for": ip }))).status).toBe(429);
  });

  it("lien de réinitialisation : usage unique, valable 1 heure, ferme toutes les sessions", async () => {
    const { createResetLink, resetTokenValid } = await import("@/lib/password");
    const { POST } = await import("@/app/api/auth/reset/route");
    const u = await newUser("reset");
    const s1 = login(u.id);
    const { token, expiresAt } = createResetLink(u.id, "self");
    expect(expiresAt - now()).toBeGreaterThan(3590_000);
    expect(expiresAt - now()).toBeLessThanOrEqual(3600_000);
    expect(resetTokenValid(token)).toBe(true);
    expect((await POST(post("/api/auth/reset", { token, password: "court" }, { "x-forwarded-for": "10.3.0.1" }))).status).toBe(400);
    expect((await POST(post("/api/auth/reset", { token, password: "tout-nouveau-1" }, { "x-forwarded-for": "10.3.0.1" }))).status).toBe(200);
    expect(await verifyLogin(u.email, "tout-nouveau-1")).not.toBeNull();
    expect(one("SELECT 1 FROM sessions WHERE id = ?", sha256(s1))).toBeUndefined();
    // Deuxième usage : refusé.
    const again = await POST(post("/api/auth/reset", { token, password: "encore-autre-2" }, { "x-forwarded-for": "10.3.0.1" }));
    expect(again.status).toBe(400);
    expect((await again.json()).code).toBe("invalid_token");
    // Lien expiré : refusé.
    const old = createResetLink(u.id, "self");
    run("UPDATE password_resets SET expires_at = ? WHERE user_id = ?", now() - 1, u.id);
    expect(resetTokenValid(old.token)).toBe(false);
    expect((await POST(post("/api/auth/reset", { token: old.token, password: "encore-autre-2" }, { "x-forwarded-for": "10.3.0.1" }))).status).toBe(400);
    // Un nouveau lien annule le précédent.
    const l1 = createResetLink(u.id, "self");
    const l2 = createResetLink(u.id, "self");
    expect(resetTokenValid(l1.token)).toBe(false);
    expect(resetTokenValid(l2.token)).toBe(true);
  });

  it("administration : génère un lien pour un client (réservé à l'administrateur)", async () => {
    const { POST } = await import("@/app/api/admin/users/[uid]/reset-link/route");
    const { resetTokenValid } = await import("@/lib/password");
    const admin = await newUser("admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    const client = await newUser("client");
    jar.token = login(client.id);
    expect((await POST(post(`/api/admin/users/${admin.id}/reset-link`, {}), ctx({ uid: admin.id }))).status).toBe(403);
    jar.token = login(admin.id);
    const r = await POST(post(`/api/admin/users/${client.id}/reset-link`, {}), ctx({ uid: client.id }));
    expect(r.status).toBe(200);
    const { url } = await r.json();
    expect(url).toMatch(/\/mot-de-passe\?jeton=/);
    expect(resetTokenValid(decodeURIComponent(url.split("jeton=")[1]))).toBe(true);
    expect(one<{ created_by: string }>("SELECT created_by FROM password_resets WHERE user_id = ?", client.id)?.created_by).toBe(admin.id);
  });

  it("réglages SMTP : acceptés, chiffrés, jamais renvoyés en clair ; port et expéditeur vérifiés", async () => {
    const { POST } = await import("@/app/api/admin/settings/route");
    const { GET } = await import("@/app/api/admin/overview/route");
    const admin = await newUser("smtp-admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    jar.token = login(admin.id);
    expect((await POST(post("/api/admin/settings", { set: [{ key: "smtp.port", value: "abc" }] }))).status).toBe(400);
    expect((await POST(post("/api/admin/settings", { set: [{ key: "smtp.from", value: "pas-une-adresse" }] }))).status).toBe(400);
    const r = await POST(post("/api/admin/settings", { set: [{ key: "smtp.host", value: "smtp.secret-host.fr" }, { key: "smtp.port", value: "465" }, { key: "smtp.user", value: "compte-smtp" }, { key: "smtp.password", value: "mdp-smtp-tres-secret" }, { key: "smtp.from", value: "Studio <studio@exemple.fr>" }] }));
    expect(r.status).toBe(200);
    for (const k of ["smtp.host", "smtp.user", "smtp.password", "smtp.from"]) {
      const row = one<{ value: string; secret: number }>("SELECT value, secret FROM settings WHERE key = ?", k)!;
      expect(row.secret).toBe(1);
      expect(row.value).not.toMatch(/secret|compte|studio@/);
    }
    const o = await (await (GET as () => Promise<Response>)()).json();
    expect(o.smtp.configured).toBe(true);
    expect(o.smtp.port).toBe("465");
    expect(JSON.stringify(o)).not.toMatch(/mdp-smtp-tres-secret|smtp\.secret-host\.fr|compte-smtp/);
  });
});

describe("I7 — découverte gratuite : images, vidéos et UGC réservées aux forfaits", () => {
  it("402 clair sans forfait, accepté avec un forfait", async () => {
    const images = (await import("@/app/api/projects/[id]/images/route")).POST;
    const videos = (await import("@/app/api/projects/[id]/videos/route")).POST;
    const ugc = (await import("@/app/api/projects/[id]/ugc/route")).POST;
    const u = await newUser("decouverte");
    const pid = newProject(u.id);
    jar.token = login(u.id);
    for (const [fn, body] of [[images, { mode: "single", kind: "scene" }], [videos, { format: "9:16" }], [ugc, { options: {}, script: {} }]] as const) {
      const r = await fn(post(`/api/projects/${pid}/x`, body), ctx({ id: pid }));
      expect(r.status).toBe(402);
      const j = await r.json();
      expect(j.code).toBe("plan_required");
      expect(j.error).toMatch(/forfait/);
    }
    withPlan(u.id);
    const ok = await images(post(`/api/projects/${pid}/images`, { mode: "single", kind: "banner" }), ctx({ id: pid }));
    expect(ok.status).toBe(200);
    // M6 : libellé lisible, jamais la clé interne.
    const job = one<{ label: string }>("SELECT label FROM jobs WHERE id = ?", (await ok.json()).jobId)!;
    expect(job.label).toBe("Bannière");
    // Migration V2 : l'ancien moteur vidéo ne produit plus rien (410) ; le moteur V2 accepte la demande avec un forfait.
    expect((await videos(post(`/api/projects/${pid}/videos`, { format: "9:16" }), ctx({ id: pid }))).status).toBe(410);
    run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify({ name: "Marque" }), pid);
    const v2 = (await import("@/app/api/projects/[id]/videos/v2/route")).POST;
    expect((await v2(post(`/api/projects/${pid}/videos/v2`, { action: "generate", ask: { kind: "video_ad" } }), ctx({ id: pid }))).status).toBe(200);
  });

  it("GET /api/billing indique si la création est ouverte (forfait ou administrateur)", async () => {
    const { GET } = await import("@/app/api/billing/route");
    const u = await newUser("billing");
    jar.token = login(u.id);
    expect((await (await (GET as () => Promise<Response>)()).json()).canCreate).toBe(false);
    withPlan(u.id, "creer");
    expect((await (await (GET as () => Promise<Response>)()).json()).canCreate).toBe(true);
  });
});

describe("I2 / I3 / M9 — résumés d'étapes et questions dans la langue de l'interface", () => {
  it("les résumés enregistrés (clé + paramètres) s'affichent en FR ou en EN, sans « moteur local » ni identifiant", async () => {
    const { stepNoteText, note } = await import("@/lib/step-notes");
    const n = note("cutout.done", { n: 1 });
    expect(stepNoteText(n, "fr")).toBe("1 détourage réalisé");
    expect(stepNoteText(n, "en")).toBe("1 cutout done");
    expect(stepNoteText(note("analysis.product", { established: 3, unknown: 2, questions: 4, ai: 0 }), "en")).toBe("3 facts established, 2 unknowns, 4 questions");
    expect(stepNoteText(note("brand.done", { name: "Ondine", direction: "Terroir" }), "en")).toBe("Ondine — Terroir direction");
    expect(stepNoteText(note("calendar.started"), "fr")).not.toMatch(/\(/);
    expect(stepNoteText({ fr: "Photos reçues", en: "Photos received" }, "en")).toBe("Photos received");
    // Anciens projets : texte gardé, nettoyé des mentions techniques.
    // Anciens projets : résumés reconnus et retraduits, nettoyés des mentions techniques.
    expect(stepNoteText("1 détourage(s) réalisé(s) localement", "fr")).toBe("1 détourage réalisé");
    expect(stepNoteText("1 détourage(s) réalisé(s) localement", "en")).toBe("1 cutout done");
    expect(stepNoteText("3 information(s) établie(s), 2 inconnue(s), 4 question(s) — moteur local", "fr")).toBe("3 informations établies, 2 inconnues, 4 questions");
    expect(stepNoteText("Ondine — direction Terroir (moteur local)", "en")).toBe("Ondine — Terroir direction");
    expect(stepNoteText("Calendrier en préparation (heb0mh)", "fr")).not.toMatch(/heb0mh/);
    expect(stepNoteText("Textes de base assemblés (moteur local) — à enrichir", "en")).toBe("Base copy assembled — to be enriched");
    expect(stepNoteText("12 fichiers rangés par dossier, 2 à classer", "en")).toBe("12 files organized into folders, 2 to sort");
    // Texte inconnu : gardé tel quel (sauf mentions techniques).
    expect(stepNoteText("Site lu : Maison (moteur local)", "fr")).toBe("Site lu : Maison");
  });

  it("pipelineState traduit les résumés selon la langue de la requête", async () => {
    const { pipelineState } = await import("@/lib/engine/pipeline");
    const job = { checkpoint: JSON.stringify({ __steps: { sources: { status: "done", at: 1, note: { k: "sources.photos" } }, images: { status: "skipped", at: 1, note: { k: "skip.plan" } } } }) } as any;
    const fr = runWithLang({ ui: "fr" }, () => pipelineState(job));
    const en = runWithLang({ ui: "en" }, () => pipelineState(job));
    expect(fr.find((s) => s.id === "sources")?.note).toBe("Photos reçues");
    expect(en.find((s) => s.id === "sources")?.note).toBe("Photos received");
    expect(en.find((s) => s.id === "images")?.note).toMatch(/^Included in the plans/);
  });

  it("résumé de version bilingue et questions connues retraduites", async () => {
    const { storedText } = await import("@/lib/step-notes");
    const { localizeQuestions } = await import("@/lib/engine/local");
    const raw = JSON.stringify({ fr: "Boutique créée — direction Terroir", en: "Store created — Terroir direction" });
    expect(storedText(raw, "en")).toBe("Store created — Terroir direction");
    expect(storedText("Ancien résumé", "en")).toBe("Ancien résumé");
    const q = [{ id: "price", question: "Quel est le prix de vente (TTC) ?", why: "Indispensable pour vendre", required: true, factKey: "price" }, { id: "x1", question: "Question libre", why: "", required: false, factKey: "x" }];
    const en = runWithLang({ ui: "en" }, () => localizeQuestions(q));
    expect(en[0].question).toBe("What is the retail price (including tax)?");
    expect(en[1].question).toBe("Question libre");
  });

  it("aucune mention « moteur local » dans les textes des étapes et des réponses du chat", async () => {
    const fs = await import("node:fs");
    for (const f of ["src/lib/engine/pipeline.ts", "src/lib/engine/brand.ts", "src/lib/engine/calendar.ts", "src/lib/engine/local.ts"]) {
      const code = fs.readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l) && !/\.replace\(/.test(l));
      expect(code.join("\n"), f).not.toMatch(/moteur local|local engine|à activer dans l'administration/);
    }
  });
});

describe("M2 — retour après connexion", () => {
  it("garde le chemin interne demandé, refuse les autres origines", async () => {
    const { safeNextPath } = await import("@/lib/safe-path");
    expect(safeNextPath("/studio/compte?plan=vendre&billing=year")).toBe("/studio/compte?plan=vendre&billing=year");
    expect(safeNextPath("/studio/abc/calendrier")).toBe("/studio/abc/calendrier");
    expect(safeNextPath("/admin", "/studio")).toBe("/admin");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/connexion?suite=/x", "", null]) expect(safeNextPath(bad)).toBe("/studio");
  });
});

describe("I9 / M12 — administration", () => {
  it("l'option « Essai » n'est plus acceptée ; les comptes existants en essai restent lisibles", async () => {
    const { POST } = await import("@/app/api/admin/users/[uid]/route");
    const admin = await newUser("adm-trial");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    const c = await newUser("trial");
    jar.token = login(admin.id);
    expect((await POST(post(`/api/admin/users/${c.id}`, { subscription: "trial" }), ctx({ uid: c.id }))).status).toBe(400);
    expect((await POST(post(`/api/admin/users/${c.id}`, { subscription: "manual", plan: "dominer" }), ctx({ uid: c.id }))).status).toBe(200);
    getSubscription(c.id);
    run("UPDATE subscriptions SET status = 'trial' WHERE user_id = ?", c.id);
    const { clientRows } = await import("@/lib/admin-stats");
    expect(runWithLang({ ui: "fr" }, () => clientRows()).find((x) => x.id === c.id)?.segment).toBe("essai");
  });

  it("les packs payés sont comptés avec les « packs » du tableau de bord (et non ignorés)", async () => {
    const { dashboard } = await import("@/lib/admin-stats");
    const u = await newUser("pack");
    const before = runWithLang({ ui: "fr" }, () => dashboard()).money30;
    run("INSERT INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, created_at) VALUES (?,?,?,?,?,?,?,?)", `pay${uniq()}`, u.id, "pack", 1490, "paid", `cs_${uniq()}`, "visuals", now());
    const after = runWithLang({ ui: "fr" }, () => dashboard()).money30;
    expect(after.topupCount).toBe(before.topupCount + 1);
    expect(after.topupEur).toBeCloseTo(before.topupEur + 14.9, 2);
  });
});
