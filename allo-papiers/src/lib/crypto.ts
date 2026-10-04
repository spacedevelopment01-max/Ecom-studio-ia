import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { ConfigError } from "./db";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Empreinte avec clé (HMAC) : sert à stocker jetons, codes et IP sans les conserver en clair. */
export function keyedHash(value: string): string {
  const secret = env.sessionSecret;
  if (!secret) throw new ConfigError("SESSION_SECRET manquant.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Code numérique à 6 chiffres, uniformément tiré. */
export function numericCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

// ───────────── Chiffrement applicatif des fichiers (AES-256-GCM) ─────────────
// En plus du chiffrement au repos du fournisseur, chaque fichier est chiffré par le
// serveur avant d'être stocké. La clé reste côté serveur (variable FILE_ENCRYPTION_KEY) :
// ce n'est PAS un chiffrement de bout en bout, le serveur peut déchiffrer pour l'analyse.
const MAGIC = Buffer.from("AP1");

function fileKey(): Buffer {
  const raw = env.fileEncryptionKey;
  if (!raw) throw new ConfigError("FILE_ENCRYPTION_KEY manquant : impossible de chiffrer les fichiers.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new ConfigError("FILE_ENCRYPTION_KEY doit faire 32 octets encodés en base64.");
  return key;
}

export function encryptBlob(plain: Buffer, aad: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", fileKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), enc]);
}

export function decryptBlob(blob: Buffer, aad: string): Buffer {
  if (!blob.subarray(0, 3).equals(MAGIC)) throw new Error("Format de fichier chiffré inconnu.");
  const iv = blob.subarray(3, 15);
  const tag = blob.subarray(15, 31);
  const decipher = createDecipheriv("aes-256-gcm", fileKey(), iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(31)), decipher.final()]);
}
