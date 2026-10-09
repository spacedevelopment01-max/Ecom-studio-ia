/**
 * Abonnement et budget IA interne (jamais affiché au client : il voit des quotas, voir quotas.ts et plans.ts).
 *
 * Règle de marge (impérative) :
 *  - dépense chez les fournisseurs d'IA ≤ 40 % du prix mensuel HT effectivement applicable à l'abonnement
 *    (équivalent mensuel en annuel, remise comprise ; changement de forfait au prorata de la période) ;
 *    la première création de la boutique fait partie de ce budget, sans enveloppe supplémentaire ;
 *  - recharges et packs : budget distinct ≤ 50 % de leur prix HT payé ;
 *  - découverte gratuite : 0 € (moteur local seulement).
 *
 * Protection côté serveur, pour TOUT appel payant (texte, image, vidéo ; worker, site, administrateur, anciens et
 * nouveaux moteurs — tous passent par ai/llm.ts ou ai/media-providers.ts) :
 *  1. réservation atomique du coût MAXIMAL de l'appel avant l'envoi (`reserve`) — refusée si le reste disponible,
 *     réservations en cours déduites, ne le couvre pas : deux appels simultanés ne peuvent pas dépasser le budget ;
 *  2. règlement au coût réellement facturé (`settle`) — jamais de solde négatif ; un coût réel supérieur à la
 *     réservation n'est débité qu'à hauteur du reste et le dépassement est signalé (`overrun`) ;
 *  3. appel refusé par le fournisseur avant tout travail : réservation libérée (`release`) ;
 *  4. résultat incertain (délai dépassé, coupure, erreur après acceptation) : réservation débitée en entier
 *     (`settleUncertain`), à réconcilier avec la facture du fournisseur (`reconcileReservation`) ;
 *  5. réservation orpheline (processus arrêté pendant l'appel) : traitée comme incertaine après RESERVATION_TTL_MS.
 * Montants internes en micro-euros (1 € = 1 000 000).
 */
import { addMonths } from "date-fns";
import { all, id, logError, now, one, run, tx } from "./db";
import { UserFacingError } from "./jobs";
import { getJsonSetting } from "./settings";
import { pick } from "./i18n";
import { L, userLang } from "./i18n-server";
import { PLANS, type Billing, type PlanId } from "./plans";

/** Texte enregistré pour un compte (relevé, notification) : dans la langue mémorisée de ce compte. */
const forUser = (userId: string, fr: string, en: string) => pick(userLang(userId), fr, en);

export const EUR = 1_000_000;
export const toEur = (micro: number) => micro / EUR;

/** TVA française des prix affichés (TTC) des forfaits et des packs (même hypothèse que la comptabilité). */
export const SALES_VAT_RATE = 0.2;
/** Part maximale du prix mensuel HT d'un abonnement dépensée chez les fournisseurs d'IA. */
export const SUBSCRIPTION_AI_SHARE = 0.4;
/** Part maximale du prix HT d'une recharge ou d'un pack dépensée chez les fournisseurs d'IA. */
export const PACK_AI_SHARE = 0.5;
/** Prix HT d'un prix TTC. */
export const htEur = (ttcEur: number) => ttcEur / (1 + SALES_VAT_RATE);
/** Budget fournisseur d'un pack ou d'une recharge payé `paidTtcEur` (50 % du HT, arrondi à l'inférieur). */
export const packBudgetMicro = (paidTtcEur: number) => Math.max(0, Math.floor(PACK_AI_SHARE * htEur(paidTtcEur) * EUR));
/** Réservation sans règlement au-delà de ce délai : l'appel est considéré comme parti (prudence). */
export const RESERVATION_TTL_MS = 2 * 60 * 60_000;
/** Version de la règle budgétaire : les portefeuilles plus anciens sont mis en conformité une fois. */
const BUDGET_RULE_VERSION = 1;

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
  /** Horodatage Stripe (secondes) du dernier événement appliqué à l'abonnement en cours. */
  stripe_event_at?: number | null;
  /** Création (secondes) de la session de paiement qui a souscrit l'abonnement en cours. */
  stripe_checkout_at?: number | null;
};

