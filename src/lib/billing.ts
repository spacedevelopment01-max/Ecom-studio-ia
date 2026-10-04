/**
 * Offre commerciale et enveloppe IA.
 *  - 49,90 € TTC / mois pour une boutique, 40 € / mois par boutique supplémentaire.
 *  - 1/3 de l'abonnement alimente l'enveloppe IA mensuelle (non reportée).
 *  - Recharges par multiples de 10 € : 50 % alimentent l'IA ; solde conservé.
 *  - Alerte à 80 % ; nouvelles générations en pause quand le disponible est épuisé.
 * Aucun quota de créations n'est ajouté : seul le budget compte.
 * Montants internes en micro-euros (1 € = 1 000 000).
 */
import { addMonths } from "date-fns";
import { id, now, one, run, tx } from "./db";
import { UserFacingError } from "./jobs";
import { getJsonSetting } from "./settings";
import { pick } from "./i18n";
import { L, userLang } from "./i18n-server";

/** Texte enregistré pour un compte (relevé, notification) : dans la langue mémorisée de ce compte. */
const forUser = (userId: string, fr: string, en: string) => pick(userLang(userId), fr, en);

export const OFFER = {
  basePriceEur: 49.9,
  extraStorePriceEur: 40,
  aiShareOfSubscription: 1 / 3,
  topupStepEur: 10,
  aiShareOfTopup: 0.5,
  alertThreshold: 0.8,
} as const;

export const EUR = 1_000_000;
export const toEur = (micro: number) => micro / EUR;

export type Subscription = {
  user_id: string;
  status: "none" | "trial" | "active" | "past_due" | "canceled" | "manual";
  stores: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
};

type Wallet = {
  user_id: string;
  period_start: number;
  period_end: number;
  monthly_allowance: number;
  monthly_used: number;
  topup_balance: number;
  topup_period_added: number;
  topup_period_used: number;
  alert80_sent_at: number | null;
};

export function monthlyPriceEur(stores: number) {
  const n = Math.max(1, stores);
  return Math.round((OFFER.basePriceEur + (n - 1) * OFFER.extraStorePriceEur) * 100) / 100;
}

export function monthlyAllowanceMicro(stores: number) {
  return Math.round(monthlyPriceEur(stores) * OFFER.aiShareOfSubscription * EUR);
}

export function getSubscription(userId: string): Subscription {
  const s = one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId);
  if (s) return s;
  run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", userId, "none", 1, now());
  return one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId)!;
}

export const subscriptionActive = (s: Subscription) => s.status === "active" || s.status === "manual" || s.status === "trial";

function ensureWallet(userId: string): Wallet {
  let w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId);
  if (!w) {
    const sub = getSubscription(userId);
    const start = now();
    const allowance = subscriptionActive(sub) && sub.status !== "trial" ? monthlyAllowanceMicro(sub.stores) : 0;
    run(
      "INSERT INTO wallets (user_id, period_start, period_end, monthly_allowance, monthly_used, topup_balance, updated_at) VALUES (?,?,?,?,0,0,?)",
      userId,
      start,
      addMonths(start, 1).getTime(),
      allowance,
      now(),
    );
    if (allowance) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance, forUser(userId, "Crédits de création activés", "Creation credits activated"), now());
    w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  }
  return renewIfDue(w);
}

/** Renouvelle l'enveloppe mensuelle à échéance (le solde de recharge est conservé). */
function renewIfDue(w: Wallet): Wallet {
  if (now() < w.period_end) return w;
  const sub = getSubscription(w.user_id);
  let start = w.period_start;
  let end = w.period_end;
  while (end <= now()) {
    start = end;
    end = addMonths(end, 1).getTime();
  }
  const allowance = subscriptionActive(sub) && sub.status !== "trial" ? monthlyAllowanceMicro(sub.stores) : 0;
  tx(() => {
    run(
      "UPDATE wallets SET period_start=?, period_end=?, monthly_allowance=?, monthly_used=0, topup_period_added=0, topup_period_used=0, alert80_sent_at=NULL, updated_at=? WHERE user_id=?",
      start,
      end,
      allowance,
      now(),
      w.user_id,
    );
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), w.user_id, "renewal", "monthly", allowance, forUser(w.user_id, "Renouvellement mensuel des crédits de création", "Monthly renewal of creation credits"), now());
  });
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", w.user_id)!;
}

/** Recalcule l'enveloppe après un changement d'abonnement (boutiques, activation). */
export function syncAllowance(userId: string) {
  const w = ensureWallet(userId);
  const sub = getSubscription(userId);
  const allowance = subscriptionActive(sub) && sub.status !== "trial" ? monthlyAllowanceMicro(sub.stores) : 0;
  if (allowance !== w.monthly_allowance) {
    run("UPDATE wallets SET monthly_allowance=?, updated_at=? WHERE user_id=?", allowance, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance - w.monthly_allowance, forUser(userId, "Crédits ajustés à votre abonnement", "Credits adjusted to your subscription"), now());
  }
}

export type Balance = {
  available: number;
  used: number;
  capacity: number;
  usedPct: number;
  monthlyRemaining: number;
  topupBalance: number;
  periodEnd: number;
  alert: boolean;
  paused: boolean;
};

export function balance(userId: string): Balance {
  const w = ensureWallet(userId);
  const monthlyRemaining = Math.max(0, w.monthly_allowance - w.monthly_used);
  const available = monthlyRemaining + w.topup_balance;
  const used = w.monthly_used + w.topup_period_used;
  const capacity = available + used;
  const usedPct = capacity > 0 ? used / capacity : 0;
  return {
    available,
    used,
    capacity,
    usedPct,
    monthlyRemaining,
    topupBalance: w.topup_balance,
    periodEnd: w.period_end,
    alert: usedPct >= OFFER.alertThreshold,
    paused: available <= 0,
  };
}

