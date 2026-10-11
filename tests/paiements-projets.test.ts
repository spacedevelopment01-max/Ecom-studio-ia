/**
 * Forfaits V2 — paiements Stripe par projet (cahier des charges §10, §11, §21). Stripe est SIMULÉ (fetch remplacé) :
 * aucun appel réseau, aucun paiement réel. Ces tests prouvent la logique du serveur, pas la connexion réelle à Stripe.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings", async (orig) => {
  const real = await orig<typeof import("@/lib/settings")>();
  return { ...real, getSetting: (k: string) => (k === "stripe.secretKey" ? "sk_test_projets" : real.getSetting(k)) };
});

import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { balance, getSubscription } from "@/lib/billing";
import { handleStripeEvent } from "@/lib/payments";
import { changeProjectPlan, repriceLegacySubscriptions, setProjectCancellation, subscriptionCheckout, topupCheckout } from "@/lib/payments-v2";
import { createProjectWithSubscription, pendingSubscriptions, subscriptionOfProject } from "@/lib/project-billing";

// ------------------------------------------------------------------ Stripe simulé

type Remote = { status: string; start: number; end: number; unit: number; metadata: Record<string, string>; cancel: boolean };
const remote = new Map<string, Remote>();
const posts: { path: string; params: URLSearchParams; key: string | null }[] = [];
let seq = 0;
const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

function stripeFetch(input: any, init?: any): Promise<Response> {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const p = url.pathname.replace(/^\/v1\//, "");
  if (method === "POST") posts.push({ path: p, params: new URLSearchParams(String(init.body)), key: init.headers?.["Idempotency-Key"] ?? null });
  if (p === "checkout/sessions" && method === "POST") {
    const sid = `cs_test_${++seq}`;
    return json(200, { id: sid, url: `https://checkout.stripe.test/${sid}` });
  }
  const m = p.match(/^subscriptions\/([^/]+)$/);
  if (!m) return json(404, { error: { code: "resource_missing" } });
  const s = remote.get(decodeURIComponent(m[1]));
  if (!s) return json(404, { error: { code: "resource_missing" } });
  if (method === "POST") {
    const params = new URLSearchParams(String(init.body));
    if (params.get("items[0][price_data][unit_amount]")) s.unit = Number(params.get("items[0][price_data][unit_amount]"));
    if (params.get("metadata[plan]")) s.metadata.plan = params.get("metadata[plan]")!;
    if (params.get("cancel_at_period_end")) s.cancel = params.get("cancel_at_period_end") === "true";
  }
  return json(200, {
    id: m[1],
    status: s.status,
    cancel_at_period_end: s.cancel,
    current_period_start: Math.floor(s.start / 1000),
    current_period_end: Math.floor(s.end / 1000),
    metadata: s.metadata,
    items: { data: [{ id: `si_${m[1]}`, price: { product: `prod_${m[1]}`, unit_amount: s.unit } }] },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(stripeFetch));
  posts.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

const newUser = () => createUser(`pay-${uniq()}@test.fr`, "motdepasse-test", "Pay");

function stripeSub(plan: string, kind = "subscription_v2") {
  const sid = `sub_${uniq()}`;
  remote.set(sid, { status: "active", start: now(), end: now() + 30 * 86400_000, unit: 4900, metadata: { kind, plan }, cancel: false });
  return sid;
}

const sessionEvent = (userId: string, o: { session?: string; sub?: string; plan?: string; billing?: string; kind?: string; projectId?: string; paid?: boolean; amount?: number; pi?: string; type?: string; evtId?: string }) => ({
  id: o.evtId ?? `evt_${uniq()}`,
  type: o.type ?? "checkout.session.completed",
  created: Math.floor(now() / 1000),
  data: {
    object: {
      id: o.session ?? `cs_${uniq()}`,
      client_reference_id: userId,
      payment_status: o.paid === false ? "unpaid" : "paid",
      amount_total: o.amount ?? 4900,
      subscription: o.sub ?? null,
      customer: "cus_test",
      payment_intent: o.pi ?? null,
      metadata: { kind: o.kind ?? "subscription_v2", user_id: userId, plan: o.plan ?? "creer", billing: o.billing ?? "month", ...(o.projectId ? { project_id: o.projectId } : {}) },
    },
  },
});

const newProject = (userId: string, subKey: string | null = null) =>
  createProjectWithSubscription(userId, subKey, () => {
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, userId, "Projet", now(), now());
    return { projectId: pid, result: pid };
  });

describe("paiements Stripe des forfaits V2 (Stripe simulé)", () => {
  it("un webhook répété ou relivré ne crée jamais un second abonnement", async () => {
    const u = await newUser();
    const sub = stripeSub("vendre");
    const evt = sessionEvent(u.id, { sub, plan: "vendre", session: `cs_${uniq()}` });
    await handleStripeEvent(evt);
    await handleStripeEvent(evt); // même événement
    await handleStripeEvent({ ...evt, id: `evt_${uniq()}`, type: "checkout.session.async_payment_succeeded" }); // autre événement, même session
    const pending = pendingSubscriptions(u.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ plan: "vendre", status: "active", source: "stripe", stripe_subscription_id: sub, project_id: null });
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM payments WHERE user_id = ? AND kind = 'subscription'", u.id)!.n).toBe(1);
  });

  it("un paiement non confirmé (SEPA en attente, échec) n'ouvre aucun droit ; la page de succès non plus", async () => {
    const u = await newUser();
    await handleStripeEvent(sessionEvent(u.id, { sub: stripeSub("creer"), paid: false }));
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
    // Un abonnement Stripe déjà terminé ne crée rien non plus.
    const ended = stripeSub("creer");
    remote.get(ended)!.status = "incomplete_expired";
    await handleStripeEvent(sessionEvent(u.id, { sub: ended }));
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
    // Ouvrir une session de paiement ne donne rien : seule la confirmation signée du serveur compte.
    await subscriptionCheckout(u, "dominer", "month");
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
  });

  it("abonnement payé sans projet : il reste disponible et sert à créer UN projet, plus jamais un second", async () => {
    const u = await newUser();
    await handleStripeEvent(sessionEvent(u.id, { sub: stripeSub("creer") }));
    expect(pendingSubscriptions(u.id)).toHaveLength(1);
    const pid = newProject(u.id);
    expect(subscriptionOfProject(pid)?.plan).toBe("creer");
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
    expect(() => newProject(u.id)).toThrow();
  });

  it("une session ouverte est réutilisée (double clic, actualisation) : jamais deux paiements pour une même demande", async () => {
    const u = await newUser();
    const a = await subscriptionCheckout(u, "vendre", "year");
    const b = await subscriptionCheckout(u, "vendre", "year");
    expect(b).toMatchObject({ url: a.url, reused: true });
    expect(posts.filter((p) => p.path === "checkout/sessions")).toHaveLength(1);
    const sent = posts[0].params;
    expect(sent.get("mode")).toBe("subscription");
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("89000");
    expect(sent.get("line_items[0][price_data][recurring][interval]")).toBe("year");
    expect(sent.get("subscription_data[metadata][kind]")).toBe("subscription_v2");
    // Session expirée : la suivante en ouvre une nouvelle.
    const sid = one<{ id: string }>("SELECT id FROM checkout_sessions WHERE url = ?", a.url)!.id;
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "checkout.session.expired", created: 1, data: { object: { id: sid, metadata: { kind: "subscription_v2" } } } });
    expect((await subscriptionCheckout(u, "vendre", "year")).reused).toBe(false);
  });

  it("recharge de 10 € : rattachée au bon projet seulement, jamais créditée deux fois ; remboursée = budget retiré", async () => {
    const u = await newUser();
    await handleStripeEvent(sessionEvent(u.id, { sub: stripeSub("creer") }));
    await handleStripeEvent(sessionEvent(u.id, { sub: stripeSub("vendre"), plan: "vendre" }));
    const a = newProject(u.id);
    const b = newProject(u.id);
    const before = { a: balance(u.id, a).topupBalance, b: balance(u.id, b).topupBalance };
    await topupCheckout(u, a);
    const sent = posts.find((p) => p.path === "checkout/sessions")!.params;
    expect(sent.get("mode")).toBe("payment");
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("1000");
    expect(sent.get("metadata[project_id]")).toBe(a);
    const evt = sessionEvent(u.id, { kind: "topup_v2", projectId: a, amount: 1000, pi: `pi_${uniq()}` });
    await handleStripeEvent(evt);
    await handleStripeEvent({ ...evt, id: `evt_${uniq()}` });
    // 50 % du HT de 10 € TTC (TVA 20 %) = 4,1666… € de budget fournisseur, arrondi prudemment.
    const added = balance(u.id, a).topupBalance - before.a;
    expect(added).toBeGreaterThan(4_000_000);
    expect(added).toBeLessThanOrEqual(4_166_667);
    expect(balance(u.id, b).topupBalance).toBe(before.b);
    // Remboursement total : le budget de la recharge est retiré (une seule fois).
    const refund = { id: `evt_${uniq()}`, type: "charge.refunded", created: 2, data: { object: { id: `ch_${uniq()}`, payment_intent: evt.data.object.payment_intent, amount_refunded: 1000 } } };
    await handleStripeEvent(refund);
    await handleStripeEvent({ ...refund, id: `evt_${uniq()}` });
    expect(balance(u.id, a).topupBalance).toBe(before.a);
  });

  it("une recharge visant le projet d'un autre compte n'est jamais créditée ; pas de recharge sans abonnement actif", async () => {
    const u = await newUser();
    const other = await newUser();
    await handleStripeEvent(sessionEvent(other.id, { sub: stripeSub("creer") }));
    const theirs = newProject(other.id);
    const before = balance(other.id, theirs).topupBalance;
    await handleStripeEvent(sessionEvent(u.id, { kind: "topup_v2", projectId: theirs, amount: 1000 }));
    expect(balance(other.id, theirs).topupBalance).toBe(before);
    const lone = id();
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", lone, u.id, "Sans forfait", now(), now());
    await expect(topupCheckout(u, lone)).rejects.toThrow(/abonnement actif/);
  });

  it("changement de forfait et résiliation : seul ce projet change, aucun nouveau projet", async () => {
    const u = await newUser();
    const s1 = stripeSub("creer");
    const s2 = stripeSub("creer");
    await handleStripeEvent(sessionEvent(u.id, { sub: s1 }));
    await handleStripeEvent(sessionEvent(u.id, { sub: s2 }));
    const a = newProject(u.id);
    const b = newProject(u.id);
    const budgetA = balance(u.id, a).capacity;
    await changeProjectPlan(a, "dominer", "month");
    const up = posts.find((p) => p.path === `subscriptions/${s1}`)!.params;
    expect(up.get("proration_behavior")).toBe("always_invoice");
    expect(up.get("items[0][price_data][unit_amount]")).toBe("12900");
    expect(subscriptionOfProject(a)?.plan).toBe("dominer");
    expect(subscriptionOfProject(b)?.plan).toBe("creer");
    expect(balance(u.id, a).capacity).toBeGreaterThan(budgetA);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id = ?", u.id)!.n).toBe(2);
    await setProjectCancellation(b, true);
    expect(subscriptionOfProject(b)?.cancel_at_period_end).toBe(1);
    await setProjectCancellation(b, false);
    expect(subscriptionOfProject(b)?.cancel_at_period_end).toBe(0);
  });

  it("fin de l'abonnement puis réactivation : le MÊME projet reprend ses droits, jamais un autre", async () => {
    const u = await newUser();
    const s1 = stripeSub("vendre");
    await handleStripeEvent(sessionEvent(u.id, { sub: s1, plan: "vendre" }));
    const pid = newProject(u.id);
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "customer.subscription.deleted", created: Math.floor(now() / 1000) + 5, data: { object: { id: s1, status: "canceled", metadata: { kind: "subscription_v2" } } } });
    expect(subscriptionOfProject(pid)?.status).toBe("canceled");
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
    // L'abonnement résilié reste attaché : il ne peut pas financer un autre projet.
    expect(() => newProject(u.id)).toThrow();
    const s2 = stripeSub("creer", "reactivate_v2");
    await handleStripeEvent(sessionEvent(u.id, { sub: s2, kind: "reactivate_v2", projectId: pid, plan: "creer" }));
    expect(subscriptionOfProject(pid)).toMatchObject({ status: "active", plan: "creer", stripe_subscription_id: s2 });
    expect(pendingSubscriptions(u.id)).toHaveLength(0);
    // Un projet déjà actif ne se réabonne pas (il change de forfait).
    await expect(subscriptionCheckout(u, "dominer", "month", pid)).rejects.toThrow(/déjà un abonnement actif/);
  });

  it("événements dans le désordre : un ancien état n'écrase pas un état plus récent", async () => {
    const u = await newUser();
    const s = stripeSub("creer");
    await handleStripeEvent(sessionEvent(u.id, { sub: s }));
    const pid = newProject(u.id);
    const t = Math.floor(now() / 1000);
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "customer.subscription.updated", created: t + 100, data: { object: { id: s, status: "past_due", metadata: { kind: "subscription_v2" } } } });
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "customer.subscription.updated", created: t + 50, data: { object: { id: s, status: "active", metadata: { kind: "subscription_v2" } } } });
    expect(subscriptionOfProject(pid)?.status).toBe("past_due");
  });

  it("ancien abonné : nouveau prix seulement au prochain renouvellement, sans facturation immédiate, client prévenu", async () => {
    const u = await newUser();
    getSubscription(u.id);
    const s = stripeSub("creer");
    remote.get(s)!.unit = 4990;
    delete remote.get(s)!.metadata.kind;
    const start = now() - 10 * 86400_000;
    run("UPDATE subscriptions SET status = 'active', plan = 'creer', billing = 'month', stripe_subscription_id = ?, price_cents = 4990, source = 'legacy', current_period_start = ? WHERE user_id = ?", s, start, u.id);
    const preview = (await repriceLegacySubscriptions(true)).find((r) => r.key === u.id)!;
    expect(preview).toMatchObject({ from: 4990, to: 4900 });
    expect(posts.filter((p) => p.path === `subscriptions/${s}`)).toHaveLength(0); // aperçu : rien n'est changé
    await repriceLegacySubscriptions(false);
    const sent = posts.find((p) => p.path === `subscriptions/${s}`)!.params;
    expect(sent.get("proration_behavior")).toBe("none");
    expect(sent.get("items[0][price_data][unit_amount]")).toBe("4900");
    // Période en cours : toujours l'ancien prix (et son budget IA).
    expect(one<{ price_cents: number }>("SELECT price_cents FROM subscriptions WHERE user_id = ?", u.id)!.price_cents).toBe(4990);
    expect(one("SELECT 1 FROM notifications WHERE user_id = ? AND title LIKE 'Nouveau tarif%'", u.id)).toBeTruthy();
    // Renouvellement : le nouveau prix s'applique.
    const next = Math.floor((start + 31 * 86400_000) / 1000);
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "customer.subscription.updated", created: next, data: { object: { id: s, status: "active", current_period_start: next, current_period_end: next + 30 * 86400, metadata: { kind: "subscription_v2", plan: "creer", billing: "month" }, items: { data: [{ price: { unit_amount: 4900 } }] } } } });
    expect(one<{ price_cents: number }>("SELECT price_cents FROM subscriptions WHERE user_id = ?", u.id)!.price_cents).toBe(4900);
  });
});