export type Wallet = {
  user_id: string;
  period_start: number;
  period_end: number;
  prev_period_start: number | null;
  monthly_allowance: number;
  monthly_used: number;
  topup_balance: number;
  topup_period_added: number;
  topup_period_used: number;
  alert80_sent_at: number | null;
  /** Coûts maximaux réservés par les appels en cours (déduits du disponible). */
  reserved: number;
  rule_version: number;
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

/** Budget IA mensuel caché d'un abonnement : 40 % du prix mensuel HT applicable (arrondi à l'inférieur). */
export function monthlyAllowanceMicro(sub: Pick<Subscription, "status" | "plan" | "billing">) {
  const plan = planOf(sub as Subscription);
  return plan ? Math.floor(SUBSCRIPTION_AI_SHARE * htEur(monthlyPriceEur(sub)) * EUR) : 0;
}

function ensureWallet(userId: string): Wallet {
  let w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId);
  if (!w) {
    const sub = getSubscription(userId);
    const start = now();
    const allowance = monthlyAllowanceMicro(sub);
    // Web et worker peuvent créer le portefeuille en même temps : le second ne fait rien.
    const created = run(
      "INSERT OR IGNORE INTO wallets (user_id, period_start, period_end, monthly_allowance, monthly_used, topup_balance, rule_version, updated_at) VALUES (?,?,?,?,0,0,?,?)",
      userId,
      start,
      addMonths(start, 1).getTime(),
      allowance,
      BUDGET_RULE_VERSION,
      now(),
    );
    if (created.changes && allowance) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance, forUser(userId, "Budget IA du forfait", "Plan AI budget"), now());
    w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  }
  w = renewIfDue(w);
  if (w.rule_version < BUDGET_RULE_VERSION) w = conformWallet(w);
  if (w.reserved > 0) sweepStaleReservations(userId);
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
}

/** Budget fournisseur auquel les packs et recharges payés donnent droit (50 % du HT de chaque paiement). */
function packEntitlementMicro(userId: string) {
  return all<{ amount_cents: number }>("SELECT amount_cents FROM payments WHERE user_id = ? AND kind IN ('pack','topup') AND status = 'paid'", userId).reduce((a, p) => a + packBudgetMicro(p.amount_cents / 100), 0);
}

/**
 * Mise en conformité unique d'un portefeuille créé avant la règle des 40 % / 50 % (données conservées, montants
 * plafonnés) : budget mensuel de la période ramené au nouveau plafond s'il le dépasse ; budget hors forfait
 * (ancien budget de création, anciennes recharges) plafonné à ce que les packs et recharges payés justifient.
 * Chaque changement est inscrit au relevé interne.
 */
function conformWallet(w: Wallet): Wallet {
  tx(() => {
    const cur = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", w.user_id)!;
    if (cur.rule_version >= BUDGET_RULE_VERSION) return;
    const allowance = Math.min(cur.monthly_allowance, monthlyAllowanceMicro(getSubscription(w.user_id)));
    const topup = Math.max(0, Math.min(cur.topup_balance, packEntitlementMicro(w.user_id)));
    run("UPDATE wallets SET monthly_allowance = ?, topup_balance = ?, rule_version = ?, updated_at = ? WHERE user_id = ?", allowance, topup, BUDGET_RULE_VERSION, now(), w.user_id);
    if (allowance !== cur.monthly_allowance) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), w.user_id, "adjustment", "monthly", allowance - cur.monthly_allowance, "Mise en conformité : budget IA ≤ 40 % du prix HT du forfait", now());
    if (topup !== cur.topup_balance) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), w.user_id, "adjustment", "topup", topup - cur.topup_balance, "Mise en conformité : budget hors forfait ≤ 50 % du HT des packs et recharges payés", now());
  });
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", w.user_id)!;
}

/**
 * Début et fin de la période mensuelle en cours (quotas et budget se renouvellent ensemble), et début de la
 * période immédiatement précédente (seule source du report des quotas). C'est la seule date de renouvellement
 * montrée au client (Mon compte, messages de quota, limite d'usage).
 */
export function currentPeriod(userId: string) {
  const w = ensureWallet(userId);
  return { start: w.period_start, end: w.period_end, prevStart: w.prev_period_start ?? null };
}

