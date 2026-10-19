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
 *     la réservation est prise sur le budget de l'abonnement puis sur celui des packs, chaque part étant suivie à part
 *     (`reserved` / `reserved_topup`) et rendue ou débitée sur son propre budget ;
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
import { accountKeyFor, isNoPlanKey } from "./project-billing";
import { assertUnderCostCap, currentTrace } from "./ai/trace";
import { currentRunScope } from "./billing-scope";
import { createHash } from "node:crypto";

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
  /**
   * Prix TTC réellement payé par période (centimes) : un ancien abonné garde l'ancien prix jusqu'à son
   * renouvellement, et son budget IA reste calculé sur ce qu'il paie (règle des 40 %).
   */
  price_cents?: number | null;
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
  /** Coûts maximaux réservés par les appels en cours, sur le budget de l'abonnement. */
  reserved: number;
  /** Coûts maximaux réservés par les appels en cours, sur le budget des packs et recharges (distinct). */
  reserved_topup: number;
  rule_version: number;
};

/**
 * Abonnement d'un compte de facturation (clé : id du client pour un ancien abonnement, id propre pour un abonnement
 * par projet — voir project-billing.ts). Projet sans abonnement : abonnement vide, jamais enregistré.
 */
export function getSubscription(userId: string): Subscription {
  if (isNoPlanKey(userId)) return { user_id: userId, status: "none", stores: 1, plan: null, billing: null, stripe_customer_id: null, stripe_subscription_id: null, current_period_start: null, current_period_end: null };
  const s = one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId);
  if (s) return s;
  // Seul un compte client existant reçoit un abonnement vide (un abonnement par projet est créé par le paiement).
  if (!one("SELECT 1 FROM users WHERE id = ?", userId)) throw new Error("compte introuvable");
  run("INSERT OR IGNORE INTO subscriptions (user_id, owner_user_id, status, stores, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", userId, userId, "none", 1, "legacy", now(), now());
  return one<Subscription>("SELECT * FROM subscriptions WHERE user_id = ?", userId)!;
}

export const subscriptionActive = (s: Subscription) => s.status === "active" || s.status === "manual" || s.status === "trial";

/** Forfait en vigueur : abonnement actif (les anciens abonnements sans forfait sont rattachés à « Créer »). */
export function planOf(sub: Subscription): PlanId | null {
  if (!subscriptionActive(sub) || sub.status === "trial") return null;
  return sub.plan && sub.plan in PLANS ? sub.plan : "creer";
}

/** Prix mensuel (TTC) d'un abonnement payant : prix du forfait, ou équivalent mensuel en annuel. */
export function monthlyPriceEur(sub: Pick<Subscription, "plan" | "billing"> & { price_cents?: number | null }) {
  // Arrondi conservateur : l'équivalent mensuel d'un prix annuel est arrondi au centime INFÉRIEUR (le budget IA qui
  // en découle ne dépasse jamais 40 % du prix réellement payé).
  if (sub.price_cents && sub.price_cents > 0) return (sub.billing === "year" ? Math.floor(sub.price_cents / 12) : sub.price_cents) / 100;
  const plan: PlanId = sub.plan && sub.plan in PLANS ? sub.plan : "creer";
  return sub.billing === "year" ? Math.floor((PLANS[plan].price.year * 100) / 12) / 100 : PLANS[plan].price.month;
}

/** Budget IA mensuel caché d'un abonnement : 40 % du prix mensuel HT applicable (arrondi à l'inférieur). */
export function monthlyAllowanceMicro(sub: Pick<Subscription, "status" | "plan" | "billing"> & { price_cents?: number | null }) {
  const plan = planOf(sub as Subscription);
  return plan ? Math.floor(SUBSCRIPTION_AI_SHARE * htEur(monthlyPriceEur(sub)) * EUR) : 0;
}

/** Portefeuille vide d'un projet sans abonnement (jamais enregistré : aucun budget). */
const emptyWallet = (key: string): Wallet => ({ user_id: key, period_start: now(), period_end: addMonths(now(), 1).getTime(), prev_period_start: null, monthly_allowance: 0, monthly_used: 0, topup_balance: 0, topup_period_added: 0, topup_period_used: 0, alert80_sent_at: null, reserved: 0, reserved_topup: 0, rule_version: BUDGET_RULE_VERSION });

