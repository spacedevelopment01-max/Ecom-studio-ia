import { afterEach, describe, expect, it, vi } from 'vitest';
import { readyInitial, injectedInitial, executeInitial } from './initial-fixtures';
import { fixture } from './preparation-fixtures';
import { stateOf, approve } from '@/lib/preparation/engine';
import { commitState } from '@/lib/preparation/store';
import { all, now, one, run } from '@/lib/db';
import { saveBrand, loadProject } from '@/lib/projects';
import { acceptInitialAuthorization, cancelInitialAuthorization, initialAuthorizationView, quoteInitialAuthorization, tryStartInitialFromConsent } from '@/lib/social-v2/initial-authorization';
import { getSetting, setSetting } from '@/lib/settings';
import { assertInitialEnvelopeBudget } from '@/lib/social-v2/initial';
import { balance } from '@/lib/billing';

afterEach(() => vi.restoreAllMocks());
describe('Accord initial intégré et lancement automatique — fournisseurs simulés', () => {
  it('un plafond trop élevé n’annonce pas un budget consommé à 100 % et ne débite rien', async () => {
    const f = await readyInitial(), d = injectedInitial();
    run('UPDATE wallets SET monthly_allowance=100,monthly_used=0,topup_balance=0,reserved=0,reserved_topup=0 WHERE user_id=?', f.uid);
    d.deps.guard = assertInitialEnvelopeBudget;
    const before = balance(f.uid, f.pid);
    expect(before).toMatchObject({ used: 0, usedPct: 0, available: 100 });
    expect(() => quoteInitialAuthorization(f.pid, d.deps)).toThrow(/ne couvre pas le plafond/);
    expect(balance(f.uid, f.pid)).toEqual(before);
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toHaveLength(0);
    expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'', f.pid)).toHaveLength(0);
    expect(d.plans).toBe(0);
    expect(() => assertInitialEnvelopeBudget(loadProject(f.pid), 50)).not.toThrow();
  });
  it('n’invente pas un accord à la création ni depuis les accords des autres étapes', async () => {
    const f = await fixture(), d = injectedInitial();
    expect(initialAuthorizationView(f.pid, d.deps)).toMatchObject({ available: false, status: 'absent' });
    expect(tryStartInitialFromConsent(f.pid, d.deps).started).toBe(false);
    expect(() => quoteInitialAuthorization(f.pid, d.deps)).toThrow(/stratégie/);
    expect(all('SELECT id FROM jobs WHERE project_id=?', f.pid)).toHaveLength(0);
  });
  it.each([0, 1])('accord avant validation marque puis un seul démarrage, cas %i', async i => {
    const f = await readyInitial(i), d = injectedInitial();
    const s = stateOf(f.pid)!;
    commitState(f.pid, s.revision, n => { n.stages.brand!.status = 'draft'; });
    const q = quoteInitialAuthorization(f.pid, d.deps);
    expect(acceptInitialAuthorization(f.pid, q.id, d.deps)).toMatchObject({ started: false, waitingForIdentity: true });
    expect(initialAuthorizationView(f.pid, d.deps).status).toBe('authorized');
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toHaveLength(0);
    approve(f.pid, stateOf(f.pid)!.revision, 'brand', { logoId: stateOf(f.pid)!.stages.brand!.data.selectedLogo });
    const started = tryStartInitialFromConsent(f.pid, d.deps);
    expect(started.started).toBe(true);
    expect(tryStartInitialFromConsent(f.pid, d.deps).jobId).toBe(started.jobId);
    expect(acceptInitialAuthorization(f.pid, q.id, d.deps).jobId).toBe(started.jobId);
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toHaveLength(1);
    expect(d.plans).toBe(0);
  });
  it('un contexte déjà validé démarre sans exiger le même devis une deuxième fois', async () => {
    const f = await readyInitial(), d = injectedInitial(), q = quoteInitialAuthorization(f.pid, d.deps);
    expect(acceptInitialAuthorization(f.pid, q.id, d.deps).started).toBe(true);
    expect(initialAuthorizationView(f.pid, d.deps).status).toBe('consumed');
    expect(() => quoteInitialAuthorization(f.pid, d.deps)).toThrow(/déjà/);
  });
  it('un accord déjà consommé ne devient pas expiré le lendemain', async () => {
    const f = await readyInitial(), d = injectedInitial(), q = quoteInitialAuthorization(f.pid, d.deps);
    const started = acceptInitialAuthorization(f.pid, q.id, d.deps);
    const future = now() + 25 * 60 * 60_000;
    vi.spyOn(Date, 'now').mockReturnValue(future);
    expect(initialAuthorizationView(f.pid, d.deps)).toMatchObject({ status: 'consumed', reason: '', jobId: started.jobId });
    expect(tryStartInitialFromConsent(f.pid, d.deps).jobId).toBe(started.jobId);
  });
  it('un changement manuel/automatique des routes arrête la suite avant un nouveau contrôle payant', async () => {
    const previous = getSetting('ai.routing.mode');
    try {
      setSetting('ai.routing.mode','manual');
      const f = await readyInitial(), d = injectedInitial(), plan = d.deps.plan;
      d.deps.plan = async (...args) => { const result = await plan(...args); setSetting('ai.routing.mode','auto'); return result; };
      await expect(executeInitial(f.pid,d.deps)).rejects.toThrow(/Routes ou tarifs modifiés/);
      expect(d.plans).toBe(1);
      expect(d.calls).toHaveLength(0);
      expect(d.visuals).toHaveLength(0);
    } finally { setSetting('ai.routing.mode', previous ?? 'manual'); }
  });
  it('retrait avant départ, devis expiré et plafond changé refusent un lancement', async () => {
    const f = await readyInitial(), d = injectedInitial();
    const q = quoteInitialAuthorization(f.pid, d.deps);
    cancelInitialAuthorization(f.pid);
    expect(() => acceptInitialAuthorization(f.pid, q.id, d.deps)).toThrow(/changé|expiré/);
    const fresh = quoteInitialAuthorization(f.pid, d.deps);
    vi.spyOn(Date, 'now').mockReturnValue(now() + 16 * 60_000);
    expect(() => acceptInitialAuthorization(f.pid, fresh.id, d.deps)).toThrow(/expiré/);
    vi.restoreAllMocks();
    const latest = quoteInitialAuthorization(f.pid, d.deps), costs = d.deps.costs;
    d.deps.costs = () => ({ ...costs(), imageCap: 100 });
    expect(() => acceptInitialAuthorization(f.pid, latest.id, d.deps)).toThrow(/changé/);
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toHaveLength(0);
  });
  it('échec de budget au moment utile reste visible et ne défait pas l’identité validée', async () => {
    const f = await readyInitial(), d = injectedInitial(), s = stateOf(f.pid)!;
    commitState(f.pid, s.revision, n => { n.stages.brand!.status = 'draft'; });
    const q = quoteInitialAuthorization(f.pid, d.deps);
    acceptInitialAuthorization(f.pid, q.id, d.deps);
    const before = loadProject(f.pid).brand;
    approve(f.pid, stateOf(f.pid)!.revision, 'brand', { logoId: stateOf(f.pid)!.stages.brand!.data.selectedLogo });
    d.deps.guard = () => { throw Error('Budget insuffisant — test synthétique'); };
    expect(tryStartInitialFromConsent(f.pid, d.deps)).toMatchObject({ started: false, reason: expect.stringContaining('Budget insuffisant') });
    expect(loadProject(f.pid).brand).toEqual(before);
    expect(initialAuthorizationView(f.pid, d.deps).status).toBe('blocked');
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toHaveLength(0);
    d.deps.guard = () => {};
    expect(tryStartInitialFromConsent(f.pid, d.deps).started).toBe(false);
  });
  it('une nouvelle identité ne réutilise pas un accord déjà consommé et garde le premier lot', async () => {
    const f = await readyInitial(), d = injectedInitial(), q = quoteInitialAuthorization(f.pid, d.deps);
    const first = acceptInitialAuthorization(f.pid, q.id, d.deps);
    const p = loadProject(f.pid); saveBrand(f.pid, { ...p.brand!, tagline: 'Nouvelle identité de test' });
    expect(initialAuthorizationView(f.pid, d.deps)).toMatchObject({ status: 'blocked', reason: expect.stringContaining('Identité modifiée') });
    expect(tryStartInitialFromConsent(f.pid, d.deps).started).toBe(false);
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid).map((x:any)=>x.id)).toEqual([first.jobId]);
  });
  it('une stratégie modifiée invalide l’accord conservé avant départ', async () => {
    const f = await readyInitial(), d = injectedInitial(), s = stateOf(f.pid)!;
    commitState(f.pid, s.revision, n => { n.stages.brand!.status = 'draft'; });
    const q = quoteInitialAuthorization(f.pid, d.deps); acceptInitialAuthorization(f.pid, q.id, d.deps);
    commitState(f.pid, stateOf(f.pid)!.revision, n => { n.stages.research!.data.selectedId = 'autre-strategie'; });
    expect(tryStartInitialFromConsent(f.pid, d.deps)).toMatchObject({ started: false, reason: expect.stringContaining('stratégie modifiée') });
    expect(one("SELECT id FROM jobs WHERE project_id=? AND type='social.initial'", f.pid)).toBeUndefined();
  });
});