/** Renouvelle le budget mensuel à échéance (les budgets uniques restants sont conservés). Exportée pour les tests. */
export function renewIfDue(w: Wallet): Wallet {
  if (now() < w.period_end) return w;
  const sub = getSubscription(w.user_id);
  let prevStart = w.period_start;
  let start = w.period_start;
  let end = w.period_end;
  while (end <= now()) {
    prevStart = start;
    start = end;
    end = addMonths(end, 1).getTime();
  }
  const allowance = monthlyAllowanceMicro(sub);
  tx(() => {
    // Web et worker peuvent renouveler en même temps : seul celui qui voit encore l'ancienne échéance renouvelle.
    const done = run(
      "UPDATE wallets SET period_start=?, period_end=?, prev_period_start=?, monthly_allowance=?, monthly_used=0, topup_period_added=0, topup_period_used=0, alert80_sent_at=NULL, updated_at=? WHERE user_id=? AND period_end=?",
      start,
      end,
      prevStart,
      allowance,
      now(),
      w.user_id,
      w.period_end,
    );
    if (done.changes === 1) run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), w.user_id, "renewal", "monthly", allowance, forUser(w.user_id, "Renouvellement mensuel", "Monthly renewal"), now());
  });
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", w.user_id)!;
}

/**
 * Activation d'un forfait (nouvel abonnement payé, ou activation par l'administration) : la période des quotas et
 * du budget est réalignée sur la période de facturation (début de l'abonnement). Sans cela, la période née à
 * l'inscription se renouvellerait quelques jours après le paiement et doublerait les quotas.
 * La période précédente (découverte, ou ancien forfait) devient la seule source possible du report.
 */
export function alignPeriod(userId: string, startMs?: number | null, endMs?: number | null) {
  const w = ensureWallet(userId);
  let start = startMs && startMs > 0 ? startMs : now();
  // Abonnement mensuel : fin de période Stripe ; annuel ou inconnu : un mois (les quotas restent mensuels).
  let end = endMs && endMs > start && endMs <= addMonths(start, 1).getTime() + 3 * 86400_000 ? endMs : addMonths(start, 1).getTime();
  if (end <= now()) {
    start = now();
    end = addMonths(start, 1).getTime();
  }
  if (w.period_start === start && w.period_end === end) return;
  const allowance = monthlyAllowanceMicro(getSubscription(userId));
  tx(() => {
    run(
      "UPDATE wallets SET prev_period_start=period_start, period_start=?, period_end=?, monthly_allowance=?, monthly_used=0, topup_period_added=0, topup_period_used=0, alert80_sent_at=NULL, updated_at=? WHERE user_id=?",
      start,
      end,
      allowance,
      now(),
      userId,
    );
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "renewal", "monthly", allowance, forUser(userId, "Début de la période du forfait", "Plan period start"), now());
  });
}

/**
 * Recalcule le budget après un changement d'abonnement. Changement de forfait en cours de période : budget au
 * prorata (ancien forfait pour la partie écoulée, nouveau pour le reste), comme la facturation. La première
 * création de la boutique est prise sur ce budget (plus d'enveloppe supplémentaire).
 */
export function syncAllowance(userId: string) {
  const w = ensureWallet(userId);
  const target = monthlyAllowanceMicro(getSubscription(userId));
  if (target === w.monthly_allowance) return;
  const span = Math.max(1, w.period_end - w.period_start);
  const left = Math.min(1, Math.max(0, (w.period_end - now()) / span));
  // Pas de budget précédent (activation) : budget plein ; fin d'abonnement : 0 ; sinon prorata de la période restante.
  const allowance = w.monthly_allowance > 0 && target > 0 ? Math.floor(w.monthly_allowance + (target - w.monthly_allowance) * left) : target;
  run("UPDATE wallets SET monthly_allowance=?, updated_at=? WHERE user_id=?", allowance, now(), userId);
  run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "allowance", "monthly", allowance - w.monthly_allowance, forUser(userId, "Budget ajusté au forfait", "Budget adjusted to the plan"), now());
}

export type Balance = {
  available: number;
  used: number;
  capacity: number;
  usedPct: number;
  monthlyRemaining: number;
  topupBalance: number;
  /** Coûts maximaux réservés par les appels en cours. */
  reserved: number;
  periodEnd: number;
  alert: boolean;
  paused: boolean;
};

export function balance(userId: string): Balance {
  const w = ensureWallet(userId);
  const monthlyRemaining = Math.max(0, w.monthly_allowance - w.monthly_used);
  const available = Math.max(0, monthlyRemaining + Math.max(0, w.topup_balance) - w.reserved);
  const used = w.monthly_used + w.topup_period_used;
  const capacity = available + w.reserved + used;
  const usedPct = capacity > 0 ? used / capacity : 0;
  return {
    available,
    used,
    capacity,
    usedPct,
    monthlyRemaining,
    topupBalance: w.topup_balance,
    reserved: w.reserved,
    periodEnd: w.period_end,
    alert: usedPct >= 0.8,
    paused: available <= 0,
  };
}