function ensureWallet(userId: string): Wallet {
  if (isNoPlanKey(userId)) return emptyWallet(userId);
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
  if (w.reserved > 0 || w.reserved_topup > 0) sweepStaleReservations(userId);
  return one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
}

/** Budget fournisseur auquel les packs et recharges payés donnent droit (50 % du HT de chaque paiement). */
function packEntitlementMicro(userId: string) {
  // Anciens packs (rattachés au compte) et recharges V2 (rattachées à l'abonnement d'un projet), remboursements déduits.
  return all<{ amount_cents: number; refunded_cents: number }>("SELECT amount_cents, refunded_cents FROM payments WHERE (account_key = ? OR (account_key IS NULL AND user_id = ?)) AND kind IN ('pack','topup') AND status = 'paid'", userId, userId).reduce((a, p) => a + packBudgetMicro(Math.max(0, p.amount_cents - (p.refunded_cents ?? 0)) / 100), 0);
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
    // Les engagements de l'ancien mois sont retenus AVANT sa clôture. Un résultat tardif
    // les rapproche ensuite sans prélever ni recréditer le nouveau mois.
    if (one<Wallet>("SELECT * FROM wallets WHERE user_id=?", w.user_id)?.period_end === w.period_end) closePeriodReservations(w.user_id);
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
    closePeriodReservations(userId);
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

/** Reste non réservé du budget de l'abonnement, et du budget packs/recharges (jamais mélangés). */
const freeMonthly = (w: Wallet) => Math.max(0, w.monthly_allowance - w.monthly_used - w.reserved);
const freeTopup = (w: Wallet) => Math.max(0, w.topup_balance - w.reserved_topup);

export function balance(userId: string, projectId?: string | null): Balance {
  const w = ensureWallet(accountKeyFor(userId, projectId));
  const monthlyRemaining = Math.max(0, w.monthly_allowance - w.monthly_used);
  const available = freeMonthly(w) + freeTopup(w);
  const used = w.monthly_used + w.topup_period_used;
  const capacity = available + w.reserved + w.reserved_topup + used;
  const usedPct = capacity > 0 ? used / capacity : 0;
  return {
    available,
    used,
    capacity,
    usedPct,
    monthlyRemaining,
    topupBalance: w.topup_balance,
    reserved: w.reserved + w.reserved_topup,
    periodEnd: w.period_end,
    alert: usedPct >= 0.8,
    paused: available <= 0,
  };
}

/**
 * Les deux réserves d'IA d'un compte, en proportions (jamais de montant affiché au client) : le forfait du mois, et
 * les crédits achetés en plus (packs, recharges), qui ne servent qu'une fois le forfait épuisé et n'expirent pas.
 */
export function aiReserves(key: string): { plan: { used: number } | null; credits: { used: number } | null } {
  const userId = key;
  const w = ensureWallet(userId);
  const ratio = (used: number, total: number) => (total > 0 ? Math.min(1, Math.max(0, used / total)) : 1);
  // Crédits : tout ce qui a été acheté (budget des packs et recharges payés), dont ce qu'il reste à utiliser.
  const bought = Math.max(packEntitlementMicro(userId), w.topup_balance + w.topup_period_used);
  // Seul ce qui a réellement été dépensé compte : la réserve d'une action en cours (son coût MAXIMAL, rendu en partie
  // à la fin) ferait baisser puis remonter le « reste » affiché.
  return {
    plan: w.monthly_allowance > 0 ? { used: ratio(w.monthly_used, w.monthly_allowance) } : null,
    credits: bought > 0 ? { used: ratio(bought - Math.max(0, w.topup_balance), bought) } : null,
  };
}

/**
 * Base des pourcentages de coût montrés au client (« ≈ 3 % de votre budget IA ») : la même réserve que la jauge
 * « Reste … % » — le budget IA du forfait du mois tant qu'il n'est pas épuisé, puis les crédits achetés. 0 : aucun budget.
 * Jamais affichée elle-même (aucun montant montré au client).
 */
export function aiPctBaseMicro(key: string): number {
  const w = ensureWallet(key);
  const bought = Math.max(packEntitlementMicro(key), w.topup_balance + w.topup_period_used);
  if (w.monthly_allowance > 0 && w.monthly_used < w.monthly_allowance) return w.monthly_allowance;
  return bought > 0 ? bought : Math.max(0, w.monthly_allowance);
}

/** Message de budget épuisé (limite d'usage équitable, sans montant affiché). */
function budgetError(userId: string) {
  const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId);
  if (w && w.reserved + w.reserved_topup > 0) return new UserFacingError(L("Le budget disponible est engagé dans une génération en cours. Attendez son résultat ; les étapes déjà terminées sont conservées.", "The available budget is committed to a generation in progress. Wait for its result; completed steps are kept."));
  const end = new Date(w?.period_end ?? now()).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
  return new UserFacingError(L(`L'IA de votre forfait est utilisée à 100 % pour ce mois-ci. Elle reprend le ${end}, ou tout de suite avec une recharge de l'IA du projet (Mon compte).`, `Your plan's AI is 100% used for this month. It resumes on ${end}, or right away with a project AI top-up (My account).`));
}

