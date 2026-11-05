import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import { historicalProject, businessFingerprints } from './conversation284-fixtures';
import { account, sender } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { rdvSection, listBookings, type RdvKind } from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { localReadAllowed, localEditAllowed, nativeLocalEditAllowed } from '@/lib/existing-local-edits';
import { metaOf, ownedConversation } from '@/lib/orchestrator/conversation/store';
import { stateOf } from '@/lib/preparation/store';
import { createCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { projectAccountKey } from '@/lib/project-billing';
import { aiDisabledReason } from '@/lib/ai/access';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';

type Domain = RdvKind | 'workshop';
const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-20';
beforeEach(() => {
  for (const f of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_AVAILABILITY', 'BOOKING_WORKSHOPS', 'EXISTING_BOOKING_AVAILABILITY_READ', 'EXISTING_BOOKING_WORKSHOPS_READ']) vi.stubEnv('STUDIO_CONVERSATION_' + f, '1');
  for (const f of ['EXISTING_LOCAL', 'EXISTING_PROMPTS_READ', 'EXISTING_BOOKING_RECORDS_READ']) vi.stubEnv('STUDIO_CONVERSATION_' + f, '0');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at);
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function fixture(domain: Domain = 'restaurant', business: 'products' | 'services' = 'services') {
  const f = await historicalProject(business), kind = domain === 'workshop' ? 'cabinet' : domain, spec = serviceSpec(({ salon: 'atelier-nuance', cabinet: 'parenthese', restaurant: 'table-saison' }[kind]) as never), sec = rdvSection(spec)!.section;
  sec.blocks = {}; sec.block_order = [];
  if (kind !== 'restaurant') {
    sec.blocks.service = { type: kind === 'salon' ? 'service' : 'seance', settings: { service_id: 'diagnostic', seance_id: 'diagnostic', name: 'Diagnostic acquis', duration: 30, price: 50, category: 'coupe', modes: 'cabinet,visio', custom_acquired: 'CONSERVER' } }; sec.block_order.push('service');
    if (kind === 'salon') { sec.blocks.member = { type: 'member', settings: { member_id: 'alex', name: 'Alex fictif', skills: '', days: '' } }; sec.block_order.push('member'); }
    if (domain === 'workshop') { sec.blocks.atelier = { type: 'atelier', settings: { atelier_id: 'atelier-acquis', title: 'Pause acquise', date, time: '10:00', duration: 60, capacity: 2, price: 25 } }; sec.block_order.push('atelier'); }
  }
  Object.assign(sec.settings, { booking_mode: 'live', timezone: 'Europe/Paris', hours_fri: '09:00-12:00', slot_step: 30, capacity: 6, min_party: 2, max_party: 6, open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00', dinner_slots: '19:00' });
  saveThemeVersion(f.pid, spec, 'Planning A1 fictif acquis', 'user'); listBookings(f.pid, kind, date, date);
  jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), f.u.id, now() + 3_600_000, now());
  const c = openProjectConversation(f.u, f.pid), op = domain === 'workshop' ? 'booking-workshops' as const : 'booking-availability' as const, field = domain === 'workshop' ? 'bookingWorkshops' as const : 'bookingAvailability' as const;
  return { ...f, domain, kind, c, op, field, flag: domain === 'workshop' ? 'EXISTING_BOOKING_WORKSHOPS_READ' : 'EXISTING_BOOKING_AVAILABILITY_READ', send: sender(f.u, c.id) };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const text = (f: Fixture) => f.domain === 'workshop' ? `Montre les places disponibles de l’atelier « Pause acquise » le ${date}` : f.kind === 'restaurant' ? `Montre les créneaux disponibles du restaurant pour 4 personnes le ${date}` : `Montre les créneaux disponibles pour le service réservable « Diagnostic acquis »${f.kind === 'cabinet' ? ' en cabinet' : ''} le ${date}`;
const say = (f: Fixture) => f.send({ action: 'message', text: text(f), context: { tab: 'rendez-vous', target: null } });
const command = (f: Fixture) => ({ action: 'message', text: text(f), context: { tab: 'rendez-vous', target: null }, revision: conversationView(f.u, f.c.id).revision, projectRevision: null, requestId: id() });
function seed(f: Fixture) {
  const row: Record<string, unknown> = { id: id(), project_id: f.pid, number: 'ACQUIS-' + id(), status: 'confirmed', date, first_name: 'CONTACT_PRIVE', last_name: 'Fictif', email: 'PRIVE_EMAIL@example.invalid', phone: 'PRIVE_PHONE', note: 'PRIVE_NOTE', created_at: now(), updated_at: now(),
    ...(f.kind === 'restaurant' ? { party: 4, time: '12:00', token_hash: 'PRIVE_TOKEN' } : { service: f.domain === 'workshop' ? 'atelier-acquis' : 'diagnostic', service_name: 'Service acquis', start_min: f.domain === 'workshop' ? 600 : 540, end_min: 660, price: 50, ...(f.kind === 'salon' ? { client_id: 'client-fictif', staff: 'alex' } : { kind: f.domain === 'workshop' ? 'atelier' : 'seance', modality: f.domain === 'workshop' ? '' : 'cabinet', personal_note: 'PRIVE_SANTE' }) }) };
  const keys = Object.keys(row), table = f.kind === 'restaurant' ? 'restaurant_reservations' : f.kind + '_appointments'; run(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k]));
}

it.each(['salon', 'cabinet', 'restaurant', 'workshop'] as const)('A1 %s: exact readonly capability, native visible data and no preparation, version or business changes', async domain => {
  const f = await fixture(domain), fp = businessFingerprints(), before = currentTheme(f.pid), p = await say(f);
  expect(p.recovery).toMatchObject({ state: 'read-only', actionsEnabled: false, aiEnabled: false, localReads: { ops: ['booking-availability', 'booking-workshops'], readOnly: true, confirmationRequired: false, costEur: 0, providerCalls: 0 } });
  expect(p[f.field]).toMatchObject({ state: 'listed', kind: f.kind, readOnly: true, confirmationRequired: false, actionsExecuted: false }); expect(p[f.field]!.rows!.length).toBeGreaterThan(0);
  expect(localReadAllowed(p, f.op)).toBe(true); expect(localReadAllowed(p, 'booking-records')).toBe(false); expect(localEditAllowed(p, 'booking-hours')).toBe(false); expect(nativeLocalEditAllowed(p)).toBe(false); expect(p.recovery?.localEdits).toBeUndefined();
  expect(p.projectRevision).toBeNull(); expect(p.creation).toBeNull(); expect(p.correctionFields).toEqual([]); expect(stateOf(f.pid)).toBeNull(); expect(currentTheme(f.pid)).toEqual(before); expect(businessFingerprints()).toEqual(fp);
});

it.each(['EXISTING_BOOKING_AVAILABILITY_READ', 'BOOKING_AVAILABILITY', 'CONTEXT'])('%s closed keeps A1 availability speech-only without reading the native engine', async flag => {
  const f = await fixture('salon'); vi.stubEnv('STUDIO_CONVERSATION_' + flag, '0'); const spy = vi.spyOn(salon, 'availability'), fp = businessFingerprints();
  const p = await f.send({ action: 'message', text: text(f), ...(flag === 'CONTEXT' ? {} : { context: { tab: 'rendez-vous', target: null } }) });
  expect(p.bookingAvailability).toBeUndefined(); expect(p.bookingAvailabilityRead).toBeUndefined(); expect(localReadAllowed(p, 'booking-availability')).toBe(false); expect(spy).not.toHaveBeenCalled(); expect(businessFingerprints()).toEqual(fp);
});

it.each(['EXISTING_BOOKING_WORKSHOPS_READ', 'BOOKING_WORKSHOPS'])('%s closed cannot infer workshop places from a different read right', async flag => {
  const f = await fixture('workshop'); vi.stubEnv('STUDIO_CONVERSATION_' + flag, '0'); const spy = vi.spyOn(cabinet, 'workshops'), fp = businessFingerprints(), p = await say(f);
  expect(p.bookingWorkshops).toBeUndefined(); expect(p.bookingWorkshopsRead).toBeUndefined(); expect(localReadAllowed(p, 'booking-availability')).toBe(true); expect(localReadAllowed(p, 'booking-workshops')).toBe(false); expect(spy).not.toHaveBeenCalled(); expect(businessFingerprints()).toEqual(fp);
});

it.each(['restaurant', 'workshop'] as const)('%s: feature withdrawal blocks old cached read receipts and GET withholds the card', async domain => {
  const f = await fixture(domain), cmd = command(f), first = await submitConversation(f.u, f.c.id, cmd); expect(await submitConversation(f.u, f.c.id, cmd)).toEqual(first);
  vi.stubEnv('STUDIO_CONVERSATION_' + f.flag, '0'); const fp = businessFingerprints(); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 409 }); expect(conversationView(f.u, f.c.id)[f.field]).toBeUndefined(); expect(businessFingerprints()).toEqual(fp); expect(stateOf(f.pid)).toBeNull();
});

