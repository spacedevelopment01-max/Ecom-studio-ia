/**
 * Forfaits V2 — UN ABONNEMENT = UN PROJET UNIQUE (cahier des charges §1, §2, §9, §10, §19, §20, §21).
 * Création de projet liée à un abonnement payé libre, rattachement définitif (archivage, suppression, requête forgée,
 * concurrence), projets et budgets IA indépendants, projets masqués de l'ancienne découverte, migration.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return {
    ...real,
    currentUser: async () => sessionUser,
    requireUser: async () => {
      if (!sessionUser) throw new real.HttpError(401, "Connexion requise.");
      return sessionUser;
    },
  };
});
afterEach(() => {
  sessionUser = null;
});

describe("un abonnement = un projet", async () => {
  const { createUser, ownedProject, HttpError } = await import("@/lib/auth");
  const { id, now, one, run, migrateBillingV2 } = await import("@/lib/db");
  const { createSubscription, grantProjectPlan } = await import("@/lib/project-subscriptions");
  const pb = await import("@/lib/project-billing");
  const { reserve, balance, EUR } = await import("@/lib/billing");
  const { aiActiveFor } = await import("@/lib/ai/access");
  const projects = await import("@/app/api/projects/route");
  const projectRoute = await import("@/app/api/projects/[id]/route");
  const mk = async (tag: string) => {
    const u = await createUser(`ap-${tag}-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "A");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    return { ...u, role: "client" as const };
  };
  const createProject = async (name: string, subscription?: string) => {
    const form = new FormData();
    form.set("productName", name);
    return projects.POST(new Request(`http://localhost:3000/api/projects${subscription ? `?subscription=${subscription}` : ""}`, { method: "POST", body: form }));
  };
  const projectIds = (uid: string) => (one<{ ids: string }>("SELECT GROUP_CONCAT(id) ids FROM projects WHERE user_id = ?", uid)?.ids ?? "").split(",").filter(Boolean);

  it("compte gratuit (découverte) : aucun projet réel", async () => {
    const u = await mk("free");
    sessionUser = u;
    const r = await createProject("Ma boutique");
    expect(r.status).toBe(402);
    expect((await r.json()).code).toBe("subscription_required");
    expect(projectIds(u.id)).toEqual([]);
  });

  it("Créer payé : premier projet ; le même abonnement refuse un second projet ; archiver ou supprimer ne libère rien", async () => {
    const u = await mk("creer");
    sessionUser = u;
    const sub = createSubscription(u.id, { plan: "creer", source: "stripe", stripeSubscriptionId: `sub_${Date.now()}` });
    expect(pb.pendingSubscriptions(u.id).map((s) => s.user_id)).toEqual([sub]);
    const r1 = await createProject("Cosmétiques");
    expect(r1.status).toBe(200);
    const pid = (await r1.json()).id as string;
    expect(pb.subscriptionOfProject(pid)?.user_id).toBe(sub);
    expect(pb.projectPlan(pid)).toBe("creer");
    // Second projet avec le même abonnement : refusé, rien n'est créé.
    expect((await createProject("Vêtements")).status).toBe(402);
    expect(projectIds(u.id)).toEqual([pid]);
    // Suppression (archivage) : l'abonnement reste rattaché, toujours pas de nouveau projet.
    const del = await projectRoute.DELETE(new Request(`http://localhost:3000/api/projects/${pid}`, { method: "DELETE" }), { params: Promise.resolve({ id: pid }) });
    expect(del.status).toBe(200);
    expect(pb.subscriptionOfProject(pid)?.user_id).toBe(sub);
    expect(pb.pendingSubscriptions(u.id)).toEqual([]);
    expect((await createProject("Vêtements")).status).toBe(402);
    expect(() => ownedProject(u, pid)).toThrow(HttpError);
  });

  it("rattachement définitif : une requête forgée ne peut ni changer, ni retirer, ni supprimer le lien", async () => {
    const u = await mk("lock");
    const a = id();
    const b = id();
    for (const p of [a, b]) run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", p, u.id, "P", now(), now());
    const sub = createSubscription(u.id, { plan: "dominer", source: "admin", projectId: a });
    expect(() => run("UPDATE subscriptions SET project_id = ? WHERE user_id = ?", b, sub)).toThrow(/permanent/);
    expect(() => run("UPDATE subscriptions SET project_id = NULL WHERE user_id = ?", sub)).toThrow(/permanent/);
    expect(() => run("DELETE FROM subscriptions WHERE user_id = ?", sub)).toThrow(/never deleted/);
    expect(() => run("UPDATE subscriptions SET owner_user_id = 'autre' WHERE user_id = ?", sub)).toThrow(/permanent/);
    // Deux abonnements ne peuvent pas financer le même projet.
    expect(() => createSubscription(u.id, { plan: "creer", source: "admin", projectId: a })).toThrow();
    expect(pb.subscriptionOfProject(a)?.user_id).toBe(sub);
  });

  it("deux créations simultanées avec un seul abonnement : un seul projet", async () => {
    const u = await mk("race");
    createSubscription(u.id, { plan: "creer", source: "stripe" });
    const mkp = () => {
      const pid = id();
      run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "R", now(), now());
      return { projectId: pid, result: pid };
    };
    const first = pb.createProjectWithSubscription(u.id, null, mkp);
    expect(() => pb.createProjectWithSubscription(u.id, null, mkp)).toThrow(pb.NoFreeSubscription);
    // La transaction refusée n'a laissé aucun projet orphelin.
    expect(projectIds(u.id)).toEqual([first]);
  });

  it("nouvel abonnement : deuxième projet ; projets, forfaits et budgets IA indépendants", async () => {
    const u = await mk("multi");
    sessionUser = u;
    createSubscription(u.id, { plan: "creer", source: "stripe" });
    const a = (await (await createProject("A")).json()).id as string;
    createSubscription(u.id, { plan: "vendre", source: "stripe" });
    const b = (await (await createProject("B")).json()).id as string;
    expect([pb.projectPlan(a), pb.projectPlan(b)]).toEqual(["creer", "vendre"]);
    const ka = pb.projectAccountKey(a);
    const kb = pb.projectAccountKey(b);
    expect(ka).not.toBe(kb);
    // Budget de chaque projet : 40 % du HT de SON forfait.
    expect(balance(u.id, a).available).toBe(Math.floor(0.4 * (49 / 1.2) * EUR));
    expect(balance(u.id, b).available).toBe(Math.floor(0.4 * (89 / 1.2) * EUR));
    // Le projet A engage son budget : B n'est pas touché, et une dépense de A n'est jamais prise sur B.
    reserve(u.id, balance(u.id, a).available, { task: "t", provider: "anthropic", model: "m", projectId: a });
    expect(aiActiveFor(u.id, a)).toBe(false);
    expect(aiActiveFor(u.id, b)).toBe(true);
    expect(() => reserve(u.id, 1 * EUR, { task: "t", provider: "anthropic", model: "m", projectId: a })).toThrow(/engagé.*génération en cours/);
    expect(balance(u.id, b).available).toBe(Math.floor(0.4 * (89 / 1.2) * EUR));
    // Changement de forfait du projet B : A inchangé.
    grantProjectPlan(b, "dominer", "active");
    expect([pb.projectPlan(a), pb.projectPlan(b)]).toEqual(["creer", "dominer"]);
    // Résiliation de A : B garde ses droits.
    run("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?", ka);
    expect([pb.projectPlan(a), pb.projectPlan(b)]).toEqual([null, "dominer"]);
    // Projet d'un autre compte : jamais le budget de ce compte.
    const other = await mk("autre");
    expect(pb.accountKeyFor(other.id, b)).toBe(`noplan:${b}`);
  });

  it("abonnement payé sans projet : création possible plus tard sans repayer (le choix de l'abonnement est respecté)", async () => {
    const u = await mk("pending");
    sessionUser = u;
    const s1 = createSubscription(u.id, { plan: "creer", source: "stripe" });
    const s2 = createSubscription(u.id, { plan: "dominer", source: "stripe" });
    const pid = (await (await createProject("Services", s2)).json()).id as string;
    expect(pb.subscriptionOfProject(pid)?.user_id).toBe(s2);
    expect(pb.pendingSubscriptions(u.id).map((s) => s.user_id)).toEqual([s1]);
  });

  it("projet masqué (ancienne découverte) : invisible et inaccessible, repris par un nouvel abonnement", async () => {
    const u = await mk("hidden");
    sessionUser = u;
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, hidden, created_at, updated_at) VALUES (?,?,?,1,?,?)", pid, u.id, "Ancien essai", now(), now());
    expect(() => ownedProject(u, pid)).toThrow(HttpError);
    const list = await (await projects.GET()).json();
    expect(list.projects).toEqual([]);
    expect(list.hidden.map((h: any) => h.id)).toEqual([pid]);
    expect(() => pb.attachHiddenProject(u.id, pid, null)).toThrow(pb.NoFreeSubscription);
    createSubscription(u.id, { plan: "creer", source: "stripe" });
    expect(pb.attachHiddenProject(u.id, pid, null)).toBe(true);
    expect(ownedProject(u, pid).id).toBe(pid);
    expect(pb.projectPlan(pid)).toBe("creer");
  });

  it("migration d'une ancienne base : sauvegarde des lignes, abonnement rattaché au projet actif, ancien prix conservé, découverte masquée", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-mig-"));
    const db = new Database(path.join(dir, "old.db"));
    db.pragma("foreign_keys = ON");
    db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, secret INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
      CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT, archived INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0, updated_at INTEGER);
      CREATE TABLE subscriptions (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'none', stores INTEGER NOT NULL DEFAULT 1, stripe_customer_id TEXT, stripe_subscription_id TEXT, current_period_start INTEGER, current_period_end INTEGER, updated_at INTEGER NOT NULL, plan TEXT, billing TEXT, stripe_event_at INTEGER, stripe_checkout_at INTEGER, owner_user_id TEXT, project_id TEXT, bound_at INTEGER, created_at INTEGER, source TEXT, price_cents INTEGER, cancel_at_period_end INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE wallets (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, monthly_allowance INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE quota_usage (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, period_start INTEGER NOT NULL, key TEXT NOT NULL, included INTEGER NOT NULL, rollover INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, period_start, key));
      CREATE TABLE pack_balances (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, key));
      CREATE TABLE pack_purchases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, pack TEXT NOT NULL, ref TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
      INSERT INTO users VALUES ('paye','p@x'), ('gratuit','g@x');
      INSERT INTO projects (id, user_id, archived, updated_at) VALUES ('p-old', 'paye', 1, 1), ('p-actif', 'paye', 0, 2), ('p-essai', 'gratuit', 0, 3);
      INSERT INTO subscriptions (user_id, status, plan, billing, updated_at) VALUES ('paye', 'active', 'vendre', 'month', 1), ('gratuit', 'none', NULL, NULL, 1);
      INSERT INTO wallets VALUES ('paye', 26633333);
      INSERT INTO quota_usage VALUES ('paye', 1, 'blog', 2, 0, 1);
      INSERT INTO pack_purchases VALUES ('x', 'paye', 'videos', 'ref-1', 1);`);
    migrateBillingV2(db);
    migrateBillingV2(db); // rejouable
    const fk = (t: string) => (db.prepare(`PRAGMA foreign_key_list(${t})`).all() as unknown[]).length;
    expect(["subscriptions", "wallets", "quota_usage", "pack_balances", "pack_purchases"].map(fk)).toEqual([0, 0, 0, 0, 0]);
    expect(db.prepare("SELECT owner_user_id, project_id, price_cents FROM subscriptions WHERE user_id = 'paye'").get()).toEqual({ owner_user_id: "paye", project_id: "p-actif", price_cents: 7990 });
    expect(db.prepare("SELECT monthly_allowance FROM wallets WHERE user_id = 'paye'").get()).toEqual({ monthly_allowance: 26633333 });
    expect(db.prepare("SELECT used FROM quota_usage WHERE user_id = 'paye'").get()).toEqual({ used: 1 });
    expect(db.prepare("SELECT ref FROM pack_purchases").get()).toEqual({ ref: "ref-1" });
    expect(() => db.prepare("INSERT INTO pack_purchases VALUES ('y', 'paye', 'videos', 'ref-1', 2)").run()).toThrow(/UNIQUE/);
    expect(db.prepare("SELECT id, hidden FROM projects ORDER BY id").all()).toEqual([{ id: "p-actif", hidden: 0 }, { id: "p-essai", hidden: 1 }, { id: "p-old", hidden: 0 }]);
    expect(() => db.prepare("UPDATE subscriptions SET project_id = 'p-old' WHERE user_id = 'paye'").run()).toThrow(/permanent/);
    db.close();
  });
});