/** Pré-contrôle avant de proposer une génération payante (le vrai garde-fou est la réservation, `reserve`). */
export function assertCanSpend(userId: string, estimateMicro: number, projectId?: string | null) {
  if (estimateMicro <= 0) return;
  const key = accountKeyFor(userId, projectId);
  if (balance(key).available < estimateMicro) throw budgetError(key);
}

// ------------------------------------------------------------------ réservations

export type ReservationMeta = { task: string; provider: string; model: string; jobId?: string | null; projectId?: string | null; usageKey?: string; requestHash?: string };
type ReservationRow = { id: string; user_id: string; amount: number; res_monthly: number; res_topup: number; status: "held" | "settled" | "released" | "uncertain" | "reconciled"; debit_monthly: number; debit_topup: number; actual: number | null; created_at: number; settled_at: number | null; settled_period_start: number | null };

type Operation = ReservationRow & { request_hash: string | null; result: string | null; provider_receipt: string | null; recovery_until: number; provider: string; model: string };
const operationProject = (projectId?: string | null) => projectId ?? currentTrace().projectId ?? currentRunScope()?.projectId ?? null;
const operationKey = (user: string, meta: Pick<ReservationMeta, "task" | "projectId" | "usageKey">) => meta.usageKey ? createHash("sha256").update(JSON.stringify([user, operationProject(meta.projectId), meta.task, meta.usageKey])).digest("hex") : null;
export function requestHash(value: unknown): string {
  const normalize = (v: any): any => Buffer.isBuffer(v) ? { bytes: v.length, sha256: createHash("sha256").update(v).digest("hex") } : Array.isArray(v) ? v.map(normalize) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, normalize(v[k])])) : typeof v === "function" ? undefined : v;
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}

/** La réservation native est aussi le reçu de l'opération : aucune seconde requête payante sous la même clé. */
export function existingOperation(user: string, meta: Pick<ReservationMeta, "task" | "projectId" | "usageKey" | "requestHash">): Operation | undefined {
  // Résout et vérifie le propriétaire, même pour la lecture d'un résultat déjà acquis.
  const account = accountKeyFor(user, meta.projectId);
  const key = operationKey(user, meta);
  if (!key) return undefined;
  const r = one<Operation>("SELECT * FROM ai_reservations WHERE operation_key=? AND user_id=? AND status!='released'", key, account);
  if (r && r.request_hash !== (meta.requestHash ?? null)) throw new UserFacingError(L("Cette demande a changé. Enregistrez-la comme une nouvelle action ; le travail précédent est conservé.", "This request has changed. Save it as a new action; the previous work is kept."));
  if (!r && !one("SELECT 1 FROM ai_reservations WHERE operation_key=?", key)) {
    // Avant cette migration, une clé n'empêchait pas le second envoi. Une ancienne facture/trace
    // ou un suivi fournisseur sans reçu associé ne doivent pas devenir un nouvel appel gratuit.
    const project = operationProject(meta.projectId);
    const billedKey = `usage:v2:${createHash("sha256").update(JSON.stringify([user,project,meta.task,meta.usageKey])).digest("hex")}`;
    const historical = one("SELECT 1 FROM usage_events WHERE user_id=? AND project_id IS ? AND task=? AND idempotency_key IN (?,?)",user,project,meta.task,meta.usageKey!,billedKey)
      || one("SELECT 1 FROM ai_calls WHERE user_id=? AND project_id IS ? AND task=? AND usage_key=?",user,project,meta.task,meta.usageKey!)
      || getJsonSetting(`alibaba.task.${meta.usageKey}`,null) || getJsonSetting(`fal.done.${meta.usageKey}`,null);
    if (historical) operationPending();
  }
  return r;
}