it('product projects cannot acquire either booking read even when every new flag is enabled', async () => {
  const f = await fixture('workshop', 'products'), fp = businessFingerprints(), p = await say(f); expect(p.bookingWorkshopsRead).toBeUndefined(); expect(p.bookingAvailabilityRead).toBeUndefined(); expect(p.recovery?.localReads).toBeUndefined(); expect(businessFingerprints()).toEqual(fp);
});

it('read rights never authorize a mutator, provider cognition or a forged/unknown capability', async () => {
  const f = await fixture('workshop'), p = await say(f), fp = businessFingerprints();
  for (const action of ['confirm-booking-hours', 'confirm-booking-service-catalog', 'confirm-booking-staff', 'confirm-booking-closures', 'confirm-local']) await expect(f.send({ action, proposalId: 'forged', confirmation: true })).rejects.toMatchObject({ status: 409 });
  expect(() => createCognitiveQuote(f.u, f.c.id, { revision: p.revision, projectRevision: p.projectRevision })).toThrow();
  for (const patch of [{ schema: 'other' }, { readOnly: false }, { confirmationRequired: true }, { costEur: 1 }, { providerCalls: 1 }, { financialConsent: true }, { ops: ['booking-records'] }]) expect(localReadAllowed({ ...p, recovery: { ...p.recovery!, localReads: { ...p.recovery!.localReads!, ...patch } as never } }, 'booking-workshops')).toBe(false);
  expect(localReadAllowed(p, 'files' as never)).toBe(false); expect(localReadAllowed({ ...p, bookingWorkshopsRead: undefined }, 'booking-workshops')).toBe(false); expect(businessFingerprints()).toEqual(fp); expect(stateOf(f.pid)).toBeNull();
});