/** Message de budget épuisé (limite d'usage équitable, sans montant affiché). */
function budgetError(userId: string) {
  const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId);
  const end = new Date(w?.period_end ?? now()).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
  return new UserFacingError(L(`Vous avez atteint la limite d'utilisation équitable de l'IA de votre forfait pour ce mois-ci. Elle se renouvelle le ${end}.`, `You've reached your plan's fair-use AI limit for this month. It renews on ${end}.`));
}

/** Pré-contrôle avant de proposer une génération payante (le vrai garde-fou est la réservation, `reserve`). */
export function assertCanSpend(userId: string, estimateMicro: number) {
  if (estimateMicro <= 0) return;
  if (balance(userId).available < estimateMicro) throw budgetError(userId);
}

// ------------------------------------------------------------------ réservations

export type ReservationMeta = { task: string; provider: string; model: string; jobId?: string | null; projectId?: string | null };
type ReservationRow = { id: string; user_id: string; amount: number; status: "held" | "settled" | "released" | "uncertain" | "reconciled"; debit_monthly: number; debit_topup: number; actual: number | null; created_at: number };

/**
 * Réserve le coût MAXIMAL d'un appel avant son envoi. Une seule instruction SQL conditionnelle : le reste
 * (budget mensuel restant + budget packs − réservations en cours) doit couvrir le montant, sinon rien n'est réservé
 * et l'appel est refusé. Atomique entre processus (site, worker) : deux appels simultanés ne peuvent pas réserver
 * le même reste.
 */
export function reserve(userId: string, maxMicro: number, meta: ReservationMeta): string {
  const amount = Math.ceil(maxMicro);
  // Coût maximal inconnu ou non borné : l'opération est bloquée (jamais d'appel « à découvert »).
  if (!Number.isFinite(amount) || amount <= 0) throw new UserFacingError(L("Coût maximal de l'appel d'IA inconnu : opération bloquée par sécurité.", "Maximum cost of the AI call is unknown: operation blocked for safety."));
  ensureWallet(userId);
  const rid = id();
  const ok = tx(() => {
    const r = run(
      "UPDATE wallets SET reserved = reserved + ?, updated_at = ? WHERE user_id = ? AND MAX(0, monthly_allowance - monthly_used) + MAX(0, topup_balance) - reserved >= ?",
      amount,
      now(),
      userId,
      amount,
    );
    if (r.changes !== 1) return false;
    run("INSERT INTO ai_reservations (id, user_id, amount, status, task, provider, model, job_id, project_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", rid, userId, amount, "held", meta.task, meta.provider, meta.model, meta.jobId ?? null, meta.projectId ?? null, now());
    return true;
  });
  if (!ok) throw budgetError(userId);
  return rid;
}

/** Débite `amount` sur le budget mensuel puis sur le budget packs, sans jamais passer sous zéro. Dans une transaction. */
function debit(userId: string, amount: number) {
  const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  const fromMonthly = Math.min(amount, Math.max(0, w.monthly_allowance - w.monthly_used));
  const fromTopup = Math.min(amount - fromMonthly, Math.max(0, w.topup_balance));
  run("UPDATE wallets SET monthly_used = monthly_used + ?, topup_balance = topup_balance - ?, topup_period_used = topup_period_used + ?, updated_at = ? WHERE user_id = ?", fromMonthly, fromTopup, fromTopup, now(), userId);
  return { fromMonthly, fromTopup, overrun: amount - fromMonthly - fromTopup };
}

/** Dépassement (coût réel au-delà de ce qui pouvait être débité) : jamais débité au client, inscrit et signalé. */
function recordOverrun(userId: string, overrun: number, ref: string | null, note: string) {
  if (overrun <= 0) return;
  run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "overrun", "none", -overrun, ref ? `overrun:${ref}` : null, `Dépassement non débité (coût réel > réservation) — ${note}`, now());
  logError("billing:overrun", new Error(`Coût IA réel supérieur au budget réservé de ${(overrun / EUR).toFixed(4)} €`), { userId, details: { ref, note } });
}

