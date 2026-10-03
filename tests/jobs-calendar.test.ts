import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { claimNext, enqueue, getJob, JobContext, JobPaused, pauseJob, releaseJob, resumeJob } from "@/lib/jobs";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { scheduleTime } from "@/lib/engine/calendar";
import { lintClaims } from "@/lib/ai/tasks";
import { product } from "./fixtures";

describe("tâches de fond", () => {
  it("une clé d'idempotence empêche les doublons ; une tâche n'est réclamée qu'une fois", async () => {
    const u = await createUser(`j${Date.now()}@test.fr`, "motdepasse-test", "J");
    const a = enqueue({ userId: u.id, type: "test.noop", payload: {}, idempotencyKey: "pub-42" });
    const b = enqueue({ userId: u.id, type: "test.noop", payload: {}, idempotencyKey: "pub-42" });
    expect(b.id).toBe(a.id);
    expect(claimNext(["test.noop"])?.id).toBe(a.id);
    expect(claimNext(["test.noop"])).toBeNull();
  });
});

describe("calendrier", () => {
  it("programme dans le fuseau choisi, heure d'été comprise", () => {
    const base = { days: 3, perDay: 1, slots: ["09:30"], networks: [], goals: "", tone: "", mix: { photo: 1, video: 0, text: 0 }, approval: "manual" as const };
    const winter = scheduleTime({ ...base, startDate: "2026-01-15", timezone: "Europe/Paris" }, 0, 0);
    expect(new Date(winter).toISOString()).toBe("2026-01-15T08:30:00.000Z");
    const summer = scheduleTime({ ...base, startDate: "2026-07-15", timezone: "Europe/Paris" }, 1, 0);
    expect(new Date(summer).toISOString()).toBe("2026-07-16T07:30:00.000Z");
  });
});

describe("contrôle des allégations", () => {
  it("signale les promesses non confirmées", () => {
    const issues = lintClaims({ hero: "Le meilleur sérum, 100 % naturel, livraison offerte" }, { product } as any);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("pause et reprise", () => {
  it("une tâche en pause n'est plus réclamée, s'arrête à son prochain point d'avancement et reprend sans perdre ses points de reprise", async () => {
    const u = await createUser(`p${Date.now()}@test.fr`, "motdepasse-test", "P");
    const j = enqueue({ userId: u.id, type: "test.pause", payload: {} });
    const claimed = claimNext(["test.pause"])!;
    const ctx = new JobContext(claimed);
    ctx.save("etape1", 42);
    pauseJob(j.id);
    expect(() => ctx.progress(0.5)).toThrow(JobPaused);
    expect(getJob(j.id)!.status).toBe("paused");
    expect(getJob(j.id)!.attempts).toBe(0);
    expect(claimNext(["test.pause"])).toBeNull();
    // Reprise rapide alors que le worker n'a pas encore rendu la main : personne d'autre ne la prend.
    resumeJob(j.id);
    expect(claimNext(["test.pause"])).toBeNull();
    // Le worker constate la pause et rend la main : la reprise est alors réclamée.
    releaseJob(j.id);
    const again = claimNext(["test.pause"])!;
    expect(again.id).toBe(j.id);
    expect(new JobContext(again).checkpoint.etape1).toBe(42);
  });
});

describe("marque locale", () => {
  it("propose toujours un nom, quelle que soit la photo", () => {
    for (let i = 0; i < 300; i++) {
      const p = { ...emptyProduct(), sector: "hightech" as const, visual: { colors: [{ hex: `#${(i * 7919).toString(16).padStart(6, "0").slice(0, 6)}`, name: "x", share: 1 }] } };
      expect(localBrand(p as any).brand.name).toBeTruthy();
    }
  });
});
