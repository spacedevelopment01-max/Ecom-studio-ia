/**
 * Masquage des secrets dans tout texte journalisé (journal d'erreurs, trace des appels, diagnostic) :
 * clés OpenAI / Anthropic / Gemini / Pixabay / fal / Stripe, jetons OAuth (réseaux, Shopify, Google),
 * en-têtes Authorization et Bearer, paramètres `key=` / `token=`, et le secret maître de l'application.
 * Jamais de valeur partielle : le secret est remplacé par « *** ».
 */
import { masterSecret } from "./secrets";

const PATTERNS: [RegExp, string][] = [
  // En-têtes : Authorization, clés Google / Shopify / Anthropic (toute la valeur).
  [/\b(authorization|x-goog-api-key|x-shopify-access-token|x-api-key)(["']?\s*[:=]\s*["']?)[^"'\r\n,}]+/gi, "$1$2***"],
  [/\b(Bearer|Basic|Key|Token)\s+[A-Za-z0-9._~+/:=-]{8,}/g, "$1 ***"],
  // Clés de fournisseurs.
  [/\bsk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-***"],
  [/\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{8,}/g, "sk-***"],
  [/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g, "stripe_***"],
  [/\bwhsec_[A-Za-z0-9]{8,}/g, "whsec_***"],
  [/\bAIza[0-9A-Za-z_-]{10,}/g, "AIza***"],
  [/\b\d{5,10}-[0-9a-f]{32}\b/g, "pixabay-***"],
  // Jetons OAuth : Shopify, Google, Meta, génériques en JSON.
  [/\bshp(?:at|ca|ss|pa)_[A-Za-z0-9]{8,}/g, "shp_***"],
  [/\bya29\.[A-Za-z0-9._-]{8,}/g, "ya29.***"],
  [/\bEAA[A-Za-z0-9]{20,}/g, "EAA***"],
  [/(["']?(?:access_token|refresh_token|id_token|client_secret|api_key|apikey|app_secret|password)["']?\s*:\s*["'])[^"']+(["'])/gi, "$1***$2"],
  [/\b(key|api_key|apikey|token|access_token|refresh_token|client_secret|secret|app_secret|code)=([^&\s"']+)/gi, "$1=***"],
  [/\bAPP_SECRET\s*[=:]\s*\S+/g, "APP_SECRET=***"],
];

function literalSecrets(): string[] {
  const out: string[] = [];
  if (process.env.APP_SECRET) out.push(process.env.APP_SECRET);
  try {
    out.push(masterSecret());
  } catch {
    /* production sans APP_SECRET : rien à masquer de plus */
  }
  return [...new Set(out.filter((s) => s.length >= 8))];
}

export function redact(text: string): string {
  let t = String(text ?? "");
  for (const s of literalSecrets()) t = t.split(s).join("***");
  for (const [re, by] of PATTERNS) t = t.replace(re, by);
  return t;
}

/** Masque récursivement les chaînes d'un objet (détails joints à un journal). */
export function redactDeep<T>(v: T, depth = 0): T {
  if (typeof v === "string") return redact(v) as T;
  if (depth > 6 || v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redactDeep(x, depth + 1)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    out[k] = /^(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|client[_-]?secret|password|app[_-]?secret)$/i.test(k) ? "***" : redactDeep(x, depth + 1);
  }
  return out as T;
}

let consoleRedacted = false;
/** Masque aussi les secrets de tout console.error / warn / log du serveur et du worker (messages d'erreur des SDK…). */
export function installConsoleRedaction(): void {
  if (consoleRedacted) return;
  consoleRedacted = true;
  for (const level of ["error", "warn", "log", "info"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) =>
      orig(...args.map((a) => (typeof a === "string" ? redact(a) : a instanceof Error ? redact(a.stack || a.message) : a && typeof a === "object" ? redactDeep(a) : a)));
  }
}