it('foreign user and withdrawn subscription cannot read or replay an A1 observation', async () => {
  const f = await fixture('workshop'), cmd = command(f); await submitConversation(f.u, f.c.id, cmd); await expect(submitConversation(await account(), f.c.id, cmd)).rejects.toMatchObject({ status: 404 });
  run("UPDATE subscriptions SET status='canceled' WHERE project_id=?", f.pid); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 402 }); expect(() => conversationView(f.u, f.c.id)).toThrow(); expect(stateOf(f.pid)).toBeNull();
});

it('native POST and GET readers stay under the no-AI guard; a native failure rolls the message back', async () => {
  const f = await fixture('workshop'), original = cabinet.workshops, reasons: (string | null)[] = [];
  vi.spyOn(cabinet, 'workshops').mockImplementation((...args) => { reasons.push(aiDisabledReason()); return original(...args); }); await say(f); conversationView(f.u, f.c.id); expect(reasons.length).toBeGreaterThan(1); expect(reasons.every(Boolean)).toBe(true);
  vi.restoreAllMocks(); const before = all('SELECT * FROM agent_conversations WHERE id=?', f.c.id), fp = businessFingerprints(); vi.spyOn(cabinet, 'workshops').mockImplementation(() => { throw Error('synthetic_workshop_read_failure'); });
  const live = before[0]; await expect(submitConversation(f.u, f.c.id, { action: 'message', text: text(f), revision: live.revision, projectRevision: null, requestId: id(), context: { tab: 'rendez-vous', target: null } })).rejects.toThrow(/synthetic_workshop_read_failure/); expect(all('SELECT * FROM agent_conversations WHERE id=?', f.c.id)).toEqual(before); expect(businessFingerprints()).toEqual(fp);
});

