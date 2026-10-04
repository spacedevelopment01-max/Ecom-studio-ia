import { vi } from "vitest";
import { randomUUID } from "node:crypto";

// next/headers n'existe qu'à l'intérieur d'une requête Next : on le simule pour les tests de bibliothèque.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "vitest" }),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

export async function makeUser(plan: "free" | "plus" = "free") {
  const { sql } = await import("@/lib/db");
  const email = `t-${randomUUID().slice(0, 8)}@exemple.fr`;
  const [u] = await sql()<{ id: string }[]>`insert into users (email, plan, ai_consent_at) values (${email}, ${plan}, now()) returning id`;
  const [s] = await sql()<{ id: string }[]>`insert into sessions (user_id, token_hash, expires_at) values (${u.id}, ${randomUUID()}, now() + interval '1 day') returning id`;
  const user = { id: u.id, email, display_name: null, plan, retention_days: 365, reminders_enabled: true, ai_consent_at: new Date(), created_at: new Date() };
  const session = { id: s.id, user_id: u.id, elevated_until: null, elevated_method: null, created_at: new Date(), locked: false };
  return { user, session };
}

/** Image JPEG minimale valide (1x1) pour simuler une page. */
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

/** Image PNG réelle (1x1, blanche), décodable par les outils PDF. */
export const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC", "base64");