/**
 * Règle une réservation au coût réellement facturé : la réservation est libérée, le coût réel débité (au plus le
 * disponible : jamais de solde négatif), un éventuel dépassement inscrit à part. Idempotent.
 */
export function settle(reservationId: string, billedMicro: number, ref: string | null, note: string) {
  tx(() => {
    const r = one<ReservationRow>("SELECT * FROM ai_reservations WHERE id = ?", reservationId);
    if (!r || r.status !== "held") return;
    run("UPDATE wallets SET reserved = MAX(0, reserved - ?), updated_at = ? WHERE user_id = ?", r.amount, now(), r.user_id);
    const amount = Math.max(0, Math.round(billedMicro));
    const d = debit(r.user_id, amount);
    run("UPDATE ai_reservations SET status = 'settled', actual = ?, debit_monthly = ?, debit_topup = ?, settled_at = ? WHERE id = ?", amount, d.fromMonthly, d.fromTopup, now(), r.id);
    if (amount > 0) run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), r.user_id, "usage", d.fromTopup > 0 ? "topup" : "monthly", -(d.fromMonthly + d.fromTopup), ref, note, now());
    recordOverrun(r.user_id, d.overrun, ref ?? r.id, note);
  });
}

/** Libère une réservation : l'appel n'a rien coûté (refusé par le fournisseur avant tout travail, déjà compté). */
export function release(reservationId: string, reason = "") {
  tx(() => {
    const r = one<ReservationRow>("SELECT * FROM ai_reservations WHERE id = ?", reservationId);
    if (!r || r.status !== "held") return;
    run("UPDATE wallets SET reserved = MAX(0, reserved - ?), updated_at = ? WHERE user_id = ?", r.amount, now(), r.user_id);
    run("UPDATE ai_reservations SET status = 'released', note = ?, settled_at = ? WHERE id = ?", reason.slice(0, 200), now(), r.id);
  });
}

/**
 * Résultat incertain (délai dépassé, coupure, erreur après acceptation par le fournisseur) : par prudence, le
 * coût maximal réservé est débité. La facture réelle du fournisseur permet ensuite de rendre la différence.
 */
export function settleUncertain(reservationId: string, reason: string) {
  tx(() => {
    const r = one<ReservationRow>("SELECT * FROM ai_reservations WHERE id = ?", reservationId);
    if (!r || r.status !== "held") return;
    run("UPDATE wallets SET reserved = MAX(0, reserved - ?), updated_at = ? WHERE user_id = ?", r.amount, now(), r.user_id);
    const d = debit(r.user_id, r.amount);
    run("UPDATE ai_reservations SET status = 'uncertain', actual = ?, debit_monthly = ?, debit_topup = ?, note = ?, settled_at = ? WHERE id = ?", r.amount, d.fromMonthly, d.fromTopup, reason.slice(0, 200), now(), r.id);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), r.user_id, "usage", d.fromTopup > 0 ? "topup" : "monthly", -(d.fromMonthly + d.fromTopup), `uncertain:${r.id}`, `Résultat incertain, coût maximal retenu — ${reason.slice(0, 120)}`, now());
    recordOverrun(r.user_id, d.overrun, `uncertain:${r.id}`, reason);
  });
}

/**
 * Réconciliation d'un appel incertain avec la facture du fournisseur (administration) : la différence entre le
 * montant retenu et le coût réel est rendue au budget d'où elle venait (jamais au-delà de ce qui a été retenu).
 */
export function reconcileReservation(reservationId: string, actualMicro: number) {
  tx(() => {
    const r = one<ReservationRow>("SELECT * FROM ai_reservations WHERE id = ?", reservationId);
    if (!r || r.status !== "uncertain") return;
    const actual = Math.max(0, Math.round(actualMicro));
    const refund = Math.max(0, r.debit_monthly + r.debit_topup - actual);
    const toTopup = Math.min(refund, r.debit_topup);
    const toMonthly = refund - toTopup;
    run("UPDATE wallets SET monthly_used = MAX(0, monthly_used - ?), topup_balance = topup_balance + ?, topup_period_used = MAX(0, topup_period_used - ?), updated_at = ? WHERE user_id = ?", toMonthly, toTopup, toTopup, now(), r.user_id);
    run("UPDATE ai_reservations SET status = 'reconciled', actual = ?, settled_at = ? WHERE id = ?", actual, now(), r.id);
    if (refund > 0) run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), r.user_id, "reconciliation", toTopup > 0 ? "topup" : "monthly", refund, `reconcile:${r.id}`, "Appel incertain réconcilié avec la facture du fournisseur", now());
  });
}

