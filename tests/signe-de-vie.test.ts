/** Pilote : pourcentage et signe de vie de la création (le studio travaille-t-il encore ?). */
import { describe, expect, it } from "vitest";
import { jobLiveness, shortDuration } from "@/lib/job-liveness";

describe("signe de vie d'une création", () => {
  const at = 1_000_000;
  it("tâche tenue par le worker (bail en cours) : vivante, avec le temps écoulé depuis la dernière avancée", () => {
    expect(jobLiveness({ status: "running", locked_until: at + 60_000, updated_at: at - 12_000 }, at)).toEqual({ alive: true, idleMs: 12_000 });
  });
  it("bail expiré (worker arrêté) ou tâche en attente : pas vivante", () => {
    expect(jobLiveness({ status: "running", locked_until: at - 1, updated_at: at - 200_000 }, at).alive).toBe(false);
    expect(jobLiveness({ status: "queued", locked_until: null, updated_at: at }, at).alive).toBe(false);
  });
  it("durées lisibles", () => {
    expect(shortDuration(12_000)).toBe("12 s");
    expect(shortDuration(185_000)).toBe("3 min");
    expect(shortDuration(3_900_000)).toBe("1 h 05");
  });
});
