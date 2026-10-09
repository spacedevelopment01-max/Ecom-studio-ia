/**
 * Sécurité (correctifs post-audit) :
 *  - retour d'autorisation OAuth rattaché au seul compte connecté qui l'a demandée ;
 *  - rôle administrateur jamais donné sur simple inscription avec ADMIN_EMAIL : lien signé, compte connecté ;
 *  - projet supprimé (archivé) inutilisable : la limite d'une boutique par abonnement ne se contourne pas ;
 *  - aucun passe-droit administrateur sur la limite de boutiques ;
 *  - séparation des comptes : le projet d'un autre compte reste introuvable.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

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
const oauth = { completed: [] as string[] };
vi.mock("@/lib/social/oauth", async (orig) => ({
  ...(await orig<object>()),
  // Échange du code chez le fournisseur simulé : enregistre pour quel compte les pages seraient rattachées.
  completeOAuth: async (_p: string, _code: string, st: { user_id: string }) => {
    oauth.completed.push(st.user_id);
    return ["page-1"];
  },
}));

afterEach(() => {
  sessionUser = null;
  delete process.env.ADMIN_EMAIL;
});

describe("sécurité après l'audit", async () => {
  const { createUser, ownedProject, HttpError } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const { createState } = await import("@/lib/social/oauth");
  const { requestAdminClaim, confirmAdminClaim } = await import("@/lib/admin-claim");
  const callback = await import("@/app/api/oauth/[provider]/callback/route");
  const projects = await import("@/app/api/projects/route");

  const mk = async (tag: string) => {
    const u = await createUser(`${tag}${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", tag);
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    return { ...u, role: "client" as const };
  };
  const project = (userId: string, archived = 0) => {
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, archived, created_at, updated_at) VALUES (?,?,?,?,?,?)", pid, userId, "P", archived, now(), now());
    return pid;
  };

  it("OAuth : un lien d'autorisation lancé par un fraudeur et ouvert par une victime n'est rattaché à personne", async () => {
    const attacker = await mk("attaquant");
    const victim = await mk("victime");
    oauth.completed.length = 0;
    const s = createState(attacker.id, "meta" as any, null, "/studio");
    sessionUser = victim; // la victime ouvre le lien dans SON navigateur
    const res = await callback.GET(new Request(`http://localhost:3000/api/oauth/meta/callback?state=${s.state}&code=abc`), { params: Promise.resolve({ provider: "meta" }) });
    expect(new URL(res.headers.get("location")!).searchParams.get("connexion")).toBe("erreur");
    expect(oauth.completed).toEqual([]);
    // Sans session non plus.
    const s2 = createState(attacker.id, "meta" as any, null, "/studio");
    sessionUser = null;
    await callback.GET(new Request(`http://localhost:3000/api/oauth/meta/callback?state=${s2.state}&code=abc`), { params: Promise.resolve({ provider: "meta" }) });
    expect(oauth.completed).toEqual([]);
    // Le compte demandeur, connecté : la connexion aboutit pour lui seul.
    const s3 = createState(victim.id, "meta" as any, null, "/studio");
    sessionUser = victim;
    const ok = await callback.GET(new Request(`http://localhost:3000/api/oauth/meta/callback?state=${s3.state}&code=abc`), { params: Promise.resolve({ provider: "meta" }) });
    expect(new URL(ok.headers.get("location")!).searchParams.get("connexion")).toBe("ok");
    expect(oauth.completed).toEqual([victim.id]);
  });

  it("ADMIN_EMAIL : inscription = compte client ; rôle donné seulement par le lien, au compte connecté de cette adresse", async () => {
    const email = `proprio${Date.now()}@test.fr`;
    process.env.ADMIN_EMAIL = email;
    const owner = await createUser(email, "motdepasse-test", "Propriétaire");
    expect(owner.role).toBe("client");
    const url = requestAdminClaim(owner)!;
    expect(url).toMatch(/\/api\/auth\/admin-claim\?jeton=/);
    const token = new URL(url).searchParams.get("jeton")!;
    const other = await mk("autre");
    expect(confirmAdminClaim(token, other)).toBe(false); // autre compte connecté
    expect(confirmAdminClaim("jeton-invente", owner)).toBe(false);
    expect(confirmAdminClaim(token, null)).toBe(false);
    expect(one<{ role: string }>("SELECT role FROM users WHERE id = ?", owner.id)!.role).toBe("client");
    expect(confirmAdminClaim(token, owner)).toBe(true);
    expect(one<{ role: string }>("SELECT role FROM users WHERE id = ?", owner.id)!.role).toBe("admin");
    // Lien à usage unique.
    run("UPDATE users SET role = 'client' WHERE id = ?", owner.id);
    expect(confirmAdminClaim(token, { ...owner, role: "client" })).toBe(false);
    // Un autre compte ne peut pas demander le rôle.
    expect(requestAdminClaim(other)).toBeNull();
  });

  it("projet supprimé (archivé) : inaccessible, et la limite d'une boutique par abonnement s'applique aussi à l'administrateur", async () => {
    const u = await mk("limite");
    const archived = project(u.id, 1);
    expect(() => ownedProject(u, archived)).toThrow(HttpError);
    const active = project(u.id);
    expect(ownedProject(u, active).id).toBe(active);
    // Un autre compte ne voit jamais ce projet.
    const other = await mk("voisin");
    expect(() => ownedProject(other, active)).toThrow(HttpError);
    // Administrateur avec déjà une boutique : pas de seconde boutique sans abonnement correspondant.
    const admin = await mk("admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    project(admin.id);
    sessionUser = { ...admin, role: "admin" };
    const form = new FormData();
    form.set("name", "Seconde boutique");
    const res = await projects.POST(new Request("http://localhost:3000/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(402);
  });
});

describe("publications : la duplication par l'ancien écran ne contourne pas l'approbation V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const route = await import("@/app/api/posts/[pid]/route");
  it("la copie d'une publication V2 reste V2 (approbation par version exigée)", async () => {
    const u = await createUser(`dup${Date.now()}@test.fr`, "motdepasse-test", "D");
    sessionUser = u;
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "P", now(), now());
    const post = id();
    run("INSERT INTO posts (id, project_id, network, format, status, scheduled_at, timezone, caption, media, engine, publish_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", post, pid, "instagram", "image", "approved", now() + 86_400_000, "Europe/Paris", "Bonjour", "[]", "v2", `k-${post}`, now(), now());
    const res = await route.POST(new Request(`http://localhost:3000/api/posts/${post}`, { method: "POST", body: JSON.stringify({ action: "duplicate" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ pid: post }) });
    const copy = (await res.json()).id;
    const row = one<{ engine: string; status: string; approved_hash: string | null }>("SELECT engine, status, approved_hash FROM posts WHERE id = ?", copy)!;
    expect(row).toEqual({ engine: "v2", status: "draft", approved_hash: null });
  });
});