export function operationPending(): never {
  throw new UserFacingError(L("Cette action a déjà été envoyée. Les résultats acquis sont conservés ; aucune nouvelle génération n'a été lancée. Reprenez son suivi ou faites vérifier le résultat incertain avant de recommencer.", "This action has already been sent. Acquired results are kept; no new generation was started. Resume tracking it or have its uncertain outcome checked before starting again."));
}

export function saveOperationResult(reservationId: string, result: unknown) {
  run("UPDATE ai_reservations SET result=?,recovery_until=0 WHERE id=? AND status IN ('settled','reconciled')", JSON.stringify(result), reservationId);
}
export function saveProviderReceipt(reservationId: string, receipt: unknown) {
  run("UPDATE ai_reservations SET provider_receipt=? WHERE id=?", JSON.stringify(receipt), reservationId);
}
/** Récupération en lecture seule chez le fournisseur ; jamais une nouvelle réservation ni un second dépôt. */
export function claimOperationRecovery(reservationId: string): boolean {
  return run("UPDATE ai_reservations SET recovery_until=? WHERE id=? AND recovery_until<=? AND provider_receipt IS NOT NULL AND status!='released'", now() + 30 * 60_000, reservationId, now()).changes === 1;
}
export function finishOperationRecovery(reservationId: string) {
  run("UPDATE ai_reservations SET recovery_until=0 WHERE id=?", reservationId);
}

/**
 * Réserve le coût MAXIMAL d'un appel avant son envoi. Une seule instruction SQL conditionnelle : le reste
 * (budget mensuel restant + budget packs − réservations en cours) doit couvrir le montant, sinon rien n'est réservé
 * et l'appel est refusé. Atomique entre processus (site, worker) : deux appels simultanés ne peuvent pas réserver
 * le même reste.
 */