/** Réservations orphelines (processus arrêté pendant l'appel) : traitées comme incertaines, par prudence. */
export function sweepStaleReservations(userId?: string) {
  const stale = userId
    ? all<{ id: string }>("SELECT id FROM ai_reservations WHERE user_id = ? AND status = 'held' AND created_at < ?", userId, now() - RESERVATION_TTL_MS)
    : all<{ id: string }>("SELECT id FROM ai_reservations WHERE status = 'held' AND created_at < ?", now() - RESERVATION_TTL_MS);
  for (const r of stale) settleUncertain(r.id, "réservation sans règlement (processus interrompu pendant l'appel)");
}

/** Débite une consommation sans réservation préalable (ancien chemin) : jamais au-delà du disponible. */
export function charge(userId: string, amountMicro: number, ref: string | null, note: string) {
  if (amountMicro <= 0) return;
  ensureWallet(userId);
  tx(() => {
    if (ref && one("SELECT 1 FROM ledger WHERE type='usage' AND ref=?", ref)) return; // déjà débité
    const d = debit(userId, amountMicro);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "usage", d.fromTopup > 0 ? "topup" : "monthly", -(d.fromMonthly + d.fromTopup), ref, note, now());
    recordOverrun(userId, d.overrun, ref, note);
  });
}

/** Ancienne recharge payée (avant les packs) : crédite 50 % de son prix HT au budget hors forfait. */
export function creditTopup(userId: string, paidEur: number, ref: string) {
  creditPackBudget(userId, paidEur, ref, forUser(userId, `Recharge de ${paidEur} €`, `€${paidEur} top-up`));
}

/** Pack acheté : budget fournisseur distinct = 50 % du prix HT payé. Une seule fois par paiement. */
export function creditPackBudget(userId: string, paidTtcEur: number, ref: string, note: string) {
  const ai = packBudgetMicro(paidTtcEur);
  if (ai <= 0) return;
  ensureWallet(userId);
  tx(() => {
    if (one("SELECT 1 FROM ledger WHERE type='topup' AND ref=?", ref)) return;
    run("UPDATE wallets SET topup_balance = topup_balance + ?, topup_period_added = topup_period_added + ?, updated_at=? WHERE user_id=?", ai, ai, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "topup", "topup", ai, ref, note, now());
  });
}

/**
 * Ajustement manuel par l'administration : uniquement à la baisse. Un budget IA ajouté à la main dépasserait la
 * règle des 40 % / 50 % (les gestes commerciaux passent par les quotas ou un pack).
 */
export function adminAdjust(userId: string, amountMicro: number, note: string) {
  if (amountMicro > 0) throw new UserFacingError(L("Le budget IA ne peut pas être augmenté à la main (règle des 40 % du prix HT). Offrez plutôt un pack.", "The AI budget can't be raised by hand (40% of the net price rule). Offer a pack instead."));
  ensureWallet(userId);
  tx(() => {
    const d = debit(userId, -amountMicro);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, note, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "adjustment", d.fromTopup > 0 ? "topup" : "monthly", -(d.fromMonthly + d.fromTopup), note, now());
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

/**
 * Facturation d'un usage. Renvoie l'événement créé, ou `dedup: true` s'il était déjà compté (reprise, même clé).
 * Avec `reservationId` : la réservation est réglée au coût réel (ou libérée si l'usage était déjà compté).
 */
export function recordUsage(u: UsageInput, o: { reservationId?: string | null } = {}): { eventId: string | null; dedup: boolean } {
  const markup = getJsonSetting<number>("billing.markup", 1);
  const billed = Math.round(u.costMicro * Math.max(1, markup));
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
    if (String(e?.message).includes("UNIQUE")) {
      if (o.reservationId) release(o.reservationId, "usage déjà compté (reprise)");
      return { eventId: null, dedup: true }; // déjà comptabilisé (reprise)
    }
    throw e;
  }
  const note = `${u.task} · ${u.provider}/${u.model}`;
  if (o.reservationId) settle(o.reservationId, billed, `usage:${uid}`, note);
  else charge(u.userId, billed, `usage:${uid}`, note);
  return { eventId: uid, dedup: false };
}
