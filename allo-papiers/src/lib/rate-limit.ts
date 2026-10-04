import "server-only";
import { sql } from "./db";
import { HttpError } from "./http";

/** Limitation de fréquence persistée en base (fonctionne avec plusieurs instances serveur). */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const [row] = await sql()<{ count: number }[]>`
    insert into rate_limits (key, window_start, count) values (${key}, ${windowStart}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`;
  if (row.count > max) throw new HttpError(429, "trop_de_demandes", "Trop de tentatives. Patientez quelques minutes avant de réessayer.");
}
