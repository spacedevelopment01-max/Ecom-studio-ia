/**
 * Stabilité du serveur de développement (« next dev exited with code 0 », requêtes de 5 à 18 s) :
 *  - un second « npm run dev » (port déjà pris) ne lance RIEN (ni site, ni second worker) et le dit clairement ;
 *  - site et worker s'arrêtent ensemble (--kill-others) : jamais de worker orphelin ;
 *  - l'interface interroge le serveur une requête à la fois (jamais d'empilement quand il est lent) ;
 *  - les routes compilées restent prêtes 30 min en développement (plus de recompilations toutes les minutes).
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startPolling } from "@/lib/poll";

afterEach(() => vi.useRealTimers());

describe("serveur de développement", () => {
  it("polling : un tour est sauté tant que la requête précédente n'a pas répondu", async () => {
    vi.useFakeTimers();
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;
    const resolvers: (() => void)[] = [];
    const load = () => {
      calls++;
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise<void>((r) => resolvers.push(() => (inFlight--, r())));
    };
    const p = startPolling(load, 3000);
    // Serveur lent : 20 s sans réponse → un seul appel en vol (avant : un nouvel appel toutes les 3 s).
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toBe(1);
    expect(p.inFlight()).toBe(true);
    resolvers.shift()!();
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toBe(2);
    expect(maxInFlight).toBe(1);
    p.stop();
    resolvers.shift()!();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toBe(2);
  });

  it("polling : rien n'est envoyé onglet masqué, et une erreur n'arrête pas les tours suivants", async () => {
    vi.useFakeTimers();
    let visible = false;
    let calls = 0;
    const p = startPolling(async () => {
      calls++;
      throw new Error("panne");
    }, 1000, () => visible);
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(0);
    visible = true;
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toBe(3);
    p.stop();
  });

  it("second « npm run dev » : port déjà pris → message clair, code 1, ni site ni worker lancés", async () => {
    const srv = net.createServer().listen(0, "127.0.0.1");
    await new Promise((r) => srv.once("listening", r));
    const port = (srv.address() as net.AddressInfo).port;
    try {
      const r = spawnSync(process.execPath, ["scripts/dev.mjs"], { env: { ...process.env, STUDIO_DEV_PORT: String(port) }, encoding: "utf8", timeout: 20_000 });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(new RegExp(`Le port ${port} est déjà utilisé`));
      expect(r.stderr).toMatch(/Rien n'a été relancé/);
      expect(`${r.stdout}${r.stderr}`).not.toMatch(/\[web\]|\[worker\]/);
    } finally {
      srv.close();
    }
  });

  it("scripts : « dev » passe par le lanceur ; site et worker s'arrêtent ensemble ; routes gardées 30 min", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.scripts.dev).toBe("node scripts/dev.mjs");
    const dev = fs.readFileSync(path.join("scripts", "dev.mjs"), "utf8");
    expect(dev).toMatch(/"--kill-others"/);
    expect(dev).toMatch(/next dev -p \$\{PORT\}/);
    expect(dev).toMatch(/node_modules\/\.bin/);
    expect(fs.readFileSync("next.config.ts", "utf8")).toMatch(/onDemandEntries: \{ maxInactiveAge: 30 \* 60_000/);
    // L'interface n'utilise plus de setInterval pour interroger l'API.
    for (const f of ["src/components/ui.tsx", "src/components/studio/content-panel.tsx", "src/components/studio/tab-blog.tsx"]) {
      const s = fs.readFileSync(f, "utf8");
      expect(s).toMatch(/startPolling\(/);
      expect(s).not.toMatch(/setInterval\(async/);
    }
  });
});
