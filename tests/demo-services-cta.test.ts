/**
 * Entreprise de services : les publications reprennent l'appel à l'action choisi par le client (devis, rendez-vous,
 * appel, contact) au lieu d'un « Prendre rendez-vous » imposé ; et un logo provisoire a déjà sa planche d'identité.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Services : appel à l'action des publications", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { socialStrategy } = await import("@/lib/social-v2/strategy");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const u = await createUser(`svc-cta-${Date.now()}@test.fr`, "motdepasse-test", "S");
  const base = loadProject(seedImageFixture(u.id, "artisan"));
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("devis, rendez-vous, appel : le premier appel à l'action est celui du client, sans doublon contradictoire", () => {
    const withMode = (contactMode: "quote" | "booking" | "call") => ({ ...base, business: "services" as const, services: { ...base.services, contactMode } });
    const q = fr(() => socialStrategy(withMode("quote"))).ctas;
    expect(q[0]).toBe("Demander un devis");
    expect(q.join(" ")).not.toMatch(/rendez-vous/i);
    expect(fr(() => socialStrategy(withMode("booking"))).ctas[0]).toBe("Prendre rendez-vous");
    expect(fr(() => socialStrategy(withMode("call"))).ctas[0]).toBe("Appeler");
  });

  it("affiche de publication : sans appel à l'action fourni, celui du mode de contact (plus de « Prendre rendez-vous » imposé)", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/ads-v2/poster.ts"), "utf8");
    expect(src).toMatch(/p\.business === "services" \? contactCta\(p\.services\?\.contactMode\)/);
  });

  it("logo provisoire : la planche d'identité est faite tout de suite", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/engine/identity.ts"), "utf8");
    const i = src.indexOf("if (opts.provisional) {");
    expect(i).toBeGreaterThan(0);
    expect(src.slice(i, i + 300)).toMatch(/saveIdentityBoard\(projectId\)/);
  });
});
