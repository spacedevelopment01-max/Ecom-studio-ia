import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import { account, project, sender, emptySpend } from './conversation209-fixtures';
import { businessFingerprints, historicalProject } from './conversation284-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { savePrestations } from '@/lib/contenus/prestations';
import { listBookings, rdvSection, type RdvKind } from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import * as restaurant from '@/lib/restaurant/booking';
import { createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { bookingAvailabilityCandidate } from '@/lib/orchestrator/conversation/local-booking-availability';
import { studioOperationCatalogue } from '@/lib/orchestrator/conversation/studio-operations';
import { seedSourcedAnglesForTest } from './sourced-strategy-fixture';
import { stateOf } from '@/lib/preparation/store';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-10';
beforeEach(() => {
  for (const f of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_AVAILABILITY', 'BOOKING_HOURS', 'BOOKING_CLOSURES', 'BOOKING_EDIT', 'STOCK', 'FILES', 'PAGES', 'SEO']) vi.stubEnv('STUDIO_CONVERSATION_' + f, '1');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at);
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function fixture(kind: RdvKind = 'salon', live = true, prepared = true) {
  const u = await account(), pid = project(u, 'services'), c = openProjectConversation(u, pid);
  saveThemeVersion(pid, serviceSpec(({ salon: 'atelier-nuance', cabinet: 'parenthese', restaurant: 'table-saison' }[kind]) as never), 'Planning fictif', 'user');
  if (kind !== 'restaurant') savePrestations(pid, { services: [{ name: 'Diagnostic fictif', duration: 30, price: 50, modes: 'cabinet,visio' }], ...(kind === 'salon' ? { staff: [{ name: 'Alex fictif', title: 'Fictif', skills: [], days: [] }] } : {}) });
  const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!;
  Object.assign(sec.section.settings, { booking_mode: live ? 'live' : 'demo', timezone: 'Europe/Paris', hours_tue: '09:00-12:00', open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00, 12:30', dinner_slots: '19:00', min_party: 2, max_party: 6, capacity: 6 });
  saveThemeVersion(pid, spec, 'Règles isolées', 'user'); listBookings(pid, kind, date, date);
  if (prepared) seedSourcedAnglesForTest(pid);
  return { u, pid, c, kind, send: sender(u, c.id), serviceId: kind === 'salon' ? salon.salonOf(pid).config.services[0].id : kind === 'cabinet' ? cabinet.cabinetOf(pid).config.seances[0].id : '', staffId: kind === 'salon' ? salon.salonOf(pid).config.staff[0].id : '' };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const phrase = (f: Fixture) => f.kind === 'restaurant' ? `Montre les créneaux disponibles du restaurant pour 4 personnes le ${date}` : `Montre les créneaux disponibles pour le service réservable « Diagnostic fictif »${f.kind === 'cabinet' ? ' en cabinet' : ''} le ${date}`;
const say = (f: Fixture, text = phrase(f)) => f.send({ action: 'message', text, context: { tab: 'rendez-vous', target: null } });
function seed(f: Fixture) {
  const row: Record<string, unknown> = { id: id(), project_id: f.pid, number: 'FICTIF-' + id(), status: 'confirmed', date, first_name: 'CONTACT_PRIVE', last_name: 'Fictif', email: 'SECRET_EMAIL@example.invalid', phone: 'SECRET_PHONE', note: 'NOTE_PRIVEE', created_at: now(), updated_at: now(),
    ...(f.kind === 'restaurant' ? { party: 4, time: '12:00', token_hash: 'SECRET_TOKEN' } : { service: f.serviceId, service_name: 'Diagnostic acquis', start_min: 540, end_min: 570, price: 50, ...(f.kind === 'salon' ? { staff: f.staffId, client_id: 'SECRET_CLIENT' } : { kind: 'seance', modality: 'cabinet', personal_note: 'NOTE_SANTE' }) }) };
  const table = f.kind === 'restaurant' ? 'restaurant_reservations' : f.kind + '_appointments', keys = Object.keys(row);
  run(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k]));
}

for (const kind of ['salon', 'cabinet', 'restaurant'] as const) it.each([false, true])(`${kind}: natural read matches the native engine, prepared=%s, with no business write or customer secrets`, async prepared => {
  const f = await fixture(kind, true, prepared); seed(f);
  const fp = businessFingerprints(), prep = stateOf(f.pid), theme = currentTheme(f.pid), profile = loadProject(f.pid).services, p = await say(f);
  expect(p.bookingAvailability).toMatchObject({ schema: 'syna-booking-availability-read-1', state: 'listed', kind, bookingMode: 'live', timezone: 'Europe/Paris', observedAt: at, readOnly: true, confirmationRequired: false, actionsExecuted: false, providerCalls: 0, costEur: 0, filter: { kind, date } });
  expect(p.bookingAvailabilityRead).toEqual({ enabled: true }); expect(p.action?.state).not.toBe('quote');
  const actual = p.bookingAvailability!.rows!;
  if (kind === 'salon') expect(actual.map(({ time, available, staffIds }) => ({ time, available, staff: staffIds }))).toEqual(salon.availability(f.pid, { date, service: f.serviceId, staff: 'any' }, at).slots);
  else if (kind === 'cabinet') expect(actual).toEqual(cabinet.availability(f.pid, { date, service: f.serviceId, modality: 'cabinet' }, at).slots);
  else expect(actual.map(({ time, available, serviceId }) => ({ time, available, serviceId }))).toEqual(restaurant.availability(f.pid, date, 4, at).services.flatMap(s => s.slots.map(slot => ({ time: slot.time, available: slot.available, serviceId: s.id }))));
  for (const secret of ['CONTACT_PRIVE', 'SECRET_EMAIL', 'SECRET_PHONE', 'NOTE_PRIVEE', 'SECRET_TOKEN', 'SECRET_CLIENT', 'NOTE_SANTE']) expect(JSON.stringify(p)).not.toContain(secret);
  expect(businessFingerprints()).toEqual(fp); expect(stateOf(f.pid)).toEqual(prep); expect(currentTheme(f.pid)).toEqual(theme); expect(loadProject(f.pid).services).toEqual(profile);
});

it.each(['Peux-tu me montrer', 'Je voudrais voir', 'Montre-moi', 'Quels sont', 'Affiche'])('natural polite availability stays local: %s', async prefix => {
  const f = await fixture(), p = await say(f, phrase(f).replace('Montre', prefix)); expect(p.bookingAvailability?.state).toBe('listed');
});

it.each(['salon', 'cabinet', 'restaurant'] as const)('%s GET rereads new occupancy and does not reuse a stale slot snapshot', async kind => {
  const f = await fixture(kind), p = await say(f); expect(p.bookingAvailability!.rows![0].available).toBe(true); seed(f);
  const fp = businessFingerprints(), fresh = conversationView(f.u, f.c.id); expect(fresh.bookingAvailability!.rows![0].available).toBe(false); expect(businessFingerprints()).toEqual(fp);
});

it.each(['salon', 'cabinet', 'restaurant'] as const)('%s demo is unavailable and is never activated by a read', async kind => {
  const f = await fixture(kind, false), before = currentTheme(f.pid), p = await say(f);
  expect(p.bookingAvailability).toMatchObject({ state: 'unavailable', bookingMode: 'demo', confirmationRequired: false }); expect(p.bookingAvailability!.rows).toBeUndefined(); expect(currentTheme(f.pid)).toEqual(before);
});

it.each([
  'Montre les créneaux disponibles',
  'Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » demain',
  'Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » le 2026-02-31',
  'Montre les créneaux disponibles pour le service réservable « absent » le 2026-11-10',
  'Montre les créneaux disponibles pour le service réservable « Diagnostic fictif » le 2026-11-10 puis réserve',
])('invalid, missing, relative or chained target clarifies without inventing availability: %s', async text => {
  const f = await fixture(), fp = businessFingerprints(), p = await say(f, text);
  expect(p.bookingAvailability).toMatchObject({ state: 'ambiguous', confirmationRequired: false }); expect(p.bookingAvailability!.rows).toBeUndefined(); expect(businessFingerprints()).toEqual(fp);
});

it('restaurant group limits and cabinet modality are explicit; no salon/restaurant target substitution', async () => {
  const r = await fixture('restaurant'); expect((await say(r, phrase(r).replace('4 personnes', '7 personnes'))).bookingAvailability?.state).toBe('ambiguous');
  const c = await fixture('cabinet'); expect((await say(c, phrase(c).replace(' en cabinet', ''))).bookingAvailability?.state).toBe('ambiguous');
  const f = await fixture(); await expect(say(f, phrase(r))).rejects.toMatchObject({ status: 409 });
});

it('native salon length variants require an exact supported choice and use its native duration', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec), service = Object.values(rdvSection(spec)!.section.blocks!).find(b => b.type === 'service')!;
  service.settings.short_duration = 30; service.settings.long_duration = 60; saveThemeVersion(f.pid, spec, 'Longueurs acquises', 'user');
  expect((await say(f)).bookingAvailability?.state).toBe('ambiguous');
  const p = await say(f, phrase(f).replace(' le ' + date, ' longueur « long » le ' + date)); expect(p.bookingAvailability).toMatchObject({ state: 'listed', filter: { length: 'long' } });
  expect(p.bookingAvailability!.rows!.map(r => ({ time: r.time, available: r.available, staff: r.staffIds }))).toEqual(salon.availability(f.pid, { date, service: f.serviceId, staff: 'any', length: 'long' }, at).slots);
  expect((await say(f, phrase(f).replace(' le ' + date, ' longueur « inconnu » le ' + date))).bookingAvailability?.state).toBe('ambiguous');
});

it('GET refuses a changed engine, removed service or withdrawn restaurant group range without substitution', async () => {
  const f = await fixture(); await say(f); savePrestations(f.pid, { serviceRemove: { id: f.serviceId } });
  expect(conversationView(f.u, f.c.id).bookingAvailability?.state).toBe('unavailable');
  saveThemeVersion(f.pid, serviceSpec('parenthese'), 'Autre planning acquis', 'user'); expect(conversationView(f.u, f.c.id).bookingAvailability?.state).toBe('unavailable');
  const r = await fixture('restaurant'); await say(r); savePrestations(r.pid, { restaurantPartyPatch: { minParty: 2, maxParty: 3 } }); expect(conversationView(r.u, r.c.id).bookingAvailability?.state).toBe('unavailable');
});

it('a manual return to demo removes formerly real slots on GET, without reactivating the service', async () => {
  const f = await fixture(); expect((await say(f)).bookingAvailability?.state).toBe('listed');
  const spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.settings.booking_mode = 'demo'; saveThemeVersion(f.pid, spec, 'Retour démo fictif', 'user');
  const fp = businessFingerprints(), p = conversationView(f.u, f.c.id);
  expect(p.bookingAvailability).toMatchObject({ state: 'unavailable', bookingMode: 'demo' }); expect(p.bookingAvailability!.rows).toBeUndefined(); expect(businessFingerprints()).toEqual(fp);
});

it('homonymous services require their unique ID rather than choosing the first duration', async () => {
  const f = await fixture(); savePrestations(f.pid, { services: [{ name: 'Homonyme', duration: 30, price: 50 }, { name: 'Homonyme', duration: 60, price: 75 }] });
  const config = salon.salonOf(f.pid).config;
  expect((await say(f, phrase(f).replace('Diagnostic fictif', 'Homonyme'))).bookingAvailability?.state).toBe('ambiguous');
  const p = await say(f, phrase(f).replace('Diagnostic fictif', config.services[1].id)); expect(p.bookingAvailability).toMatchObject({ state: 'listed', service: { id: config.services[1].id } });
  expect(p.bookingAvailability!.rows!.map(r => ({ time: r.time, available: r.available, staff: r.staffIds }))).toEqual(salon.availability(f.pid, { date, service: config.services[1].id, staff: 'any' }, at).slots);
});

it('large native calendars are bounded without misrepresenting the omitted slots', async () => {
  const f = await fixture(); savePrestations(f.pid, { hours: { tue: '00:00-24:00' }, servicePatch: { id: f.serviceId, duration: 5 } });
  const spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.settings.slot_step = 5; saveThemeVersion(f.pid, spec, 'Calendrier dense fictif', 'user');
  const fp = businessFingerprints(), p = await say(f), native = salon.availability(f.pid, { date, service: f.serviceId, staff: 'any' }, at);
  expect(native.slots.length).toBeGreaterThan(100); expect(p.bookingAvailability).toMatchObject({ state: 'listed', total: native.slots.length, limit: 100, hasMore: true }); expect(p.bookingAvailability!.rows).toHaveLength(100); expect(businessFingerprints()).toEqual(fp);
});

it('quoted command words remain service data and cannot trigger a retouch, file action or cognitive quote', async () => {
  const f = await fixture(); savePrestations(f.pid, { servicePatch: { id: f.serviceId, name: 'prix stock ferme mardi et fichier' } });
  const p = await say(f, phrase(f).replace('Diagnostic fictif', 'prix stock ferme mardi et fichier'));
  expect(p.bookingAvailability).toMatchObject({ state: 'listed', service: { id: f.serviceId } }); expect(p.bookingHours).toBeUndefined(); expect(p.localStock).toBeUndefined(); expect(p.localFiles).toBeUndefined();
  expect(bookingAvailabilityCandidate('Explique « Montre les créneaux disponibles »')).toBe(false);
});

it.each(['listed', 'ambiguous', 'disabled'])('%s native read cannot create or accept a paid cognitive quote', async status => {
  const f = await fixture(), p = await say(f, status === 'ambiguous' ? 'Montre les créneaux disponibles' : phrase(f));
  if (status === 'disabled') vi.stubEnv('STUDIO_CONVERSATION_BOOKING_AVAILABILITY', '0');
  const v = conversationView(f.u, f.c.id), spend = emptySpend(), quotes = all('SELECT * FROM agent_conversation_quotes');
  expect(() => createCognitiveQuote(f.u, f.c.id, { revision: v.revision, projectRevision: v.projectRevision })).toThrow(/parcours gratuit de réservation/); expect(all('SELECT * FROM agent_conversation_quotes')).toEqual(quotes);
  const q = id(); run('INSERT INTO agent_conversation_quotes(id,conversation_id,revision,project_revision,billing_key,plan_json,created_at) VALUES(?,?,?,?,?,?,?)', q, f.c.id, v.revision, v.projectRevision, f.u.id, '{}', now());
  expect(() => confirmCognitiveQuote(f.u, f.c.id, q, id())).toThrow(/parcours gratuit de réservation/); expect(emptySpend()).toEqual(spend); expect(p.bookingAvailability?.financialConsent).toBe(false);
});

it('owner, tab, feature flag and withdrawn plan are checked before native read and cached replay', async () => {
  const f = await fixture(), v = conversationView(f.u, f.c.id), cmd = { action: 'message', text: phrase(f), context: { tab: 'rendez-vous', target: null }, revision: v.revision, projectRevision: v.projectRevision, requestId: id() };
  await expect(submitConversation(await account(), f.c.id, cmd)).rejects.toMatchObject({ status: 404 });
  await expect(f.send({ action: 'message', text: phrase(f), context: { tab: 'produit', target: null } })).rejects.toMatchObject({ status: 409 });
  await submitConversation(f.u, f.c.id, cmd); vi.stubEnv('STUDIO_CONVERSATION_BOOKING_AVAILABILITY', '0');
  expect(conversationView(f.u, f.c.id).bookingAvailabilityRead).toBeUndefined(); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 404 });
  vi.stubEnv('STUDIO_CONVERSATION_BOOKING_AVAILABILITY', '1'); run("UPDATE subscriptions SET status='canceled' WHERE project_id=?", f.pid); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 402 });
});

