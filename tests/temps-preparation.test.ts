/**
 * Temps des préparations : durée habituelle MESURÉE (médiane des tâches terminées du même type), temps restant
 * corrigé par l'avancement, libellés honnêtes (« environ », « presque terminé », « plus long que d'habitude »).
 */
import { describe, expect, it } from "vitest";
import { clock, remaining, roughly } from "@/lib/time-estimate";

describe("temps restant", () => {
  it("durée habituelle + avancement réel", () => {
    const est = { ms: 60_000, source: "history" as const };
    expect(remaining(10_000, 0, est)).toEqual({ kind: "remaining", ms: 50_000 });
    // À mi-parcours après 40 s : 20 s selon l'habitude, 40 s selon le rythme → moyenne 30 s.
    expect(remaining(40_000, 0.5, est)).toEqual({ kind: "remaining", ms: 30_000 });
    expect(remaining(59_000, 0.99, est).kind).toBe("almost");
    expect(remaining(120_000, 1, est).kind).toBe("longer");
    // Sans repère : d'après le rythme, sinon inconnu (jamais de chiffre inventé).
    expect(remaining(20_000, 0.25, null)).toEqual({ kind: "remaining", ms: 60_000 });
    expect(remaining(2_000, 0, null).kind).toBe("unknown");
  });

  it("affichage", () => {
    expect(clock(42_000)).toBe("0:42");
    expect(clock(125_000)).toBe("2:05");
    expect(clock(3_725_000)).toBe("1 h 02");
    expect(roughly(38_000, "fr")).toBe("40 s");
    expect(roughly(150_000, "fr")).toBe("3 min");
  });
});

describe("durée habituelle d'une tâche", async () => {
  const { run, id, now } = await import("@/lib/db");
  const { jobEstimate } = await import("@/lib/job-estimate");
  const { createUser } = await import("@/lib/auth");

  it("médiane des tâches terminées du même type (au moins 3), sinon ordre de grandeur de la famille", async () => {
    const u = await createUser(`est${Date.now()}@test.fr`, "motdepasse-test", "P");
    const type = `image.test-${Date.now()}`;
    expect(jobEstimate(type)).toEqual({ ms: 30_000, source: "default" });
    const t = now();
    for (const d of [10_000, 20_000, 90_000]) run("INSERT INTO jobs (id, user_id, type, label, status, payload, run_at, created_at, updated_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), u.id, `${type}-b`, "x", "done", "{}", t - d, t - d, t, t);
    expect(jobEstimate(`${type}-b`)).toEqual({ ms: 20_000, source: "history" });
    expect(jobEstimate("inconnu.type")).toBeNull();
  });
});
