/**
 * Audit forfaits / administration : Découverte n'est pas un forfait (libellés), abonnement payé en vigueur détecté
 * pour le compte, images de la page de connexion présentes, mise en page des cartes de l'administration et du
 * formulaire de mot de passe.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("Découverte n'est pas un forfait", () => {
  it("Mon compte et le studio de démonstration ne parlent plus de « forfait Découverte »", () => {
    for (const f of ["src/components/account.tsx", "src/app/studio/decouverte/page.tsx"]) {
      expect(src(f)).not.toMatch(/Forfait Découverte|Discovery plan/);
    }
    expect(src("src/components/account.tsx")).toContain("Compte Découverte (gratuit, sans abonnement)");
  });
});

describe("abonnement payé en vigueur (hasPaidSubscription)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { createSubscription } = await import("@/lib/project-subscriptions");
  const { hasPaidSubscription } = await import("@/lib/project-billing");

  it("Découverte : non ; résilié ou impayé : non ; payé ou offert (en attente de projet) : oui", async () => {
    const u = await createUser(`paid-${Date.now()}@test.fr`, "motdepasse-test", "P");
    expect(hasPaidSubscription(u.id)).toBe(false);
    createSubscription(u.id, { plan: "creer", status: "canceled", source: "admin" });
    createSubscription(u.id, { plan: "creer", status: "past_due", source: "stripe" });
    expect(hasPaidSubscription(u.id)).toBe(false);
    createSubscription(u.id, { plan: "vendre", status: "manual", source: "admin" });
    expect(hasPaidSubscription(u.id)).toBe(true);
    const v = await createUser(`paid2-${Date.now()}@test.fr`, "motdepasse-test", "P");
    expect(hasPaidSubscription(v.id)).toBe(false);
  });
});

describe("pages de connexion et d'administration", () => {
  it("chaque image de la page de connexion / inscription existe (aucune image cassée en anglais)", () => {
    // La photo de fond vient des pages (connexion / inscription), qui ne la passent que si le fichier du kit privé est installé.
    const imgs = [...`${src("src/app/connexion/page.tsx")}${src("src/app/inscription/page.tsx")}`.matchAll(/"(\/demo\/[^"]+\.(?:jpg|png|webp))"/g)].map((m) => m[1]);
    expect(imgs.length).toBeGreaterThan(0);
    expect(src("src/components/auth-form.tsx")).toContain("{background && <img");
    const installed = fs.existsSync(path.join(process.cwd(), "public", "demo", "onde"));
    if (installed) for (const i of imgs) expect(fs.existsSync(path.join(process.cwd(), "public", i)), i).toBe(true);
  });

  it("cartes des fournisseurs : contenu en haut (pas étiré) et pastille d'état sur une ligne", () => {
    const a = src("src/components/admin.tsx");
    expect(a).toContain('<Card key={p.id} className="grid content-start gap-3 p-5">');
    expect(a).toContain('<Badge className="shrink-0 whitespace-nowrap">{t("Aucune clé", "No key")}</Badge>');
  });

  it("changer de mot de passe : les deux champs côte à côte restent alignés", () => {
    expect(src("src/components/password-forms.tsx")).toContain('<div className="grid items-start gap-4 sm:grid-cols-2">');
  });
});

describe("connexion : le temps de réponse ne révèle pas si un compte existe", async () => {
  const { createUser, verifyLogin } = await import("@/lib/auth");

  it("adresse inconnue : une vraie vérification bcrypt est faite (durée comparable à un vrai compte)", async () => {
    const email = `timing-${Date.now()}@test.fr`;
    await createUser(email, "motdepasse-test", "T");
    const time = async (e: string) => {
      const t = performance.now();
      expect(await verifyLogin(e, "mauvais-mot-de-passe")).toBeNull();
      return performance.now() - t;
    };
    await time(email);
    await time(`chauffe-${Date.now()}@test.fr`); // première adresse inconnue : calcul de l'empreinte factice
    const known = await time(email);
    const unknown = await time(`inconnu-${Date.now()}@test.fr`);
    // Avant : ~1 ms pour une adresse inconnue contre ~100 ms pour un vrai compte (empreinte factice invalide).
    expect(unknown).toBeGreaterThan(known / 4);
  }, 20_000);
});