export function reserve(user: string, maxMicro: number, meta: ReservationMeta): string {
  meta = { ...meta, projectId: operationProject(meta.projectId), jobId: meta.jobId ?? currentTrace().jobId };
  // Budget de l'abonnement qui finance le projet de l'appel (jamais celui d'un autre projet du compte).
  const userId = accountKeyFor(user, meta.projectId);
  if (isNoPlanKey(userId)) throw budgetError(userId);
  const amount = Math.ceil(maxMicro);
  // Coût maximal inconnu ou non borné : l'opération est bloquée (jamais d'appel « à découvert »).
  if (!Number.isFinite(amount) || amount <= 0) throw new UserFacingError(L("Coût maximal de l'appel d'IA inconnu : opération bloquée par sécurité.", "Maximum cost of the AI call is unknown: operation blocked for safety."));
  ensureWallet(userId);
  const rid = id();
  // Transaction IMMEDIATE : le verrou d'écriture est pris AVANT la lecture, donc deux processus (site, worker) ne
  // peuvent jamais réserver le même reste. Le coût est réparti : budget de l'abonnement d'abord, puis packs.
  const ok = tx(() => {
    if (existingOperation(user, meta)) operationPending();
    // Même verrou que le portefeuille : deux appels parallèles ne peuvent pas engager le même plafond de tâche.
    assertUnderCostCap(amount);
    const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
    const fm = freeMonthly(w);
    const ft = freeTopup(w);
    if (fm + ft < amount) return false;
    const onMonthly = Math.min(amount, fm);
    const onTopup = amount - onMonthly;
    run("UPDATE wallets SET reserved = reserved + ?, reserved_topup = reserved_topup + ?, updated_at = ? WHERE user_id = ?", onMonthly, onTopup, now(), userId);
    run("INSERT INTO ai_reservations (id, user_id, amount, res_monthly, res_topup, status, task, provider, model, job_id, project_id, created_at, operation_key, request_hash, recovery_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rid, userId, amount, onMonthly, onTopup, "held", meta.task, meta.provider, meta.model, meta.jobId ?? null, meta.projectId ?? null, now(), operationKey(user, meta), meta.requestHash ?? null, now() + 30 * 60_000);
    return true;
  });
  if (!ok) throw budgetError(userId);
  return rid;
}

/** Rend la part réservée (sur chaque budget) d'une réservation. Dans une transaction. */
function unreserve(r: ReservationRow) {
  run("UPDATE wallets SET reserved = MAX(0, reserved - ?), reserved_topup = MAX(0, reserved_topup - ?), updated_at = ? WHERE user_id = ?", r.res_monthly, r.res_topup, now(), r.user_id);
}

/**
 * Débite `amount` : d'abord dans la limite de ce qui avait été réservé sur chaque budget (abonnement, packs), puis,
 * pour un éventuel excédent, sur le reste libre — sans jamais passer sous zéro. Dans une transaction, APRÈS
 * `unreserve`. L'excédent impossible à couvrir est renvoyé (`overrun`).
 */
function debit(userId: string, amount: number, res: { monthly: number; topup: number } = { monthly: 0, topup: 0 }) {
  const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
  let left = amount;
  const m1 = Math.min(left, res.monthly, Math.max(0, w.monthly_allowance - w.monthly_used));
  left -= m1;
  const t1 = Math.min(left, res.topup, Math.max(0, w.topup_balance));
  left -= t1;
  const m2 = Math.min(left, freeMonthly({ ...w, monthly_used: w.monthly_used + m1 }));
  left -= m2;
  const t2 = Math.min(left, freeTopup({ ...w, topup_balance: w.topup_balance - t1 }));
  left -= t2;
  const fromMonthly = m1 + m2;
  const fromTopup = t1 + t2;
  run("UPDATE wallets SET monthly_used = monthly_used + ?, topup_balance = topup_balance - ?, topup_period_used = topup_period_used + ?, updated_at = ? WHERE user_id = ?", fromMonthly, fromTopup, fromTopup, now(), userId);
  return { fromMonthly, fromTopup, overrun: left };
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
    if (!r) return;
    if (r.status === "uncertain") return reconcileReservation(r.id, billedMicro);
    if (r.status !== "held") return;
    unreserve(r);
    const amount = Math.max(0, Math.round(billedMicro));
    const d = debit(r.user_id, amount, { monthly: r.res_monthly, topup: r.res_topup });
    run("UPDATE ai_reservations SET status = 'settled', actual = ?, debit_monthly = ?, debit_topup = ?, settled_at = ?, settled_period_start = (SELECT period_start FROM wallets WHERE user_id=?) WHERE id = ?", amount, d.fromMonthly, d.fromTopup, now(), r.user_id, r.id);
    if (amount > 0) run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), r.user_id, "usage", d.fromTopup > 0 ? "topup" : "monthly", -(d.fromMonthly + d.fromTopup), ref, note, now());
    recordOverrun(r.user_id, d.overrun, ref ?? r.id, note);
  });
}

