/**
 * Forfaits V2 — écrans (cahier des charges §2.1, §2.2, §4, §15, §16) : grille à 4 cartes avec les textes officiels,
 * « 1 projet inclus par abonnement », studio Découverte sans IA, « Mes projets » par abonnement, reprise d'un ancien
 * essai gratuit uniquement avec un abonnement libre, gestion d'abonnement limitée au propriétaire du projet.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import { id, now, one, run } from "@/lib/db";
import { createSubscription, grantProjectPlan } from "@/lib/project-subscriptions";
import { PLANS } from "@/lib/plans";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const newUser = () => createUser(`ui-${uniq()}@test.fr`, "motdepasse-test", "UI");
const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) });
const post = (url: string, body: unknown) => new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

afterEach(() => {
  sessionUser = null;
});

describe("grille tarifaire et textes commerciaux", () => {
  it("4 cartes : Découverte + 3 forfaits, accroches et boutons officiels, 1 projet inclus par abonnement", () => {
    const pricing = read("src/components/pricing.tsx");
    const page = read("src/app/page.tsx");
    expect(page).toContain("<PricingCards loggedIn={!!user} withDiscovery />");
    expect(pricing).toContain("Découvrez toute la puissance du studio, gratuitement.");
    expect(pricing).toContain("Découvrir gratuitement");
    expect(pricing).toContain("Sans carte bancaire");
    expect(pricing).toContain("1 projet inclus par abonnement");
    expect(pricing).toContain("Notre recommandation");
    expect(PLANS.creer.pitch.fr).toBe("Lancez votre e-commerce avec l'intelligence artificielle.");
    expect(PLANS.creer.cta.fr).toBe("Créer mon e-commerce");
    expect(PLANS.vendre.pitch.fr).toBe("Créez vos publicités, vidéos et contenus pour développer vos ventes.");
    expect(PLANS.vendre.cta.fr).toBe("Développer mon activité");
    expect(PLANS.dominer.pitch.fr).toBe("Automatisez votre marketing et exploitez toute la puissance du studio IA.");
    expect(PLANS.dominer.cta.fr).toBe("Accéder au studio complet");
    expect(page).toContain("Vous gérez plusieurs activités ? Souscrivez un abonnement par projet et retrouvez toutes vos activités dans un seul compte E-COM STUDIO IA.");
    expect(page).toContain("Un abonnement permet-il de créer plusieurs projets ?");
    // Plus aucun ancien pack en vente ni quota de visuels affiché.
    expect(page).not.toContain("<PackCards");
    expect(pricing).not.toMatch(/visuels IA par mois/);
  });

  it("nouveau projet sans abonnement libre : le message officiel puis les 3 forfaits", () => {
    const src = read("src/components/studio/new-subscription.tsx");
    expect(src).toContain("Chaque abonnement E-COM STUDIO IA est associé à un seul projet. Pour créer une nouvelle activité, choisissez un nouvel abonnement.");
    expect(src).toContain('kind: "subscription"');
    const home = read("src/components/studio/home.tsx");
    expect(home).toContain("Ouvrir le studio");
    expect(home).toContain("Gérer mon abonnement");
    expect(home).toContain("Créer un nouveau projet");
    expect(home).toContain("en attente de création de projet");
  });

  it("studio Découverte : uniquement des exemples préexistants, aucun appel IA ni écriture", () => {
    const src = read("src/app/studio/decouverte/page.tsx");
    expect(src).not.toMatch(/@\/lib\/ai|fetch\(|api\(|enqueue|\/api\//);
    expect(src).toContain("demoList(lang)");
    expect(src).toMatch(/Aucun appel IA, aucune publication, aucun export, rien n'est enregistré/);
  });
});

describe("routes des projets et abonnements", () => {
  it("reprise d'un ancien essai gratuit : refusée sans abonnement libre, acceptée avec, et l'abonnement est consommé", async () => {
    const u = await newUser();
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, hidden, created_at, updated_at) VALUES (?,?,?,?,?,?)", pid, u.id, "Ancien essai", 1, now(), now());
    sessionUser = u;
    const { POST } = await import("@/app/api/projects/hidden/[id]/route");
    expect((await POST(post("http://t/", {}), ctx(pid))).status).toBe(402);
    createSubscription(u.id, { plan: "vendre", source: "admin", status: "manual" });
    const r = await POST(post("http://t/", {}), ctx(pid));
    expect(r.status).toBe(200);
    expect(one<{ hidden: number }>("SELECT hidden FROM projects WHERE id = ?", pid)!.hidden).toBe(0);
    expect(one<{ plan: string }>("SELECT plan FROM subscriptions WHERE project_id = ?", pid)!.plan).toBe("vendre");
  });

  it("l'abonnement d'un projet n'est visible et modifiable que par son propriétaire", async () => {
    const owner = await newUser();
    const other = await newUser();
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, owner.id, "P", now(), now());
    grantProjectPlan(pid, "creer");
    const route = await import("@/app/api/projects/[id]/subscription/route");
    sessionUser = other;
    expect((await route.GET(new Request("http://t/"), ctx(pid))).status).toBe(404);
    sessionUser = owner;
    const r = await route.GET(new Request("http://t/"), ctx(pid));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.subscription).toMatchObject({ plan: "creer", status: "manual", managedByAdmin: true });
  });

  it("paiement : la réactivation ou la recharge d'un projet d'un autre compte est refusée avant tout appel à Stripe", async () => {
    vi.resetModules();
    vi.doMock("@/lib/payments", async (orig) => ({ ...(await orig<typeof import("@/lib/payments")>()), stripeKeys: () => ({ secret: "sk_test_ui", webhookSecret: null }) }));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const owner = await newUser();
      const other = await newUser();
      const pid = id();
      run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, owner.id, "P", now(), now());
      grantProjectPlan(pid, "creer");
      sessionUser = other;
      const { POST } = await import("@/app/api/billing/checkout/route");
      expect((await POST(post("http://t/", { kind: "topup", projectId: pid }))).status).toBe(404);
      expect((await POST(post("http://t/", { kind: "reactivate", projectId: pid, plan: "dominer", billing: "month" }))).status).toBe(404);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      vi.doUnmock("@/lib/payments");
    }
  });
});
