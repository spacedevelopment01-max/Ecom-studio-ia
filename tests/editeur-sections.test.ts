/**
 * Éditeur de sections du studio : remplacer une section par une autre depuis la bibliothèque (titres, textes et
 * images repris), dupliquer une section — sur le vrai projet enregistré (nouvelle version, restaurable).
 */
import { describe, expect, it, vi } from "vitest";

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

describe("éditeur de sections", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  const { currentTheme, saveThemeVersion } = await import("@/lib/projects");
  const { applyOps } = await import("@/lib/theme/ops");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`editeur-${Date.now()}@test.fr`, "motdepasse-test", "E");
  const pid = await seedThemeScenario(u.id, "hightech");
  const spec = (await fr(() => composeThemeV2(pid))).spec;
  fr(() => saveThemeVersion(pid, spec, "Création", "system"));
  const route = await import("@/app/api/projects/[id]/theme/sections/route");
  const post = (body: unknown) => route.POST(new Request("http://localhost/api/projects/x/theme/sections", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: pid }) });

  it("remplacer une section : nouveau type, mêmes titre et image, au même endroit, nouvelle version", async () => {
    sessionUser = u;
    const before = currentTheme(pid)!;
    const home = before.spec.templates.index;
    const sid = home.order.find((k) => home.sections[k].type === "v2-split")!;
    expect(sid).toBeTruthy();
    const old = home.sections[sid].settings;
    const res = await fr(() => post({ type: "v2-banner", template: "index", replace: sid }));
    expect(res.status).toBe(200);
    const after = currentTheme(pid)!;
    expect(after.version.number).toBe(before.version.number + 1);
    const s = after.spec.templates.index.sections[sid];
    expect(s.type).toBe("v2-banner");
    expect(s.settings.heading).toBe(old.heading);
    expect(s.settings.image_asset).toBe(old.image_asset);
    expect(after.spec.templates.index.order.indexOf(sid)).toBe(home.order.indexOf(sid));
  });

  it("dupliquer : copie identique juste après l'originale ; la section principale d'une fiche ne se duplique pas", () => {
    const cur = currentTheme(pid)!.spec;
    const sid = cur.templates.index.order[1];
    const r = fr(() => applyOps(cur, [{ op: "duplicate_section", template: "index", section: sid }]));
    expect(r.rejected).toEqual([]);
    const o = r.spec.templates.index.order;
    expect(r.spec.templates.index.sections[o[2]]).toEqual(cur.templates.index.sections[sid]);
    const main = cur.templates.product.order.find((k) => cur.templates.product.sections[k].type === "main-product")!;
    expect(fr(() => applyOps(cur, [{ op: "duplicate_section", template: "product", section: main }])).rejected).toHaveLength(1);
  });

  it("chat : une section désignée n'est jamais remplacée par une autre ; « transforme ce bloc en… » va à l'IA", async () => {
    const { localFirst } = await import("@/lib/engine/local-first");
    const cur = currentTheme(pid)!.spec;
    const banner = cur.templates.index.order.find((k) => cur.templates.index.sections[k].type === "v2-banner" || cur.templates.index.sections[k].type === "v2-band")!;
    const sel = { template: "index", section: banner, kind: "Section" };
    const lf = (m: string) => fr(() => localFirst(cur, m, sel, [], "products", () => null));
    expect(lf("Transforme ce bloc en présentation de prestations")).toBeNull();
    const r = lf("Recompose cette section");
    if (r) for (const op of r.ops) expect((op as any).section).toBe(banner);
  });

  it("réponse de l'IA sous une autre forme (« operations », { replace_section: {…} }) : ramenée à la forme attendue, rien n'est perdu", async () => {
    const { normalizeOps } = await import("@/lib/ai/tasks");
    const { OpSchema } = await import("@/lib/theme/ops");
    const raw = { reply: "ok", ops: [], operations: [{ replace_section: { template: "index", section: "v2_banner_1", type: "services-list", settings: { heading: "Prestations" } } }, { op: "move_section", template: "index", section: "a", position: { index: 0 } }] };
    const n = normalizeOps(raw) as { ops: unknown[]; operations?: unknown };
    expect(n.operations).toBeUndefined();
    expect(n.ops).toHaveLength(2);
    expect(n.ops.every((o) => OpSchema.safeParse(o).success)).toBe(true);
    expect((n.ops[0] as { op: string }).op).toBe("replace_section");
  });
});

