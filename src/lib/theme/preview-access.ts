/**
 * Cloisonnement des aperçus de boutique.
 *
 * Les sections (sur mesure, écrites par l'IA ou venues d'un thème importé) peuvent contenir du JavaScript.
 * L'aperçu est donc servi dans un bac à sable (en-tête CSP « sandbox » et iframe `sandbox` sans
 * `allow-same-origin`) : son origine est opaque, il ne peut ni lire la session du studio ni appeler l'API
 * avec les droits du client. Comme il ne reçoit plus le cookie de session pour ses fichiers (CSS, images,
 * panier…), l'accès passe par une clé signée et temporaire placée dans l'adresse :
 * `/preview/<projet>/v/<version>~<clé>/…`, valable seulement pour ce projet et seulement pour l'aperçu.
 */
import crypto from "node:crypto";
import { one } from "../db";
import { derivedKey } from "../secrets";
import { shareBinding } from "../share-links";

const TTL_SECONDS = 12 * 3600;

// Secret maître unique (APP_SECRET, ou secret aléatoire de l'installation en développement).
const key = () => derivedKey("theme-preview");

const sign = (payload: string) => crypto.createHmac("sha256", key()).update(payload).digest("base64url").slice(0, 32);

/** Clé d'aperçu d'un projet, liée à son propriétaire. */
export function signPreview(userId: string, projectId: string, ttlSeconds = TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp.toString(36)}.${sign(`${projectId}.${userId}.${exp}.${shareBinding(projectId) ?? "unavailable"}`)}`;
}

/** Propriétaire du projet si la clé est valable (signature, échéance, projet toujours à lui), sinon null. */
export function verifyPreview(token: string, projectId: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [exp36, sig] = parts;
  if (!exp36 || !sig || !/^[0-9a-z]{1,12}$/.test(exp36)) return null;
  const exp = parseInt(exp36, 36);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId)?.user_id;
  const binding = shareBinding(projectId);
  if (!owner || !binding) return null;
  const expected = sign(`${projectId}.${owner}.${exp}.${binding}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return owner;
}

/** Segment de version avec clé : « <version>~<clé> ». */
export const previewSegment = (versionId: string, userId: string, projectId: string) => `${versionId}~${signPreview(userId, projectId)}`;

/** Sépare « <version>~<clé> ». */
export function splitPreviewSegment(seg: string): { vid: string; token: string | null } {
  const i = seg.indexOf("~");
  return i < 0 ? { vid: seg, token: null } : { vid: seg.slice(0, i), token: seg.slice(i + 1) };
}

/**
 * Origine opaque dans tous les environnements. Le transport des ressources et le pont borné du
 * studio permettent l'affichage derrière un proxy privé sans rendre sa session au document importé.
 */
export function previewIsolated(): boolean {
  return true;
}

const SANDBOX_TOKENS = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";

/** Attribut `sandbox` de l'iframe d'aperçu (le même que l'en-tête CSP). */
export const previewSandbox = (tokens = SANDBOX_TOKENS) => tokens.split(/\s+/).filter(t => t !== "allow-same-origin").join(" ");

/**
 * Bac à sable de la page d'aperçu (même ouverte hors du studio) : scripts permis, mais origine opaque,
 * donc ni cookies du studio, ni stockage, ni appels à l'API avec la session du client.
 */
export const previewCsp = (tokens = SANDBOX_TOKENS) => `sandbox ${previewSandbox(tokens)}; frame-ancestors 'self'`;

/** Valeur stricte de référence ; préférer previewCsp() pour les jetons facultatifs. */
export const PREVIEW_SANDBOX_CSP = `sandbox ${SANDBOX_TOKENS}; frame-ancestors 'self'`;

/** Le document de l'aperçu (origine « null ») lit ses propres fichiers et le panier de démonstration. */
export function previewCors(req: Request, headers: Headers): Headers {
  if (req.headers.get("origin") === "null") {
    headers.set("Access-Control-Allow-Origin", "null");
    headers.append("Vary", "Origin");
    // Ouvert seul, l'aperçu peut avoir besoin du cookie du proxy privé. Ne permettre
    // sa réponse qu'avec une capacité déjà valide, jamais par la seule session.
    try {
      const parts=new URL(req.url).pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/|$)/);
      if(parts){const{token}=splitPreviewSegment(decodeURIComponent(parts[2]));if(token&&verifyPreview(token,decodeURIComponent(parts[1])))headers.set("Access-Control-Allow-Credentials","true");}
    } catch { /* Une URL ou une capacité invalide n'ajoute aucun droit. */ }
  }
  return headers;
}
