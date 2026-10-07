/**
 * Limitation de débit persistante (SQLite) : inscriptions, tentatives de connexion, mot de passe oublié.
 * Partagée entre les processus et conservée au redémarrage ; les entrées anciennes sont purgées.
 */
import { now, one, run } from "./db";
import { getSetting } from "./settings";

const KEEP_MS = 2 * 86400_000;

/**
 * Adresse IP du client. Derrière le proxy HTTPS recommandé (Caddy, Traefik, nginx), la DERNIÈRE valeur de
 * X-Forwarded-For est celle que le proxy a vue (les précédentes peuvent être forgées par le client) ;
 * sans proxy, Next.js y place l'adresse de la connexion.
 */
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  const last = xff?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  const ip = last || req.headers.get("x-real-ip")?.trim() || "";
  return ip ? ip.replace(/^::ffff:/, "").slice(0, 64) : null;
}

/** Nombre d'événements enregistrés pour `key` dans la fenêtre. */
export function rateCount(key: string, windowMs: number): number {
  return one<{ n: number }>("SELECT COUNT(*) n FROM rate_events WHERE key = ? AND at > ?", key, now() - windowMs)!.n;
}

export function rateHit(key: string) {
  run("INSERT INTO rate_events (key, at) VALUES (?, ?)", key, now());
  if (Math.random() < 0.05) run("DELETE FROM rate_events WHERE at < ?", now() - KEEP_MS);
}

export function rateClear(key: string) {
  run("DELETE FROM rate_events WHERE key = ?", key);
}

/** Limites appliquées (exportées pour les tests). */
export const LIMITS = {
  loginPerEmail: { max: 8, windowMs: 10 * 60_000 },
  loginPerIp: { max: 30, windowMs: 10 * 60_000 },
  registerPerIpHour: { max: 5, windowMs: 3600_000 },
  registerPerIpDay: { max: 10, windowMs: 86400_000 },
  forgotPerEmail: { max: 3, windowMs: 3600_000 },
  forgotPerIp: { max: 10, windowMs: 3600_000 },
  resetPerIp: { max: 20, windowMs: 10 * 60_000 },
  passwordChangePerUser: { max: 5, windowMs: 10 * 60_000 },
  /** Prompts de la bibliothèque lancés avec l'IA (onglet Prompts), par compte : valeur par défaut. */
  promptRunPerUser: { max: 20, windowMs: 3600_000 },
} as const;

/**
 * Limite effective des prompts lancés avec l'IA, par compte et par heure : réglage d'administration
 * `limits.promptRunPerHour` (ou variable d'environnement LIMITS_PROMPTRUNPERHOUR), sinon LIMITS.promptRunPerUser.
 */
export function promptRunLimit(): { max: number; windowMs: number } {
  const n = Number(getSetting("limits.promptRunPerHour"));
  return { max: Number.isInteger(n) && n > 0 ? n : LIMITS.promptRunPerUser.max, windowMs: LIMITS.promptRunPerUser.windowMs };
}
