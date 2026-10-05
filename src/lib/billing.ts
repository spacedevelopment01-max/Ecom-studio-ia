/**
 * Abonnement et budget IA interne (jamais affiché au client : il voit des quotas, voir quotas.ts et plans.ts).
 *  - Chaque forfait a un budget IA mensuel caché (`aiBudgetEur`) : garde-fou de marge, renouvelé chaque mois.
 *  - À la première activation d'un forfait, un budget unique couvre la création de la boutique.
 *  - Sans forfait : un petit budget unique pour la découverte gratuite (analyse, marque, logos, aperçu).
 *  - Budget épuisé : le studio passe discrètement sur le moteur local (voir ai/access.ts).
 * Montants internes en micro-euros (1 € = 1 000 000).
 */
import { addMonths } from "date-fns";
import { id, now, one, run, tx } from "./db";
import { UserFacingError } from "./jobs";
import { getJsonSetting } from "./settings";
import { pick } from "./i18n";
import { L, userLang } from "./i18n-server";
import { DISCOVERY, PLANS, type Billing, type PlanId } from "./plans";

/** Texte enregistré pour un compte (relevé, notification) : dans la langue mémorisée de ce compte. */
const forUser = (userId: string, fr: string, en: string) => pick(userLang(userId), fr, en);

/** Budget unique (caché) pour la création initiale de la boutique, à la première activation d'un forfait. */
export const CREATION_BUDGET_EUR = 12;
/** Anciennes recharges (avant les packs) : encore créditées si un paiement arrive. */
const LEGACY_TOPUP_AI_SHARE = 0.5;

export const EUR = 1_000_000;
export const toEur = (micro: number) => micro / EUR;

export type Subscription = {
  user_id: string;
  status: "none" | "trial" | "active" | "past_due" | "canceled" | "manual";
  stores: number;
  plan: PlanId | null;
  billing: Billing | null;
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

export function getSubscription(userId: string): Subscription {
  const s = one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId);
  if (s) return s;
  run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", userId, "none", 1, now());
  return one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId)!;
}

export const subscriptionActive = (s: Subscription) => s.status === "active" || s.status === "manual" || s.status === "trial";

/** Forfait en vigueur : abonnement actif (les anciens abonnements sans forfait sont rattachés à « Créer »). */
export function planOf(sub: Subscription): PlanId | null {
  if (!subscriptionActive(sub) || sub.status === "trial") return null;
  return sub.plan && sub.plan in PLANS ? sub.plan : "creer";
}

/** Prix mensuel (TTC) d'un abonnement payant : prix du forfait, ou équivalent mensuel en annuel. */
export function monthlyPriceEur(sub: Pick<Subscription, "plan" | "billing">) {
  const plan: PlanId = sub.plan && sub.plan in PLANS ? sub.plan : "creer";
  return sub.billing === "year" ? Math.round((PLANS[plan].price.year / 12) * 100) / 100 : PLANS[plan].price.month;
}

/** Budget IA mensuel caché d'un abonnement. */
export function monthlyAllowanceMicro(sub: Subscription) {
  const plan = planOf(sub);
  return plan ? Math.round(PLANS[plan].aiBudgetEur * EUR) : 0;
}

function ensureWallet(userId: string): Wallet {
  let w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId);
  if (!w) {
    const sub = getSubscription(userId);
    const start = now();
    const allowance = monthlyAllowanceMicro(sub);
    run(
      "INSERT INTO wallets (user_id, period_start, period_end, monthly_allowance, monthly_used, topup_balance, updated_at) VALUES (?,?,?,?,0,0,?)",
      userId,
      start,
      addMonths(start, 1).getTime(),
      allowance,
      now(),
    );
    if (allowance) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance, forUser(userId, "Budget IA du forfait", "Plan AI budget"), now());
    w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  }
  w = renewIfDue(w);
  if (!planOf(getSubscription(userId)) && grantOnce(userId, "discovery", Math.round(DISCOVERY.aiBudgetEur * EUR), "Découverte gratuite", "Free discovery")) {
    w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  }
  return w;
}

/** Budget unique (découverte, création de la boutique) : une seule fois par compte. */
function grantOnce(userId: string, type: "discovery" | "creation", micro: number, fr: string, en: string): boolean {
  if (one("SELECT 1 FROM ledger WHERE user_id = ? AND type = ?", userId, type)) return false;
  return tx(() => {
    if (one("SELECT 1 FROM ledger WHERE user_id = ? AND type = ?", userId, type)) return false;
    run("UPDATE wallets SET topup_balance = topup_balance + ?, topup_period_added = topup_period_added + ?, updated_at=? WHERE user_id=?", micro, micro, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, type, "topup", micro, forUser(userId, fr, en), now());
    return true;
  });
}

/** Début et fin de la période mensuelle en cours (quotas et budget se renouvellent ensemble). */
export function currentPeriod(userId: string) {
  const w = ensureWallet(userId);
  return { start: w.period_start, end: w.period_end };
}

/** Renouvelle le budget mensuel à échéance (les budgets uniques restants sont conservés). */
function renewIfDue(w: Wallet): Wallet {
  if (now() < w.period_end) return w;
  const sub = getSubscription(w.user_id);
  let start = w.period_start;
  let end = w.period_end;
  while (end <= now()) {
    start = end;
    end = addMonths(end, 1).getTime();
  }
  const allowance = monthlyAllowanceMicro(sub);
  tx(() => {
    run(
      "UPDATE wallets SET period_start=?, period_end=?, monthly_allowance=?, monthly_used=0, topup_period_added=0, topup_period_used=0, alert80_sent_at=NULL, updated_at=? WHERE user_id=?",
      start,
      end,
      allowance,
      now(),
      w.user_id,
    );
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), w.user_id, "renewal", "monthly", allowance, forUser(w.user_id, "Renouvellement mensuel", "Monthly renewal"), now());
  });
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", w.user_id)!;
}

/** Recalcule le budget après un changement d'abonnement (forfait, activation) ; première activation : budget de création. */
export function syncAllowance(userId: string) {
  const w = ensureWallet(userId);
  const sub = getSubscription(userId);
  const allowance = monthlyAllowanceMicro(sub);
  if (allowance !== w.monthly_allowance) {
    run("UPDATE wallets SET monthly_allowance=?, updated_at=? WHERE user_id=?", allowance, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance - w.monthly_allowance, forUser(userId, "Budget ajusté au forfait", "Budget adjusted to the plan"), now());
  }
  if (planOf(sub)) grantOnce(userId, "creation", Math.round(CREATION_BUDGET_EUR * EUR), "Création de la boutique", "Store creation");
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
    alert: usedPct >= 0.8,
    paused: available <= 0,
  };
}

/** Vérifie qu'une génération payante peut démarrer (limite d'usage équitable de l'IA, sans montant affiché). */
export function assertCanSpend(userId: string, estimateMicro: number) {
  if (estimateMicro <= 0) return;
  const b = balance(userId);
  if (b.available < estimateMicro) {
    const end = new Date(b.periodEnd).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
    throw new UserFacingError(L(`Vous avez atteint la limite d'utilisation équitable de l'IA de votre forfait pour ce mois-ci. Elle se renouvelle le ${end}.`, `You've reached your plan's fair-use AI limit for this month. It renews on ${end}.`));
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
}

/** Ancienne recharge payée (avant les packs) : crédite encore le budget si un paiement arrive. */
export function creditTopup(userId: string, paidEur: number, ref: string) {
  if (paidEur <= 0) return;
  const ai = Math.round(paidEur * LEGACY_TOPUP_AI_SHARE * EUR);
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
