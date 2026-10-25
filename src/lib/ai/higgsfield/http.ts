import { HIGGS_MODELS } from "./catalog";
/** Server-side official API only. No user-supplied API host, redirects, raw errors or credential echoes. */
import { getSetting } from "../../settings";
export const HIGGS_API = "https://api.higgsfield.ai";
export type Transport = typeof fetch;
export function credentials() {
  const id = (
      getSetting("provider.higgsfield.keyId") ?? process.env.HF_API_KEY_ID
    )?.trim(),
    secret = (
      getSetting("provider.higgsfield.keySecret") ??
      process.env.HF_API_KEY_SECRET
    )?.trim();
  return id && secret ? { id, secret } : null;
}
export class HiggsfieldHttpError extends Error {
  constructor(
    public status: number,
    public retryAfter: number | null,
  ) {
    super(`HIGGSFIELD_HTTP_${status}`);
  }
}
export async function api(
  path: string,
  body?: unknown,
  transport: Transport = fetch,
  extra: Record<string, string> = {},
) {
  const model = path.startsWith("/estimate/")
    ? path.slice("/estimate/".length)
    : path.slice(1);
  if (
    !HIGGS_MODELS.some((m) => m.id === model) &&
    path !== "/files/generate-upload-url" &&
    !/^\/requests\/[\w-]+\/status$/.test(path)
  )
    throw Error("HIGGSFIELD_API_PATH_REFUSED");
  const c = credentials();
  if (!c) throw Error("HIGGSFIELD_CREDENTIALS_MISSING");
  const r = await transport(`${HIGGS_API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Key ${c.id}:${c.secret}`,
      "Content-Type": "application/json",
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok)
    throw new HiggsfieldHttpError(
      r.status,
      Number(r.headers.get("retry-after")) || null,
    );
  if (Number(r.headers.get("content-length") || 0) > 2_000_000)
    throw Error("HIGGSFIELD_RESPONSE_TOO_LARGE");
  return r.json() as Promise<Record<string, unknown>>;
}
export async function estimate(
  model: string,
  body: unknown,
  transport?: Transport,
) {
  const result = await api(`/estimate/${model}`, body, transport);
  const usd =
    typeof result.usd === "string" || typeof result.usd === "number"
      ? Number(result.usd)
      : NaN;
  if (!Number.isFinite(usd) || usd <= 0 || usd > 1000)
    throw Error("HIGGSFIELD_ESTIMATE_INVALID");
  return usd;
}
