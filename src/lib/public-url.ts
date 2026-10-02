/**
 * Adresses publiques signées et temporaires pour les médias que les réseaux
 * sociaux ou Shopify doivent télécharger (Instagram, Facebook, thème ZIP).
 */
import crypto from "node:crypto";
import { appUrl } from "./settings";

function key() {
  return crypto.createHash("sha256").update(`public-media:${process.env.APP_SECRET || "dev-only-secret-ecom-studio-ia"}`).digest();
}

export function signMedia(kind: "asset" | "theme", ref: string, ttlSeconds = 3 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${kind}.${ref}.${exp}`;
  const sig = crypto.createHmac("sha256", key()).update(payload).digest("base64url").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyMedia(token: string): { kind: "asset" | "theme"; ref: string } | null {
  let raw: string;
  try {
    raw = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [kind, ref, exp, sig] = parts;
  const expected = crypto.createHmac("sha256", key()).update(`${kind}.${ref}.${exp}`).digest("base64url").slice(0, 32);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  if (kind !== "asset" && kind !== "theme") return null;
  return { kind, ref };
}

export function publicMediaUrl(assetId: string, ext: string, ttlSeconds?: number) {
  return `${appUrl()}/api/public/media/${signMedia("asset", assetId, ttlSeconds)}/media.${ext}`;
}

export function isPublicAppUrl() {
  const u = appUrl();
  return u.startsWith("https://") && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u);
}