it('capability is bounded read-only and a historical A1 project cannot acquire it through the new flag', async () => {
  const f = await fixture(), row = studioOperationCatalogue(f.pid, false).rows.find(r => r.id === 'appointments.availability');
  expect(row).toMatchObject({ implementation: 'implemented', cost: 'free', confirmation: 'none_read_only_no_business_action', scope: 'native_live_availability_read_backend_partial' });
  const old = await historicalProject('services'), c = openProjectConversation(old.u, old.pid), before = loadProject(old.pid), p = await sender(old.u, c.id)({ action: 'message', text: phrase(f), context: { tab: 'rendez-vous', target: null } });
  expect(p.bookingAvailabilityRead).toBeUndefined(); expect(loadProject(old.pid)).toEqual(before); expect(stateOf(old.pid)).toBeNull();
});

it('real HTTP after17s/project refresh rereads native occupancy; a lost-response request replay creates no booking or second turn', async () => {
  const f = await fixture('restaurant'); jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), f.u.id, now() + 3_600_000, now());
  const ctx = { params: Promise.resolve({ cid: f.c.id }) }, request = (body?: unknown) => new Request('http://localhost/api', { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const v = conversationView(f.u, f.c.id), cmd = { action: 'message', text: phrase(f), context: { tab: 'rendez-vous', target: null }, revision: v.revision, projectRevision: v.projectRevision, requestId: id() }, fp = businessFingerprints();
  const first = await thread.POST(request(cmd), ctx); expect(first.status).toBe(200); const snapshot = await first.json(); expect(snapshot.bookingAvailability.rows[0].available).toBe(true); expect(businessFingerprints()).toEqual(fp);
  seed(f); const afterManual = businessFingerprints(), { waitAtLeast } = await import('../scripts/lot9/wait-at-least');
  expect(await waitAtLeast(17_000, ms => new Promise(resolve => setTimeout(resolve, ms)))).toBeGreaterThanOrEqual(17_000);
  vi.mocked(Date.now).mockReturnValue(at + 17_000);
  expect((await projectGet(request(), { params: Promise.resolve({ id: f.pid }) })).status).toBe(200);
  const refreshed = await (await thread.GET(request(), ctx)).json(); expect(refreshed.bookingAvailability.rows[0].available).toBe(false); expect(refreshed.bookingAvailability.observedAt).toBe(at + 17_000);
  // A POST replay is the original dated receipt; GET is the explicitly current native observation.
  expect(await (await thread.POST(request(cmd), ctx)).json()).toEqual(snapshot); expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?', f.c.id, cmd.requestId)).toHaveLength(1);
  expect(businessFingerprints()).toEqual(afterManual);
});