/** Libère une réservation : l'appel n'a rien coûté (refusé par le fournisseur avant tout travail, déjà compté). */
export function release(reservationId: string, reason = "") {
  tx(() => {
    const r = one<ReservationRow>("SELECT * FROM ai_reservations WHERE id = ?", reservationId);
    if (!r || r.status !== "held") return;
    unreserve(r);
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
    unreserve(r);
    const d = debit(r.user_id, r.amount, { monthly: r.res_monthly, topup: r.res_topup });
    run("UPDATE ai_reservations SET status = 'uncertain', actual = ?, debit_monthly = ?, debit_topup = ?, note = ?, settled_at = ?, settled_period_start = (SELECT period_start FROM wallets WHERE user_id=?) WHERE id = ?", r.amount, d.fromMonthly, d.fromTopup, reason.slice(0, 200), now(), r.user_id, r.id);
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
    const w = ensureWallet(r.user_id);
    const samePeriod = r.settled_period_start != null ? r.settled_period_start === w.period_start : (r.settled_at ?? r.created_at) >= w.period_start;
    // Le mensuel expiré ne devient pas du budget neuf. Une recharge reste remboursable, sans effacer l'usage actuel.
    run("UPDATE wallets SET monthly_used = MAX(0, monthly_used - ?), topup_balance = topup_balance + ?, topup_period_used = MAX(0, topup_period_used - ?), updated_at = ? WHERE user_id = ?", samePeriod ? toMonthly : 0, toTopup, samePeriod ? toTopup : 0, now(), r.user_id);
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

function closePeriodReservations(userId: string) {
  for (const r of all<{ id: string }>("SELECT id FROM ai_reservations WHERE user_id=? AND status='held'", userId)) {
    settleUncertain(r.id, "appel en cours lors de la clôture de période, à rapprocher du résultat fournisseur");
  }
}

/** Débite une consommation sans réservation préalable (ancien chemin) : jamais au-delà du disponible. */
export function charge(userId: string, amountMicro: number, ref: string | null, note: string) {
  if (amountMicro <= 0 || isNoPlanKey(userId)) return;
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
 * Recharge remboursée (en tout ou partie) : le budget fournisseur qu'elle avait ouvert est retiré, dans la limite de
 * ce qu'il en reste (jamais de solde négatif). Une seule fois par remboursement (`ref`).
 */
export function revokeTopupBudget(userId: string, refundedTtcEur: number, ref: string, note: string) {
  const micro = packBudgetMicro(refundedTtcEur);
  if (micro <= 0 || isNoPlanKey(userId)) return;
  ensureWallet(userId);
  tx(() => {
    if (one("SELECT 1 FROM ledger WHERE type='adjustment' AND ref=?", ref)) return;
    const w = one<Wallet>("SELECT * FROM wallets WHERE user_id = ?", userId)!;
    const take = Math.min(micro, Math.max(0, w.topup_balance - w.reserved_topup));
    run("UPDATE wallets SET topup_balance = topup_balance - ?, updated_at = ? WHERE user_id = ?", take, now(), userId);
    run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "adjustment", "topup", -take, ref, note, now());
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
  return tx(() => {
    u = { ...u, projectId: operationProject(u.projectId), jobId: u.jobId ?? currentTrace().jobId };
    if (!Number.isFinite(u.costMicro) || u.costMicro < 0) throw new UserFacingError(L("Coût du résultat inconnu : rapprochement nécessaire, aucune relance automatique.", "Result cost unknown: reconciliation required, no automatic retry."));
    if (o.reservationId) {
      const r = one<{ user_id: string; project_id: string | null; task: string; status: string }>("SELECT user_id,project_id,task,status FROM ai_reservations WHERE id=?", o.reservationId);
      if (!r || r.user_id !== accountKeyFor(u.userId, u.projectId) || r.project_id !== (u.projectId ?? null) || r.task !== u.task || r.status === "released") throw new UserFacingError(L("Le règlement ne correspond pas à cette action. Aucun autre projet n'a été débité.", "This settlement does not match the action. No other project was charged."));
    }
    const markup = getJsonSetting<number>("billing.markup", 1);
    const billed = Math.round(u.costMicro * Math.max(1, markup));
    const uid = id();
    // Les anciens événements restent lisibles ; une clé fournie par un autre compte ne déduplique jamais cet usage.
    const scopedKey = u.idempotencyKey ? `usage:v2:${createHash("sha256").update(JSON.stringify([u.userId,u.projectId??null,u.task,u.idempotencyKey])).digest("hex")}` : null;
    const previous = u.idempotencyKey ? one<{ id: string; billed: number }>("SELECT id,billed FROM usage_events WHERE idempotency_key IN (?,?) AND user_id=? AND project_id IS ? AND task=?", scopedKey, u.idempotencyKey, u.userId, u.projectId??null, u.task) : null;
    if(previous){
      if(o.reservationId){
        const same = one<{ usage_event_id: string | null }>("SELECT usage_event_id FROM ai_reservations WHERE id=?",o.reservationId);
        if(same?.usage_event_id===previous.id)settle(o.reservationId,previous.billed,`usage:${previous.id}`,"réponse déjà comptabilisée");
        else release(o.reservationId,"usage déjà compté (reprise)");
      }
      return {eventId:previous.id,dedup:true};
    }

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
      scopedKey,
      now(),
    );
    const note = `${u.task} · ${u.provider}/${u.model}`;
    if (o.reservationId) {
      run("UPDATE ai_reservations SET usage_event_id=? WHERE id=?",uid,o.reservationId);
      settle(o.reservationId, billed, `usage:${uid}`, note);
    }
    else charge(accountKeyFor(u.userId, u.projectId), billed, `usage:${uid}`, note);
    return { eventId: uid, dedup: false };

  });
}
