/** Explicit consent for the first twenty creations, consumed once when identity becomes valid. */
import { id, json, now, one, tx } from '../db';
import { loadProject, remember } from '../projects';
import { stateOf } from '../preparation/store';
import { stableHash } from '../brain/hash';
import { HttpError } from '../auth';
import { budgetPctOf } from '../ai/budget-pct';
import { redact } from '../ai/trace';
import { L } from '../i18n-server';
import { initialCreativeCount, initialCreativesView, initialEnvelope, initialRoutingSignature, quoteInitialCreatives, queueInitialCreatives, realInitialDeps, type InitialDeps } from './initial';

const KEY = 'initial.automatic.authorization';
type Consent = {
  id: string; sourceHash: string; routeHash: string; capMicro: number; probableMicro: number;
  createdAt: number; acceptedAt?: number; validUntil?: number; boundHash?: string;
  status: 'offered' | 'authorized' | 'consumed' | 'blocked' | 'cancelled';
  reason?: string; jobId?: string;
};
const read = (pid: string) => json<Consent | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?", pid, KEY)?.value, null);
function save(pid: string, c: Consent) { remember(pid, { kind: 'artifact', key: KEY, value: JSON.stringify(c), source: 'user' }); }
function sourceHash(pid: string) {
  const s = stateOf(pid), p = loadProject(pid);
  if (!s || s.stages.brief?.status !== 'approved' || s.stages.research?.status !== 'approved')
    throw new HttpError(409, L('Validez d’abord votre offre et votre stratégie.', 'Approve your offer and strategy first.'));
  return stableHash('initial-automatic-scope-1', { brief: s.stages.brief.data, research: s.stages.research.data, strategy: p.strategy, business: p.business, required:initialCreativeCount(pid) });
}
const routeHash = (deps: InitialDeps) => initialRoutingSignature(deps);

