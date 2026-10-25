import sharp from "sharp";
import { uploadImage } from "./media";
/** Versioned account estimates, one bulk approval. Refresh never edits approved revisions. */
import { createHash, randomUUID } from "node:crypto";
import {
  getJsonSetting,
  setJsonSetting,
  getSetting,
  setSetting,
} from "../../settings";
import { tx } from "../../db";
import {
  HIGGS_MODELS,
  configurations,
  configurationKey,
  requestBody,
  validateConfiguration,
  type Configuration,
} from "./catalog";
import {
  credentials,
  estimate,
  type Transport,
  HiggsfieldHttpError,
} from "./http";
export const ECB_SOURCE =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export type Fx = {
  usdToEur: number;
  date: string;
  source: string;
  retrievedAt: number;
};
export type PriceRow = {
  key: string;
  configuration: Configuration;
  usd: number | null;
  source: string;
  retrievedAt: number;
  status: "account_estimate" | "missing";
  problem?: string;
  oldUsd: number | null;
  overrideUsd?: number;
  overrideReason?: string;
};
export type Proposal = {
  id: string;
  at: number;
  credentialFingerprint: string;
  fx: Fx | null;
  rows: PriceRow[];
  discovered: string[];
  warnings: string[];
};
export type Approval = {
  id: string;
  proposal: string;
  at: number;
  actor: string;
  credentialFingerprint: string;
  fx: Fx;
  rows: PriceRow[];
  models: string[];
};
const fingerprint = () => {
  const c = credentials();
  return c
    ? createHash("sha256").update(`${c.id}:${c.secret}`).digest("hex")
    : "";
};
const age = (at: number) =>
  Number.isFinite(at) &&
  at <= Date.now() + 60000 &&
  Date.now() - at < 24 * 3600_000;
