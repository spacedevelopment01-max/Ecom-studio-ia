/**
 * Quotas des forfaits (visuels, vidéos IA, vidéos UGC, articles) : ce que le client voit et consomme.
 *  - Chaque mois (période de l'enveloppe, voir billing.ts), le forfait apporte ses quotas.
 *  - Forfaits avec report : ce qui n'a pas servi passe au mois suivant (au plus un mois de forfait).
 *  - Les packs s'ajoutent et n'expirent pas ; ils ne servent qu'une fois le mois épuisé.
 *  - La création initiale de la boutique ne décompte pas les visuels (elle fait partie de l'abonnement).
 * Le budget IA (caché) reste le garde-fou de marge : voir billing.ts et ai/access.ts.
 */
import { id, now, one, run, tx } from "./db";
import { UserFacingError } from "./jobs";
import { L } from "./i18n-server";
import { currentPeriod, getSubscription, planOf } from "./billing";
import { PACKS, PLANS, type PackId, type QuotaKey, type QuotaView } from "./plans";

export const QUOTA_KEYS: QuotaKey[] = ["visuals", "aiVideos", "ugc", "blog"];

export const userPlan = (userId: string) => planOf(getSubscription(userId));

type Row = { user_id: string; period_start: number; key: QuotaKey; included: number; rollover: number; used: number };

/** Ligne du mois en cours (créée à la première lecture, avec le report du mois précédent). */
function periodRow(userId: string, key: QuotaKey): Row {
  const { start } = currentPeriod(userId);
  const plan = userPlan(userId);
  const included = plan ? PLANS[plan].quotas[key] : 0;
  let r = one<Row>("SELECT * FROM quota_usage WHERE user_id = ? AND period_start = ? AND key = ?", userId, start, key);
  if (!r) {
    const prev = one<Row>("SELECT * FROM quota_usage WHERE user_id = ? AND period_start < ? AND key = ? ORDER BY period_start DESC LIMIT 1", userId, start, key);
    const rollover = plan && PLANS[plan].rollover && prev ? Math.min(included, Math.max(0, prev.included - prev.used)) : 0;
    run("INSERT OR IGNORE INTO quota_usage (user_id, period_start, key, included, rollover, used) VALUES (?,?,?,?,?,0)", userId, start, key, included, rollover);
    r = one<Row>("SELECT * FROM quota_usage WHERE user_id = ? AND period_start = ? AND key = ?", userId, start, key)!;
  } else if (r.included !== included) {
    // Changement de forfait en cours de mois : le nouveau quota s'applique tout de suite.
    run("UPDATE quota_usage SET included = ? WHERE user_id = ? AND period_start = ? AND key = ?", included, userId, start, key);
    r = { ...r, included };
  }
  return r;
}

const packBalance = (userId: string, key: QuotaKey) => one<{ balance: number }>("SELECT balance FROM pack_balances WHERE user_id = ? AND key = ?", userId, key)?.balance ?? 0;

export function quotaView(userId: string, key: QuotaKey): QuotaView {
  const r = periodRow(userId, key);
  // Le report ne compte que dans la limite de ce qui reste du mois précédent ; « included » regroupe le report pour le calcul.
  const monthLeft = Math.max(0, r.included + r.rollover - r.used);
  const pack = packBalance(userId, key);
  return { included: r.included, rollover: r.rollover, pack, used: r.used, left: monthLeft + pack };
}

export function quotasView(userId: string): Record<QuotaKey, QuotaView> {
  return Object.fromEntries(QUOTA_KEYS.map((k) => [k, quotaView(userId, k)])) as Record<QuotaKey, QuotaView>;
}

/** Langues : incluses dans le forfait + packs « Langue en plus ». */
export function languagesOf(userId: string) {
  const plan = userPlan(userId);
  const extra = one<{ balance: number }>("SELECT balance FROM pack_balances WHERE user_id = ? AND key = 'languages'", userId)?.balance ?? 0;
  return { included: plan ? PLANS[plan].languages : 1, extra };
}