function invalidReason(pid: string, c: Consent, deps: InitialDeps) {
  if (c.status !== 'consumed' && c.validUntil && now() > c.validUntil) return L('L’accord initial a expiré. Actualisez et acceptez son devis.', 'Initial consent expired. Refresh and accept its quote.');
  try { if (sourceHash(pid) !== c.sourceHash) return L('Offre ou stratégie modifiée : nouvel accord requis, résultats conservés.', 'Offer or strategy changed: new consent required, results preserved.'); }
  catch { return L('Les validations ont changé : nouvel accord requis après validation.', 'Approvals changed: new consent required after approval.'); }
  try {
    if (c.status !== 'consumed' && routeHash(deps) !== c.routeHash) return L('Routes ou tarifs modifiés : nouvel accord requis avant toute dépense.', 'Routes or pricing changed: new consent required before spending.');
  } catch { return L('Configuration ou tarifs indisponibles : démarrage suspendu, marque conservée.', 'Configuration or pricing unavailable: start suspended, identity preserved.'); }
  const current = initialCreativesView(pid);
  if (c.boundHash && current?.hash !== c.boundHash) return L('Identité modifiée : ancien accord inapplicable. Aucun nouveau lot lancé.', 'Identity changed: previous consent no longer applies. No new set started.');
  return '';
}
export function initialAuthorizationView(pid: string, deps = realInitialDeps()) {
  const p = loadProject(pid), c = read(pid);
  let available = false;
  try { sourceHash(pid); available = true; } catch { /* Still waiting for meaningful approvals. */ }
  const reason = c ? invalidReason(pid, c, deps) || c.reason || '' : '';
  return { available, status: reason && c?.status !== 'cancelled' ? 'blocked' : c?.status ?? 'absent', reason, jobId: c?.jobId ?? null, validUntil: c?.validUntil ?? null, probableBudgetPct: c ? budgetPctOf(p.userId, c.probableMicro, pid) : null, maxBudgetPct: c ? budgetPctOf(p.userId, c.capMicro, pid) : null };
}
export function quoteInitialAuthorization(pid: string, deps = realInitialDeps()) {
  const p = loadProject(pid), hash = sourceHash(pid), existing = read(pid);
  if (existing?.status === 'consumed' && !invalidReason(pid, existing, deps)) throw new HttpError(409, 'Le lot initial a déjà été lancé. Reprenez seulement ses résultats manquants.');
  const e = initialEnvelope(initialCreativeCount(pid), false, deps);
  deps.guard(p, e.capMicro);
  const c: Consent = { id: id(), sourceHash: hash, routeHash: routeHash(deps), capMicro: e.capMicro, probableMicro: e.probableMicro, createdAt: now(), status: 'offered' };
  save(pid, c);
  return { id: c.id, probableBudgetPct: budgetPctOf(p.userId, c.probableMicro, pid), maxBudgetPct: budgetPctOf(p.userId, c.capMicro, pid), note: L(`${initialCreativeCount(pid)} créations indépendantes : 10 publications${initialCreativeCount(pid)===20?' et 10 publicités':''}, contrôles et corrections bornées inclus. Après cet accord, démarrage automatique à la première validation définitive de votre marque. Accord valable 24 h pour cette offre et cette stratégie ; aucun envoi sur les réseaux. Une nouvelle identité après ce lancement exige un nouvel accord.`, `${initialCreativeCount(pid)} independent creations: 10 posts${initialCreativeCount(pid)===20?' and 10 ads':''}, including controls and bounded corrections. After consent, automatic start when you first approve the final identity. Valid for 24 hours for this offer and strategy; no social sending. A new identity after this launch requires fresh consent.`) };
}
export function acceptInitialAuthorization(pid: string, quoteId: string, deps = realInitialDeps()) {
  tx(() => {
    const c = read(pid);
    if (!c || c.id !== quoteId) throw new HttpError(409, 'Devis initial absent ou remplacé.');
    if (['authorized', 'consumed'].includes(c.status)) return;
    if (c.status !== 'offered' || now() - c.createdAt > 15 * 60_000 || invalidReason(pid, c, deps)) throw new HttpError(409, 'Le devis initial a changé ou expiré. Actualisez-le.');
    deps.guard(loadProject(pid), c.capMicro);
    c.status = 'authorized'; c.acceptedAt = now(); c.validUntil = now() + 24 * 60 * 60_000;
    save(pid, c);
  });
  return tryStartInitialFromConsent(pid, deps);
}
export function cancelInitialAuthorization(pid: string) {
  const c = read(pid);
  if (!c) return;
  if (c.status === 'consumed') throw new HttpError(409, 'Ce lot a déjà démarré ; ses résultats et coûts restent conservés.');
  c.status = 'cancelled'; delete c.reason; save(pid, c);
}
/** A failed dispatch never rolls back a valid identity. It stays visible and does not retry spend automatically. */
export function tryStartInitialFromConsent(pid: string, deps = realInitialDeps()) {
  return tx(() => {
    const c = read(pid);
    if (!c || c.status !== 'authorized') return { started: false, jobId: c?.jobId ?? null };
    const invalid = invalidReason(pid, c, deps);
    if (invalid) { c.status = 'blocked'; c.reason = invalid; save(pid, c); return { started: false, reason: invalid }; }
    const current = initialCreativesView(pid);
    if (!current?.ready || !current.hash) return { started: false, waitingForIdentity: true };
    c.boundHash = current.hash;
    try {
      const q = quoteInitialCreatives(pid, deps), maximum = initialEnvelope(q.missing, false, deps).capMicro;
      if (maximum > c.capMicro) throw new HttpError(409, 'Le plafond du lot a augmenté. Acceptez un nouveau devis.');
      const j = queueInitialCreatives(pid, q.id, deps);
      c.status = 'consumed'; c.jobId = j.jobId ?? undefined; delete c.reason; save(pid, c);
      return { started: !!j.jobId, jobId: j.jobId };
    } catch (e) {
      c.status = 'blocked'; c.reason = redact((e as Error).message); save(pid, c);
      return { started: false, reason: c.reason };
    }
  });
}
