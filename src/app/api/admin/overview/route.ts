import { all, one } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_PRICES, DEFAULT_ROUTES, PRICE_REVIEW_DAYS, PROVIDERS, TASKS, providerKey, routeFor, priceFor, priceValid, pricesCheckedAt, usdToEur, type ProviderId, type TaskId } from "@/lib/ai/config";
import { mask } from "@/lib/secrets";
import { balance, getSubscription, EUR } from "@/lib/billing";
import { getSetting, getJsonSetting, appUrl } from "@/lib/settings";
import { PROVIDER_INFO, providerConfig, redirectUri, type ProviderKey } from "@/lib/social/oauth";
import { paymentsLive, stripeKeys } from "@/lib/payments";
import { mailConfigured } from "@/lib/mail";
import { textRoutingOverview } from "@/lib/ai/text-routing-admin";

export const GET = handle(async () => {
  await requireAdmin();
  const since = Date.now() - 30 * 86400_000;
  const users = all<any>("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 200").map((u) => {
    const b = balance(u.id);
    const s = getSubscription(u.id);
    return { ...u, subscription: s.status, stores: s.stores, projects: one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id = ?", u.id)!.n, availableEur: b.available / EUR, usedPct: b.usedPct };
  });
  const usage = all<any>("SELECT provider, model, unit, COUNT(*) calls, SUM(input_units) inp, SUM(output_units) out, SUM(quantity) q, SUM(cost) cost, SUM(billed) billed, MAX(estimated) est FROM usage_events WHERE created_at >= ? GROUP BY provider, model, unit ORDER BY cost DESC", since).map((r) => ({ ...r, costEur: r.cost / EUR, billedEur: r.billed / EUR }));
  const revenue = all<any>("SELECT kind, SUM(amount_cents) cents, COUNT(*) n FROM payments WHERE created_at >= ? GROUP BY kind", since);
  const hb = one<{ beat_at: number; info: string }>("SELECT beat_at, info FROM worker_heartbeat ORDER BY beat_at DESC LIMIT 1");
  return ok({
    appUrl: appUrl(),
    providers: (Object.keys(PROVIDERS) as ProviderId[]).map((p) => ({ id: p, ...PROVIDERS[p], keyMasked: mask(providerKey(p)), configured: !!providerKey(p), disabled: getSetting(`provider.${p}.disabled`) === "1" })),
    tasks: (Object.keys(TASKS) as TaskId[]).map((t) => ({ id: t, ...TASKS[t], route: routeFor(t), defaultRoute: DEFAULT_ROUTES[t], price: priceFor(routeFor(t).provider, routeFor(t).model) })),
    prices: { ...DEFAULT_PRICES, ...getJsonSetting<Record<string, unknown>>("ai.prices", {}) },
    usdToEur: usdToEur(),
    pricing: {
      checkedAt: pricesCheckedAt(),
      reviewDays: PRICE_REVIEW_DAYS,
      // Tâches dont le modèle n'a pas de tarif valide : leurs générations sont refusées.
      missing: (Object.keys(TASKS) as TaskId[]).filter((t) => { const r = routeFor(t); const p = priceFor(r.provider, r.model); return !p || !priceValid(p); }).map((t) => ({ task: t, label: TASKS[t].label, key: `${routeFor(t).provider}:${routeFor(t).model}` })),
    },
    markup: getJsonSetting<number>("billing.markup", 1),
    textRouting: textRoutingOverview(),
    oauth: (Object.keys(PROVIDER_INFO) as ProviderKey[]).map((k) => ({ key: k, label: PROVIDER_INFO[k].label, configured: providerConfig(k).configured, clientIdMasked: mask(providerConfig(k).clientId), redirectUri: redirectUri(k), needs: PROVIDER_INFO[k].needs, docs: PROVIDER_INFO[k].docs })),
    stripe: { secretMasked: mask(stripeKeys().secret), webhookConfigured: !!stripeKeys().webhookSecret, verifiedAt: getSetting("stripe.verifiedAt"), live: paymentsLive(), webhookUrl: `${appUrl()}/api/stripe/webhook` },
    // SMTP : valeurs masquées uniquement (le port n'est pas un secret).
    smtp: { configured: mailConfigured(), hostMasked: mask(getSetting("smtp.host")), port: getSetting("smtp.port") ?? "", userMasked: mask(getSetting("smtp.user")), passwordConfigured: !!getSetting("smtp.password"), fromMasked: mask(getSetting("smtp.from")) },
    users,
    usage,
    revenue,
    errors: all("SELECT id, scope, message, user_id, project_id, created_at FROM error_log ORDER BY created_at DESC LIMIT 60"),
    failedJobs: all("SELECT id, type, error, attempts, user_id, project_id, updated_at FROM jobs WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 30"),
    queue: all("SELECT status, COUNT(*) n FROM jobs GROUP BY status"),
    worker: hb ? { lastBeat: hb.beat_at, info: JSON.parse(hb.info || "{}"), alive: Date.now() - hb.beat_at < 60_000 } : null,
  });
});