const NAMES: Record<QuotaKey, [fr: string, en: string, pack: PackId | null]> = {
  visuals: ["visuels", "visuals", "visuals"],
  aiVideos: ["vidéos IA", "AI videos", "videos"],
  ugc: ["vidéos UGC", "UGC videos", "ugc"],
  blog: ["articles de blog", "blog posts", null],
};

/** Message clair quand un quota est épuisé : ce qui manque et comment continuer. */
export function quotaMessage(userId: string, key: QuotaKey) {
  const [fr, en, pack] = NAMES[key];
  if (!userPlan(userId)) {
    return L(`Les ${fr} sont inclus dans les forfaits. Choisissez un forfait dans « Mon compte » pour les créer.`, `${en[0].toUpperCase()}${en.slice(1)} are included in the plans. Choose a plan in "My account" to create them.`);
  }
  const end = new Date(currentPeriod(userId).end).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
  const p = pack ? PACKS[pack] : null;
  return p
    ? L(`Vous avez utilisé tous vos ${fr} ce mois-ci. Ajoutez un ${p.name.fr} dans « Mon compte », ou attendez le ${end}.`, `You've used all your ${en} this month. Add a ${p.name.en} in "My account", or wait until ${end}.`)
    : L(`Vous avez utilisé tous vos ${fr} ce mois-ci. Ils reviennent le ${end}.`, `You've used all your ${en} this month. They come back on ${end}.`);
}

/** Vérifie qu'il reste au moins `n` unités (sinon message clair pour le client). */
export function assertQuota(userId: string, key: QuotaKey, n = 1) {
  if (quotaView(userId, key).left < n) throw new UserFacingError(quotaMessage(userId, key));
}

/**
 * Décompte `n` unités : le mois d'abord, puis les packs. `ref` évite un double décompte (reprise d'une tâche).
 * Ne bloque jamais après coup : ce qui a été créé est compté dans la limite de ce qui reste.
 */
export function consumeQuota(userId: string, key: QuotaKey, n = 1, ref?: string | null) {
  if (n <= 0) return;
  tx(() => {
    if (ref) {
      const done = run("INSERT OR IGNORE INTO quota_events (ref, user_id, key, amount, created_at) VALUES (?,?,?,?,?)", ref, userId, key, n, now());
      if (!done.changes) return;
    }
    const r = periodRow(userId, key);
    const fromMonth = Math.min(n, Math.max(0, r.included + r.rollover - r.used));
    const fromPack = Math.min(n - fromMonth, packBalance(userId, key));
    run("UPDATE quota_usage SET used = used + ? WHERE user_id = ? AND period_start = ? AND key = ?", fromMonth, userId, r.period_start, key);
    if (fromPack > 0) run("UPDATE pack_balances SET balance = balance - ? WHERE user_id = ? AND key = ?", fromPack, userId, key);
  });
}

/** Ajoute un pack payé (une seule fois par paiement). */
export function creditPack(userId: string, pack: PackId, ref: string) {
  tx(() => {
    const done = run("INSERT OR IGNORE INTO pack_purchases (id, user_id, pack, ref, created_at) VALUES (?,?,?,?,?)", id(), userId, pack, ref, now());
    if (!done.changes) return;
    for (const [key, amount] of Object.entries(PACKS[pack].adds)) {
      run("INSERT INTO pack_balances (user_id, key, balance) VALUES (?,?,?) ON CONFLICT(user_id, key) DO UPDATE SET balance = balance + excluded.balance", userId, key, amount);
    }
  });
}

export const launchPackBought = (userId: string) => !!one("SELECT 1 FROM pack_purchases WHERE user_id = ? AND pack = 'launch'", userId);

/** Publication automatique permise par le forfait (à partir de Vendre). */
export const autopublishAllowed = (userId: string) => {
  const plan = userPlan(userId);
  return !!plan && PLANS[plan].autopublish;
};
