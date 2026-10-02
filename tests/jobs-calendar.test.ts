import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { claimNext, enqueue } from "@/lib/jobs";
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
