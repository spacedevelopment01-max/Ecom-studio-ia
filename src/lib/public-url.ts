/**
 * Adresses publiques signées et temporaires pour les médias que les réseaux
 * sociaux ou Shopify doivent télécharger (Instagram, Facebook, thème ZIP).
 */
import crypto from "node:crypto";
import { appUrl } from "./settings";
import { derivedKey } from "./secrets";
import { one } from "./db";
import { shareBinding } from "./share-links";

// Secret maître unique : en production APP_SECRET est obligatoire (aucun secret de secours connu de tous).
const key = () => derivedKey("public-media");

function bindingFor(kind: string, ref: string): string | null {
  if (kind === "theme") return shareBinding(ref.split(":")[0]);
  if (kind !== "asset") return null;
  const a = one<{ project_id: string; user_id: string; owner: string }>("SELECT a.project_id,a.user_id,p.user_id owner FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.id=? AND a.deleted_at IS NULL", ref);
  return a && a.user_id === a.owner ? shareBinding(a.project_id) : null;
}

export function signMedia(kind: "asset" | "theme", ref: string, ttlSeconds = 3 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${kind}.${ref}.${exp}`;
  const secret = key();
  const sig = crypto.createHmac("sha256", secret).update(`${payload}.${bindingFor(kind, ref) ?? "unavailable"}`).digest("base64url").slice(0, 32);
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
  const binding = bindingFor(kind, ref);
  if (!binding || !/^\d{1,12}$/.test(exp) || !Number.isFinite(Number(exp))) return null;
  const expected = crypto.createHmac("sha256", key()).update(`${kind}.${ref}.${exp}.${binding}`).digest("base64url").slice(0, 32);
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
