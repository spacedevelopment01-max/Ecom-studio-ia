/**
 * Intégration #194 : protections du lot 9 (#173) étendues aux fonctions arrivées après lui (#176, #190) —
 * connecteurs de boutiques (aucune redirection suivie avec les accès), photos importées par le téléchargement public
 * contrôlé, plafonds de débit atomiques des services publics de réservation.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { makeConnector } from "@/lib/products/sync";

describe("Intégration #194 — protections du lot 9 sur les nouvelles fonctions", () => {
  it("connecteur WooCommerce : chaque appel authentifié refuse les redirections", async () => {
    vi.stubEnv("STORE_CONNECT_ALLOW_LOCAL", "1");
    const seen: RequestInit[] = [];
    const fetcher = (async (_u: string | URL | Request, init?: RequestInit) => { seen.push(init ?? {}); return new Response("null", { status: 404 }); }) as typeof fetch;
    const conn = await makeConnector({ platform: "woocommerce", url: "https://203.0.113.10", key: "ck_fictive", secret: "cs_fictive" }, fetcher).catch(() => null);
    if (conn) await conn.get("1").catch(() => null);
    vi.unstubAllEnvs();
    expect(conn).not.toBeNull();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((i) => i.redirect === "error")).toBe(true);
  });

  it("photos importées d'une boutique : téléchargement public contrôlé (DNS, redirections, taille)", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/api/projects/[id]/products/sync/route.ts"), "utf8");
    expect(src).toMatch(/publicDownload\(url/);
    expect(src).not.toMatch(/await fetch\(/);
  });

  it("réservations publiques (salon, cabinet, restaurant) : plafond de débit atomique", () => {
    for (const kind of ["salon", "cabinet", "restaurant"]) {
      const src = fs.readFileSync(path.join(process.cwd(), `src/app/api/public/${kind}/[projectId]/[[...path]]/route.ts`), "utf8");
      expect(src, kind).toMatch(/rateTake\(\[\{ key, max, windowMs \}\]\)/);
      expect(src, kind).not.toMatch(/rateCount\(/);
    }
  });
});
