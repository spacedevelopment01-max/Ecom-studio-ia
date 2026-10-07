/**
 * Chiffrement AES-256-GCM des clés fournisseurs et jetons OAuth.
 * Secret maître unique (`masterSecret`) : APP_SECRET (généré par `npm run setup`), obligatoire en production.
 * En développement sans APP_SECRET : un secret aléatoire propre à l'installation, gardé dans `data/.app-secret`
 * (dossier exclu de Git) — jamais une constante connue. Les données chiffrées autrefois avec l'ancienne constante de
 * développement restent lisibles (`decrypt`) et sont rechiffrées avec le secret actuel (`reencryptLegacy`).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Ancienne constante de développement : uniquement pour relire (jamais pour chiffrer) les données d'avant 1C. */
const LEGACY_DEV_SECRET = "dev-only-secret-ecom-studio-ia";
const MIN_SECRET = 32;

let devSecret: { file: string; value: string } | null = null;
function devSecretFile(): string {
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), ".app-secret");
}

/** Secret maître de l'application (chiffrement, signatures des liens d'aperçu et des médias publics, jetons). */
export function masterSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= MIN_SECRET) return s;
  if (process.env.NODE_ENV === "production") throw new Error(`APP_SECRET manquant (${MIN_SECRET} caractères minimum).`);
  const file = devSecretFile();
  if (devSecret?.file === file) return devSecret.value;
  let value = "";
  try {
    value = fs.readFileSync(file, "utf8").trim();
  } catch {
    /* premier lancement : créé ci-dessous */
  }
  if (value.length < MIN_SECRET) {
    value = crypto.randomBytes(32).toString("base64url");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // « wx » : si un autre processus (worker / serveur) l'a créé entre-temps, on relit le sien.
    try {
      fs.writeFileSync(file, value + "\n", { mode: 0o600, flag: "wx" });
    } catch {
      value = fs.readFileSync(file, "utf8").trim();
    }
  }
  devSecret = { file, value };
  return value;
}

/** Clé dérivée du secret maître pour un usage donné (chiffrement, aperçu, médias publics…). */
export function derivedKey(purpose?: string): Buffer {
  return crypto.createHash("sha256").update(purpose ? `${purpose}:${masterSecret()}` : masterSecret()).digest();
}

function masterKey(): Buffer {
  return derivedKey();
}
const legacyKey = () => crypto.createHash("sha256").update(LEGACY_DEV_SECRET).digest();

export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

function open(box: string, key: Buffer): string | null {
  const [v, iv, tag, data] = box.split(".");
  if (v !== "v1" || !iv || !tag || data == null) return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Déchiffre avec le secret actuel, sinon avec l'ancienne constante de développement (aucune clé perdue). */
export function decrypt(box: string | null | undefined): string | null {
  if (!box) return null;
  return open(box, masterKey()) ?? (masterSecret() === LEGACY_DEV_SECRET ? null : open(box, legacyKey()));
}

/**
 * Rechiffre avec le secret actuel une valeur chiffrée avec l'ancienne constante de développement.
 * Renvoie la nouvelle valeur, ou null s'il n'y a rien à faire (déjà au secret actuel, ou illisible : laissée intacte).
 */
export function reencryptLegacy(box: string | null | undefined): string | null {
  if (!box || open(box, masterKey()) != null) return null;
  const plain = open(box, legacyKey());
  return plain == null ? null : encrypt(plain);
}

export function mask(secret: string | null | undefined): string {
  if (!secret) return "";
  return secret.length <= 8 ? "••••" : `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (s: string | Buffer) => crypto.createHash("sha256").update(s).digest("hex");

/** Empreinte signée (HMAC-SHA256 avec la clé maître) : un jeton ne peut pas être fabriqué sans APP_SECRET. */
export const hmac = (s: string) => crypto.createHmac("sha256", masterKey()).update(s).digest("hex");
