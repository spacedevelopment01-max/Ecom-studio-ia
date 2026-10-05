/**
 * Chiffrement AES-256-GCM des clés fournisseurs et jetons OAuth.
 * La clé maître provient de APP_SECRET (générée par `npm run setup`).
 */
import crypto from "node:crypto";

function masterKey(): Buffer {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET manquant (32 caractères minimum).");
    return crypto.createHash("sha256").update("dev-only-secret-ecom-studio-ia").digest();
  }
  return crypto.createHash("sha256").update(s).digest();
}

export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(box: string | null | undefined): string | null {
  if (!box) return null;
  const [v, iv, tag, data] = box.split(".");
  if (v !== "v1") return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function mask(secret: string | null | undefined): string {
  if (!secret) return "";
  return secret.length <= 8 ? "••••" : `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (s: string | Buffer) => crypto.createHash("sha256").update(s).digest("hex");

/** Empreinte signée (HMAC-SHA256 avec la clé maître) : un jeton ne peut pas être fabriqué sans APP_SECRET. */
export const hmac = (s: string) => crypto.createHmac("sha256", masterKey()).update(s).digest("hex");