/** Vérifie qu'une génération payante peut démarrer. */
export function assertCanSpend(userId: string, estimateMicro: number) {
  if (estimateMicro <= 0) return;
  const b = balance(userId);
  if (b.available <= 0) {
    throw new UserFacingError(L("Vos crédits de création sont épuisés : les nouvelles générations sont en pause. Rechargez vos crédits ou attendez leur renouvellement.", "Your creation credits are used up: new generations are paused. Top up your credits or wait for them to renew."));
  }
  if (b.available < estimateMicro) {
    const pct = Math.max(1, Math.round((estimateMicro / Math.max(1, b.capacity ?? b.available)) * 100));
    throw new UserFacingError(L(`Crédits de création insuffisants pour cette génération (environ ${pct} % de vos crédits nécessaires). Rechargez vos crédits ou attendez leur renouvellement.`, `Not enough creation credits for this generation (about ${pct}% of your credits needed). Top up your credits or wait for them to renew.`));
  }
}

/** Débite une consommation réelle : l'enveloppe mensuelle d'abord, puis les recharges. */
export function charge(userId: string, amountMicro: number, ref: string | null, note: string) {
  if (amountMicro <= 0) return;
  tx(() => {
    if (ref && one("SELECT 1 FROM ledger WHERE type='usage' AND ref=?", ref)) return; // déjà débité
    const w = ensureWallet(userId);
    const fromMonthly = Math.min(amountMicro, Math.max(0, w.monthly_allowance - w.monthly_used));
    const fromTopup = amountMicro - fromMonthly;
    run(
      "UPDATE wallets SET monthly_used = monthly_used + ?, topup_balance = topup_balance - ?, topup_period_used = topup_period_used + ?, updated_at=? WHERE user_id=?",
      fromMonthly,
      fromTopup,
      fromTopup,
      now(),
      userId,
    );
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "usage", fromTopup > 0 ? "topup" : "monthly", -amountMicro, ref, note, now());
  });
  const b = balance(userId);
  const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  if (b.alert && !w.alert80_sent_at) {
    run("UPDATE wallets SET alert80_sent_at=? WHERE user_id=?", now(), userId);
    run(
      "INSERT INTO notifications (id, user_id, level, title, body, created_at) VALUES (?,?,?,?,?,?)",
      id(),
      userId,
      "warning",
      forUser(userId, "80 % de vos crédits de création sont utilisés", "80% of your creation credits have been used"),
      forUser(userId, "Les générations continuent jusqu'à épuisement. Vous pouvez recharger vos crédits par tranches de 10 €.", "Generations continue until your credits run out. You can top up your credits in €10 increments."),
      now(),
    );
  }
}

/** Crédite une recharge payée : seuls les multiples de 10 € sont acceptés. */
export function creditTopup(userId: string, paidEur: number, ref: string) {
  if (paidEur <= 0 || Math.round(paidEur * 100) % (OFFER.topupStepEur * 100) !== 0) throw new Error(L("Les recharges se font par multiples de 10 €.", "Top-ups must be in multiples of €10."));
  const ai = Math.round(paidEur * OFFER.aiShareOfTopup * EUR);
  tx(() => {
    if (one("SELECT 1 FROM ledger WHERE type='topup' AND ref=?", ref)) return;
    ensureWallet(userId);
    run("UPDATE wallets SET topup_balance = topup_balance + ?, topup_period_added = topup_period_added + ?, updated_at=? WHERE user_id=?", ai, ai, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "topup", "topup", ai, ref, forUser(userId, `Recharge de ${paidEur} €`, `€${paidEur} top-up`), now());
  });
}

/** Ajustement manuel par l'administration (geste commercial, test). */
export function adminAdjust(userId: string, amountMicro: number, note: string) {
  tx(() => {
    ensureWallet(userId);
    run("UPDATE wallets SET topup_balance = MAX(0, topup_balance + ?), topup_period_added = topup_period_added + MAX(0, ?), updated_at=? WHERE user_id=?", amountMicro, amountMicro, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "adjustment", "topup", amountMicro, note, now());
  });
}

// ------------------------------------------------------------------ usage

export type UsageInput = {
  userId: string;
  projectId?: string | null;
  jobId?: string | null;
  task: string;
  provider: string;
  model: string;
  unit: "tokens" | "image" | "video_second" | "request" | "cpu_second";
  inputUnits?: number;
  outputUnits?: number;
  quantity?: number;
  costMicro: number;
  estimated: boolean;
  idempotencyKey?: string;
};

export function recordUsage(u: UsageInput) {
  const markup = getJsonSetting<number>("billing.markup", 1);
  const billed = Math.round(u.costMicro * markup);
  const uid = id();
  try {
    run(
      `INSERT INTO usage_events (id, user_id, project_id, job_id, task, provider, model, unit, input_units, output_units, quantity, cost, billed, estimated, idempotency_key, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      uid,
      u.userId,
      u.projectId ?? null,
      u.jobId ?? null,
      u.task,
      u.provider,
      u.model,
      u.unit,
      u.inputUnits ?? 0,
      u.outputUnits ?? 0,
      u.quantity ?? 0,
      u.costMicro,
      billed,
      u.estimated ? 1 : 0,
      u.idempotencyKey ?? null,
      now(),
    );
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) return; // déjà comptabilisé (reprise)
    throw e;
  }
  charge(u.userId, billed, `usage:${uid}`, `${u.task} · ${u.provider}/${u.model}`);
}