export function fxValid(f: Fx | null): f is Fx {
  return (
    !!f &&
    f.source === ECB_SOURCE &&
    Number.isFinite(f.usdToEur) &&
    f.usdToEur > 0 &&
    f.usdToEur < 10 &&
    Date.parse(f.date) <= Date.now() &&
    Date.now() - Date.parse(f.date) < 7 * 86400_000
  );
}
export function parseFx(xml: string): Fx {
  const date = xml.match(/time=['"]([\d-]+)['"]/)?.[1],
    usd = Number(
      xml.match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/)?.[1],
    );
  const f = {
    date: date ?? "",
    usdToEur: 1 / usd,
    source: ECB_SOURCE,
    retrievedAt: Date.now(),
  };
  if (!fxValid(f)) throw Error("HIGGSFIELD_FX_UNVERIFIED");
  return f;
}
export const proposal = () =>
  getJsonSetting<Proposal | null>("higgsfield.proposal", null);
export const approved = () =>
  getJsonSetting<Approval | null>("higgsfield.approved", null);
export function overview() {
  const p = proposal(),
    a = approved();
  return {
    configured: !!credentials(),
    disabled: getSetting("provider.higgsfield.disabled") !== "0",
    accountAccess: p?.rows.some((r) => r.status === "account_estimate")
      ? "estimate-verified-generation-untested"
      : "not-tested",
    models: HIGGS_MODELS,
    proposal: p,
    approved: a,
    history: getJsonSetting<Approval[]>("higgsfield.history", []).map(
      ({ rows, ...a }) => ({ ...a, rowCount: rows.length }),
    ),
    readiness:
      a && fxValid(a.fx) ? "approved-not-paid-tested" : "approval-required",
  };
}
/** Source catalog discovery only; UI marketing minima/discounts are never chargeable prices. */
export function discoverModels(html: string) {
  return [
    ...new Set(
      [
        ...html.matchAll(
          /(?:https:\/\/open\.higgsfield\.ai)?\/models\/([a-zA-Z0-9/_.-]+?)(?:\/(?:playground|api-reference))?(?=["'?#\\\s<])/g,
        ),
      ].map((m) => m[1].replace(/\/(playground|api-reference)$/, "")),
    ),
  ].slice(0, 200);
}
export async function refreshPricing(transport: Transport = fetch) {
  const identityAtStart = fingerprint();
  const warnings: string[] = [];
  let fx: Fx | null = null,
    discovered: string[] = [];
  try {
    const r = await transport(ECB_SOURCE, {
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw Error();
    fx = parseFx(await r.text());
  } catch {
    warnings.push("ECB_UNAVAILABLE_OR_UNVERIFIED");
  }
  try {
    const r = await transport("https://open.higgsfield.ai/explore", {
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw Error();
    discovered = discoverModels(await r.text());
    if (!discovered.length) warnings.push("CATALOG_STRUCTURE_UNRECOGNIZED");
  } catch {
    warnings.push("PUBLIC_CATALOG_UNAVAILABLE");
  }
  const previous = approved();
  const rows: PriceRow[] = [];
  const hasCredentials = !!credentials();
  let denied = false;
  const references: Partial<Record<Configuration["aspect"], string>> = {};
  if (hasCredentials)
    try {
      for (const aspect of ["16:9", "9:16", "1:1"] as const) {
        const width = aspect === "16:9" ? 1280 : 720,
          height = aspect === "9:16" ? 1280 : aspect === "16:9" ? 720 : 720;
        const image = await sharp({
          create: { width, height, channels: 3, background: "#888888" },
        })
          .jpeg()
          .toBuffer();
        references[aspect] = await uploadImage(image, transport);
      }
    } catch {
      warnings.push("NEUTRAL_ESTIMATE_REFERENCE_UPLOAD_UNAVAILABLE");
    }

  // Two lanes, no automatic retry of rate limits; partial imports remain explicit and unapprovable per missing row.
  const queue = configurations();
  let index = 0;
  await Promise.all(
    [0, 1].map(async () => {
      while (index < queue.length) {
        const c = queue[index++],
          key = configurationKey(c),
          old = previous?.rows.find((r) => r.key === key);
        const row: PriceRow = {
          key,
          configuration: c,
          usd: null,
          oldUsd: old?.overrideUsd ?? old?.usd ?? null,
          source: `https://api.higgsfield.ai/estimate/${c.model}`,
          retrievedAt: Date.now(),
          status: "missing",
          problem: hasCredentials
            ? "ESTIMATE_UNAVAILABLE"
            : "CREDENTIALS_MISSING",
          ...(old?.overrideUsd
            ? {
                overrideUsd: old.overrideUsd,
                overrideReason: old.overrideReason,
              }
            : {}),
        };
        if (hasCredentials && !denied)
          try {
            const m = HIGGS_MODELS.find((m) => m.id === c.model)!;
            row.usd = await estimate(
              c.model,
              requestBody(
                c,
                "Price estimate only",
                m.mode === "image" ? references[c.aspect] : undefined,
              ),
              transport,
            );
            row.status = "account_estimate";
            delete row.problem;
          } catch (e) {
            row.problem =
              e instanceof HiggsfieldHttpError
                ? `HTTP_${e.status}`
                : "ESTIMATE_UNAVAILABLE";
            if (
              e instanceof HiggsfieldHttpError &&
              [401, 403, 429].includes(e.status)
            )
              denied = true;
          }
        rows.push(row);
      }
    }),
  );
  rows.sort(
    (a, b) =>
      a.configuration.model.localeCompare(b.configuration.model) ||
      a.configuration.resolution.localeCompare(b.configuration.resolution) ||
      a.configuration.seconds - b.configuration.seconds ||
      Number(a.configuration.audio) - Number(b.configuration.audio) ||
      a.configuration.aspect.localeCompare(b.configuration.aspect),
  );
  if (fingerprint() !== identityAtStart)
    throw Error("HIGGSFIELD_CREDENTIALS_CHANGED");
  const p: Proposal = {
    id: randomUUID(),
    at: Date.now(),
    credentialFingerprint: identityAtStart,
    fx,
    rows,
    discovered,
    warnings,
  };
  setJsonSetting("higgsfield.proposal", p);
  return p;
}
export function approvePricing(
  id: string,
  models: string[],
  actor: string,
  overrides: { key: string; usd: number; reason: string }[] = [],
) {
  return tx(() => {
    const p = proposal();
    if (
      !p ||
      p.id !== id ||
      !age(p.at) ||
      p.credentialFingerprint !== fingerprint() ||
      !fxValid(p.fx)
    )
      throw Error("HIGGSFIELD_PROPOSAL_STALE_OR_UNVERIFIED");
    if (
      !models.length ||
      models.some((id) => !HIGGS_MODELS.some((m) => m.id === id))
    )
      throw Error("HIGGSFIELD_SELECTION_INVALID");
    const rows = p.rows
      .filter((r) => models.includes(r.configuration.model))
      .map((r) => ({ ...r }));
    for (const o of overrides) {
      const row = rows.find((r) => r.key === o.key);
      if (
        !row ||
        !Number.isFinite(o.usd) ||
        o.usd <= 0 ||
        o.usd > 1000 ||
        o.reason.trim().length < 5
      )
        throw Error("HIGGSFIELD_OVERRIDE_INVALID");
      row.overrideUsd = o.usd;
      row.overrideReason = o.reason;
    }
    // An override cannot transform an unavailable model or an absent account estimate into access verification.
    if (
      models.some(
        (id) =>
          rows.filter((r) => r.configuration.model === id).length !==
          configurations().filter((c) => c.model === id).length,
      ) ||
      rows.some((r) => r.status !== "account_estimate" || !r.usd)
    )
      throw Error("HIGGSFIELD_SELECTED_PRICES_INCOMPLETE");
    const a: Approval = {
      id: randomUUID(),
      proposal: p.id,
      at: Date.now(),
      actor,
      credentialFingerprint: p.credentialFingerprint,
      fx: p.fx,
      rows,
      models: [...new Set(models)],
    };
    const old = approved();
    setJsonSetting(
      "higgsfield.history",
      [
        ...(old ? [old] : []),
        ...getJsonSetting<Approval[]>("higgsfield.history", []),
      ].slice(0, 20),
    );
    setJsonSetting("higgsfield.approved", a);
    const admin = getJsonSetting<
      Record<string, { enabled?: boolean; confirmedAt?: number }>
    >("ai.media.models", {});
    for (const id of a.models)
      admin[`higgsfield:${id}`] = {
        ...admin[`higgsfield:${id}`],
        enabled: true,
        confirmedAt: Date.now(),
      };
    setJsonSetting("ai.media.models", admin);
    setSetting("provider.higgsfield.disabled", "0");
    return a;
  });
}
export function approvedQuote(c: Configuration) {
  validateConfiguration(c);
  const a = approved();
  if (
    getSetting("provider.higgsfield.disabled") !== "0" ||
    !a ||
    a.credentialFingerprint !== fingerprint() ||
    !fxValid(a.fx) ||
    Date.now() - a.at > 90 * 86400_000 ||
    !a.models.includes(c.model) ||
    getJsonSetting<Record<string, { enabled?: boolean }>>(
      "ai.media.models",
      {},
    )[`higgsfield:${c.model}`]?.enabled === false
  )
    throw Error("HIGGSFIELD_APPROVAL_REQUIRED");
  const row = a.rows.find((r) => r.key === configurationKey(c));
  if (!row || row.status !== "account_estimate" || !row.usd)
    throw Error("HIGGSFIELD_EXACT_PRICE_MISSING");
  const usd = row.overrideUsd ?? row.usd;
  return {
    usd,
    micro: Math.ceil(usd * a.fx.usdToEur * 1e6),
    revision: a.id,
    fx: a.fx,
    row,
  };
}
export async function checkedQuote(
  c: Configuration,
  body: unknown,
  transport?: Transport,
) {
  const q = approvedQuote(c);
  const currentUsd = await estimate(c.model, body, transport);
  if (approvedQuote(c).revision !== q.revision)
    throw Error("HIGGSFIELD_APPROVAL_CHANGED");
  if (currentUsd > q.usd + 1e-9)
    throw Error("HIGGSFIELD_PRICE_INCREASE_REQUIRES_APPROVAL");
  return {
    ...q,
    currentUsd,
    micro: Math.ceil(currentUsd * q.fx.usdToEur * 1e6),
  };
}