it('zero AI allowance permits both exact reads and persists no customer metadata', async () => {
  const f = await fixture('workshop'); seed(f); run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?', projectAccountKey(f.pid)); const fp = businessFingerprints(), p = await say(f); expect(p.bookingWorkshops?.state).toBe('listed'); expect(businessFingerprints()).toEqual(fp);
  const slots = await f.send({ action: 'message', text: `Montre les créneaux disponibles pour le service réservable « Diagnostic acquis » en cabinet le ${date}`, context: { tab: 'rendez-vous', target: null } });
  expect(slots.bookingAvailability?.state).toBe('listed'); expect(slots.bookingWorkshops).toBeUndefined(); expect(localReadAllowed(slots, 'booking-availability')).toBe(true); expect(businessFingerprints()).toEqual(fp);
  const metadata = JSON.stringify(metaOf(ownedConversation(f.u, f.c.id, true))); for (const secret of ['CONTACT_PRIVE', 'PRIVE_EMAIL', 'PRIVE_PHONE', 'PRIVE_NOTE', 'PRIVE_SANTE', 'PRIVE_TOKEN']) expect(metadata).not.toContain(secret); expect(stateOf(f.pid)).toBeNull();
});

it.each(['restaurant', 'workshop'] as const)('A1 %s real HTTP≥17s/project refresh: fresh native observation, no preparation and lost-response replay without duplicate', async domain => {
  const f = await fixture(domain), fp = businessFingerprints(), cmd = command(f), ctx = { params: Promise.resolve({ cid: f.c.id }) }, request = (body?: unknown) => new Request('http://localhost/api', { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const r = await thread.POST(request(cmd), ctx); expect(r.status).toBe(200); const first = await r.json(); expect(first[f.field].state).toBe('listed'); expect(businessFingerprints()).toEqual(fp); seed(f);
  const afterManual = businessFingerprints(), { waitAtLeast } = await import('../scripts/lot9/wait-at-least'); expect(await waitAtLeast(17_000, ms => new Promise(resolve => setTimeout(resolve, ms)))).toBeGreaterThanOrEqual(17_000); vi.mocked(Date.now).mockReturnValue(at + 17_000);
  expect((await projectGet(request(), { params: Promise.resolve({ id: f.pid }) })).status).toBe(200); const fresh = await (await thread.GET(request(), ctx)).json(); expect(fresh[f.field].observedAt).toBe(at + 17_000); if (domain === 'workshop') expect(fresh[f.field].rows[0].remaining).toBe(1); else expect(fresh[f.field].rows[0].available).toBe(false);
  expect(await (await thread.POST(request(cmd), ctx)).json()).toEqual(first); expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?', f.c.id, cmd.requestId)).toHaveLength(1); expect(businessFingerprints()).toEqual(afterManual); expect(stateOf(f.pid)).toBeNull(); expect(fresh.projectRevision).toBeNull();
});
