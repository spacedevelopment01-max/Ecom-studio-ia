/**
 * Palette choisie par le client (onglet Marque) : elle est validée et le site actuel (Theme V2) prend aussitôt ses
 * couleurs — sans IA. Métiers : escape game reconnu, plus de faux positifs (mécanismes ≠ mécanicien, décoration ≠
 * peintre, aménagé ≠ architecte d'intérieur).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Palette du client appliquée au site", async () => {
  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject, currentTheme } = await import("@/lib/projects");
  const { buildShopV2 } = await import("@/lib/theme-v2/engine");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const route = await import("@/app/api/projects/[id]/brand/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("palette « Marine et sable » enregistrée : validée, et le site change de couleurs", async () => {
    const u = await createUser(`pal${Date.now()}@test.fr`, "motdepasse-test", "P");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'none', plan = NULL WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    await fr(() => buildShopV2(null, pid));
    const before = JSON.stringify(currentTheme(pid)!.spec.settings.color_schemes);
    const palette = { primary: "#22385C", secondary: "#E8DCC6", accent: "#C99A5B", light: "#FAF7F1", dark: "#121B2B" };
    const r = await fr(() => route.PATCH(new Request(`http://localhost:3000/api/projects/${pid}/brand`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ palette, paletteExact: true }) }), { params: Promise.resolve({ id: pid }) } as any));
    expect(r.status).toBe(200);
    const out = await r.json();
    expect(out.siteUpdated).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.palette).toEqual(palette);
    expect(b.validated).toContain("palette");
    const th = currentTheme(pid)!;
    const after = JSON.stringify(th.spec.settings.color_schemes);
    expect(after).not.toBe(before);
    // La couleur principale du client est l'accent du site (boutons, liens) ; ses fonds clair/foncé sont repris.
    expect(after.toUpperCase()).toContain("#FAF7F1");
    expect(after.toUpperCase()).toContain("#22385C");
    // Enregistrer de nouveau sans rien changer : rien à refaire.
    const again = await fr(() => route.PATCH(new Request(`http://localhost:3000/api/projects/${pid}/brand`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ palette }) }), { params: Promise.resolve({ id: pid }) } as any));
    expect((await again.json()).siteUpdated).toBe(false);
  }, 60_000);
});

describe("Métiers : escape game et faux positifs", async () => {
  const { resolveTrade } = await import("@/lib/brain/trade");
  const { tradeStock } = await import("@/lib/stock/trade-queries");

  it("escape game reconnu, avec des recherches de photos de son univers", () => {
    const t = resolveTrade("Contretemps — escape game : salles d'énigmes en équipe, mécanismes et décors immersifs aménagés");
    expect(t.id).toBe("escape_game");
    const s = tradeStock("Escape game en centre-ville")!;
    expect(s.queries.join(" ")).toMatch(/escape room/);
    expect(s.must).toEqual(expect.arrayContaining(["escape", "padlock", "key"]));
  });

  it("« mécanismes », « décoration », « aménagé », « sport » ne donnent plus mécanicien, peintre ni architecte", () => {
    for (const txt of ["Mécanismes ingénieux et décoration soignée", "Espace aménagé pour les équipes", "Animation sportive et staff accueillant"]) {
      const s = tradeStock(txt);
      const q = (s?.queries ?? []).join(" ");
      expect(q).not.toMatch(/mechanic|painter|interior design|fitness|plaster/);
    }
  });
});
